#!/usr/bin/env python3
"""Mirror official Azuki gallery images into Cairn's public asset tree.

The official URL remains provenance. Runtime catalogue rendering uses only the
byte-verified local copy recorded by the newest dated manifest.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import UTC, date, datetime
from pathlib import Path
from typing import Any
from urllib.parse import urlparse
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
AZUKI = ROOT / "data" / "azuki-tcg"
OFFICIAL = AZUKI / "releases" / "azuki_tcg_official_gallery.json"
SNAPSHOT_DIR = AZUKI / "source-snapshots"
MANIFEST_GLOB = "azuki_official_gallery_image_manifest_*.json"
WEB_PUBLIC_DIR = ROOT / "web" / "public"
ASSET_DIR = WEB_PUBLIC_DIR / "assets" / "azuki" / "official"
PUBLIC_PREFIX = "assets/azuki/official"
USER_AGENT = "CairnCatalogMirror/0.1 (+https://cairn.cards)"


def read_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def sha256_file(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def newest_manifest() -> Path:
    manifests = sorted(SNAPSHOT_DIR.glob(MANIFEST_GLOB))
    if not manifests:
        raise FileNotFoundError(
            f"no official gallery image manifest matches {MANIFEST_GLOB}; run with --refresh"
        )
    return manifests[-1]


def safe_stem(source_entry_id: str) -> str:
    stem = re.sub(r"[^A-Za-z0-9._-]+", "-", source_entry_id).strip("-.")
    if not stem:
        raise ValueError(f"unsafe empty asset stem for {source_entry_id!r}")
    return stem


def validate_jpeg(data: bytes, source_url: str) -> None:
    if len(data) < 4 or not data.startswith(b"\xff\xd8\xff") or not data.endswith(b"\xff\xd9"):
        raise ValueError(f"official gallery response is not a complete JPEG: {source_url}")


def fetch_image(card: dict[str, Any], timeout: float) -> tuple[dict[str, Any], bytes]:
    source_url = card.get("image_url") or ""
    parsed = urlparse(source_url)
    if parsed.scheme != "https" or not parsed.netloc:
        raise ValueError(f"official image URL must be HTTPS: {source_url!r}")

    request = Request(source_url, headers={"User-Agent": USER_AGENT, "Accept": "image/jpeg"})
    with urlopen(request, timeout=timeout) as response:
        data = response.read()
        content_type = response.headers.get_content_type()
        if content_type != "image/jpeg":
            raise ValueError(f"unexpected content type {content_type!r}: {source_url}")
        validate_jpeg(data, source_url)
        digest = sha256_bytes(data)
        filename = f"{safe_stem(card['source_entry_id'])}--{digest[:12]}.jpg"
        public_path = f"{PUBLIC_PREFIX}/{filename}"
        entry = {
            "uid": card["uid"],
            "source_entry_id": card["source_entry_id"],
            "source_url": source_url,
            "source_host": parsed.netloc,
            "public_path": public_path,
            "repo_path": f"web/public/{public_path}",
            "content_type": content_type,
            "bytes": len(data),
            "sha256": digest,
            "etag": (response.headers.get("ETag") or "").strip('"'),
            "last_modified": response.headers.get("Last-Modified") or "",
        }
    return entry, data


def refresh(*, snapshot_date: str, workers: int, timeout: float) -> Path:
    release = read_json(OFFICIAL)
    cards = [card for card in release.get("cards", []) if card.get("image_url")]
    urls = [card["image_url"] for card in cards]
    if len(urls) != len(set(urls)):
        raise ValueError("official gallery image URLs are not unique")

    ASSET_DIR.mkdir(parents=True, exist_ok=True)
    fetched: dict[str, tuple[dict[str, Any], bytes]] = {}
    with ThreadPoolExecutor(max_workers=workers) as pool:
        futures = {pool.submit(fetch_image, card, timeout): card for card in cards}
        for done, future in enumerate(as_completed(futures), start=1):
            card = futures[future]
            entry, data = future.result()
            fetched[card["uid"]] = (entry, data)
            if done % 25 == 0 or done == len(futures):
                print(f"fetched {done}/{len(futures)} official gallery images")

    entries: list[dict[str, Any]] = []
    expected_paths: set[Path] = set()
    for card in cards:
        entry, data = fetched[card["uid"]]
        path = ROOT / entry["repo_path"]
        path.parent.mkdir(parents=True, exist_ok=True)
        temporary = path.with_suffix(path.suffix + ".tmp")
        temporary.write_bytes(data)
        temporary.replace(path)
        expected_paths.add(path.resolve())
        entries.append(entry)

    for path in ASSET_DIR.glob("*"):
        if path.is_file() and path.resolve() not in expected_paths:
            path.unlink()

    manifest = {
        "schema": "azuki_tcg_official_gallery_image_manifest_v0.1",
        "snapshot_date": snapshot_date,
        "generated_at": datetime.now(UTC).isoformat(),
        "authority_label": "cairn_hosted_copy_of_official_gallery_image",
        "hosting_policy": (
            "The catalogue renders this byte-verified Cairn-hosted copy. The upstream "
            "official URL is retained only for source provenance and refreshes."
        ),
        "source_release": {
            "path": str(OFFICIAL.relative_to(ROOT)),
            "sha256": sha256_file(OFFICIAL),
            "retrieved": release.get("source", {}).get("retrieved") or "",
            "gallery_url": release.get("source", {}).get("gallery_url") or "",
        },
        "counts": {
            "official_rows_with_image": len(cards),
            "unique_source_urls": len(urls),
            "local_assets": len(entries),
            "bytes": sum(entry["bytes"] for entry in entries),
        },
        "not_claiming": [
            "image-rights approval beyond the source release's existing boundary",
            "seller possession",
            "physical-card authenticity",
            "condition truth",
            "market value",
        ],
        "images": entries,
    }
    SNAPSHOT_DIR.mkdir(parents=True, exist_ok=True)
    path = SNAPSHOT_DIR / f"azuki_official_gallery_image_manifest_{snapshot_date}.json"
    path.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    return path


def check(path: Path) -> dict[str, int]:
    release = read_json(OFFICIAL)
    manifest = read_json(path)
    cards = [card for card in release.get("cards", []) if card.get("image_url")]
    entries = manifest.get("images", [])
    release_by_url = {card["image_url"]: card for card in cards}
    manifest_by_url = {entry.get("source_url"): entry for entry in entries}
    if len(manifest_by_url) != len(entries):
        raise ValueError("official image manifest contains duplicate source URLs")
    if set(release_by_url) != set(manifest_by_url):
        missing = sorted(set(release_by_url) - set(manifest_by_url))
        stale = sorted(set(manifest_by_url) - set(release_by_url))
        raise ValueError(f"official image manifest coverage drifted; missing={missing}, stale={stale}")
    if manifest.get("source_release", {}).get("sha256") != sha256_file(OFFICIAL):
        raise ValueError("official image manifest points at a different gallery release hash")

    expected_files: set[Path] = set()
    total_bytes = 0
    asset_root = ASSET_DIR.resolve()
    for source_url, entry in manifest_by_url.items():
        card = release_by_url[source_url]
        if entry.get("uid") != card.get("uid") or entry.get("source_entry_id") != card.get("source_entry_id"):
            raise ValueError(f"official image identity drifted: {source_url}")
        public_path = entry.get("public_path") or ""
        if public_path.startswith(("http://", "https://", "/")):
            raise ValueError(f"manifest public path is not local: {public_path}")
        path = (WEB_PUBLIC_DIR / public_path).resolve()
        if not path.is_relative_to(asset_root):
            raise ValueError(f"manifest asset escapes the official image directory: {public_path}")
        if not path.is_file():
            raise FileNotFoundError(f"Cairn-hosted official image is missing: {path}")
        data = path.read_bytes()
        validate_jpeg(data, source_url)
        if len(data) != entry.get("bytes") or sha256_bytes(data) != entry.get("sha256"):
            raise ValueError(f"Cairn-hosted official image integrity drifted: {public_path}")
        expected_files.add(path)
        total_bytes += len(data)

    actual_files = {path.resolve() for path in ASSET_DIR.glob("*") if path.is_file()}
    if actual_files != expected_files:
        extra = sorted(str(path.relative_to(ROOT)) for path in actual_files - expected_files)
        raise ValueError(f"unmanifested official gallery assets found: {extra}")
    counts = manifest.get("counts", {})
    expected_counts = {
        "official_rows_with_image": len(cards),
        "unique_source_urls": len(release_by_url),
        "local_assets": len(entries),
        "bytes": total_bytes,
    }
    if counts != expected_counts:
        raise ValueError(f"official image manifest counts drifted: {counts} != {expected_counts}")
    return expected_counts


def main() -> int:
    parser = argparse.ArgumentParser(description="Mirror official Azuki catalogue images into Cairn assets.")
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--refresh", action="store_true", help="download exact official image bytes and write a dated manifest")
    mode.add_argument("--check", action="store_true", help="verify manifest coverage and every local image hash")
    parser.add_argument("--snapshot-date", default=date.today().isoformat())
    parser.add_argument("--workers", type=int, default=12)
    parser.add_argument("--timeout", type=float, default=45.0)
    parser.add_argument("--manifest", type=Path, help="specific manifest to check; defaults to newest dated manifest")
    args = parser.parse_args()

    if args.refresh:
        if args.workers < 1:
            parser.error("--workers must be at least 1")
        manifest_path = refresh(snapshot_date=args.snapshot_date, workers=args.workers, timeout=args.timeout)
    else:
        manifest_path = args.manifest.expanduser() if args.manifest else newest_manifest()

    counts = check(manifest_path)
    print(
        f"Azuki official image mirror OK: {counts['local_assets']} local assets · "
        f"{counts['bytes'] / (1024 * 1024):.1f} MiB · {manifest_path.relative_to(ROOT)}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
