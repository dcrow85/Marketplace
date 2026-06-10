#!/usr/bin/env python3
"""Build a provenance-first data foundry for the No Rarity training lab.

The foundry deliberately separates:
- owned/local assets that can become training candidates after human confirmation;
- external reference witnesses that are useful for agents but not automatically
  training-allowed;
- search/API discovery records that point agents at more data without scraping it.

This mirrors the protocol wall: contact can be useful before it becomes spendable.
"""

from __future__ import annotations

import argparse
import datetime as dt
import hashlib
import html
import json
import os
import re
import shutil
import subprocess
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
CATALOG_PATH = ROOT / "data" / "no-rarity-base-set.json"
FIXTURE_PATH = ROOT / "test-fixtures" / "no-rarity-binder-page-9-holos.png"
RECOGNITION_CROP_DIR = ROOT / "runs" / "recognition_api_compare_latest" / "crops"
DATASET_ROOT = ROOT / "datasets" / "no-rarity-lab"
LATEST_RUN = ROOT / "runs" / "no_rarity_data_foundry_latest"

USER_AGENT = "Marketplace-NoRarity-Foundry/0.1 (+local research; contact evidence)"
MARKETPLACE_IMAGE_HOST_HINTS = {
    "yahoo_japan_search": [
        "auc-pctr.c.yimg.jp/i/",
        "images.auctions.yahoo.co.jp/image/",
    ],
    "mercari_search": [
        "static.mercdn.net",
        "mercari-shops-static.com",
        "assets.mercari-shops-static.com",
    ],
    "ebay_web_search": [
        "i.ebayimg.com/images/",
    ],
}


def utc_now() -> str:
    return dt.datetime.now(dt.UTC).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def read_json(path: Path) -> Any:
    return json.loads(path.read_text())


def write_json(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n")


def append_jsonl(path: Path, rows: list[dict[str, Any]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w") as f:
        for row in rows:
            f.write(json.dumps(row, ensure_ascii=False, sort_keys=True) + "\n")


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def safe_slug(value: str) -> str:
    normalized = "".join(ch.lower() if ch.isalnum() else "-" for ch in value)
    while "--" in normalized:
        normalized = normalized.replace("--", "-")
    return normalized.strip("-")[:72] or "asset"


def sips_dimensions(path: Path) -> dict[str, int | None]:
    try:
        out = subprocess.run(
            ["sips", "-g", "pixelWidth", "-g", "pixelHeight", str(path)],
            check=True,
            capture_output=True,
            text=True,
        ).stdout
    except (subprocess.CalledProcessError, FileNotFoundError):
        return {"width": None, "height": None}
    width = None
    height = None
    for line in out.splitlines():
        line = line.strip()
        if line.startswith("pixelWidth:"):
            width = int(line.split(":", 1)[1].strip())
        if line.startswith("pixelHeight:"):
            height = int(line.split(":", 1)[1].strip())
    return {"width": width, "height": height}


def copy_asset(
    src: Path,
    dest_dir: Path,
    label: str,
    rights_status: str,
    allowed_use: list[str],
    source: str,
    notes: list[str] | None = None,
    metadata: dict[str, Any] | None = None,
) -> dict[str, Any]:
    dest_dir.mkdir(parents=True, exist_ok=True)
    suffix = src.suffix.lower() or ".bin"
    digest = sha256_file(src)
    dest = dest_dir / f"{safe_slug(label)}_{digest[:16]}{suffix}"
    if not dest.exists():
        shutil.copy2(src, dest)
    dims = sips_dimensions(dest) if suffix in {".png", ".jpg", ".jpeg", ".webp"} else {"width": None, "height": None}
    return {
        "asset_id": f"asset:{digest[:24]}",
        "sha256": digest,
        "path": str(dest),
        "source": source,
        "source_path": str(src),
        "rights_status": rights_status,
        "allowed_use": allowed_use,
        "retrieved_at": utc_now(),
        "width": dims.get("width"),
        "height": dims.get("height"),
        "notes": notes or [],
        "metadata": metadata or {},
    }


def download_asset(
    url: str,
    dest_dir: Path,
    label: str,
    rights_status: str,
    allowed_use: list[str],
    source: str,
    source_page_url: str | None,
    timeout: int,
) -> dict[str, Any]:
    dest_dir.mkdir(parents=True, exist_ok=True)
    parsed = urllib.parse.urlparse(url)
    suffix = Path(parsed.path).suffix.lower()
    if suffix not in {".jpg", ".jpeg", ".png", ".webp", ".gif"}:
        suffix = ".img"
    tmp = dest_dir / f"{safe_slug(label)}.download{suffix}"
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    started = time.time()
    with urllib.request.urlopen(req, timeout=timeout) as response:
        content_type = response.headers.get("content-type", "")
        body = response.read()
    tmp.write_bytes(body)
    digest = sha256_file(tmp)
    dest = dest_dir / f"{safe_slug(label)}_{digest[:16]}{suffix}"
    if dest.exists():
        tmp.unlink()
    else:
        tmp.rename(dest)
    dims = sips_dimensions(dest)
    return {
        "asset_id": f"asset:{digest[:24]}",
        "sha256": digest,
        "path": str(dest),
        "source": source,
        "source_url": url,
        "source_page_url": source_page_url,
        "rights_status": rights_status,
        "allowed_use": allowed_use,
        "retrieved_at": utc_now(),
        "download_elapsed_s": round(time.time() - started, 3),
        "content_type": content_type,
        "width": dims.get("width"),
        "height": dims.get("height"),
        "notes": [
            "External reference witness only unless later rights review promotes it.",
            "Do not use as training data by default.",
        ],
    }


def fetch_html(url: str, timeout: int, referer: str | None = None) -> str:
    headers = {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Marketplace-NoRarity-Foundry/0.1",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9,ja;q=0.8",
    }
    if referer:
        headers["Referer"] = referer
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req, timeout=timeout) as response:
        raw = response.read()
    return raw.decode("utf-8", "replace")


def external_image_urls_from_html(page_html: str, provider: str) -> list[str]:
    text = html.unescape(page_html).replace("\\u002F", "/")
    raw_urls = re.findall(r"https?:\\?/\\?/[^\"'<> )]+", text)
    hints = MARKETPLACE_IMAGE_HOST_HINTS.get(provider, [])
    seen: set[str] = set()
    urls: list[str] = []
    for raw in raw_urls:
        url = raw.replace("\\/", "/")
        if not any(hint in url for hint in hints):
            continue
        if any(block in url for block in ["/logo/", "/banner", "excludePostage", "na_170x170"]):
            continue
        if url in seen:
            continue
        seen.add(url)
        urls.append(url)
    return urls


def crop_lower_right(src: Path, out_dir: Path, label: str) -> dict[str, Any] | None:
    dims = sips_dimensions(src)
    width = dims.get("width")
    height = dims.get("height")
    if not width or not height:
        return None
    crop_w = max(80, int(width * 0.32))
    crop_h = max(80, int(height * 0.32))
    offset_y = max(0, height - crop_h)
    offset_x = max(0, width - crop_w)
    out_dir.mkdir(parents=True, exist_ok=True)
    out = out_dir / f"{safe_slug(label)}_lower-right.png"
    subprocess.run(
        [
            "sips",
            "-c",
            str(crop_h),
            str(crop_w),
            "--cropOffset",
            str(offset_y),
            str(offset_x),
            str(src),
            "--out",
            str(out),
        ],
        check=True,
        capture_output=True,
        text=True,
    )
    digest = sha256_file(out)
    final = out_dir / f"{safe_slug(label)}_lower-right_{digest[:16]}.png"
    if final.exists():
        out.unlink()
    else:
        out.rename(final)
    return {
        "asset_id": f"asset:{digest[:24]}",
        "sha256": digest,
        "path": str(final),
        "source": "derived_local_crop",
        "source_path": str(src),
        "rights_status": "derived_from_user_supplied_asset",
        "allowed_use": ["training_candidate_after_user_confirmation", "eval", "wall_drill"],
        "retrieved_at": utc_now(),
        "width": crop_w,
        "height": crop_h,
        "notes": [
            "Automatic lower-right crop. Human should confirm whether the rarity-symbol region is actually visible.",
        ],
        "metadata": {
            "crop_role": "lower_right_rarity_region_probe",
            "offset_x": offset_x,
            "offset_y": offset_y,
        },
    }


def booster_cards(catalog: dict[str, Any]) -> list[dict[str, Any]]:
    return [
        card
        for card in catalog["cards"]
        if card.get("product_scope", {}).get("strict_booster_member")
    ]


def catalog_row(card: dict[str, Any]) -> dict[str, Any]:
    scope = card.get("product_scope", {})
    profile = card.get("pokemon_profile", {})
    ref = card.get("no_rarity_reference", {})
    return {
        "pmcg_id": card.get("tcgdex_id"),
        "local_id": card.get("local_id"),
        "booster_order": scope.get("japanese_booster_order"),
        "booster_section": scope.get("japanese_booster_section"),
        "name_ja": scope.get("japanese_name_from_research") or card.get("name_source_raw"),
        "romaji": scope.get("romaji_from_research"),
        "name_en": card.get("name_en"),
        "category": card.get("category"),
        "rarity": card.get("rarity_source"),
        "holo_source": card.get("holo_source"),
        "types": profile.get("types", []),
        "stage": profile.get("stage"),
        "dex_id": profile.get("dex_id", []),
        "illustrator": card.get("illustrator", {}).get("name"),
        "no_rarity_target": card.get("no_rarity_target"),
        "evidence_focus": card.get("evidence_focus"),
        "variant_traps": card.get("variant_traps", []),
        "reference_source": ref.get("source"),
        "reference_page_url": ref.get("source_page_url"),
        "reference_image_small": ref.get("image_small"),
        "reference_image_large": ref.get("image_large"),
        "not_claiming": card.get("not_claiming", []),
    }


def marketplace_queries(card: dict[str, Any]) -> list[dict[str, Any]]:
    row = catalog_row(card)
    name_en = row["name_en"]
    local_id = row["local_id"]
    name_ja = row["name_ja"]
    terms = [
        f'"{name_en}" "No Rarity" Japanese Pokemon',
        f'"{name_en}" "No Rarity" "{local_id}"',
        f'"{name_ja}" "マークなし" ポケモンカード',
    ]
    records = []
    for query in terms:
        encoded = urllib.parse.quote_plus(query)
        records.extend(
            [
                {
                    "provider": "ebay_web_search",
                    "pmcg_id": row["pmcg_id"],
                    "query": query,
                    "url": f"https://www.ebay.com/sch/i.html?_nkw={encoded}",
                    "rights_status": "discovery_link_only",
                    "allowed_use": ["discovery", "market_contact", "manual_review"],
                    "notes": [
                        "Use official eBay Browse API with OAuth for structured collection.",
                        "Do not scrape listing images into training data by default.",
                    ],
                },
                {
                    "provider": "yahoo_japan_search",
                    "pmcg_id": row["pmcg_id"],
                    "query": query,
                    "url": f"https://auctions.yahoo.co.jp/search/search?p={encoded}",
                    "rights_status": "discovery_link_only",
                    "allowed_use": ["discovery", "market_contact", "manual_review"],
                    "notes": ["Manual or API-based review only; do not assume training rights."],
                },
                {
                    "provider": "mercari_search",
                    "pmcg_id": row["pmcg_id"],
                    "query": query,
                    "url": f"https://jp.mercari.com/search?keyword={encoded}",
                    "rights_status": "discovery_link_only",
                    "allowed_use": ["discovery", "market_contact", "manual_review"],
                    "notes": ["Manual or API-based review only; do not assume training rights."],
                },
            ]
        )
    return records


def source_candidates(card: dict[str, Any]) -> list[dict[str, Any]]:
    row = catalog_row(card)
    candidates: list[dict[str, Any]] = []
    ref = card.get("no_rarity_reference", {})
    if ref.get("source_page_url"):
        candidates.append(
            {
                "provider": ref.get("source") or "external_reference",
                "pmcg_id": row["pmcg_id"],
                "name_en": row["name_en"],
                "name_ja": row["name_ja"],
                "url": ref.get("source_page_url"),
                "image_small": ref.get("image_small"),
                "image_large": ref.get("image_large"),
                "rights_status": "external_reference_witness",
                "allowed_use": ["reference_witness", "manual_review"],
                "not_allowed_by_default": ["training"],
                "notes": [
                    "Source-labeled No Rarity reference. Useful for agents, not seller proof.",
                    "Rights review required before training use.",
                ],
            }
        )
    if card.get("tcgdex", {}).get("url"):
        candidates.append(
            {
                "provider": "TCGdex",
                "pmcg_id": row["pmcg_id"],
                "url": card["tcgdex"]["url"],
                "rights_status": "api_metadata",
                "allowed_use": ["catalog_metadata", "manual_review"],
                "notes": ["Metadata contact; image rights must be reviewed separately."],
            }
        )
    if card.get("english_reference", {}).get("source_url"):
        candidates.append(
            {
                "provider": card["english_reference"].get("source"),
                "pmcg_id": row["pmcg_id"],
                "url": card["english_reference"]["source_url"],
                "rights_status": "crosswalk_metadata",
                "allowed_use": ["catalog_crosswalk", "manual_review"],
                "notes": [
                    "English Base crosswalk only. Do not use as Japanese No Rarity reference image.",
                ],
            }
        )
    candidates.extend(marketplace_queries(card))
    return candidates


def training_seed_rows(cards: list[dict[str, Any]]) -> list[dict[str, Any]]:
    rows = []
    for card in cards:
        row = catalog_row(card)
        prompt = (
            f"Collector says: I think I have {row['name_en']} / {row['name_ja']} "
            f"({row['romaji']}) No Rarity. Add it to my collection."
        )
        completion = {
            "pmcg_id": row["pmcg_id"],
            "name_ja": row["name_ja"],
            "romaji": row["romaji"],
            "name_en": row["name_en"],
            "identity_status": "candidate_from_user_claim",
            "no_rarity_status": "not_verified",
            "condition_status": "unknown",
            "allowed_claims": ["candidate_catalog_identity"],
            "not_claiming": ["seller_possession", "authenticity", "condition", "no_rarity_verified"],
            "next_best_evidence": "full_front_plus_sharp_lower_right_crop",
            "human_line": (
                f"I can mark {row['name_ja']} / {row['romaji']} / {row['name_en']} "
                f"as a candidate. I still need the lower-right corner before treating it as a No Rarity claim."
            ),
        }
        rows.append(
            {
                "example_id": f"text-claim-{row['pmcg_id']}",
                "task": "collection_import_from_text_claim",
                "rights_status": "synthetic_from_catalog",
                "allowed_use": ["training", "eval"],
                "prompt": prompt,
                "completion": completion,
            }
        )

        if card.get("variant_traps"):
            rows.append(
                {
                    "example_id": f"trap-{row['pmcg_id']}",
                    "task": "quick_starter_text_layout_trap",
                    "rights_status": "synthetic_from_catalog",
                    "allowed_use": ["training", "eval"],
                    "prompt": (
                        f"Collector uploads a no-symbol {row['name_en']} / {row['name_ja']} "
                        "trainer and asks if it is confirmed No Rarity."
                    ),
                    "completion": {
                        "pmcg_id": row["pmcg_id"],
                        "identity_status": "candidate",
                        "no_rarity_status": "not_verified_trap_case",
                        "condition_status": "unknown",
                        "allowed_claims": ["candidate_catalog_identity", "quick_starter_trap_risk"],
                        "not_claiming": [
                            "expansion_pack_origin",
                            "quick_starter_origin",
                            "authenticity",
                            "condition",
                        ],
                        "next_best_evidence": "readable_japanese_text_layout_plus_lower_right_crop",
                        "human_line": (
                            "This is one of the trainer traps. The missing mark is not enough; "
                            "I need the Japanese text layout and corner together."
                        ),
                    },
                }
            )
    return rows


def collect_ebay_browse(cards: list[dict[str, Any]], per_card: int) -> list[dict[str, Any]]:
    token = os.getenv("EBAY_OAUTH_TOKEN")
    if not token:
        return [
            {
                "provider": "ebay_browse_api",
                "status": "skipped_missing_credentials",
                "missing_env": "EBAY_OAUTH_TOKEN",
                "notes": [
                    "Set EBAY_OAUTH_TOKEN to collect structured item summaries.",
                    "Listing images remain discovery/contact evidence unless rights are separately obtained.",
                ],
            }
        ]
    rows = []
    endpoint = "https://api.ebay.com/buy/browse/v1/item_summary/search"
    for card in cards:
        row = catalog_row(card)
        q = f"{row['name_en']} No Rarity Japanese Pokemon"
        params = urllib.parse.urlencode({"q": q, "limit": str(per_card)})
        req = urllib.request.Request(
            f"{endpoint}?{params}",
            headers={
                "Authorization": f"Bearer {token}",
                "User-Agent": USER_AGENT,
                "X-EBAY-C-MARKETPLACE-ID": "EBAY_US",
            },
        )
        try:
            with urllib.request.urlopen(req, timeout=30) as response:
                payload = json.loads(response.read())
        except urllib.error.HTTPError as exc:
            rows.append(
                {
                    "provider": "ebay_browse_api",
                    "pmcg_id": row["pmcg_id"],
                    "status": "http_error",
                    "code": exc.code,
                    "query": q,
                }
            )
            continue
        for item in payload.get("itemSummaries", []):
            rows.append(
                {
                    "provider": "ebay_browse_api",
                    "pmcg_id": row["pmcg_id"],
                    "query": q,
                    "status": "item_summary",
                    "title": item.get("title"),
                    "item_id": item.get("itemId"),
                    "item_web_url": item.get("itemWebUrl"),
                    "image": item.get("image"),
                    "thumbnail_images": item.get("thumbnailImages"),
                    "additional_images": item.get("additionalImages"),
                    "price": item.get("price"),
                    "seller": item.get("seller"),
                    "rights_status": "marketplace_contact_witness",
                    "allowed_use": ["market_discovery", "manual_review", "eval_if_terms_allow"],
                    "not_allowed_by_default": ["training"],
                }
            )
        time.sleep(0.2)
    return rows


def scrape_marketplace_review_images(
    cards: list[dict[str, Any]],
    providers: list[str],
    card_limit: int,
    images_per_card: int,
    timeout: int,
) -> tuple[list[dict[str, Any]], list[dict[str, Any]], list[dict[str, Any]]]:
    """Collect marketplace thumbnails into a human-review witness queue.

    These records are intentionally not training-approved. They are contact
    evidence for human review and later explicit promotion.
    """
    providers = [provider.strip() for provider in providers if provider.strip()]
    scrape_records: list[dict[str, Any]] = []
    asset_rows: list[dict[str, Any]] = []
    errors: list[dict[str, Any]] = []
    limited_cards = cards[:card_limit] if card_limit > 0 else cards
    asset_root = DATASET_ROOT / "assets" / "marketplace_review_witness"

    for card in limited_cards:
        row = catalog_row(card)
        all_queries = marketplace_queries(card)
        for provider in providers:
            candidates = [candidate for candidate in all_queries if candidate.get("provider") == provider]
            if provider == "yahoo_japan_search":
                # Japanese terms produce the most relevant auction pages; English
                # Yahoo queries often 404.
                candidates = [candidate for candidate in candidates if "マークなし" in candidate.get("query", "")]
            elif provider == "mercari_search":
                candidates = [candidate for candidate in candidates if "マークなし" in candidate.get("query", "")]
            elif provider == "ebay_web_search":
                # eBay often blocks unauthenticated HTML fetches. Official Browse
                # API collection is handled separately by collect_ebay_browse().
                candidates = candidates[:1]

            if not candidates:
                continue

            search = candidates[0]
            search_url = search["url"]
            search_record = {
                "provider": provider,
                "pmcg_id": row["pmcg_id"],
                "name_en": row["name_en"],
                "name_ja": row["name_ja"],
                "query": search.get("query"),
                "search_url": search_url,
                "rights_status": "marketplace_review_witness",
                "allowed_use": ["human_review", "market_contact", "eval_if_terms_allow"],
                "not_allowed_by_default": ["training"],
                "retrieved_at": utc_now(),
            }
            try:
                page_html = fetch_html(search_url, timeout)
                image_urls = external_image_urls_from_html(page_html, provider)
                search_record["candidate_image_count"] = len(image_urls)
                scrape_records.append(search_record)
            except Exception as exc:
                search_record["status"] = "search_fetch_failed"
                search_record["error"] = type(exc).__name__
                search_record["message"] = str(exc)
                scrape_records.append(search_record)
                errors.append(search_record)
                time.sleep(0.4)
                continue

            for index, image_url in enumerate(image_urls[:images_per_card], start=1):
                try:
                    asset_rows.append(
                        download_asset(
                            image_url,
                            asset_root / provider,
                            f"{provider}-{row['pmcg_id']}-{index}",
                            "marketplace_review_witness",
                            ["human_review", "market_contact", "eval_if_terms_allow"],
                            provider,
                            search_url,
                            timeout,
                        )
                    )
                    asset_rows[-1]["metadata"] = {
                        "pmcg_id": row["pmcg_id"],
                        "name_en": row["name_en"],
                        "name_ja": row["name_ja"],
                        "marketplace_query": search.get("query"),
                        "review_status": "unreviewed",
                    }
                    asset_rows[-1]["not_allowed_by_default"] = ["training"]
                except Exception as exc:
                    errors.append(
                        {
                            "provider": provider,
                            "pmcg_id": row["pmcg_id"],
                            "search_url": search_url,
                            "image_url": image_url,
                            "error": type(exc).__name__,
                            "message": str(exc),
                            "retrieved_at": utc_now(),
                        }
                    )
                time.sleep(0.25)
            time.sleep(0.6)

    return scrape_records, asset_rows, errors


def write_readme(dataset_root: Path, counts: dict[str, Any]) -> None:
    readme = f"""# No Rarity Lab Dataset

Generated: {utc_now()}

This dataset is a provenance-first foundry for a narrow No Rarity agent. It is
not a blanket training dump. Assets are labeled by rights posture and intended
use.

## Counts

```json
{json.dumps(counts, ensure_ascii=False, indent=2)}
```

## Rights Wall

- `training`: synthetic or otherwise clean enough for immediate model work.
- `training_candidate_after_user_confirmation`: local/user-supplied assets that
  need explicit human confirmation before being treated as model-training data.
- `reference_witness`: external source-labeled images that help agents compare
  and reason, but are not training data by default.
- `discovery_link_only`: URLs and query records that point agents toward market
  contact evidence without scraping or copying.
- `marketplace_contact_witness`: structured marketplace API records. Useful for
  comps and discovery; not training data by default.
- `marketplace_review_witness`: scraped marketplace thumbnails/assets placed in
  a human review queue; not training data unless explicitly promoted later.

## Protocol Boundary

The lab trains a model to say what it can know:
catalog candidate, visible lower-right corner status, trap risk, and the next
evidence request. It does not train the model to authenticate, grade condition,
or prove seller possession from weak photos.
"""
    (dataset_root / "README.md").write_text(readme)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--download-reference-images", action="store_true")
    parser.add_argument("--reference-limit", type=int, default=96)
    parser.add_argument("--ebay-per-card", type=int, default=3)
    parser.add_argument("--scrape-marketplace-images", action="store_true")
    parser.add_argument("--marketplace-providers", default="yahoo_japan_search")
    parser.add_argument("--marketplace-card-limit", type=int, default=12)
    parser.add_argument("--marketplace-images-per-card", type=int, default=3)
    parser.add_argument("--timeout", type=int, default=45)
    args = parser.parse_args()

    catalog = read_json(CATALOG_PATH)
    cards = booster_cards(catalog)

    if len(cards) != 96:
        print(f"warning: expected 96 strict booster cards, found {len(cards)}", file=sys.stderr)

    dataset_root = DATASET_ROOT
    manifest_dir = dataset_root / "manifests"
    assets_dir = dataset_root / "assets"
    run_dir = LATEST_RUN
    run_dir.mkdir(parents=True, exist_ok=True)
    dataset_root.mkdir(parents=True, exist_ok=True)

    catalog_rows = [catalog_row(card) for card in cards]
    source_rows: list[dict[str, Any]] = []
    for card in cards:
        source_rows.extend(source_candidates(card))

    asset_rows: list[dict[str, Any]] = []
    if FIXTURE_PATH.exists():
        asset_rows.append(
            copy_asset(
                FIXTURE_PATH,
                assets_dir / "local_user_supplied" / "binder_pages",
                "no-rarity-binder-page-9-holos",
                "user_supplied_current_workspace",
                ["training_candidate_after_user_confirmation", "eval", "wall_drill"],
                "local_fixture",
                notes=[
                    "User supplied this binder-page image in the working thread.",
                    "Use for local eval immediately; confirm before treating as broadly reusable training data.",
                ],
            )
        )
    if RECOGNITION_CROP_DIR.exists():
        for crop in sorted(RECOGNITION_CROP_DIR.glob("PMCG1-*.png")):
            pmcg_id = crop.stem
            asset_rows.append(
                copy_asset(
                    crop,
                    assets_dir / "local_user_supplied" / "card_crops",
                    pmcg_id,
                    "derived_from_user_supplied_asset",
                    ["training_candidate_after_user_confirmation", "eval", "wall_drill"],
                    "recognition_api_compare_crop",
                    metadata={"pmcg_id": pmcg_id, "view_type": "front_crop"},
                )
            )
            lower_right = crop_lower_right(crop, assets_dir / "local_user_supplied" / "lower_right_crops", pmcg_id)
            if lower_right:
                asset_rows.append(lower_right)

    download_errors = []
    if args.download_reference_images:
        count = 0
        for card in cards:
            if count >= args.reference_limit:
                break
            row = catalog_row(card)
            url = row.get("reference_image_small")
            if not url:
                continue
            try:
                asset_rows.append(
                    download_asset(
                        url,
                        assets_dir / "external_reference_witness" / "pricecharting_small",
                        f"{row['pmcg_id']}-{row['name_en']}-no-rarity-reference",
                        "external_reference_witness",
                        ["reference_witness", "manual_review", "eval_only_if_terms_allow"],
                        "PriceCharting",
                        row.get("reference_page_url"),
                        args.timeout,
                    )
                )
                count += 1
                time.sleep(0.12)
            except Exception as exc:  # keep collection resilient
                download_errors.append(
                    {
                        "pmcg_id": row["pmcg_id"],
                        "url": url,
                        "error": type(exc).__name__,
                        "message": str(exc),
                    }
                )

    ebay_rows = collect_ebay_browse(cards, args.ebay_per_card)
    scrape_records: list[dict[str, Any]] = []
    scrape_errors: list[dict[str, Any]] = []
    if args.scrape_marketplace_images:
        providers = args.marketplace_providers.split(",")
        scrape_records, scraped_assets, scrape_errors = scrape_marketplace_review_images(
            cards,
            providers,
            args.marketplace_card_limit,
            args.marketplace_images_per_card,
            args.timeout,
        )
        asset_rows.extend(scraped_assets)
    seed_rows = training_seed_rows(cards)

    append_jsonl(manifest_dir / "catalog_rows.jsonl", catalog_rows)
    append_jsonl(manifest_dir / "source_candidates.jsonl", source_rows)
    append_jsonl(manifest_dir / "assets.jsonl", asset_rows)
    append_jsonl(manifest_dir / "training_seed.jsonl", seed_rows)
    append_jsonl(manifest_dir / "ebay_browse_records.jsonl", ebay_rows)
    append_jsonl(manifest_dir / "marketplace_scrape_records.jsonl", scrape_records)
    if download_errors:
        append_jsonl(manifest_dir / "download_errors.jsonl", download_errors)
    if scrape_errors:
        append_jsonl(manifest_dir / "marketplace_scrape_errors.jsonl", scrape_errors)

    counts = {
        "strict_booster_rows": len(catalog_rows),
        "catalog_total_rows_in_source": len(catalog.get("cards", [])),
        "source_candidate_records": len(source_rows),
        "asset_records": len(asset_rows),
        "training_seed_examples": len(seed_rows),
        "ebay_records": len(ebay_rows),
        "marketplace_scrape_records": len(scrape_records),
        "marketplace_scrape_errors": len(scrape_errors),
        "download_errors": len(download_errors),
        "reference_download_requested": bool(args.download_reference_images),
        "marketplace_scrape_requested": bool(args.scrape_marketplace_images),
    }
    write_json(manifest_dir / "summary.json", counts)
    write_json(run_dir / "summary.json", counts)
    write_readme(dataset_root, counts)

    report = [
        "# No Rarity Data Foundry Run",
        "",
        f"Generated: {utc_now()}",
        "",
        "## Counts",
        "",
        "| Item | Count |",
        "|---|---:|",
    ]
    for key, value in counts.items():
        report.append(f"| {key} | {value} |")
    report.extend(
        [
            "",
            "## Output",
            "",
            f"- Dataset root: `{dataset_root}`",
            f"- Catalog rows: `{manifest_dir / 'catalog_rows.jsonl'}`",
            f"- Source candidates: `{manifest_dir / 'source_candidates.jsonl'}`",
            f"- Asset manifest: `{manifest_dir / 'assets.jsonl'}`",
            f"- Training seed: `{manifest_dir / 'training_seed.jsonl'}`",
            f"- eBay records: `{manifest_dir / 'ebay_browse_records.jsonl'}`",
            f"- Marketplace scrape records: `{manifest_dir / 'marketplace_scrape_records.jsonl'}`",
            "",
            "## Wall",
            "",
            "External marketplace and reference images are not promoted to training data by default.",
            "Owned/local assets are marked as training candidates pending explicit human confirmation.",
        ]
    )
    if download_errors:
        report.extend(["", "## Download Errors", ""])
        for err in download_errors[:20]:
            report.append(f"- {err['pmcg_id']}: {err['error']} {err['message']}")
    if scrape_errors:
        report.extend(["", "## Marketplace Scrape Errors", ""])
        for err in scrape_errors[:20]:
            report.append(
                f"- {err.get('provider')} {err.get('pmcg_id')}: "
                f"{err.get('error')} {err.get('message')}"
            )
    (run_dir / "REPORT.md").write_text("\n".join(report) + "\n")
    print(json.dumps(counts, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
