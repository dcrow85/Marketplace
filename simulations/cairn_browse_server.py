#!/usr/bin/env python3
"""Public-facing browse server for the Cairn binder demo.

Serves the binder (mockups/) statically and exposes a SMALL, deliberately narrow
API so the live judged-layer agent can be poked from a browser:

  POST /api/browse   {"call": "<natural-language browse call>", "catalog": "azuki-tcg"}  -> browse() result
  POST /api/decision-read {<bounded decision packet>}              -> advisory Anko read
  GET  /api/health                                               -> {"qwen": bool}

Design constraints (this is the thing that gets exposed via the tunnel):
  - The raw Qwen endpoint (:8081) is NEVER proxied or exposed. Only the trichotomy
    result of cairn_browse.browse() leaves this process: the enforced filter, the
    judged commentary + caveat, the picks (uids), and the no-overclaim flags.
  - Calls are length-capped and SINGLE-FLIGHT (one model call at a time) — the 35B
    is single-GPU, so concurrent visitors queue rather than thrash it.
  - Qwen-down degrades cleanly to a 503 the UI can render as "agent offline",
    never a stack trace.

Run:
  python3 simulations/cairn_browse_server.py --port 8788
Requires mlx_lm.server holding Qwen3.6 on :8081 for live calls (see SYNC seam 3).
"""

from __future__ import annotations

import argparse
import base64
import hmac
import json
import os
import socket
import subprocess
import threading
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parents[1]
MOCKUPS = ROOT / "mockups"
STATIC_DIR = MOCKUPS  # overridable via --static-dir (e.g. the built web/dist in production)

import sys
sys.path.insert(0, str(ROOT / "simulations"))
from cairn_browse import browse, ENDPOINT  # noqa: E402  (reuse the proven loop)
from cairn_decision_read import decision_read  # noqa: E402  (bounded, advisory decision read)
from cairn_vision import read_photo, read_page  # noqa: E402  (photo-import vision read)
from cairn_records import put_record, get_record  # noqa: E402  (content-addressed trade-record store)

MAX_CALL_CHARS = 280
MAX_READ_BYTES = 12 * 1024 * 1024  # /api/read accepts a down-res'd image (base64)
_MODEL_LOCK = threading.Lock()  # single-flight: serialize calls to the one local model

# Cloud-deploy config (all env-gated; unset = current local behavior).
ALLOW_ORIGINS = {origin.strip().rstrip("/") for origin in os.environ.get("CAIRN_ALLOW_ORIGIN", "").split(",") if origin.strip()}
# The two public Cairn hostnames are one site. Configuring either admits the other;
# arbitrary subdomains and localhost are not implicitly trusted.
if "https://cairn.cards" in ALLOW_ORIGINS:
    ALLOW_ORIGINS.add("https://www.cairn.cards")
if "https://www.cairn.cards" in ALLOW_ORIGINS:
    ALLOW_ORIGINS.add("https://cairn.cards")
_EP = urlparse(ENDPOINT)
LOCAL_MODEL = (_EP.hostname or "127.0.0.1") in ("127.0.0.1", "localhost", "::1")  # remote (DeepInfra) -> skip single-flight + socket liveness


def _load_demo_password() -> str | None:
    """Shared-password gate. Prefer the CAIRN_DEMO_PASSWORD env var (cloud hosts have no
    Keychain); else read the macOS Keychain so the secret is never in the repo or args.
    If neither is set, the gate is OFF (local dev serves freely)."""
    env = os.environ.get("CAIRN_DEMO_PASSWORD")
    if env:
        return env.strip() or None
    try:
        out = subprocess.run(
            ["security", "find-generic-password", "-a", "cairn", "-s", "cairn-demo-password", "-w"],
            capture_output=True, text=True, timeout=5,
        )
        return out.stdout.strip() or None
    except Exception:
        return None


DEMO_PASSWORD = None if os.environ.get("CAIRN_NO_AUTH") else _load_demo_password()  # None -> gate disabled


def qwen_up(timeout: float = 0.4) -> bool:
    """Liveness for the model endpoint. Local MLX server -> cheap socket probe to its
    port. A remote/hosted endpoint (DeepInfra) is assumed reachable; a real outage
    surfaces as a clean 502 from the browse path rather than a false 'offline'."""
    if not LOCAL_MODEL:
        return True
    host = _EP.hostname or "127.0.0.1"
    port = _EP.port or 8081
    try:
        with socket.create_connection((host, port), timeout=timeout):
            return True
    except OSError:
        return False


class BrowseHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args: Any, **kwargs: Any) -> None:
        super().__init__(*args, directory=str(STATIC_DIR), **kwargs)

    def _authorized(self) -> bool:
        """Shared-password (HTTP Basic) gate. Off when no password is configured.
        The username is ignored — any user + the shared password is accepted."""
        if not DEMO_PASSWORD:
            return True
        hdr = self.headers.get("Authorization", "")
        if hdr.startswith("Basic "):
            try:
                _, _, pw = base64.b64decode(hdr[6:]).decode("utf-8").partition(":")
            except Exception:
                pw = ""
            if hmac.compare_digest(pw, DEMO_PASSWORD):
                return True
        self.send_response(401)
        self._send_cors()
        self.send_header("WWW-Authenticate", 'Basic realm="Cairn demo", charset="UTF-8"')
        self.send_header("Content-Length", "0")
        self.end_headers()
        return False

    # serve the binder at "/" too
    def do_GET(self) -> None:
        if self.path == "/api/health":  # public liveness — no auth (frontend + host healthchecks)
            self.send_json({"qwen": qwen_up()})
            return
        if self.path.split("?", 1)[0] == "/api/record":  # public: content-addressed, keccak-verified by the reader
            self._get_record()
            return
        if not self._authorized():
            return
        if self.path == "/" and not (STATIC_DIR / "index.html").exists():
            self.path = "/cairn-inventory.html"  # mockups has no index.html; an SPA build does
        super().do_GET()

    def do_POST(self) -> None:
        if not self._authorized():
            return
        if self.path == "/api/browse":
            self._post_browse()
        elif self.path == "/api/decision-read":
            self._post_decision_read()
        elif self.path == "/api/read":
            self._post_read()
        elif self.path == "/api/scan":
            self._post_scan()
        elif self.path == "/api/record":
            self._post_record_store()
        else:
            self.send_error(404, "Unknown endpoint")

    def _body(self, max_bytes: int):
        try:
            length = int(self.headers.get("Content-Length", "0"))
        except ValueError:
            length = 0
        if length <= 0 or length > max_bytes:
            self.send_json({"error": "bad_request"}, status=400)
            return None
        try:
            return json.loads(self.rfile.read(length).decode("utf-8"))
        except (json.JSONDecodeError, UnicodeDecodeError):
            self.send_json({"error": "bad_json"}, status=400)
            return None

    def _post_browse(self) -> None:
        payload = self._body(4096)
        if payload is None:
            return
        call = str(payload.get("call", "")).strip()[:MAX_CALL_CHARS]
        catalog = str(payload.get("catalog", "")).strip() or None
        if not call:
            self.send_json({"error": "empty_call"}, status=400)
            return
        if not qwen_up():
            self.send_json({"error": "agent_offline", "detail": "The local model is not running."}, status=503)
            return
        try:
            if LOCAL_MODEL:
                with _MODEL_LOCK:  # single-flight: the local 35B is single-GPU
                    result = browse(call, catalog=catalog)
            else:
                result = browse(call, catalog=catalog)  # hosted endpoint scales; allow concurrent visitors
        except Exception as exc:  # noqa: BLE001 — never leak a stack trace to the demo
            self.send_json({"error": "browse_failed", "detail": type(exc).__name__}, status=502)
            return
        self.send_json(result)

    def _post_decision_read(self) -> None:
        payload = self._body(16_000)
        if payload is None:
            return
        if not qwen_up():
            self.send_json({"error": "agent_offline", "detail": "Anko is not available right now."}, status=503)
            return
        try:
            if LOCAL_MODEL:
                with _MODEL_LOCK:
                    result = decision_read(payload)
            else:
                result = decision_read(payload)
        except ValueError as exc:
            code = str(exc)
            status = 400 if code in {"bad_packet", "packet_too_large"} else 422
            self.send_json({"error": code}, status=status)
            return
        except Exception as exc:  # noqa: BLE001 — no model/provider detail leaves the service
            self.send_json({"error": "decision_read_failed", "detail": type(exc).__name__}, status=502)
            return
        self.send_json(result)

    def _post_read(self) -> None:
        """Photo-import vision read: {image: <data-uri>, expect: {name,num,release}} -> structured read."""
        payload = self._body(MAX_READ_BYTES)
        if payload is None:
            return
        image = str(payload.get("image", ""))
        expect = payload.get("expect") if isinstance(payload.get("expect"), dict) else None
        if not image.startswith("data:image"):
            self.send_json({"error": "bad_image"}, status=400)
            return
        try:
            result = read_photo(image, expect)  # hosted vision endpoint; concurrent OK
        except Exception as exc:  # noqa: BLE001 — never leak a stack trace
            self.send_json({"error": "read_failed", "detail": type(exc).__name__}, status=502)
            return
        self.send_json(result)

    def _post_scan(self) -> None:
        """One-pass detect+read over a whole frame: {image: <data-uri>} -> {cards:[...], total}.
        Same model as /api/read; here it returns EVERY card it sees (one or many) with a box,
        so the surface needs no card/page mode and no layout picker."""
        payload = self._body(MAX_READ_BYTES)
        if payload is None:
            return
        image = str(payload.get("image", ""))
        if not image.startswith("data:image"):
            self.send_json({"error": "bad_image"}, status=400)
            return
        try:
            result = read_page(image)  # hosted vision endpoint; concurrent OK
        except Exception as exc:  # noqa: BLE001 — never leak a stack trace
            self.send_json({"error": "scan_failed", "detail": type(exc).__name__}, status=502)
            return
        self.send_json(result)

    def _get_record(self) -> None:
        """GET /api/record?key=0x<32-byte-hash> -> {found, value} (the keccak preimage)."""
        from urllib.parse import parse_qs, urlparse
        key = (parse_qs(urlparse(self.path).query).get("key") or [""])[0]
        try:
            self.send_json(get_record(key))
        except Exception as exc:  # noqa: BLE001
            self.send_json({"error": "record_get_failed", "detail": type(exc).__name__}, status=502)

    def _post_record_store(self) -> None:
        """POST /api/record {key: 0x<hash>, value: <preimage string>} -> {ok} | {error}.
        The store is untrusted: the reader verifies keccak(value)==key, so a bad write can
        only make a record unreadable, never forge one."""
        payload = self._body(300_000)  # small record ({key, value} JSON); value itself is capped in put_record
        if payload is None:
            return
        key = str(payload.get("key", ""))
        value = payload.get("value", "")
        if not isinstance(value, str):
            self.send_json({"error": "bad_value"}, status=400)
            return
        try:
            self.send_json(put_record(key, value))
        except Exception as exc:  # noqa: BLE001
            self.send_json({"error": "record_put_failed", "detail": type(exc).__name__}, status=502)

    def _send_cors(self) -> None:
        origin = self.headers.get("Origin", "").rstrip("/")
        if origin and origin in ALLOW_ORIGINS:
            self.send_header("Access-Control-Allow-Origin", origin)
            self.send_header("Access-Control-Allow-Credentials", "true")
            self.send_header("Vary", "Origin")
            self.send_header("Access-Control-Allow-Headers", "Authorization, Content-Type")
            self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")

    def do_OPTIONS(self) -> None:  # CORS preflight — never auth-gated
        self.send_response(204)
        self._send_cors()
        self.send_header("Content-Length", "0")
        self.end_headers()

    def send_json(self, payload: dict[str, Any], status: int = 200) -> None:
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self._send_cors()
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, *args: Any) -> None:  # quieter logs; method + path only
        return


def main() -> None:
    parser = argparse.ArgumentParser(description="Cairn binder browse server (demo).")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8788)
    parser.add_argument("--require-auth", action="store_true",
                        help="refuse to start unless a Keychain password is loaded (fail closed — never serve unguarded)")
    parser.add_argument("--static-dir", default=None, help="directory to serve (default: mockups/; use web/dist for the built app)")
    args = parser.parse_args()
    if args.static_dir:
        global STATIC_DIR
        STATIC_DIR = Path(args.static_dir).resolve()
    if args.require_auth and not DEMO_PASSWORD:
        print("FATAL: --require-auth set but no cairn-demo-password in Keychain — refusing to serve unguarded.", file=sys.stderr)
        raise SystemExit(2)
    server = ThreadingHTTPServer((args.host, args.port), BrowseHandler)
    print(f"binder:  http://{args.host}:{args.port}/")
    print(f"browse:  POST http://{args.host}:{args.port}/api/browse")
    print(f"qwen up: {qwen_up()}  (endpoint {ENDPOINT})")
    print(f"auth:    {'shared-password ON' if DEMO_PASSWORD else 'OFF (no password set)'}")
    server.serve_forever()


if __name__ == "__main__":
    main()
