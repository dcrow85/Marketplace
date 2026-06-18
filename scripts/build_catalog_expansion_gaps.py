#!/usr/bin/env python3
"""Record source-visible catalog expansion gaps.

This file does not generate card rows. It preserves sets/products that a source
names but does not expose as card refs yet, so agents do not mistake absence for
completion or silently invent rows.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import time
import urllib.parse
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "data" / "catalog-expansion"
OUT_PATH = OUT_DIR / "source-gaps.json"
CACHE_DIR = ROOT / ".cache" / "tcgdex_gap_register"
TCGDEX_API_BASE = "https://api.tcgdex.net/v2"
TCGDEX_DOCS_URL = "https://tcgdex.dev/rest"
CANONICALIZATION = "json_sorted_keys_no_whitespace_v0.1"
HASH_ALGORITHM = "sha256"
SOURCE_VERSION = "tcgdex-gap-register-v0.1"
USER_AGENT = "MarketplaceCatalogGapRegister/0.1 (+local catalog builder)"


@dataclass(frozen=True)
class GapTarget:
    language: str
    set_id: str
    reason: str
    boundary_note: str


GAP_TARGETS: tuple[GapTarget, ...] = (
    GapTarget(
        "en",
        "wp",
        "TCGdex lists W Promotional as a 7-card English set but returns zero card refs in the set payload.",
        "English WoC-era supplemental promo gap; do not treat the English catalog as complete for this promo product.",
    ),
    GapTarget(
        "en",
        "sp",
        "TCGdex lists Sample as a 10-card English e-Card-era set but returns zero card refs in the set payload.",
        "English WoC-era supplemental sample-card gap; do not invent sample rows without a row-level source.",
    ),
    GapTarget(
        "en",
        "jumbo",
        "TCGdex lists Jumbo cards as a 160-card English miscellaneous set but returns zero card refs in the set payload.",
        "Jumbo is not safely bounded to the WoC era from this source alone; needs a row-level and date-bounded source before modeling.",
    ),
)


def utc_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def canonical_hash(value: Any) -> str:
    return hashlib.sha256(
        json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode("utf-8")
    ).hexdigest()


def cache_path(url: str) -> Path:
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    return CACHE_DIR / f"{hashlib.sha256(f'{SOURCE_VERSION}|{url}'.encode('utf-8')).hexdigest()}.json"


def fetch_json(path: str) -> dict[str, Any]:
    url = f"{TCGDEX_API_BASE}{path}"
    cache_file = cache_path(url)
    if cache_file.exists():
        return json.loads(cache_file.read_text(encoding="utf-8"))
    request = Request(url, headers={"User-Agent": USER_AGENT})
    try:
        with urlopen(request, timeout=30) as response:
            payload = {
                "url": url,
                "status": response.status,
                "fetched_at": utc_now(),
                "body": json.loads(response.read().decode("utf-8")),
            }
    except (HTTPError, URLError, TimeoutError, json.JSONDecodeError, OSError) as error:
        raise RuntimeError(f"failed to fetch {url}: {error}") from error
    cache_file.write_text(json.dumps(payload, ensure_ascii=False, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    time.sleep(0.03)
    return payload


def build_gap(target: GapTarget) -> dict[str, Any]:
    result = fetch_json(f"/{urllib.parse.quote(target.language, safe='')}/sets/{urllib.parse.quote(target.set_id, safe='')}")
    body = result["body"]
    cards = body.get("cards", []) or []
    card_count = body.get("cardCount", {}) or {}
    gap_count = max(int(card_count.get("total") or 0) - len(cards), 0)
    return {
        "schema": "marketplace.catalog_source_gap.v0.1",
        "authority_label": "legible",
        "language": target.language,
        "source": "TCGdex REST API",
        "docs_url": TCGDEX_DOCS_URL,
        "set_api_url": result["url"],
        "set_payload_hash": canonical_hash(body),
        "set_id": body.get("id", target.set_id),
        "name": body.get("name", ""),
        "series": body.get("serie", {}),
        "release_date": body.get("releaseDate", ""),
        "source_card_count": card_count,
        "card_refs_returned": len(cards),
        "source_gap_count": gap_count,
        "reason": target.reason,
        "boundary_note": target.boundary_note,
        "resolution_required_before_card_rows": [
            "row-level card identities",
            "source-attributed local IDs or card numbers",
            "source payload hashes or snapshots",
            "current catalog row fields and non-claims",
        ],
        "not_claiming": [
            "card-row model",
            "complete set checklist",
            "approved image rights",
            "seller possession",
            "authenticity",
            "condition truth",
            "price truth",
            "spendability",
        ],
    }


def build() -> dict[str, Any]:
    gaps = [build_gap(target) for target in GAP_TARGETS]
    return {
        "schema": "marketplace.catalog_expansion_gap_register.v0.1",
        "generated_at": utc_now(),
        "canonicalization": CANONICALIZATION,
        "hash_algorithm": HASH_ALGORITHM,
        "source": "TCGdex REST API",
        "source_docs_url": TCGDEX_DOCS_URL,
        "gap_count": len(gaps),
        "total_source_gap_rows": sum(gap["source_gap_count"] for gap in gaps),
        "gaps": gaps,
        "not_claiming": [
            "complete catalog expansion gap inventory",
            "card-row model",
            "complete set checklist",
            "approved image rights",
            "seller possession",
            "authenticity",
            "condition truth",
            "price truth",
        ],
    }


def write_json(path: Path, value: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2, sort_keys=True) + "\n", encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser(description="Build the catalog source-gap register.")
    parser.add_argument("--check", action="store_true", help="build without writing")
    args = parser.parse_args()
    register = build()
    if not args.check:
        write_json(OUT_PATH, register)
    print(
        json.dumps(
            {
                "gap_count": register["gap_count"],
                "total_source_gap_rows": register["total_source_gap_rows"],
                "wrote": [] if args.check else [OUT_PATH.relative_to(ROOT).as_posix()],
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
