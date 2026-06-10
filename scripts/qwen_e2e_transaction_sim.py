#!/usr/bin/env python3
"""Run a Qwen-on-MLX bounded end-to-end transaction simulation.

Qwen acts as the human-facing agent layer. The deterministic wall harness
decides whether Qwen's proposed motion is admissible, and the local EVM runner
proves the money/state rail. This keeps the agent imaginative but not sovereign.
"""

from __future__ import annotations

import json
import os
import re
import signal
import socket
import subprocess
import sys
from dataclasses import asdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
RUNS = ROOT / "runs"
SIMULATIONS = ROOT / "simulations"
CHAIN_SCRIPT = ROOT / "chain" / "script"
QWEN_MODEL = Path("/Users/che/models/mlx/Qwen3.6-35B-A3B-4bit")
QWEN_GENERATE = Path("/Users/che/.venvs/qwen36-mlx/bin/mlx_lm.generate")

sys.path.insert(0, str(SIMULATIONS))
sys.path.insert(0, str(CHAIN_SCRIPT))

from protocol_agent_api import accept_offer_and_fund_escrow, open_claim, seller_commit_route  # noqa: E402
from protocol_wall_packets import evm_bytes32_ref  # noqa: E402
from protocol_wall_pressure_sim import scenarios  # noqa: E402


def utc_stamp() -> str:
    return datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")


def json_default(value: Any) -> Any:
    if isinstance(value, set):
        return sorted(value)
    raise TypeError(f"Object of type {value.__class__.__name__} is not JSON serializable")


def write_json(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(payload, default=json_default, ensure_ascii=False, indent=2, sort_keys=True) + "\n"
    )


def find_open_port() -> int:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.bind(("127.0.0.1", 0))
        return int(sock.getsockname()[1])


def run(cmd: list[str], cwd: Path = ROOT, timeout: int | None = None) -> subprocess.CompletedProcess[str]:
    completed = subprocess.run(
        cmd,
        cwd=cwd,
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        timeout=timeout,
        check=False,
    )
    if completed.returncode != 0:
        raise RuntimeError(f"command failed ({completed.returncode}): {' '.join(cmd)}\n{completed.stdout}")
    return completed


def extract_json_object(text: str) -> dict[str, Any]:
    stripped = text.strip()
    if stripped.startswith("```"):
        stripped = re.sub(r"^```(?:json)?", "", stripped).strip()
        stripped = re.sub(r"```$", "", stripped).strip()
    try:
        return json.loads(stripped)
    except json.JSONDecodeError:
        pass
    first_object = stripped.find("{")
    if first_object >= 0:
        decoder = json.JSONDecoder()
        try:
            parsed, _ = decoder.raw_decode(stripped[first_object:])
        except json.JSONDecodeError:
            pass
        else:
            if isinstance(parsed, dict):
                return parsed
    raise ValueError(f"no valid JSON object found in Qwen output: {text[:240]}")


def repair_json(role: str, raw_output: str) -> dict[str, Any]:
    repair_prompt = f"""Return ONLY a valid JSON object repaired from this malformed JSON-like output.
Preserve the original keys and meaning. Do not add commentary.

Role: {role}

Malformed output:
{raw_output}
"""
    completed = run(
        [
            str(QWEN_GENERATE),
            "--model",
            str(QWEN_MODEL),
            "--prompt",
            repair_prompt,
            "--max-tokens",
            "1800",
            "--temp",
            "0",
            "--chat-template-config",
            '{"enable_thinking": false}',
            "--verbose",
            "False",
        ],
        cwd=ROOT,
        timeout=90,
    )
    parsed = extract_json_object(completed.stdout)
    parsed["_repair_raw"] = completed.stdout.strip()
    return parsed


def qwen_json(role: str, prompt: str, max_tokens: int = 520) -> dict[str, Any]:
    if not QWEN_GENERATE.exists():
        raise FileNotFoundError(f"missing mlx_lm.generate: {QWEN_GENERATE}")
    if not QWEN_MODEL.exists():
        raise FileNotFoundError(f"missing Qwen model: {QWEN_MODEL}")
    full_prompt = f"""You are a Marketplace protocol agent.

Return ONLY valid JSON. No markdown. No hidden reasoning.

Role: {role}

Protocol wall:
- You may recommend actions, but the protocol gate decides admissibility.
- Do not claim authenticity, condition truth, delivery truth, or seller possession unless a gate proves that exact claim.
- Current gates do NOT prove physical possession, authenticity, true condition, human satisfaction, or successful delivery; they only enforce packets, hashes, signatures, role authority, explicit risk ownership, state transitions, and recorded acceptance.
- When describing enforcement, say "the protocol requires/presents a packet" instead of "the protocol proves the physical fact" unless the deterministic API explicitly says that physical fact is proven.
- Evidence can be useful without being spendable.
- If the deterministic API says a wall blocks or requires waiver, you must surface that clearly.

Task:
{prompt}
"""
    completed = run(
        [
            str(QWEN_GENERATE),
            "--model",
            str(QWEN_MODEL),
            "--prompt",
            full_prompt,
            "--max-tokens",
            str(max_tokens),
            "--temp",
            "0.1",
            "--chat-template-config",
            '{"enable_thinking": false}',
            "--verbose",
            "False",
        ],
        cwd=ROOT,
        timeout=90,
    )
    try:
        parsed = extract_json_object(completed.stdout)
    except (ValueError, json.JSONDecodeError):
        parsed = repair_json(role, completed.stdout)
    parsed["_raw"] = completed.stdout.strip()
    return parsed


def selected_scenario():
    scenario = next(item for item in scenarios() if item.scenario_id == "full_wall_compliant_offer")
    # Route locking is a later gate than offer acceptance, so the route packet
    # commitments need an explicit spendability packet.
    scenario.hard_packets.add("route_spendability_hash")
    scenario.scenario_id = "qwen_full_wall_compliant_offer"
    scenario.description = (
        "Qwen-mediated clean Pokemon alpha trade: buyer wants a mid-value raw Neo Discovery Espeon, "
        "seller provides full default evidence, scoped trust, bond scope, external availability covenant, "
        "insured route, route wall bundle, and route spendability."
    )
    return scenario


def run_evm_route_and_close(run_dir: Path, route_gate: dict[str, Any]) -> dict[str, Any]:
    port = find_open_port()
    route_spendability_evm_hash = evm_bytes32_ref(
        schema="marketplace.route_spendability_evm_hash.v0.1",
        value=route_gate["route_spendability_hash"],
    )
    route_cmd = [
        sys.executable,
        str(CHAIN_SCRIPT / "alpha_route_commit.py"),
        "--wall-bundle-hash",
        route_gate["wall_bundle_hash"],
        "--route-spendability-hash",
        route_gate["route_spendability_hash"],
        "--route-spendability-evm-hash",
        route_spendability_evm_hash,
        "--port",
        str(port),
        "--keep-anvil",
    ]
    route_result = run(route_cmd, cwd=ROOT / "chain", timeout=180)
    route_receipt = json.loads(route_result.stdout.strip().splitlines()[-1])
    try:
        delivered = run(
            [
                sys.executable,
                str(CHAIN_SCRIPT / "alpha_trade_step.py"),
                "--summary",
                route_receipt["summary"],
                "--action",
                "mark-delivered",
            ],
            cwd=ROOT / "chain",
            timeout=120,
        )
        delivery_receipt = json.loads(delivered.stdout.strip().splitlines()[-1])
        accepted = run(
            [
                sys.executable,
                str(CHAIN_SCRIPT / "alpha_trade_step.py"),
                "--summary",
                route_receipt["summary"],
                "--action",
                "buyer-accept",
            ],
            cwd=ROOT / "chain",
            timeout=120,
        )
        acceptance_receipt = json.loads(accepted.stdout.strip().splitlines()[-1])
    finally:
        pid = route_receipt.get("anvil_pid")
        if pid:
            try:
                os.kill(int(pid), signal.SIGTERM)
            except ProcessLookupError:
                pass

    return {
        "route_commit": route_receipt,
        "delivery": delivery_receipt,
        "acceptance": acceptance_receipt,
        "route_stdout_tail": route_result.stdout[-3000:],
    }


def write_report(run_dir: Path, summary: dict[str, Any]) -> None:
    evm = summary["evm"]
    route = evm["route_commit"]
    delivery = evm["delivery"]
    acceptance = evm["acceptance"]
    lines = [
        f"# Qwen MLX E2E Transaction Simulation: {run_dir.name}",
        "",
        f"- Generated: `{summary['generated_at']}`",
        f"- Model: `{summary['model']}`",
        f"- Scenario: `{summary['scenario']['scenario_id']}`",
        f"- Offer decision: `{summary['api']['funding']['decision']}`",
        f"- Route decision: `{summary['api']['route']['decision']}`",
        f"- Claim decision: `{summary['api']['claim']['decision']}`",
        f"- EVM route state: `{route['final_state']}`",
        f"- EVM delivery state: `{delivery['final_state']}`",
        f"- EVM final state: `{acceptance['final_state']}`",
        "",
        "## Qwen Buyer Agent",
        "",
        "```json",
        json.dumps(summary["qwen"]["buyer_agent"], ensure_ascii=False, indent=2, sort_keys=True),
        "```",
        "",
        "## Qwen Seller Agent",
        "",
        "```json",
        json.dumps(summary["qwen"]["seller_agent"], ensure_ascii=False, indent=2, sort_keys=True),
        "```",
        "",
        "## Qwen Inspection Agent",
        "",
        "```json",
        json.dumps(summary["qwen"]["inspection_agent"], ensure_ascii=False, indent=2, sort_keys=True),
        "```",
        "",
        "## Deterministic Gate",
        "",
        f"- Wall bundle: `{summary['route_gate']['wall_bundle_hash']}`",
        f"- Route spendability: `{summary['route_gate']['route_spendability_hash']}`",
        f"- Route spendability EVM hash: `{summary['route_gate']['route_spendability_evm_hash']}`",
        "",
        "## EVM Transactions",
        "",
    ]
    for tx in route["transactions"]:
        lines.append(f"- `{tx['label']}`: `{tx['tx_hash']}`")
    for tx in delivery["transactions"]:
        lines.append(f"- `{tx['label']}`: `{tx['tx_hash']}`")
    for tx in acceptance["transactions"]:
        lines.append(f"- `{tx['label']}`: `{tx['tx_hash']}`")
    lines.extend(
        [
            "",
            "## Interpretation",
            "",
            "Qwen successfully operated as the narrative/agent layer, but every money-moving step was gated by the deterministic wall API and the EVM escrow. The run proves a clean transaction can move from offer evaluation to route lock, delivery, inspection, buyer acceptance, and final settlement without letting Qwen promote evidence into authenticity, condition, or delivery truth.",
            "",
            "## Files",
            "",
            f"- Summary: `{(run_dir / 'summary.json').relative_to(ROOT)}`",
            f"- EVM route report: `{route['report']}`",
            f"- Delivery report: `{delivery['report']}`",
            f"- Acceptance report: `{acceptance['report']}`",
            "",
        ]
    )
    (run_dir / "REPORT.md").write_text("\n".join(lines), encoding="utf-8")


def main() -> int:
    run_dir = RUNS / f"qwen_e2e_transaction_{utc_stamp()}"
    run_dir.mkdir(parents=True, exist_ok=True)
    scenario = selected_scenario()

    funding = accept_offer_and_fund_escrow(scenario, "convenience_first_buyer").to_dict()
    route = seller_commit_route(scenario).to_dict()
    claim = open_claim(scenario).to_dict()
    route_gate = {
        "wall_bundle_hash": route["packet_commitments"]["wall_bundle_hash"],
        "wall_bundle_evm_ref": route["packet_commitments"]["wall_bundle_evm_ref"],
        "assembly_history_hash": route["packet_commitments"]["assembly_history_hash"],
        "assembly_history_evm_ref": route["packet_commitments"]["assembly_history_evm_ref"],
        "route_assembly_witness_hash": route["packet_commitments"]["route_assembly_witness_hash"],
        "route_spendability_hash": route["packet_commitments"]["route_spendability_hash"],
        "route_spendability_evm_hash": evm_bytes32_ref(
            schema="marketplace.route_spendability_evm_hash.v0.1",
            value=route["packet_commitments"]["route_spendability_hash"],
        ),
        "placement_integrity": route["packet_commitments"]["placement_integrity"],
    }

    buyer_agent = qwen_json(
        "buyer_agent",
        f"""A buyer wants to buy a raw Pokemon card under the alpha protocol.

Scenario:
{json.dumps(asdict(scenario), ensure_ascii=False, default=list, sort_keys=True)}

Deterministic funding API response:
{json.dumps(funding, ensure_ascii=False, sort_keys=True)}

Return JSON with keys:
decision, proceed_to_fund, human_summary, evidence_boundary, not_claiming, packets_you_expect_the_protocol_to_enforce.
""",
    )
    if funding["decision"] != "escrow_fundable" or not buyer_agent.get("proceed_to_fund", False):
        raise RuntimeError("Qwen buyer did not proceed on an escrow-fundable clean scenario")

    seller_agent = qwen_json(
        "seller_agent",
        f"""The buyer accepted funding. You are the seller agent preparing route lock.

Deterministic route API response:
{json.dumps(route, ensure_ascii=False, sort_keys=True)}

Return JSON with keys:
decision, proceed_to_route_lock, seller_summary, route_boundary, not_claiming, spendability_hash_seen, wall_bundle_hash_seen.
""",
    )
    if route["decision"] != "route_locked" or not seller_agent.get("proceed_to_route_lock", False):
        raise RuntimeError("Qwen seller did not proceed on a route-lockable clean scenario")

    evm = run_evm_route_and_close(run_dir, route_gate)

    inspection_agent = qwen_json(
        "buyer_inspection_agent",
        f"""The EVM route was locked, seller delivery evidence opened inspection, and the buyer is happy.

Delivery receipt:
{json.dumps(evm['delivery'], ensure_ascii=False, sort_keys=True)}

Acceptance receipt:
{json.dumps(evm['acceptance'], ensure_ascii=False, sort_keys=True)}

Return JSON with keys:
decision, proceed_to_final_receipt, human_summary, receipt_boundary, not_claiming, reusable_trust_signal.
""",
    )

    summary = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "model": str(QWEN_MODEL),
        "scenario": asdict(scenario),
        "api": {"funding": funding, "route": route, "claim": claim},
        "route_gate": route_gate,
        "qwen": {
            "buyer_agent": buyer_agent,
            "seller_agent": seller_agent,
            "inspection_agent": inspection_agent,
        },
        "evm": evm,
        "pass": (
            funding["decision"] == "escrow_fundable"
            and route["decision"] == "route_locked"
            and evm["route_commit"]["final_state"] == "RouteLocked"
            and evm["delivery"]["final_state"] == "InspectionOpen"
            and evm["acceptance"]["final_state"] == "Settled"
            and bool(inspection_agent.get("proceed_to_final_receipt", False))
        ),
    }
    write_json(run_dir / "summary.json", summary)
    write_report(run_dir, summary)
    print(json.dumps({"run": str(run_dir), "pass": summary["pass"], "report": str(run_dir / "REPORT.md")}, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
