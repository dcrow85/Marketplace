#!/usr/bin/env python3
"""Build and validate the catalog history dossier corpus.

This layer is for sourced historical depth and collector texture. It is legible
input for agents, not authentication, pricing truth, possession, or protocol
spendability.
"""

from __future__ import annotations

import argparse
import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "data" / "catalog-history"
SOURCE_DIR = DATA_DIR / "source-sets"
OUT_PATH = DATA_DIR / "dossiers.json"
MANIFEST_PATH = DATA_DIR / "manifest.json"
AUDIT_PATH = DATA_DIR / "audit.json"

SOURCE_SCHEMA = "marketplace.catalog_history_source_set.v0.1"
CORPUS_SCHEMA = "marketplace.catalog_history_corpus.v0.1"
MANIFEST_SCHEMA = "marketplace.catalog_history_manifest.v0.1"
AUDIT_SCHEMA = "marketplace.catalog_history_audit.v0.1"
CANONICALIZATION = "json_sorted_keys_no_whitespace_v0.1"
HASH_ALGORITHM = "sha256"

SOURCE_TIERS = {"A", "B", "C"}
AUTHORITY_LABELS = {"fact", "local_catalog_fact", "interpretive", "judged_texture"}
COVERAGE_VALUES = {"A", "B", "C", "none"}
DOSSIER_TYPES = {"release", "card"}
CLAIM_FIELDS = {
    "release.date",
    "release.vehicle",
    "release.distribution",
    "release.publisher",
    "release.product_count",
    "release.context",
    "release.boundary",
    "release.chase_structure",
    "artist.credit",
    "artist.impact",
    "artist.other_work",
    "card.identity",
    "card.rarity",
    "card.art",
    "card.play_or_collecting_context",
    "history.significance",
    "history.lineage",
    "history.variant",
    "identification.special_instructions",
}
NOT_CLAIMING = [
    "complete deep-history coverage",
    "seller possession",
    "authenticity",
    "condition truth",
    "price truth",
    "official copy counts unless explicitly sourced",
    "approved image display rights",
    "spendability",
]


def canonical_hash(value: Any) -> str:
    payload = json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode("utf-8")
    return hashlib.sha256(payload).hexdigest()


def load_catalog_ids() -> tuple[set[str], set[str]]:
    release_ids: set[str] = set()
    row_ids: set[str] = set()
    for path in sorted(ROOT.glob("data/**/releases/*.json")):
        data = json.loads(path.read_text(encoding="utf-8"))
        release = data.get("release", {})
        release_id = release.get("release_family_id")
        if release_id:
            release_ids.add(str(release_id))
        for card in data.get("cards", []):
            row_id = card.get("row_id")
            if row_id:
                row_ids.add(str(row_id))
    return release_ids, row_ids


def validate_source_ref(ref: str) -> None:
    if ref.startswith(("http://", "https://", "local-catalog:", "local-rollup:")):
        return
    path = ref.split("#", 1)[0]
    if not path:
        raise ValueError(f"empty source ref path in {ref!r}")
    if not (ROOT / path).exists():
        raise ValueError(f"source ref does not exist: {ref}")


def require_string(value: Any, label: str) -> str:
    if not isinstance(value, str) or not value.strip():
        raise ValueError(f"{label} is required")
    return value


def validate_source(source: dict[str, Any], dossier_uid: str, seen: set[str]) -> str:
    sid = require_string(source.get("id"), f"{dossier_uid}: source id")
    if sid in seen:
        raise ValueError(f"{dossier_uid}: duplicate source id {sid}")
    seen.add(sid)
    if source.get("tier") not in SOURCE_TIERS:
        raise ValueError(f"{dossier_uid}: source {sid} invalid tier {source.get('tier')!r}")
    require_string(source.get("title"), f"{dossier_uid}: source {sid} title")
    validate_source_ref(require_string(source.get("ref"), f"{dossier_uid}: source {sid} ref"))
    not_claiming = source.get("not_claiming")
    if not isinstance(not_claiming, list) or not not_claiming:
        raise ValueError(f"{dossier_uid}: source {sid} must carry not_claiming")
    return sid


def validate_claim(claim: dict[str, Any], dossier_uid: str, source_ids: set[str], claim_ids: set[str]) -> str:
    cid = require_string(claim.get("id"), f"{dossier_uid}: claim id")
    if cid in claim_ids:
        raise ValueError(f"{dossier_uid}: duplicate claim id {cid}")
    claim_ids.add(cid)
    if claim.get("field") not in CLAIM_FIELDS:
        raise ValueError(f"{dossier_uid}/{cid}: invalid field {claim.get('field')!r}")
    if claim.get("tier") not in SOURCE_TIERS:
        raise ValueError(f"{dossier_uid}/{cid}: invalid tier {claim.get('tier')!r}")
    if claim.get("authority_label") not in AUTHORITY_LABELS:
        raise ValueError(f"{dossier_uid}/{cid}: invalid authority_label {claim.get('authority_label')!r}")
    require_string(claim.get("text"), f"{dossier_uid}/{cid}: text")
    refs = claim.get("sources")
    if not isinstance(refs, list) or not refs:
        raise ValueError(f"{dossier_uid}/{cid}: sources must be a non-empty list")
    missing = [ref for ref in refs if ref not in source_ids]
    if missing:
        raise ValueError(f"{dossier_uid}/{cid}: unknown source ids {missing}")
    if claim["authority_label"] in {"interpretive", "judged_texture"}:
        basis = claim.get("basis_claims")
        if not isinstance(basis, list) or not basis:
            raise ValueError(f"{dossier_uid}/{cid}: interpretive claims require basis_claims")
    return cid


def validate_special_instructions(dossier: dict[str, Any]) -> None:
    uid = dossier["uid"]
    instructions = dossier.get("special_identification_instructions")
    if not isinstance(instructions, list):
        raise ValueError(f"{uid}: special_identification_instructions must be a list")
    for index, instruction in enumerate(instructions):
        if not isinstance(instruction, dict):
            raise ValueError(f"{uid}: special_identification_instructions[{index}] must be an object")
        for key in ("id", "authority_label", "trigger", "summary", "steps", "not_claiming"):
            if key not in instruction:
                raise ValueError(f"{uid}: special_identification_instructions[{index}] missing {key}")
        if instruction["authority_label"] != "legible":
            raise ValueError(f"{uid}: special_identification_instructions[{index}] must be legible")
        if not isinstance(instruction["steps"], list) or not instruction["steps"]:
            raise ValueError(f"{uid}: special_identification_instructions[{index}].steps must be non-empty")
        if not isinstance(instruction["not_claiming"], list) or not instruction["not_claiming"]:
            raise ValueError(f"{uid}: special_identification_instructions[{index}].not_claiming must be non-empty")


def validate_narrative(dossier: dict[str, Any], claim_ids: set[str]) -> None:
    uid = dossier["uid"]
    narrative = dossier.get("narrative")
    if not isinstance(narrative, dict):
        raise ValueError(f"{uid}: narrative is required")
    for key in ("human_title", "why_it_matters"):
        require_string(narrative.get(key), f"{uid}: narrative.{key}")
    authority = narrative.get("authority_label")
    if authority != "judged_texture":
        raise ValueError(f"{uid}: narrative.authority_label must be judged_texture")
    refs = narrative.get("basis_claims")
    if not isinstance(refs, list) or not refs:
        raise ValueError(f"{uid}: narrative.basis_claims must be non-empty")
    missing = [ref for ref in refs if ref not in claim_ids]
    if missing:
        raise ValueError(f"{uid}: narrative references unknown claims {missing}")
    not_claiming = narrative.get("not_claiming")
    if not isinstance(not_claiming, list) or not not_claiming:
        raise ValueError(f"{uid}: narrative.not_claiming must be non-empty")


def validate_dossier(dossier: dict[str, Any], release_ids: set[str], row_ids: set[str]) -> None:
    uid = require_string(dossier.get("uid"), "dossier uid")
    dossier_type = dossier.get("type")
    if dossier_type not in DOSSIER_TYPES:
        raise ValueError(f"{uid}: invalid type {dossier_type!r}")
    if dossier_type == "release" and uid not in release_ids:
        raise ValueError(f"{uid}: release dossier uid is not a known release_family_id")
    if dossier_type == "card" and uid not in row_ids:
        raise ValueError(f"{uid}: card dossier uid is not a known row_id")

    context = dossier.get("context")
    if not isinstance(context, dict):
        raise ValueError(f"{uid}: context is required")

    source_ids: set[str] = set()
    sources = dossier.get("sources")
    if not isinstance(sources, list) or not sources:
        raise ValueError(f"{uid}: at least one source is required")
    for source in sources:
        validate_source(source, uid, source_ids)

    claim_ids: set[str] = set()
    claims = dossier.get("claims")
    if not isinstance(claims, list) or not claims:
        raise ValueError(f"{uid}: at least one claim is required")
    for claim in claims:
        validate_claim(claim, uid, source_ids, claim_ids)

    for claim in claims:
        for ref in claim.get("basis_claims", []):
            if ref not in claim_ids:
                raise ValueError(f"{uid}/{claim['id']}: basis claim {ref} not found")

    validate_special_instructions(dossier)
    validate_narrative(dossier, claim_ids)

    coverage = dossier.get("coverage")
    if not isinstance(coverage, dict):
        raise ValueError(f"{uid}: coverage is required")
    for key in ("release", "art", "history", "identification"):
        if coverage.get(key) not in COVERAGE_VALUES:
            raise ValueError(f"{uid}: coverage.{key} invalid {coverage.get(key)!r}")


def load_source_sets() -> list[dict[str, Any]]:
    source_files = sorted(SOURCE_DIR.glob("*.json"))
    if not source_files:
        raise ValueError(f"no catalog-history source sets found in {SOURCE_DIR}")
    source_sets: list[dict[str, Any]] = []
    for path in source_files:
        data = json.loads(path.read_text(encoding="utf-8"))
        if data.get("schema") != SOURCE_SCHEMA:
            raise ValueError(f"{path}: unexpected schema {data.get('schema')!r}")
        source_sets.append({"path": path.relative_to(ROOT).as_posix(), "data": data})
    return source_sets


def build() -> tuple[dict[str, Any], dict[str, Any], dict[str, Any]]:
    release_ids, row_ids = load_catalog_ids()
    source_sets = load_source_sets()
    dossiers: list[dict[str, Any]] = []
    source_paths: list[str] = []
    seen: set[str] = set()
    for source_set in source_sets:
        source_paths.append(source_set["path"])
        for dossier in source_set["data"].get("dossiers", []):
            validate_dossier(dossier, release_ids, row_ids)
            uid = dossier["uid"]
            if uid in seen:
                raise ValueError(f"duplicate dossier uid {uid}")
            seen.add(uid)
            dossiers.append(dossier)

    dossiers.sort(key=lambda item: (item["type"], item["uid"]))
    generated_at = datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")
    claim_count = sum(len(dossier["claims"]) for dossier in dossiers)
    source_count = sum(len(dossier["sources"]) for dossier in dossiers)
    release_count = sum(1 for dossier in dossiers if dossier["type"] == "release")
    card_count = sum(1 for dossier in dossiers if dossier["type"] == "card")
    coverage = {
        "status": "pilot_in_progress",
        "modeled_catalog_releases": len(release_ids),
        "modeled_catalog_rows": len(row_ids),
        "release_dossier_count": release_count,
        "card_dossier_count": card_count,
        "claim_count": claim_count,
        "source_count": source_count,
        "special_identification_instruction_dossiers": sum(
            1 for dossier in dossiers if dossier.get("special_identification_instructions")
        ),
        "coverage_by_dimension": {
            dim: {tier: sum(1 for d in dossiers if d["coverage"].get(dim) == tier) for tier in sorted(COVERAGE_VALUES)}
            for dim in ("release", "art", "history", "identification")
        },
        "not_complete": {
            "release_dossiers_remaining_minimum": max(0, len(release_ids) - release_count),
            "card_dossiers_remaining_minimum": max(0, len(row_ids) - card_count),
            "note": "Pilot proves schema and sourcing rails only; it does not satisfy full-corpus deep history coverage.",
        },
        "uids": [dossier["uid"] for dossier in dossiers],
    }
    corpus = {
        "schema": CORPUS_SCHEMA,
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
        "schema": MANIFEST_SCHEMA,
        "generated_at": generated_at,
        "canonicalization": CANONICALIZATION,
        "hash_algorithm": HASH_ALGORITHM,
        "corpus": {
            "path": OUT_PATH.relative_to(ROOT).as_posix(),
            "schema": CORPUS_SCHEMA,
            "corpus_hash": corpus_hash,
            "hash_scope": "canonical corpus excluding generated_at",
            "release_dossier_count": release_count,
            "card_dossier_count": card_count,
            "claim_count": claim_count,
            "source_count": source_count,
        },
        "source_sets": source_paths,
        "not_claiming": NOT_CLAIMING,
    }
    audit = {
        "schema": AUDIT_SCHEMA,
        "generated_at": generated_at,
        "passed": True,
        "status": "pilot_in_progress",
        "corpus_hash": corpus_hash,
        "counts": coverage,
        "residuals": [
            {
                "id": "catalog_history_full_corpus_incomplete_v0.1",
                "severity": "expected_pilot_gap",
                "description": "The requested end state is deep history for every modeled release and card. This pilot only establishes schema, validation, and first high-signal dossiers.",
            }
        ],
    }
    return corpus, manifest, audit


def write_json(path: Path, value: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2, sort_keys=True) + "\n", encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser(description="Build catalog-history dossiers.")
    parser.add_argument("--check", action="store_true", help="validate and report without writing")
    args = parser.parse_args()
    corpus, manifest, audit = build()
    existing_manifest_ok = None
    if args.check and MANIFEST_PATH.exists():
        existing = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
        existing_manifest_ok = existing.get("corpus", {}).get("corpus_hash") == manifest["corpus"]["corpus_hash"]
    if not args.check:
        write_json(OUT_PATH, corpus)
        write_json(MANIFEST_PATH, manifest)
        write_json(AUDIT_PATH, audit)
    print(
        json.dumps(
            {
                "release_dossiers": manifest["corpus"]["release_dossier_count"],
                "card_dossiers": manifest["corpus"]["card_dossier_count"],
                "claims": manifest["corpus"]["claim_count"],
                "sources": manifest["corpus"]["source_count"],
                "corpus_hash": manifest["corpus"]["corpus_hash"],
                "existing_manifest_ok": existing_manifest_ok,
                "status": audit["status"],
                "wrote": []
                if args.check
                else [
                    manifest["corpus"]["path"],
                    MANIFEST_PATH.relative_to(ROOT).as_posix(),
                    AUDIT_PATH.relative_to(ROOT).as_posix(),
                ],
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
