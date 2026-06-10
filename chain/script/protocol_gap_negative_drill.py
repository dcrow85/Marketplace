#!/usr/bin/env python3
"""Negative drill for permanent physical-world gaps.

This is not a fraud-prevention test. It is a boundary-honesty test.

Pass means a protocol-compliant trade can settle while a hidden physical-world
oracle says the card was fake or swapped. The protocol should leave attributable
residue without claiming it proved authenticity.
"""

from __future__ import annotations

import argparse
import json
import signal
import subprocess
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import protocol_e2e as e2e


ROOT = e2e.ROOT
CHAIN = e2e.CHAIN
RUNS = e2e.RUNS
ENV = e2e.ENV

BANNED_OVERCLAIMS = {
    "protocol proved authenticity",
    "authenticity confirmed",
    "confirmed authentic",
    "confirmed genuine",
    "guaranteed authentic",
    "verified authentic",
    "verified genuine",
    "no physical risk",
}


def packet_payloads(packet_dir: Path) -> list[dict[str, Any]]:
    payloads: list[dict[str, Any]] = []
    for path in sorted(packet_dir.glob("*.json")):
        try:
            payloads.append(json.loads(path.read_text(encoding="utf-8")))
        except json.JSONDecodeError:
            continue
    return payloads


def find_overclaims(payloads: list[dict[str, Any]]) -> list[str]:
    hits: list[str] = []
    for payload in payloads:
        text = json.dumps(payload, sort_keys=True).lower()
        for phrase in BANNED_OVERCLAIMS:
            if phrase in text:
                hits.append(f"{payload.get('packet_id', 'unknown')}: {phrase}")
    return sorted(set(hits))


def packet_ids(scenario: e2e.ScenarioResult) -> list[str]:
    return [packet.packet_id for packet in scenario.packets]


def tx_labels(scenario: e2e.ScenarioResult) -> list[str]:
    return [tx.label for tx in scenario.transactions]


def build_physical_oracles(scenarios: list[e2e.ScenarioResult]) -> dict[str, dict[str, Any]]:
    return {
        scenarios[0].name: {
            "oracle_status": "counterfeit_not_detected_during_inspection",
            "physical_truth": "The shipped card is a convincing counterfeit. Seller-supplied scans and nonce evidence were internally consistent, but they did not prove physical authenticity.",
            "gap_path": ["G1.BindingGap", "G2.SensorGap", "G3.ContinuityGap", "G6.EgressRemedyGap"],
            "where_loss_lands": "Buyer accepted during inspection, so escrow and seller bond released. Later recovery is outside the ledger except through the signed residue.",
            "residue_to_use_later": [
                "seller-signed item fingerprint",
                "seller evidence manifest",
                "inventory lock",
                "route packet",
                "delivery packet",
                "buyer final receipt",
                "all on-chain state transitions",
            ],
        },
        scenarios[1].name: {
            "oracle_status": "counterfeit_discovered_during_inspection",
            "physical_truth": "The card is fake or materially misrepresented, but the chain only sees the buyer claim packet, verifier-scoped note, arbiter ruling, and remedy math.",
            "gap_path": ["G1.BindingGap", "G2.SensorGap", "G5.JudgmentGap", "G6.EgressRemedyGap"],
            "where_loss_lands": "Claim path moves the dispute into arbiter judgment; escrow and bond can compensate, but the protocol still cannot recover or authenticate the physical card by itself.",
            "residue_to_use_later": [
                "buyer claim packet",
                "buyer received-item manifest",
                "verifier scope approval",
                "verifier claim note",
                "arbiter ruling",
                "bond disposition",
                "settlement event",
            ],
        },
    }


def write_report(
    run_dir: Path,
    registry_setup: e2e.RegistrySetup,
    contract: str,
    rpc_url: str,
    scenarios: list[e2e.ScenarioResult],
    physical_oracles: dict[str, dict[str, Any]],
    overclaim_hits: list[str],
) -> None:
    scenario_summaries = []
    for scenario in scenarios:
        scenario_summaries.append(
            {
                "name": scenario.name,
                "trade_id": scenario.trade_id,
                "final_state": scenario.final_state,
                "transactions": [tx.__dict__ for tx in scenario.transactions],
                "packets": [packet.__dict__ for packet in scenario.packets],
                "observations": scenario.observations,
                "physical_oracle": physical_oracles[scenario.name],
            }
        )

    passed = (
        all(scenario.final_state == "Settled" for scenario in scenarios)
        and all(oracle["oracle_status"] for oracle in physical_oracles.values())
        and not overclaim_hits
    )

    summary = {
        "run_id": run_dir.name,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "passed": passed,
        "pass_definition": "The protocol-compliant EVM flows settled while the hidden physical oracle preserved a fake/swap truth the protocol cannot enforce, and no packet overclaimed authenticity.",
        "rpc_url": rpc_url,
        "registry": registry_setup.registry,
        "predicate_verifier": registry_setup.predicate_verifier,
        "contract": contract,
        "overclaim_hits": overclaim_hits,
        "scenarios": scenario_summaries,
    }
    (run_dir / "summary.json").write_text(
        json.dumps(summary, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )

    lines = [
        f"# Protocol Gap Negative Drill: {run_dir.name}",
        "",
        f"- Passed: `{passed}`",
        "- Pass definition: protocol-compliant settlement remains possible while the hidden physical oracle says the card was fake or swapped.",
        f"- RPC: `{rpc_url}`",
        f"- Registry: `{registry_setup.registry}`",
        f"- Predicate verifier: `{registry_setup.predicate_verifier}`",
        f"- Escrow: `{contract}`",
        "",
        "## Why This Drill Exists",
        "",
        "This drill proves an open gap, not a closed wall. The protocol can bind packets, signatures, route gates, spendability, witnesses, claims, rulings, escrow, and bonds. It cannot bind a physical card into the chain.",
        "",
        "A passing run means the project is not overclaiming: digital attacks are blocked by walls, but physical truth can still cross ingress or egress only as signed residue and later judgment.",
        "",
        "## Overclaim Scan",
        "",
    ]
    if overclaim_hits:
        lines.append("- Banned authenticity overclaims found:")
        for hit in overclaim_hits:
            lines.append(f"  - `{hit}`")
    else:
        lines.append("- No banned authenticity overclaims found in generated packet payloads.")

    lines.extend(["", "## Scenarios", ""])
    for scenario in scenarios:
        oracle = physical_oracles[scenario.name]
        lines.extend(
            [
                f"### {scenario.name}",
                "",
                f"- Trade ID: `{scenario.trade_id}`",
                f"- Final state: `{scenario.final_state}`",
                f"- Hidden physical oracle: `{oracle['oracle_status']}`",
                f"- Physical truth: {oracle['physical_truth']}",
                f"- Where loss lands: {oracle['where_loss_lands']}",
                f"- Gap path: `{', '.join(oracle['gap_path'])}`",
                "- Transactions:",
            ]
        )
        for label in tx_labels(scenario):
            lines.append(f"  - {label}")
        lines.append("- Signed residue:")
        for residue in oracle["residue_to_use_later"]:
            lines.append(f"  - {residue}")
        lines.append("- Anchored packet ids:")
        for packet_id in packet_ids(scenario):
            lines.append(f"  - `{packet_id}`")
        lines.append("")

    lines.extend(
        [
            "## What This Proves",
            "",
            "- A fully valid packet path can still be physically false.",
            "- The protocol makes that false path attributable rather than impossible.",
            "- Ingress remains open: seller photos, scans, nonce evidence, and verifier notes are not atoms.",
            "- Egress remains open: settlement can move money and bonds, but cannot recover or authenticate the card.",
            "- This is the intended boundary, not a bug in the EVM runner.",
            "",
            "## Tripwire",
            "",
            "If a future change makes this drill fail because the system claims it proved authenticity, that is an overclaim alarm. The acceptable hardening path is stronger residue, clearer judgment, better deterrence, and tighter walls around digital replay or scope laundering.",
        ]
    )
    (run_dir / "REPORT.md").write_text("\n".join(lines) + "\n", encoding="utf-8")


def main() -> int:
    parser = argparse.ArgumentParser(description="Run the protocol-compliant physical fraud gap drill.")
    parser.add_argument("--port", type=int, default=18546, help="Anvil port to use")
    parser.add_argument("--keep-anvil", action="store_true", help="Leave Anvil running after the drill")
    args = parser.parse_args()

    timestamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    run_dir = RUNS / f"protocol_gap_negative_drill_{timestamp}"
    packet_dir = run_dir / "packets"
    packet_dir.mkdir(parents=True, exist_ok=True)
    rpc_url = f"http://127.0.0.1:{args.port}"
    anvil_log = (run_dir / "anvil.log").open("w", encoding="utf-8")
    anvil = subprocess.Popen(
        ["anvil", "--chain-id", "31337", "--port", str(args.port), "--silent"],
        cwd=CHAIN,
        env=ENV,
        stdout=anvil_log,
        stderr=subprocess.STDOUT,
        text=True,
    )

    try:
        e2e.wait_for_rpc(rpc_url)
        e2e.run(["forge", "build"])
        registry = e2e.deploy_registry(rpc_url)
        predicate_verifier = e2e.deploy_predicate_verifier(rpc_url)
        registry_setup = e2e.setup_registry(rpc_url, registry, predicate_verifier, packet_dir)
        contract = e2e.deploy_escrow(rpc_url, registry)
        scenarios = [
            e2e.run_happy_path(rpc_url, registry, contract, predicate_verifier, packet_dir, trade_id=1),
            e2e.run_claim_path(rpc_url, registry, contract, predicate_verifier, packet_dir, trade_id=2),
        ]
        physical_oracles = build_physical_oracles(scenarios)
        overclaim_hits = find_overclaims(packet_payloads(packet_dir))
        write_report(
            run_dir,
            registry_setup,
            contract,
            rpc_url,
            scenarios,
            physical_oracles,
            overclaim_hits,
        )
        print(f"Wrote {run_dir / 'REPORT.md'}")
        for scenario in scenarios:
            print(f"{scenario.name}: trade {scenario.trade_id} -> {scenario.final_state}")
        if overclaim_hits:
            print("overclaim hits:")
            for hit in overclaim_hits:
                print(f"- {hit}")
            return 1
        return 0
    finally:
        if args.keep_anvil:
            print(f"Anvil left running at {rpc_url} with pid {anvil.pid}")
        else:
            anvil.send_signal(signal.SIGTERM)
            try:
                anvil.wait(timeout=5)
            except subprocess.TimeoutExpired:
                anvil.kill()
                anvil.wait(timeout=5)
        anvil_log.close()


if __name__ == "__main__":
    raise SystemExit(main())
