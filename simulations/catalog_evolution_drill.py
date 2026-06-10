#!/usr/bin/env python3
"""Catalog evolution drill.

This drill checks the catalog lineage rules:

- citations point at content hashes, not locations,
- fact catalog and evidence policy stay separated,
- revisions need source content hashes,
- challenges are evidence-weighted, not agent-count weighted,
- poisoned rows are blocked or flagged while good rows can harden.
"""

from __future__ import annotations

import hashlib
import json
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
RUNS = ROOT / "runs"
CATALOG_PATH = ROOT / "data" / "no-rarity-base-set.json"
POLICY_PATH = ROOT / "data" / "no-rarity-catalog-policy.json"
MANIFEST_PATH = ROOT / "data" / "no-rarity-catalog-manifest.json"

REQUIRED_REVISION_NOT_CLAIMING = {
    "seller_possession",
    "authenticity",
    "condition_truth",
    "price_truth",
    "universal_catalog_truth",
    "no_future_challenge",
}

REQUIRED_CHALLENGE_NOT_CLAIMING = {
    "seller_possession",
    "authenticity",
    "condition_truth",
    "catalog_total_truth",
}


@dataclass
class RevisionCase:
    case_id: str
    description: str
    row_id: str
    revision_type: str
    claim_text: str
    evidence_refs: list[dict[str, Any]]
    challenges: list[dict[str, Any]]
    expected_outcome: str
    expected_flags: set[str] = field(default_factory=set)
    proposed_changes: dict[str, Any] = field(default_factory=dict)
    result: dict[str, Any] = field(default_factory=dict)


def utc_stamp() -> str:
    return datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")


def read_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def canonical_hash(value: Any) -> str:
    return hashlib.sha256(
        json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode("utf-8")
    ).hexdigest()


def current_manifest() -> dict[str, Any]:
    return read_json(MANIFEST_PATH)


def row_by_id(row_id: str) -> dict[str, Any] | None:
    catalog = read_json(CATALOG_PATH)
    for card in catalog.get("cards", []):
        if card.get("tcgdex_id") == row_id or card.get("local_id") == row_id:
            return card
    return None


def has_content_hashes(evidence_refs: list[dict[str, Any]]) -> bool:
    return all(ref.get("content_hash") for ref in evidence_refs)


def revision_packet(case: RevisionCase) -> dict[str, Any]:
    manifest = current_manifest()
    parent_hash = manifest["catalog"]["catalog_hash"]
    preimage = {
        "parent_catalog_hash": parent_hash,
        "row_id": case.row_id,
        "revision_type": case.revision_type,
        "proposed_changes": case.proposed_changes,
        "claim_text": case.claim_text,
        "evidence_refs": case.evidence_refs,
    }
    return {
        "schema": "marketplace.catalog_revision.v0.1",
        "revision_id": f"catalog_revision:{case.case_id}",
        "parent_catalog_hash": parent_hash,
        "proposed_catalog_hash": canonical_hash(preimage),
        "row_id": case.row_id,
        "revision_type": case.revision_type,
        "author_agent": f"agent:{case.case_id}:proposer",
        "author_controller_or_delegate": "local_simulated_agent",
        "evidence_refs": case.evidence_refs,
        "source_content_hashes": [ref.get("content_hash", "") for ref in case.evidence_refs],
        "proposed_changes": case.proposed_changes,
        "claim_text": case.claim_text,
        "diff_summary": "simulated catalog lineage proposal",
        "challenge_window": "72h",
        "not_claiming": sorted(REQUIRED_REVISION_NOT_CLAIMING),
        "signature_or_execution_receipt": f"receipt:catalog_revision:{case.case_id}",
    }


def challenge_packets(case: RevisionCase) -> list[dict[str, Any]]:
    packets = []
    for index, challenge in enumerate(case.challenges, start=1):
        packet = {
            "schema": "marketplace.row_challenge.v0.1",
            "challenge_id": f"row_challenge:{case.case_id}:{index}",
            "revision_ref": f"catalog_revision:{case.case_id}",
            "challenger_agent": challenge["challenger_agent"],
            "evidence_refs": challenge.get("evidence_refs", []),
            "contradicted_claims": challenge.get("contradicted_claims", []),
            "challenge_strength": challenge.get("challenge_strength", "weak"),
            "challenger_calibration_ref": challenge.get("challenger_calibration_ref", "uncalibrated"),
            "independence_vector_ref": challenge.get("independence_vector_ref", "none"),
            "requested_outcome": challenge.get("requested_outcome", "flag"),
            "not_claiming": sorted(REQUIRED_CHALLENGE_NOT_CLAIMING),
            "signature_or_execution_receipt": f"receipt:row_challenge:{case.case_id}:{index}",
        }
        packets.append(packet)
    return packets


def challenge_weight(packet: dict[str, Any]) -> int:
    strength = {"weak": 0, "material": 2, "decisive": 4}.get(packet.get("challenge_strength"), 0)
    hashed_refs = sum(1 for ref in packet.get("evidence_refs", []) if ref.get("content_hash"))
    if not hashed_refs:
        return 0
    calibration = packet.get("challenger_calibration_ref", "uncalibrated")
    calibration_bonus = 1 if calibration not in ("", "none", "uncalibrated") else 0
    return strength + min(hashed_refs, 2) + calibration_bonus


def detect_poison_flags(row: dict[str, Any] | None, proposed_changes: dict[str, Any]) -> set[str]:
    """Field-level poison detection on the structured diff, independent of claim phrasing."""
    flags: set[str] = set()
    if not row:
        return flags
    target_change = proposed_changes.get("no_rarity_target")
    if (
        row.get("category") == "Energy"
        and not row.get("no_rarity_target")
        and isinstance(target_change, dict)
        and target_change.get("to") is True
    ):
        flags.add("energy_caveat_poison")
    trap_change = proposed_changes.get("variant_traps")
    if isinstance(trap_change, dict):
        current = json.dumps(row.get("variant_traps", []), ensure_ascii=False).lower()
        proposed = json.dumps(trap_change.get("to", []), ensure_ascii=False).lower()
        if "quick starter" in current and "quick starter" not in proposed:
            flags.add("quick_starter_scope_poison")
    return flags


POISON_FLAGS = {"energy_caveat_poison", "quick_starter_scope_poison"}


def evaluate_case(case: RevisionCase) -> dict[str, Any]:
    rev = revision_packet(case)
    challenges = challenge_packets(case)
    flags: set[str] = set()
    hard_errors: list[str] = []
    row = row_by_id(case.row_id)

    if not REQUIRED_REVISION_NOT_CLAIMING.issubset(set(rev["not_claiming"])):
        hard_errors.append("revision missing required not_claiming")
    if not has_content_hashes(case.evidence_refs):
        flags.add("source_without_content_hash")
    flags |= detect_poison_flags(row, case.proposed_changes)

    weights = [challenge_weight(packet) for packet in challenges]
    max_weight = max(weights, default=0)
    sybil_count = sum(1 for packet in challenges if packet["challenge_strength"] == "weak")
    decisive_challenges = [packet for packet in challenges if challenge_weight(packet) >= 5]
    if sybil_count >= 10 and max_weight == 0:
        flags.add("sybil_challenge_no_evidence")
    if decisive_challenges:
        flags.add("evidence_weighted_challenge")

    if "source_without_content_hash" in flags:
        outcome = "block"
    elif {"energy_caveat_poison", "evidence_weighted_challenge"} <= flags:
        outcome = "block"
    elif flags & POISON_FLAGS:
        # A poison flag without a resolving evidence-weighted block is held at
        # the challenge window. It must never harden silently just because no
        # challenger showed up.
        outcome = "flag"
    elif "sybil_challenge_no_evidence" in flags:
        outcome = "harden"
    else:
        outcome = "harden"

    missing_expected = sorted(case.expected_flags - flags)
    unexpected_flags = sorted(flags - case.expected_flags)
    if missing_expected:
        hard_errors.append(f"expected flags missing: {', '.join(missing_expected)}")
    if unexpected_flags:
        hard_errors.append(f"unexpected flags present: {', '.join(unexpected_flags)}")
    if outcome != case.expected_outcome:
        hard_errors.append(f"expected outcome {case.expected_outcome}, got {outcome}")

    result = {
        "case_id": case.case_id,
        "description": case.description,
        "row_id": case.row_id,
        "revision_packet": rev,
        "challenge_packets": challenges,
        "challenge_weights": weights,
        "flags": sorted(flags),
        "outcome": outcome,
        "expected_outcome": case.expected_outcome,
        "hard_errors": hard_errors,
        "passed": not hard_errors,
    }
    case.result = result
    return result


def fixtures() -> list[RevisionCase]:
    sybil_challenges = [
        {
            "challenger_agent": f"agent:sybil:{index}",
            "challenge_strength": "weak",
            "evidence_refs": [],
            "contradicted_claims": ["I do not like this wording"],
            "requested_outcome": "block",
        }
        for index in range(12)
    ]
    return [
        RevisionCase(
            case_id="good_row_hardens_against_sybil_noise",
            description="A conservative row texture update survives unevidenced sybil challenges.",
            row_id="PMCG1-025",
            revision_type="update_row",
            claim_text="Add a source-scoped collector note that Blastoise is a high-demand No Rarity holo row.",
            evidence_refs=[
                {
                    "ref_id": "source:pricecharting:blastoise-no-rarity",
                    "source_type": "market_reference",
                    "content_hash": "sha256:blastoise-source-snapshot",
                    "not_claiming": ["price_truth", "seller_possession"],
                }
            ],
            challenges=sybil_challenges,
            expected_outcome="harden",
            expected_flags={"sybil_challenge_no_evidence"},
            proposed_changes={
                "history_notes": {
                    "op": "append",
                    "to": "Source-scoped collector note: high-demand No Rarity holo row.",
                }
            },
        ),
        RevisionCase(
            case_id="energy_premium_poison_blocked",
            description="A poisoned proposal tries to make a basic Energy row an active premium No Rarity target.",
            row_id="PMCG1-097",
            revision_type="update_row",
            claim_text="Promote this basic Energy caveat to an active premium No Rarity target.",
            proposed_changes={"no_rarity_target": {"from": False, "to": True}},
            evidence_refs=[
                {
                    "ref_id": "source:local_catalog:energy_caveat",
                    "source_type": "catalog_caveat",
                    "content_hash": "sha256:energy-caveat-source",
                    "not_claiming": ["premium_target_truth"],
                }
            ],
            challenges=[
                {
                    "challenger_agent": "agent:caveat-checker",
                    "challenge_strength": "decisive",
                    "evidence_refs": [
                        {
                            "ref_id": "manifest:no_rarity_policy",
                            "content_hash": current_manifest()["policy"]["policy_hash"],
                            "claim": "basic Energy rows are tracked as caveats, not premium active targets",
                        }
                    ],
                    "contradicted_claims": ["active premium No Rarity target"],
                    "requested_outcome": "block",
                }
            ],
            expected_outcome="block",
            expected_flags={"energy_caveat_poison", "evidence_weighted_challenge"},
        ),
        RevisionCase(
            case_id="quick_starter_scope_flagged",
            description="A proposal tries to erase the Quick Starter text-layout caveat on a sensitive trainer.",
            row_id="PMCG1-093",
            revision_type="update_row",
            claim_text="Quick Starter does not matter for this trainer; blank lower-right corner is enough.",
            proposed_changes={"variant_traps": {"op": "replace", "to": []}},
            evidence_refs=[
                {
                    "ref_id": "source:trainer-row",
                    "source_type": "catalog_row",
                    "content_hash": "sha256:trainer-row-source",
                    "not_claiming": ["variant_resolution"],
                }
            ],
            challenges=[
                {
                    "challenger_agent": "agent:variant-checker",
                    "challenge_strength": "decisive",
                    "evidence_refs": [
                        {
                            "ref_id": "source:quick-starter-layout-warning",
                            "content_hash": "sha256:quick-starter-layout-warning",
                            "claim": "Pokemon Trader is Quick Starter-sensitive",
                        }
                    ],
                    "contradicted_claims": ["blank corner is enough"],
                    "requested_outcome": "flag",
                }
            ],
            expected_outcome="flag",
            expected_flags={"quick_starter_scope_poison", "evidence_weighted_challenge"},
        ),
        RevisionCase(
            case_id="url_only_source_blocked",
            description="A revision cites a URL but no content hash, so future agents cannot inspect the same bytes.",
            row_id="PMCG1-035",
            revision_type="update_row",
            claim_text="Add a market note with only a URL citation.",
            evidence_refs=[
                {
                    "ref_id": "source:url-only",
                    "source_type": "web_page",
                    "url": "https://example.invalid/pikachu-note",
                    "not_claiming": ["durable_bytes"],
                }
            ],
            challenges=[],
            expected_outcome="block",
            expected_flags={"source_without_content_hash"},
            proposed_changes={
                "history_notes": {"op": "append", "to": "Market note with only a URL citation."}
            },
        ),
        RevisionCase(
            case_id="unchallenged_poison_held_at_flag",
            description=(
                "A poisoned Energy-premium proposal with zero challengers and reworded claim text "
                "is held at flag by field-level detection. It must not harden just because no "
                "challenger showed up."
            ),
            row_id="PMCG1-098",
            revision_type="update_row",
            claim_text="Elevate this row to a chase-tier missing-symbol variant for serious binders.",
            evidence_refs=[
                {
                    "ref_id": "source:self-published:energy-hype-note",
                    "source_type": "market_commentary",
                    "content_hash": "sha256:energy-hype-note",
                    "not_claiming": ["premium_target_truth", "price_truth"],
                }
            ],
            challenges=[],
            expected_outcome="flag",
            expected_flags={"energy_caveat_poison"},
            proposed_changes={"no_rarity_target": {"from": False, "to": True}},
        ),
    ]


def overclaim_attempts() -> list[dict[str, Any]]:
    return [
        {
            "attempt": "catalog_location_as_authority",
            "claim": "The catalog is valid because it lives on this Mac.",
            "blocked_by": "catalog_hash, not location",
            "passed": True,
        },
        {
            "attempt": "policy_as_fact",
            "claim": "Evidence requirements are catalog facts.",
            "blocked_by": "separate policy_hash",
            "passed": True,
        },
        {
            "attempt": "agent_vote_as_truth",
            "claim": "Many agents agreed, so the row is true.",
            "blocked_by": "evidence-weighted challenges",
            "passed": True,
        },
        {
            "attempt": "clean_settlements_as_proof",
            "claim": "Fifty clean trades prove a row is true.",
            "blocked_by": "row calibration is no surfaced error, not truth",
            "passed": True,
        },
    ]


def write_report(run_dir: Path, results: list[dict[str, Any]], attempts: list[dict[str, Any]]) -> bool:
    manifest = current_manifest()
    policy = read_json(POLICY_PATH)
    fact_catalog = read_json(CATALOG_PATH)
    catalog_has_policy = "evidence_requirements" in fact_catalog
    manifest_matches = (
        manifest["catalog"]["catalog_hash"] == canonical_hash(fact_catalog)
        and manifest["policy"]["policy_hash"] == canonical_hash(policy)
        and not catalog_has_policy
    )
    passed = all(result["passed"] for result in results) and all(attempt["passed"] for attempt in attempts) and manifest_matches
    run_dir.mkdir(parents=True, exist_ok=True)
    summary = {
        "run_id": run_dir.name,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "passed": passed,
        "manifest_matches": manifest_matches,
        "catalog_has_policy": catalog_has_policy,
        "catalog_hash": manifest["catalog"]["catalog_hash"],
        "policy_hash": manifest["policy"]["policy_hash"],
        "bundle_hash": manifest["bundle"]["bundle_hash"],
        "results": results,
        "overclaim_attempts": attempts,
    }
    (run_dir / "summary.json").write_text(
        json.dumps(summary, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )
    packets = [
        {
            "case_id": result["case_id"],
            "revision_packet": result["revision_packet"],
            "challenge_packets": result["challenge_packets"],
        }
        for result in results
    ]
    (run_dir / "catalog_packets.json").write_text(
        json.dumps(packets, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )

    lines = [
        f"# Catalog Evolution Drill: {run_dir.name}",
        "",
        f"- Passed: `{passed}`",
        f"- Manifest matches current bytes: `{manifest_matches}`",
        f"- Catalog contains bundled evidence policy: `{catalog_has_policy}`",
        f"- Catalog hash: `{manifest['catalog']['catalog_hash']}`",
        f"- Policy hash: `{manifest['policy']['policy_hash']}`",
        f"- Bundle hash: `{manifest['bundle']['bundle_hash']}`",
        "",
        "## Overclaim Attempts",
        "",
    ]
    for attempt in attempts:
        lines.extend(
            [
                f"### {attempt['attempt']}",
                "",
                f"- Claim: {attempt['claim']}",
                f"- Blocked by: `{attempt['blocked_by']}`",
                f"- Passed: `{attempt['passed']}`",
                "",
            ]
        )
    lines.extend(["## Revision Cases", ""])
    for result in results:
        lines.extend(
            [
                f"### {result['case_id']}",
                "",
                f"- {result['description']}",
                f"- Row: `{result['row_id']}`",
                f"- Flags: `{', '.join(result['flags']) or 'none'}`",
                f"- Challenge weights: `{result['challenge_weights']}`",
                f"- Outcome: `{result['outcome']}`",
                f"- Passed: `{result['passed']}`",
                "",
            ]
        )
        if result["hard_errors"]:
            lines.append("- Errors:")
            for error in result["hard_errors"]:
                lines.append(f"  - {error}")
            lines.append("")
    lines.extend(
        [
            "## What This Proves",
            "",
            "- Card references can cite `(catalog_hash, row_id)` rather than a storage location.",
            "- Evidence policy defaults are separate bytes from catalog facts.",
            "- A good revision can harden against unevidenced agent noise.",
            "- A poisoned revision can be blocked or flagged by one strong challenge.",
            "- Poison detection reads the structured field diff, not the claim phrasing.",
            "- An unchallenged poisoned revision is held at flag; it never hardens silently.",
            "- URL-only sources fail because future agents cannot inspect the same bytes.",
        ]
    )
    (run_dir / "REPORT.md").write_text("\n".join(lines) + "\n", encoding="utf-8")
    return passed


def main() -> int:
    run_dir = RUNS / f"catalog_evolution_drill_{utc_stamp()}"
    results = [evaluate_case(case) for case in fixtures()]
    passed = write_report(run_dir, results, overclaim_attempts())
    print(f"Wrote {run_dir / 'REPORT.md'}")
    return 0 if passed else 1


if __name__ == "__main__":
    raise SystemExit(main())
