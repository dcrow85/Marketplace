#!/usr/bin/env python3
"""Content-addressed trade-record store (Cloudflare KV via REST).

The escrow only stores HASHES on-chain (terms, tracking, dispute reason). This is where
the PLAINTEXT behind each hash lives, keyed by the hash itself, so any party — crucially
the arbiter, on a different device — can fetch it and verify `keccak(plaintext) == hash`.
Cairn's whole identity is *witness*; this is the part that lets it remember.

Trust model: the store is untrusted. Keys must be hash-shaped and values are size-capped,
but the integrity guarantee is client-side — the reader recomputes the keccak and rejects
anything that doesn't match the on-chain hash. A bad value can at worst make a record
unreadable, never forge one.

Config (env): CAIRN_KV_TOKEN, CAIRN_KV_ACCOUNT, CAIRN_KV_NAMESPACE.
"""
from __future__ import annotations

import os
import re
import urllib.error
import urllib.request

_TOKEN = os.environ.get("CAIRN_KV_TOKEN", "")
_ACCT = os.environ.get("CAIRN_KV_ACCOUNT", "")
_NS = os.environ.get("CAIRN_KV_NAMESPACE", "")
_KEY_RE = re.compile(r"^0x[0-9a-fA-F]{64}$")  # a 32-byte keccak hash
MAX_VALUE = 200_000  # bytes; records are small (terms JSON, a dispute reason, a tracking #)


def configured() -> bool:
    return bool(_TOKEN and _ACCT and _NS)


def _url(key: str) -> str:
    return f"https://api.cloudflare.com/client/v4/accounts/{_ACCT}/storage/kv/namespaces/{_NS}/values/{key}"


def put_record(key: str, value: str) -> dict:
    if not configured():
        return {"error": "kv_unconfigured"}
    if not (key and _KEY_RE.match(key)):
        return {"error": "bad_key"}
    if not isinstance(value, str) or len(value.encode("utf-8")) > MAX_VALUE:
        return {"error": "bad_value"}
    req = urllib.request.Request(
        _url(key), data=value.encode("utf-8"), method="PUT",
        headers={"Authorization": f"Bearer {_TOKEN}", "Content-Type": "text/plain"})
    try:
        urllib.request.urlopen(req, timeout=20)
        return {"ok": True}
    except urllib.error.HTTPError as exc:
        return {"error": "kv_put_failed", "status": exc.code}


def get_record(key: str) -> dict:
    if not configured():
        return {"error": "kv_unconfigured"}
    if not (key and _KEY_RE.match(key)):
        return {"error": "bad_key"}
    req = urllib.request.Request(_url(key), headers={"Authorization": f"Bearer {_TOKEN}"})
    try:
        r = urllib.request.urlopen(req, timeout=20)
        return {"found": True, "value": r.read().decode("utf-8", "replace")}
    except urllib.error.HTTPError as exc:
        if exc.code == 404:
            return {"found": False, "value": None}
        return {"error": "kv_get_failed", "status": exc.code}
