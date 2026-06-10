#!/usr/bin/env python3
"""Run standalone EvidenceManifest v0.3 falsifiers against the E2E validator.

The older evidence_manifest_drill.py remains valuable for v0.2. This drill
targets the v0.3 manifest builder/validator that protocol_e2e.py now uses.
"""

from __future__ import annotations

import argparse
import copy
import json
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import protocol_e2e as e2e


RUNS = e2e.RUNS


@dataclass
class DrillCase:
    slug: str
    title: str
    expected: str
    outcome: str
    passed: bool
    error: str = ""
    observations: list[str] = field(default_factory=list)


def write_json(path: Path, value: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, indent=2, sort_keys=True) + "\n", encoding="utf-8")


def validate_payload(payload: dict[str, Any]) -> tuple[bool, str]:
    try:
        e2e.validate_evidence_manifest_payload(payload)
    except Exception as exc:
        return False, str(exc)
    return True, ""


def expect_case(
    slug: str,
    title: str,
    expected: str,
    should_pass: bool,
    payload: dict[str, Any],
    expected_error: str = "",
    observations: list[str] | None = None,
) -> DrillCase:
    ok, error = validate_payload(payload)
    passed = ok if should_pass else ((not ok) and (not expected_error or expected_error in error))
    return DrillCase(
        slug=slug,
        title=title,
        expected=expected,
        outcome="valid" if ok else "rejected",
        passed=passed,
        error=error,
        observations=observations or [],
    )


def build_standard(run_dir: Path, packet_id: str, trade_id: int = 9301) -> e2e.EvidenceManifestRecord:
    return e2e.write_evidence_manifest_packet(
        run_dir / "packets",
        packet_id,
        trade_id,
        "seller",
        "item_fingerprint",
        e2e.keccak_text(f"fingerprint:{packet_id}:{trade_id}"),
        "standard",
        "manifest_integrity_only",
        [
            {
                "asset_id": "front-photo",
                "role": "front_photo",
                "filename": "front-photo.png",
                "data": f"v0.3 {packet_id} front photo".encode("utf-8"),
            },
            {
                "asset_id": "back-photo",
                "role": "back_photo",
                "filename": "back-photo.png",
                "data": f"v0.3 {packet_id} back photo".encode("utf-8"),
            },
        ],
        known_limits=["Fixture bytes are not real card images."],
    )


def mutate_primary_asset(run_dir: Path, payload: dict[str, Any], byte_suffix: bytes) -> str:
    ref = payload["asset_descriptors"][0]["storage_refs"][0]
    path = e2e.ROOT / str(ref["uri"])
    original = path.read_bytes()
    path.write_bytes(original + byte_suffix)
    return str(path.relative_to(run_dir))


def run_drill(run_dir: Path) -> list[DrillCase]:
    cases: list[DrillCase] = []
    packet_dir = run_dir / "packets"
    packet_dir.mkdir(parents=True, exist_ok=True)

    valid = build_standard(run_dir, "valid_standard_v0_3")
    write_json(packet_dir / "valid_standard_manifest_payload.json", valid.payload)
    cases.append(
        expect_case(
            "valid_standard_v0_3",
            "Valid v0.3 standard manifest",
            "validator accepts content-hashed v0.3 front/back assets",
            True,
            valid.payload,
        )
    )

    byte_switch = build_standard(run_dir, "byte_switch_v0_3")
    write_json(packet_dir / "byte_switch_manifest_payload.json", byte_switch.payload)
    pre_ok, _ = validate_payload(byte_switch.payload)
    mutated_rel = mutate_primary_asset(run_dir, byte_switch.payload, b"-mutated")
    cases.append(
        expect_case(
            "byte_switch_v0_3",
            "v0.3 byte switch after manifest build",
            "validator rejects mutated primary bytes with unchanged descriptor hashes",
            False,
            byte_switch.payload,
            expected_error="byte_length mismatch",
            observations=[f"pre-switch valid: {pre_ok}", f"mutated asset: {mutated_rel}"],
        )
    )

    asset_root_bad = build_standard(run_dir, "asset_root_bad_v0_3")
    asset_root_payload = copy.deepcopy(asset_root_bad.payload)
    asset_root_payload["asset_root_hash"] = e2e.keccak_text("bad-asset-root")
    write_json(packet_dir / "asset_root_bad_manifest_payload.json", asset_root_payload)
    cases.append(
        expect_case(
            "asset_root_bad_v0_3",
            "v0.3 asset root mismatch",
            "validator rejects a stale or forged asset_root_hash",
            False,
            asset_root_payload,
            expected_error="asset_root_hash mismatch",
        )
    )

    subject_bad = build_standard(run_dir, "subject_bad_v0_3")
    subject_payload = copy.deepcopy(subject_bad.payload)
    subject_payload["subject"]["subject_hash"] = e2e.keccak_text("bad-subject-hash")
    write_json(packet_dir / "subject_bad_manifest_payload.json", subject_payload)
    cases.append(
        expect_case(
            "subject_bad_v0_3",
            "v0.3 subject hash mismatch",
            "validator rejects a manifest whose subject hash no longer binds to the anchor",
            False,
            subject_payload,
            expected_error="subject_hash mismatch",
        )
    )

    role_inflation = build_standard(run_dir, "role_inflation_v0_3")
    role_payload = copy.deepcopy(role_inflation.payload)
    role_payload["issuer_role"] = "verifier"
    write_json(packet_dir / "role_inflation_manifest_payload.json", role_payload)
    cases.append(
        expect_case(
            "role_inflation_v0_3",
            "v0.3 seller declares verifier role",
            "validator rejects issuer role inflation against actor authority",
            False,
            role_payload,
            expected_error="lacks role verifier",
        )
    )

    tier_inflation = build_standard(run_dir, "tier_inflation_v0_3")
    tier_payload = copy.deepcopy(tier_inflation.payload)
    tier_payload["evidence_tier"] = "verified"
    write_json(packet_dir / "tier_inflation_manifest_payload.json", tier_payload)
    cases.append(
        expect_case(
            "tier_inflation_v0_3",
            "v0.3 verified tier without attestation refs",
            "validator rejects self-declared verified structure",
            False,
            tier_payload,
            expected_error="verified manifest requires verifier attestation refs",
        )
    )

    claim_retention = build_standard(run_dir, "claim_retention_bad_v0_3")
    claim_payload = copy.deepcopy(claim_retention.payload)
    claim_payload["evidence_tier"] = "claim_grade"
    write_json(packet_dir / "claim_retention_bad_manifest_payload.json", claim_payload)
    cases.append(
        expect_case(
            "claim_retention_bad_v0_3",
            "v0.3 claim grade without retention",
            "validator rejects claim-grade memory without a 180-day retention policy",
            False,
            claim_payload,
            expected_error="claim_grade manifest requires 180 day retention",
        )
    )

    mutable_primary = build_standard(run_dir, "mutable_primary_bad_v0_3")
    mutable_payload = copy.deepcopy(mutable_primary.payload)
    mutable_payload["asset_descriptors"][0]["storage_refs"][0]["mutable"] = True
    write_json(packet_dir / "mutable_primary_bad_manifest_payload.json", mutable_payload)
    cases.append(
        expect_case(
            "mutable_primary_bad_v0_3",
            "v0.3 mutable primary ref",
            "validator rejects mutable primary evidence in the local EVM manifest path",
            False,
            mutable_payload,
            expected_error="unsupported primary storage ref",
        )
    )

    return cases


def write_report(run_dir: Path, cases: list[DrillCase]) -> None:
    summary = {
        "run_id": run_dir.name,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "spec": e2e.MANIFEST_SCHEMA,
        "canonicalization": e2e.MANIFEST_CANONICALIZATION,
        "hash_algorithm": e2e.MANIFEST_HASH_ALGORITHM,
        "cases": [case.__dict__ for case in cases],
        "passed": all(case.passed for case in cases),
    }
    write_json(run_dir / "summary.json", summary)

    lines = [
        f"# EvidenceManifest v0.3 Drill: {run_dir.name}",
        "",
        f"- Generated: `{summary['generated_at']}`",
        f"- Spec: `{summary['spec']}`",
        f"- Canonicalization: `{summary['canonicalization']}`",
        f"- Hash algorithm: `{summary['hash_algorithm']}`",
        f"- Cases: `{len(cases)}`",
        f"- Passed: `{summary['passed']}`",
        "",
        "## Result",
        "",
        "This drill exercises the same v0.3 manifest validator used by `protocol_e2e.py`, closing the coverage split where the standalone manifest falsifiers still targeted v0.2.",
        "",
        "## Falsifier Matrix",
        "",
        "| Case | Expected | Outcome | Passed | Error |",
        "| --- | --- | --- | --- | --- |",
    ]
    for case in cases:
        lines.append(
            f"| {case.title} | {case.expected} | `{case.outcome}` | `{case.passed}` | `{case.error or 'none'}` |"
        )

    lines.extend(["", "## Case Notes", ""])
    for case in cases:
        lines.extend(
            [
                f"### {case.title}",
                "",
                f"- Slug: `{case.slug}`",
                f"- Outcome: `{case.outcome}`",
                f"- Passed expectation: `{case.passed}`",
                f"- Error: `{case.error or 'none'}`",
            ]
        )
        if case.observations:
            lines.append("- Observations:")
            for observation in case.observations:
                lines.append(f"  - {observation}")
        lines.append("")

    lines.extend(
        [
            "## What This Proves",
            "",
            "- The E2E v0.3 manifest validator rejects mutated primary bytes.",
            "- Subject hashes and asset roots are recomputed, not trusted as inert fields.",
            "- Issuer role, verified tier, claim-grade retention, and mutable primary refs are checked in the actual v0.3 path.",
            "",
            "## Still Not Proven",
            "",
            "- The fixture bytes are not real card images.",
            "- The validator does not inspect image pixels or visible nonce content.",
            "- v0.3 still uses the local EVM packet-envelope hash as the manifest hash; no Solidity helper is exercised here.",
            "- This drill does not make spendability a contract-enforced gate.",
        ]
    )
    (run_dir / "REPORT.md").write_text("\n".join(lines) + "\n", encoding="utf-8")


def main() -> int:
    parser = argparse.ArgumentParser(description="Run EvidenceManifest v0.3 falsifier drill.")
    parser.add_argument("--run-dir", type=Path, help="Optional output directory")
    args = parser.parse_args()

    timestamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    run_dir = args.run_dir or (RUNS / f"evidence_manifest_v0_3_drill_{timestamp}")
    run_dir.mkdir(parents=True, exist_ok=True)
    cases = run_drill(run_dir)
    write_report(run_dir, cases)

    print(f"Wrote {run_dir / 'REPORT.md'}")
    for case in cases:
        print(f"{case.slug}: outcome={case.outcome} passed={case.passed} error={case.error or 'none'}")
    return 0 if all(case.passed for case in cases) else 1


if __name__ == "__main__":
    raise SystemExit(main())
