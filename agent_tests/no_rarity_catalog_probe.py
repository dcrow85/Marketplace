#!/usr/bin/env python3
"""Smoke probe for the No Rarity agent catalog tools."""

from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "agent_tools"))

from no_rarity_catalog_tools import dispatch  # noqa: E402


def assert_true(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError(message)


def run_direct_probe() -> dict[str, Any]:
    search = dispatch("search_catalog", {"query": "raichu holo", "limit": 5})
    assert_true(search["cards"], "Raichu search returned no cards")
    assert_true(search["cards"][0]["name"]["en"] == "Raichu", "Raichu should be top search result")
    release_hash = search["catalog_release"]["catalog_hash"]
    top_citation = search["cards"][0]["catalog_citation"]
    assert_true(top_citation["catalog_hash"] == release_hash, "generated citation should use current catalog hash")
    assert_true(top_citation["row_id"] == search["cards"][0]["card_ref"], "generated citation should bind cited row id")

    release = dispatch("catalog_release", {})["catalog_release"]
    assert_true(release["catalog_hash"] == release_hash, "catalog_release should match search release hash")

    energy = dispatch("evaluate_gate", {"card_ref": "PMCG1-102", "stance": "want"})
    assert_true(energy["decision"] == "reject_premium_no_rarity", "basic Energy caveat should reject premium claim")

    potion = dispatch("evidence_plan", {"card_ref": "Potion", "seller_trust": "thin"})
    evidence = " ".join(potion["required_or_recommended_evidence"]).lower()
    assert_true("quick starter" in evidence, "Potion should carry Quick Starter text-layout ask")

    common_search = dispatch("search_catalog", {"query": "common", "active_only": True, "limit": 8})
    rarities = {card["row"]["rarity"] for card in common_search["cards"]}
    assert_true(rarities == {"Common"}, f"common search should not match uncommon rows: {rarities}")

    charizard = dispatch(
        "evaluate_gate",
        {"card_ref": "Charizard", "stance": "want", "evidence_level": "NR-A", "seller_trust": "thin"},
    )
    assert_true(charizard["decision"] in {"request_evidence", "human_or_verifier_review"}, "Charizard should not pass low evidence")

    human = dispatch("interpret_human_text", {"text": "I might sell my no rarity blastoise if someone serious asks"})
    assert_true(human["inferred_stance"] == "sell_if_price_right", "sell posture inference failed")

    off_set = dispatch("interpret_human_text", {"text": "I want a Japanese Umbreon no rarity"})
    assert_true(off_set["candidate_source"] == "no_in_set_match", "off-set named want should not bind to a row")
    assert_true(not off_set["candidates"], "off-set named want should return no candidates")

    cross_set = dispatch("interpret_human_text", {"text": "I want a Team Rocket Pikachu"})
    assert_true(cross_set["candidate_source"] == "no_in_set_match", "cross-set qualifier should not bind Base Pikachu")
    assert_true("rocket" in cross_set["unmatched_terms"], "cross-set qualifier should be reported")

    seller_question = dispatch(
        "interpret_human_text",
        {"text": "I want cheap No Rarity commons unless a seller asks for money", "limit": 4},
    )
    assert_true(seller_question["inferred_stance"] == "want", "seller should not be inferred as sell")
    assert_true(seller_question["candidates"], "long market-intent fallback should return candidates")

    slab = dispatch(
        "evaluate_gate",
        {"card_ref": "Raichu", "stance": "want", "evidence_level": "NR-D", "seller_trust": "portable"},
    )
    assert_true(slab["decision"] == "request_evidence", "unchecked slab/cert story should request slab packet")
    assert_true(any("cert lookup" in item for item in slab["missing"]), "slab packet should include cert lookup")

    bulbasaur = dispatch("get_card", {"card_ref": "PMCG1-001"})["card"]
    assert_true(bulbasaur["variant_traps"] == [], "Bulbasaur should exercise a blank variant_traps row")
    assert_true(
        bulbasaur["variant_trap_status"] == "unexamined_or_no_cataloged_trap",
        "blank variant_traps should not surface as checked clean",
    )

    return {
        "search_top": search["cards"][0]["card_ref"],
        "energy_decision": energy["decision"],
        "potion_evidence_count": len(potion["required_or_recommended_evidence"]),
        "common_search_rarities": sorted(rarities),
        "charizard_decision": charizard["decision"],
        "human_stance": human["inferred_stance"],
        "off_set_candidate_source": off_set["candidate_source"],
        "cross_set_candidate_source": cross_set["candidate_source"],
        "slab_decision": slab["decision"],
        "variant_trap_status": bulbasaur["variant_trap_status"],
    }


def run_mcp_probe() -> dict[str, Any]:
    server = ROOT / "mcp" / "no_rarity_catalog_server.py"
    messages = [
        {"jsonrpc": "2.0", "id": 1, "method": "initialize", "params": {"protocolVersion": "2024-11-05"}},
        {"jsonrpc": "2.0", "id": 2, "method": "tools/list", "params": {}},
        {
            "jsonrpc": "2.0",
            "id": 3,
            "method": "tools/call",
            "params": {
                "name": "no_rarity_evaluate_gate",
                "arguments": {"card_ref": "PMCG1-038", "stance": "want", "evidence_level": "none"},
            },
        },
    ]
    payload = "\n".join(json.dumps(message) for message in messages) + "\n"
    proc = subprocess.run(
        [sys.executable, str(server)],
        input=payload,
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        check=True,
    )
    responses = [json.loads(line) for line in proc.stdout.splitlines() if line.strip()]
    assert_true(len(responses) == 3, f"expected 3 MCP responses, got {len(responses)}")
    tool_names = [tool["name"] for tool in responses[1]["result"]["tools"]]
    assert_true("no_rarity_evaluate_gate" in tool_names, "MCP tool list missing evaluate gate")
    result = responses[2]["result"]["structuredContent"]
    assert_true(result["decision"] == "request_evidence", "Raichu with no evidence should request evidence")
    return {
        "tool_count": len(tool_names),
        "evaluate_decision": result["decision"],
        "top_missing": result["missing"][:3],
    }


def main() -> int:
    summary = {
        "direct": run_direct_probe(),
        "mcp": run_mcp_probe(),
        "pass": True,
    }
    print(json.dumps(summary, ensure_ascii=False, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
