#!/usr/bin/env python3
"""Build and validate the sourced Card Dossier pilot corpus.

The dossier layer is legible input for agents: atomic sourced claims, not
authentication, pricing, condition truth, or protocol spendability.
"""

from __future__ import annotations

import argparse
import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "data" / "japanese-pre-english"
SOURCE_DIR = DATA_DIR / "dossiers"
OUT_PATH = DATA_DIR / "dossiers.json"
MANIFEST_PATH = DATA_DIR / "dossiers-manifest.json"

SCHEMA = "marketplace.card_dossier_corpus.v0.1"
SOURCE_SCHEMA = "marketplace.card_dossier_source_set.v0.1"
CANONICALIZATION = "json_sorted_keys_no_whitespace_v0.1"
HASH_ALGORITHM = "sha256"
SOURCE_TIERS = {"A", "B", "C"}
COVERAGE_VALUES = {"A", "B", "C", "none"}
CLAIM_FIELDS = {
    "art.illustrator",
    "art.depiction",
    "art.style_note",
    "release.date",
    "release.vehicle",
    "release.distribution",
    "release.print_note",
    "history.significance",
    "history.lineage",
    "history.variant",
    "identification.special_instructions",
}
NOT_CLAIMING = [
    "seller possession",
    "authenticity",
    "condition truth",
    "price truth",
    "physical-card No Rarity truth",
    "spendability",
    "complete earliest-era dossier coverage",
]


def canonical_hash(value: Any) -> str:
    payload = json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode("utf-8")
    return hashlib.sha256(payload).hexdigest()


def load_release_row_ids() -> set[str]:
    row_ids: set[str] = set()
    for path in sorted((DATA_DIR / "releases").glob("*.json")):
        data = json.loads(path.read_text(encoding="utf-8"))
        for card in data.get("cards", []):
            row_id = card.get("row_id")
            if row_id:
                row_ids.add(str(row_id))
    return row_ids


def validate_source_ref(ref: str) -> None:
    if ref.startswith(("http://", "https://", "local-catalog:", "local-rollup:")):
        return
    path = ref.split("#", 1)[0]
    if not path:
        raise ValueError(f"empty source ref path in {ref!r}")
    if not (ROOT / path).exists():
        raise ValueError(f"source ref does not exist: {ref}")


def validate_dossier(dossier: dict[str, Any], row_ids: set[str]) -> None:
    uid = dossier.get("uid")
    if not isinstance(uid, str) or not uid:
        raise ValueError("dossier uid is required")
    if uid not in row_ids:
        raise ValueError(f"dossier uid is not a known release row_id: {uid}")

    card = dossier.get("card")
    if not isinstance(card, dict) or not card.get("name_en"):
        raise ValueError(f"{uid}: card context is required")

    special_instructions = dossier.get("special_identification_instructions")
    if not isinstance(special_instructions, list):
        raise ValueError(f"{uid}: special_identification_instructions must be a list")
    for index, instruction in enumerate(special_instructions):
        if not isinstance(instruction, dict):
            raise ValueError(f"{uid}: special_identification_instructions[{index}] must be an object")
        for key in ("id", "authority_label", "trigger", "summary", "steps", "not_claiming"):
            if key not in instruction:
                raise ValueError(f"{uid}: special_identification_instructions[{index}] missing {key}")
        if instruction["authority_label"] != "legible":
            raise ValueError(f"{uid}: special_identification_instructions[{index}] must be legible")
        if not isinstance(instruction["steps"], list) or not instruction["steps"]:
            raise ValueError(f"{uid}: special_identification_instructions[{index}].steps must be a non-empty list")
        if not isinstance(instruction["not_claiming"], list) or not instruction["not_claiming"]:
            raise ValueError(f"{uid}: special_identification_instructions[{index}].not_claiming must be a non-empty list")

    sources = dossier.get("sources")
    if not isinstance(sources, list) or not sources:
        raise ValueError(f"{uid}: at least one source is required")
    source_ids: set[str] = set()
    for source in sources:
        sid = source.get("id")
        if not isinstance(sid, str) or not sid:
            raise ValueError(f"{uid}: source id is required")
        if sid in source_ids:
            raise ValueError(f"{uid}: duplicate source id {sid}")
        source_ids.add(sid)
        if source.get("tier") not in SOURCE_TIERS:
            raise ValueError(f"{uid}: source {sid} has invalid tier {source.get('tier')!r}")
        validate_source_ref(str(source.get("ref", "")))

    claims = dossier.get("claims")
    if not isinstance(claims, list) or not claims:
        raise ValueError(f"{uid}: at least one claim is required")
    claim_ids: set[str] = set()
    for claim in claims:
        cid = claim.get("id")
        if not isinstance(cid, str) or not cid:
            raise ValueError(f"{uid}: claim id is required")
        if cid in claim_ids:
            raise ValueError(f"{uid}: duplicate claim id {cid}")
        claim_ids.add(cid)
        if claim.get("field") not in CLAIM_FIELDS:
            raise ValueError(f"{uid}/{cid}: invalid field {claim.get('field')!r}")
        text = claim.get("text")
        if not isinstance(text, str) or not text.strip():
            raise ValueError(f"{uid}/{cid}: text is required")
        if claim.get("tier") not in SOURCE_TIERS:
            raise ValueError(f"{uid}/{cid}: invalid tier {claim.get('tier')!r}")
        refs = claim.get("sources")
        if not isinstance(refs, list) or not refs:
            raise ValueError(f"{uid}/{cid}: claim must cite at least one source")
        missing = [ref for ref in refs if ref not in source_ids]
        if missing:
            raise ValueError(f"{uid}/{cid}: unknown source ids {missing}")

    coverage = dossier.get("coverage")
    if not isinstance(coverage, dict):
        raise ValueError(f"{uid}: coverage is required")
    for key in ("art", "release", "history"):
        if coverage.get(key) not in COVERAGE_VALUES:
            raise ValueError(f"{uid}: coverage.{key} has invalid value {coverage.get(key)!r}")


def load_sources() -> list[dict[str, Any]]:
    source_files = sorted(SOURCE_DIR.glob("*.json"))
    if not source_files:
        raise ValueError(f"no dossier source files found in {SOURCE_DIR}")
    source_sets: list[dict[str, Any]] = []
    for path in source_files:
        data = json.loads(path.read_text(encoding="utf-8"))
        if data.get("schema") != SOURCE_SCHEMA:
            raise ValueError(f"{path}: unexpected schema {data.get('schema')!r}")
        source_sets.append({"path": path.relative_to(ROOT).as_posix(), "data": data})
    return source_sets


def build() -> tuple[dict[str, Any], dict[str, Any]]:
    row_ids = load_release_row_ids()
    source_sets = load_sources()
    dossiers: list[dict[str, Any]] = []
    source_paths: list[str] = []
    seen: set[str] = set()
    for source_set in source_sets:
        source_paths.append(source_set["path"])
        for dossier in source_set["data"].get("dossiers", []):
            validate_dossier(dossier, row_ids)
            uid = dossier["uid"]
            if uid in seen:
                raise ValueError(f"duplicate dossier uid {uid}")
            seen.add(uid)
            dossiers.append(dossier)

    dossiers.sort(key=lambda item: item["uid"])
    generated_at = datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")
    claim_count = sum(len(d["claims"]) for d in dossiers)
    source_count = sum(len(d["sources"]) for d in dossiers)
    coverage = {
        "dossier_count": len(dossiers),
        "claim_count": claim_count,
        "source_count": source_count,
        "special_identification_instruction_dossiers": sum(
            1 for dossier in dossiers if dossier.get("special_identification_instructions")
        ),
        "coverage_by_dimension": {
            dim: {tier: sum(1 for d in dossiers if d["coverage"].get(dim) == tier) for tier in sorted(COVERAGE_VALUES)}
            for dim in ("art", "release", "history")
        },
        "uids": [d["uid"] for d in dossiers],
    }
    corpus = {
        "schema": SCHEMA,
        "generated_at": generated_at,
        "canonicalization": CANONICALIZATION,
        "hash_algorithm": HASH_ALGORITHM,
        "not_claiming": NOT_CLAIMING,
        "source_sets": source_paths,
        "coverage": coverage,
        "dossiers": dossiers,
    }
    hash_preimage = {key: value for key, value in corpus.items() if key != "generated_at"}
    corpus_hash = canonical_hash(hash_preimage)
    manifest = {
        "schema": "marketplace.card_dossier_manifest.v0.1",
        "generated_at": generated_at,
        "canonicalization": CANONICALIZATION,
        "hash_algorithm": HASH_ALGORITHM,
        "corpus": {
            "path": OUT_PATH.relative_to(ROOT).as_posix(),
            "schema": SCHEMA,
            "dossier_count": len(dossiers),
            "claim_count": claim_count,
            "source_count": source_count,
            "corpus_hash": corpus_hash,
            "hash_scope": "canonical corpus excluding generated_at",
        },
        "source_sets": source_paths,
        "not_claiming": NOT_CLAIMING,
    }
    return corpus, manifest


def write_json(path: Path, value: Any) -> None:
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2, sort_keys=True) + "\n", encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser(description="Build the Card Dossier corpus.")
    parser.add_argument("--check", action="store_true", help="validate and report without writing")
    args = parser.parse_args()
    corpus, manifest = build()
    existing_manifest_ok = None
    if args.check and MANIFEST_PATH.exists():
        existing = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
        existing_manifest_ok = existing.get("corpus", {}).get("corpus_hash") == manifest["corpus"]["corpus_hash"]
    if not args.check:
        write_json(OUT_PATH, corpus)
        write_json(MANIFEST_PATH, manifest)
    print(
        json.dumps(
            {
                "dossiers": manifest["corpus"]["dossier_count"],
                "claims": manifest["corpus"]["claim_count"],
                "sources": manifest["corpus"]["source_count"],
                "corpus_hash": manifest["corpus"]["corpus_hash"],
                "existing_manifest_ok": existing_manifest_ok,
                "wrote": [] if args.check else [manifest["corpus"]["path"], MANIFEST_PATH.relative_to(ROOT).as_posix()],
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
