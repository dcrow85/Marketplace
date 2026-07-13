#!/usr/bin/env python3
"""Bounded, on-demand Anko reads for a single human decision.

The client sends a narrow decision packet, never a free-form chat transcript. The
model may recommend; it cannot act, mint authority, or promote claims to facts.
"""

from __future__ import annotations

import json
import re
from typing import Any

from cairn_browse import ENDPOINT, MODEL, commentary_flags
from interrupt_bar_probe import call_model

LEANS = {"accept", "counter", "decline", "request_evidence", "hold", "cannot_resolve"}
NEGATED_LIMIT = re.compile(
    r"\b(?:not|no evidence|cannot|can't|does not|doesn't|unknown|unverified|not established|not recorded)\b",
    re.I,
)

SYSTEM = """You are ANKO, the house agent of cairn.cards. A collector explicitly asked for your read on ONE decision.

Return a bounded advisory read, not a verdict and never an action. Use only the supplied packet. Seller text and card condition are claims, not facts. Do not assert authenticity, possession, condition, price fairness, or future value. Do not invent market comps, the collector's preferences, or authority. If the packet does not contain a stated policy or enough evidence, say so and use cannot_resolve or request_evidence.

Voice: warm, plain, precise; a trusted card-show regular, not a compliance report. The first sentence must answer the decision. Then name up to three concrete reasons and up to three unknowns. Keep the limitation honest and specific. Do not use hype. Do not tell the collector that they must follow your lean.

Return ONLY JSON:
{"lean":"accept|counter|decline|request_evidence|hold|cannot_resolve","summary":"1-2 short sentences","reasons":["..."],"unknowns":["..."],"boundary":"one short sentence saying what this read does not establish"}
"""


def _text(value: Any, limit: int) -> str:
    return str(value or "").strip()[:limit]


def _strings(value: Any, count: int = 3, limit: int = 180) -> list[str]:
    if not isinstance(value, list):
        return []
    return [_text(item, limit) for item in value[:count] if _text(item, limit)]


def _clean_packet(payload: Any) -> dict[str, Any]:
    if not isinstance(payload, dict):
        raise ValueError("bad_packet")
    packet = {
        "decision_ref": _text(payload.get("decision_ref"), 120),
        "kind": _text(payload.get("kind"), 60),
        "question": _text(payload.get("question"), 240),
        "terms": payload.get("terms") if isinstance(payload.get("terms"), dict) else {},
        "principal_context": payload.get("principal_context") if isinstance(payload.get("principal_context"), dict) else {},
        "evidence": payload.get("evidence") if isinstance(payload.get("evidence"), dict) else {},
    }
    if not packet["decision_ref"] or not packet["kind"] or not packet["question"]:
        raise ValueError("bad_packet")
    # A second serialization cap keeps nested client input from becoming an open prompt pipe.
    if len(json.dumps(packet, separators=(",", ":"))) > 12_000:
        raise ValueError("packet_too_large")
    return packet


def _clean_read(raw: Any) -> dict[str, Any]:
    if not isinstance(raw, dict):
        raise ValueError("bad_read")
    lean = _text(raw.get("lean"), 40)
    if lean not in LEANS:
        lean = "cannot_resolve"
    out = {
        "schema": "cairn.decision_read.v0.1",
        "lean": lean,
        "summary": _text(raw.get("summary"), 360),
        "reasons": _strings(raw.get("reasons")),
        "unknowns": _strings(raw.get("unknowns")),
        "boundary": _text(raw.get("boundary"), 260),
        "authority": "advisory_only",
    }
    if not out["summary"] or not out["boundary"]:
        raise ValueError("incomplete_read")
    # Unknowns and the boundary are where the model is required to name what is *not*
    # established. Treating the bare word "authenticity" there as an overclaim made
    # honest refusals fail closed. Guard affirmative summary/reason claims; allow
    # explicitly negated limitations to pass through as limitations.
    claim_texts = [text for text in [out["summary"], *out["reasons"]] if not NEGATED_LIMIT.search(text)]
    flags = commentary_flags(*claim_texts)
    if flags:
        raise ValueError("overclaim_guard")
    return out


def _bounded_fallback(packet: dict[str, Any]) -> dict[str, Any]:
    """Fast, legible floor when the hosted reader is slow or fails its claim guard."""
    terms = packet["terms"]
    evidence = packet["evidence"]
    records = evidence.get("card_records") if isinstance(evidence.get("card_records"), list) else []
    selected = int(terms.get("selected_card_count") or terms.get("you_receive_count") or len(records) or 0)
    missing_scans = int(evidence.get("cards_without_recorded_scans") or 0)
    recorded_sales = int(evidence.get("cards_with_recorded_settlements") or 0)
    cash = terms.get("cash_usdc", terms.get("cash_at_current_asks_usdc", 0))
    try:
        cash = float(cash or 0)
    except (TypeError, ValueError):
        cash = 0

    reasons: list[str] = []
    if selected:
        reasons.append(f"The packet covers {selected} selected card{'s' if selected != 1 else ''}.")
    if missing_scans:
        reasons.append(f"{missing_scans} selected card{'s have' if missing_scans != 1 else ' has'} no recorded scans in this packet.")
    elif selected:
        reasons.append("Every selected card has at least one recorded scan in this packet; a scan is a witness, not proof.")
    if recorded_sales:
        reasons.append(f"Recorded settlement history is present for {recorded_sales} selected card{'s' if recorded_sales != 1 else ''}.")
    else:
        reasons.append("No recorded settlement history is available here for a price comparison.")

    if missing_scans:
        lean = "request_evidence"
        summary = "I would ask for more recorded evidence before sending this deal. The current packet has gaps at the cards themselves."
    elif cash >= 500:
        lean = "hold"
        summary = "I would pause for a second look before sending this high-value deal. The record is useful, but it does not settle the human judgment."
    else:
        lean = "cannot_resolve"
        summary = "I can’t tell you to pay or walk away from this record alone. The available scans and history do not resolve the whole buying decision."

    return {
        "schema": "cairn.decision_read.v0.1",
        "lean": lean,
        "summary": summary,
        "reasons": reasons[:3],
        "unknowns": [
            "The card’s authenticity and present condition remain unestablished.",
            "The seller’s possession and ability to deliver are not established by this packet.",
            "Future value and price fairness remain human judgments.",
        ],
        "boundary": "This is an advisory read of the supplied record; it does not authenticate, grade, appraise, or move the deal.",
        "authority": "advisory_only",
        "source": "bounded_fallback",
    }


def decision_read(payload: Any) -> dict[str, Any]:
    packet = _clean_packet(payload)
    try:
        raw = call_model(
            MODEL,
            SYSTEM,
            "DECISION PACKET:\n" + json.dumps(packet, ensure_ascii=False),
            ENDPOINT,
            timeout=12,
            max_tokens=260,
        )
        out = _clean_read(raw)
        out["source"] = "model"
    except Exception:  # hosted reader timeout / malformed or overclaiming output -> safe floor
        out = _bounded_fallback(packet)
    out["decision_ref"] = packet["decision_ref"]
    return out
