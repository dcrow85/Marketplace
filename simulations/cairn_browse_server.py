#!/usr/bin/env python3
"""Public-facing browse server for the Cairn binder demo.

Serves the binder (mockups/) statically and exposes a SMALL, deliberately narrow
API so the live judged-layer agent can be poked from a browser:

  POST /api/browse   {"call": "<natural-language browse call>"}  -> browse() result
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

ROOT = Path(__file__).resolve().parents[1]
MOCKUPS = ROOT / "mockups"
STATIC_DIR = MOCKUPS  # overridable via --static-dir (e.g. the built web/dist in production)

import sys
sys.path.insert(0, str(ROOT / "simulations"))
from cairn_browse import browse, ENDPOINT  # noqa: E402  (reuse the proven loop)

MAX_CALL_CHARS = 280
_MODEL_LOCK = threading.Lock()  # single-flight: serialize calls to the one local model


def _load_demo_password() -> str | None:
    """Shared-password gate. Read from the Keychain so the secret is never in the repo,
    args, or env. If unset, the gate is OFF (local dev serves freely)."""
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
    """Cheap liveness probe — can we open a socket to the local Qwen port?"""
    host, port = "127.0.0.1", 8081
    # ENDPOINT is http://127.0.0.1:8081/...; trust the known default but stay defensive.
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
        self.send_header("WWW-Authenticate", 'Basic realm="Cairn demo", charset="UTF-8"')
        self.send_header("Content-Length", "0")
        self.end_headers()
        return False

    # serve the binder at "/" too
    def do_GET(self) -> None:
        if not self._authorized():
            return
        if self.path == "/" and not (STATIC_DIR / "index.html").exists():
            self.path = "/cairn-inventory.html"  # mockups has no index.html; an SPA build does
        elif self.path == "/api/health":
            self.send_json({"qwen": qwen_up()})
            return
        super().do_GET()

    def do_POST(self) -> None:
        if not self._authorized():
            return
        if self.path != "/api/browse":
            self.send_error(404, "Unknown endpoint")
            return
        try:
            length = int(self.headers.get("Content-Length", "0"))
        except ValueError:
            length = 0
        if length <= 0 or length > 4096:
            self.send_json({"error": "bad_request"}, status=400)
            return
        try:
            payload = json.loads(self.rfile.read(length).decode("utf-8"))
            call = str(payload.get("call", "")).strip()[:MAX_CALL_CHARS]
        except (json.JSONDecodeError, UnicodeDecodeError):
            self.send_json({"error": "bad_json"}, status=400)
            return
        if not call:
            self.send_json({"error": "empty_call"}, status=400)
            return
        if not qwen_up():
            self.send_json({"error": "agent_offline", "detail": "The local model is not running."}, status=503)
            return
        try:
            with _MODEL_LOCK:
                result = browse(call)
        except Exception as exc:  # noqa: BLE001 — never leak a stack trace to the demo
            self.send_json({"error": "browse_failed", "detail": type(exc).__name__}, status=502)
            return
        self.send_json(result)

    def send_json(self, payload: dict[str, Any], status: int = 200) -> None:
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
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
