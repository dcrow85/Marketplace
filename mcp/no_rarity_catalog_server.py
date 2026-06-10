#!/usr/bin/env python3
"""Minimal stdio MCP server for the No Rarity catalog.

It implements the small subset needed by common MCP clients:
initialize, tools/list, and tools/call. Tool results are JSON text so clients
that do not support structuredContent can still use them.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "agent_tools"))

from no_rarity_catalog_tools import dispatch  # noqa: E402


TOOLS: list[dict[str, Any]] = [
    {
        "name": "no_rarity_search_catalog",
        "description": "Search the Japanese No Rarity catalog. Returns row candidates, not possession/authenticity proof.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "query": {"type": "string"},
                "limit": {"type": "integer", "default": 12},
                "active_only": {"type": "boolean"},
                "holo": {"type": "boolean"},
                "evidence_profile": {"type": "string"},
            },
            "required": [],
        },
        "_dispatch": "search_catalog",
    },
    {
        "name": "no_rarity_get_card",
        "description": "Get a compact agent-facing catalog row by PMCG1 id, local id, English name, Japanese name, or romaji.",
        "inputSchema": {
            "type": "object",
            "properties": {"card_ref": {"type": "string"}},
            "required": ["card_ref"],
        },
        "_dispatch": "get_card",
    },
    {
        "name": "no_rarity_interpret_human_text",
        "description": "Interpret loose human Pokemon-card talk into stance plus catalog candidates.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "text": {"type": "string"},
                "limit": {"type": "integer", "default": 8},
            },
            "required": ["text"],
        },
        "_dispatch": "interpret_human_text",
    },
    {
        "name": "no_rarity_evidence_plan",
        "description": "Return value-appropriate evidence asks and attention-cost notes for a catalog row.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "card_ref": {"type": "string"},
                "posture": {"type": "string", "default": "want"},
                "seller_trust": {"type": "string", "default": "unknown"},
            },
            "required": ["card_ref"],
        },
        "_dispatch": "evidence_plan",
    },
    {
        "name": "no_rarity_evaluate_gate",
        "description": "Evaluate a proposed stance/evidence state and label enforced, legible, judgment-needed, and missing.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "card_ref": {"type": "string"},
                "stance": {"type": "string", "default": "want"},
                "evidence_level": {"type": "string", "default": "none"},
                "seller_trust": {"type": "string", "default": "unknown"},
                "public": {"type": "boolean", "default": False},
            },
            "required": ["card_ref"],
        },
        "_dispatch": "evaluate_gate",
    },
    {
        "name": "no_rarity_agent_test_packet",
        "description": "Return sample cards and prompts for comparing agents against the No Rarity protocol boundary.",
        "inputSchema": {
            "type": "object",
            "properties": {"card_ref": {"type": "string"}},
            "required": [],
        },
        "_dispatch": "agent_test_packet",
    },
]


def public_tool(tool: dict[str, Any]) -> dict[str, Any]:
    return {k: v for k, v in tool.items() if not k.startswith("_")}


def respond(message_id: Any, result: Any = None, error: dict[str, Any] | None = None) -> None:
    payload: dict[str, Any] = {"jsonrpc": "2.0", "id": message_id}
    if error is not None:
        payload["error"] = error
    else:
        payload["result"] = result
    sys.stdout.write(json.dumps(payload, ensure_ascii=False) + "\n")
    sys.stdout.flush()


def tool_result(data: dict[str, Any]) -> dict[str, Any]:
    text = json.dumps(data, ensure_ascii=False, indent=2, sort_keys=True)
    return {
        "content": [{"type": "text", "text": text}],
        "structuredContent": data,
        "isError": False,
    }


def handle(message: dict[str, Any]) -> None:
    method = message.get("method")
    message_id = message.get("id")
    params = message.get("params") or {}

    if message_id is None and method and method.startswith("notifications/"):
        return

    try:
        if method == "initialize":
            respond(
                message_id,
                {
                    "protocolVersion": params.get("protocolVersion", "2024-11-05"),
                    "serverInfo": {"name": "no-rarity-catalog", "version": "0.1.0"},
                    "capabilities": {"tools": {}},
                },
            )
            return
        if method == "tools/list":
            respond(message_id, {"tools": [public_tool(tool) for tool in TOOLS]})
            return
        if method == "tools/call":
            name = params.get("name")
            arguments = params.get("arguments") or {}
            tool = next((candidate for candidate in TOOLS if candidate["name"] == name), None)
            if not tool:
                respond(message_id, error={"code": -32602, "message": f"unknown tool: {name}"})
                return
            data = dispatch(tool["_dispatch"], arguments)
            respond(message_id, tool_result(data))
            return
        respond(message_id, error={"code": -32601, "message": f"method not found: {method}"})
    except Exception as exc:  # Keep MCP process alive for clients.
        respond(message_id, error={"code": -32000, "message": str(exc)})


def main() -> int:
    for line in sys.stdin:
        if not line.strip():
            continue
        try:
            handle(json.loads(line))
        except json.JSONDecodeError as exc:
            respond(None, error={"code": -32700, "message": str(exc)})
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

