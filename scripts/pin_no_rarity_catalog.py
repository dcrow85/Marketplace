#!/usr/bin/env python3
"""Pin the No Rarity catalog as content-addressed bytes.

The catalog facts and evidence policy should not share one hash. This script:

1. removes the top-level evidence policy from the fact catalog,
2. writes that policy to its own versioned artifact,
3. computes canonical SHA-256 hashes for catalog, policy, and release bundle,
4. regenerates the browser JS mirror from the fact catalog.
"""

from __future__ import annotations

import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
CATALOG_PATH = ROOT / "data" / "no-rarity-base-set.json"
CATALOG_JS_PATH = ROOT / "data" / "no-rarity-base-set.js"
POLICY_PATH = ROOT / "data" / "no-rarity-catalog-policy.json"
MANIFEST_PATH = ROOT / "data" / "no-rarity-catalog-manifest.json"


def canonical_bytes(value: Any) -> bytes:
    return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode("utf-8")


def sha256_hex(value: Any) -> str:
    return hashlib.sha256(canonical_bytes(value)).hexdigest()


def read_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, value: Any) -> None:
    path.write_text(json.dumps(value, indent=2, sort_keys=True, ensure_ascii=False) + "\n", encoding="utf-8")


def default_policy(catalog: dict[str, Any], evidence_requirements: list[str]) -> dict[str, Any]:
    return {
        "schema": "marketplace.no_rarity_catalog_policy.v0.1",
        "policy_id": "no_rarity_evidence_requirements.v0.1",
        "domain": "tcg.pokemon.no_rarity",
        "generated_at": catalog.get("generated_at", ""),
        "fact_catalog_schema": catalog.get("schema", ""),
        "applies_to_catalog_family": "marketplace.no_rarity_base_set",
        "evidence_requirements": evidence_requirements,
        "policy_boundary": (
            "This policy recommends evidence defaults for agent planning. "
            "It is not part of the fact catalog hash and does not prove possession, authenticity, condition, or price."
        ),
        "not_claiming": [
            "catalog_fact",
            "seller_possession",
            "authenticity",
            "condition_truth",
            "price_truth",
            "spendability",
        ],
    }


def main() -> int:
    catalog = read_json(CATALOG_PATH)
    if "evidence_requirements" in catalog:
        evidence_requirements = list(catalog.pop("evidence_requirements"))
    elif POLICY_PATH.exists():
        evidence_requirements = list(read_json(POLICY_PATH).get("evidence_requirements", []))
    else:
        raise SystemExit("no evidence_requirements in catalog and no policy file exists")

    policy = default_policy(catalog, evidence_requirements)
    catalog_hash = sha256_hex(catalog)
    policy_hash = sha256_hex(policy)
    bundle_preimage = {
        "catalog_hash": catalog_hash,
        "policy_hash": policy_hash,
        "release_family": "no_rarity_base_set",
        "schema": "marketplace.catalog_release_bundle.v0.1",
    }
    bundle_hash = sha256_hex(bundle_preimage)
    active_rows = sum(1 for card in catalog.get("cards", []) if card.get("no_rarity_target"))
    caveat_rows = len(catalog.get("cards", [])) - active_rows
    manifest = {
        "schema": "marketplace.catalog_release_manifest.v0.1",
        "release_id": f"no_rarity_base_set:{catalog_hash[:16]}",
        "catalog": {
            "path": "data/no-rarity-base-set.json",
            "schema": catalog.get("schema", ""),
            "hash_algorithm": "sha256",
            "canonicalization": "json_sorted_keys_no_whitespace_v0.1",
            "catalog_hash": catalog_hash,
            "row_count": len(catalog.get("cards", [])),
            "active_no_rarity_rows": active_rows,
            "caveat_rows": caveat_rows,
            "row_id_field": "tcgdex_id",
            "row_citation_shape": ["catalog_hash", "row_id"],
            "not_claiming": [
                "seller_possession",
                "authenticity",
                "condition_truth",
                "price_truth",
                "policy_defaults",
            ],
        },
        "policy": {
            "path": "data/no-rarity-catalog-policy.json",
            "schema": policy["schema"],
            "hash_algorithm": "sha256",
            "canonicalization": "json_sorted_keys_no_whitespace_v0.1",
            "policy_hash": policy_hash,
            "not_claiming": policy["not_claiming"],
        },
        "bundle": {
            "hash_algorithm": "sha256",
            "canonicalization": "json_sorted_keys_no_whitespace_v0.1",
            "bundle_hash": bundle_hash,
            "preimage": bundle_preimage,
        },
        "anchoring": {
            "on_chain_anchor_status": "not_anchored_yet",
            "anchor_target": "catalog_hash per release; chain stores anchors, never rows",
        },
        "generated_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
    }

    write_json(CATALOG_PATH, catalog)
    write_json(POLICY_PATH, policy)
    write_json(MANIFEST_PATH, manifest)
    CATALOG_JS_PATH.write_text(
        "window.NO_RARITY_BASE_SET = "
        + json.dumps(catalog, sort_keys=True, separators=(",", ":"), ensure_ascii=False)
        + ";\n",
        encoding="utf-8",
    )
    print(f"catalog_hash={catalog_hash}")
    print(f"policy_hash={policy_hash}")
    print(f"bundle_hash={bundle_hash}")
    print(f"wrote {MANIFEST_PATH}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
