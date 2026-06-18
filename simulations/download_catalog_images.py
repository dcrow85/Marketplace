#!/usr/bin/env python3
"""Pull the japanese-pre-english catalog's reference images local so the unified
binder can render them (badged by provenance). These rows are flagged
display_allowed:false — external reference witnesses — so the UI labels each
image's provenance (exact-source vs provider-path) and frames it as a reference
witness, never seller evidence. We mirror them locally only to avoid hotlink
fragility; provenance honesty lives in the badge + detail copy.

Reads data/japanese-pre-english/manifest.json -> every release -> each row's
image_small, saved to mockups/assets/cards/<sanitized row_id>.<ext>. Writes an
index map (row_id -> local relative path) the UI generator consumes. Idempotent;
sequential with retries for the rental-wifi idle-TCP kill.
"""

from __future__ import annotations

import json
import os
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / "data" / "japanese-pre-english" / "manifest.json"
OUT = ROOT / "mockups" / "assets" / "cards"
INDEX = OUT / "_catalog_index.json"
UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) cairn-asset-fetch/1.0"


def sanit(row_id: str) -> str:
    return row_id.replace(":", "_").replace("/", "_").replace(" ", "_")


def ext_of(url: str) -> str:
    e = os.path.splitext(urllib.parse.urlparse(url).path)[1].lower()
    return e if e in (".png", ".jpg", ".jpeg", ".webp") else ".jpg"


def fetch(url: str, dest: Path, tries: int = 4) -> int:
    last = None
    for n in range(tries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA})
            with urllib.request.urlopen(req, timeout=20) as r:
                data = r.read()
            if len(data) < 300:
                raise ValueError(f"small ({len(data)}b)")
            dest.write_bytes(data)
            return len(data)
        except Exception as e:  # noqa: BLE001
            last = e
            time.sleep(0.5 * (n + 1))
    raise RuntimeError(str(last))


def main() -> int:
    man = json.loads(MANIFEST.read_text(encoding="utf-8"))
    OUT.mkdir(parents=True, exist_ok=True)
    index = {}
    if INDEX.exists():
        try:
            index = json.loads(INDEX.read_text(encoding="utf-8"))
        except Exception:  # noqa: BLE001
            index = {}
    got = skipped = 0
    failed = []
    for rel in man["releases"]:
        rel_path = ROOT / rel["path"]
        cards = json.loads(rel_path.read_text(encoding="utf-8")).get("cards", [])
        for c in cards:
            rid = c["row_id"]
            ip = c.get("image_provenance") or {}
            url = ip.get("image_small") or ip.get("image_large")
            if not url:
                continue
            dest = OUT / f"{sanit(rid)}{ext_of(url)}"
            rel_local = f"assets/cards/{dest.name}"
            if dest.exists() and dest.stat().st_size > 300:
                index[rid] = rel_local
                skipped += 1
                continue
            try:
                fetch(url, dest)
                index[rid] = rel_local
                got += 1
                if got % 25 == 0:
                    print(f"  …{got} fetched", flush=True)
            except Exception as e:  # noqa: BLE001
                failed.append((rid, str(e)))
                print(f"  FAIL {rid}: {e}", flush=True)
        # persist index incrementally so a mid-run kill still leaves a usable map
        INDEX.write_text(json.dumps(index, indent=0, ensure_ascii=False), encoding="utf-8")
    print(f"\ndownloaded {got} · skipped {skipped} · failed {len(failed)} · indexed {len(index)}")
    for rid, e in failed[:20]:
        print(f"  ! {rid}: {e}")
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
