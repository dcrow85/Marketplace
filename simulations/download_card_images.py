#!/usr/bin/env python3
"""One-time: pull the No Rarity reference images local so the binder renders
offline, instantly, with no hotlink dependency or link-rot.

Reads the already-resolved URLs out of mockups/collection-sample.json (the
catalog's source-labeled PriceCharting reference — never the English API art),
saves each to mockups/assets/cards/<card_ref>.jpg. Idempotent: skips files that
are already on disk. Sequential with retries so the rental wifi's idle-TCP kill
doesn't strand a parallel batch.
"""

from __future__ import annotations

import json
import sys
import time
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "mockups" / "collection-sample.json"
OUT = ROOT / "mockups" / "assets" / "cards"
UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) cairn-asset-fetch/1.0"


def fetch(url: str, dest: Path, tries: int = 4) -> int:
    last = None
    for n in range(tries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA})
            with urllib.request.urlopen(req, timeout=20) as r:
                data = r.read()
            if len(data) < 500:
                raise ValueError(f"suspiciously small ({len(data)}b)")
            dest.write_bytes(data)
            return len(data)
        except Exception as e:  # noqa: BLE001 — best-effort fetch, report at end
            last = e
            time.sleep(0.6 * (n + 1))
    raise RuntimeError(f"{url} -> {last}")


def main() -> int:
    data = json.loads(SRC.read_text(encoding="utf-8"))
    OUT.mkdir(parents=True, exist_ok=True)
    got = skipped = 0
    failed = []
    for c in data["cards"]:
        url, ref = c.get("image"), c["card_ref"]
        if not url or not str(url).startswith("http"):
            skipped += 1  # local scan or no source
            continue
        dest = OUT / f"{ref}.jpg"
        if dest.exists() and dest.stat().st_size > 500:
            skipped += 1
            continue
        try:
            n = fetch(url, dest)
            got += 1
            print(f"  {ref}  {n:>6}b", flush=True)
        except Exception as e:  # noqa: BLE001
            failed.append((ref, str(e)))
            print(f"  {ref}  FAILED {e}", flush=True)
    on_disk = len(list(OUT.glob("*.jpg")))
    print(f"\ndownloaded {got} · skipped {skipped} · failed {len(failed)} · on disk {on_disk}")
    for ref, e in failed:
        print(f"  ! {ref}: {e}")
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
