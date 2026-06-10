#!/usr/bin/env python3
"""Local No Rarity house-agent demo server.

Serves a small HTML demo and proxies bounded card/profile context to the local
Qwen MLX server. The browser never decides protocol facts; it receives a
deterministic binder read and a Qwen collector-facing explanation.
"""

from __future__ import annotations

import json
import mimetypes
import os
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
CATALOG_PATH = ROOT / "data" / "no-rarity-base-set.json"
QWEN_URL = os.environ.get("QWEN_MLX_URL", "http://127.0.0.1:8080/v1/chat/completions")

PROFILE_RANK = {"NR-0": 0, "NR-A": 1, "NR-B": 2, "NR-C": 3, "NR-D": 3}
QS_TEXT_CHECK_IDS = {"PMCG1-071", "PMCG1-072", "PMCG1-073", "PMCG1-076", "PMCG1-093"}

COLLECTORS = [
    {
        "collector_id": "binder_completionist",
        "name": "Mika",
        "archetype": "binder completionist",
        "style": "fills pages quietly; avoids high ceremony on low-value rows",
        "budget": "$450 total / $45 per card",
        "attention": "low",
        "risk": "medium",
    },
    {
        "collector_id": "holo_grail_hunter",
        "name": "Rowan",
        "archetype": "high-value holo hunter",
        "style": "wants the right copy, not the fast copy",
        "budget": "$6,500 total / $3,500 per card",
        "attention": "high",
        "risk": "low",
    },
    {
        "collector_id": "tell_specialist",
        "name": "Sora",
        "archetype": "print-run tell specialist",
        "style": "cares about correction tells and Quick Starter traps",
        "budget": "$1,200 total / $650 per card",
        "attention": "medium",
        "risk": "medium-low",
    },
    {
        "collector_id": "art_line_collector",
        "name": "Jun",
        "archetype": "illustrator and character-feel collector",
        "style": "lets card charm matter, but keeps the evidence boundary intact",
        "budget": "$800 total / $160 per card",
        "attention": "medium",
        "risk": "medium",
    },
    {
        "collector_id": "seller_collector",
        "name": "Avery",
        "archetype": "collector-seller with duplicates",
        "style": "will document once, but attention has to be priced",
        "budget": "$900 total / $180 per card",
        "attention": "low-to-medium",
        "risk": "medium",
    },
    {
        "collector_id": "slab_investor",
        "name": "Theo",
        "archetype": "slab-first investor",
        "style": "wants certs, labels, and bounded resale evidence",
        "budget": "$5,000 total / $2,500 per card",
        "attention": "medium",
        "risk": "low",
    },
]


def load_catalog() -> dict[str, Any]:
    return json.loads(CATALOG_PATH.read_text())


CATALOG = load_catalog()
CARDS = CATALOG["cards"]
CARD_BY_ID = {card["tcgdex_id"]: card for card in CARDS}
COLLECTOR_BY_ID = {collector["collector_id"]: collector for collector in COLLECTORS}


def card_brief(card: dict[str, Any]) -> dict[str, Any]:
    profile = card["agent_decision_profile"]
    product = card["product_scope"]
    reference = card.get("no_rarity_reference", {})
    return {
        "id": card["tcgdex_id"],
        "local_id": card["local_id"],
        "name_en": card["name_en"],
        "name_ja": product.get("japanese_name_from_research", ""),
        "romaji": product.get("romaji_from_research", ""),
        "rarity": card.get("rarity_source", ""),
        "holo": bool(card.get("holo_source")),
        "active_no_rarity_target": bool(card.get("no_rarity_target")),
        "profile": profile["baseline_evidence_profile_id"],
        "profile_name": profile["baseline_evidence_profile_name"],
        "value_band": profile["value_band"],
        "collector_note": card.get("collector_texture", {}).get("note", ""),
        "recommended_evidence": profile.get("recommended_evidence", [])[:8],
        "spendability_boundaries": profile.get("spendability_boundaries", [])[:6],
        "what_agent_does_not_know": profile.get("what_agent_does_not_know", [])[:7],
        "tells": profile.get("card_specific_tells", []),
        "traps": card.get("variant_traps", []),
        "image": reference.get("image_small") or reference.get("image_large") or "",
        "source_url": reference.get("source_page_url", ""),
        "not_claiming": card.get("not_claiming", []),
    }


def search_cards(query: str, limit: int = 30) -> list[dict[str, Any]]:
    terms = [term.lower() for term in query.split() if term.strip()]
    rows = []
    for card in CARDS:
        haystack = " ".join(
            [
                card.get("tcgdex_id", ""),
                card.get("local_id", ""),
                card.get("name_en", ""),
                card.get("product_scope", {}).get("japanese_name_from_research", ""),
                card.get("product_scope", {}).get("romaji_from_research", ""),
                card.get("rarity_source", ""),
                card.get("agent_decision_profile", {}).get("baseline_evidence_profile_id", ""),
                "holo" if card.get("holo_source") else "",
            ]
        ).lower()
        if not terms or all(term in haystack for term in terms):
            rows.append(card_brief(card))
    return rows[:limit]


def deterministic_read(
    card: dict[str, Any],
    stance: str,
    evidence_level: str,
    seller_trust: str,
    collector: dict[str, Any],
) -> dict[str, Any]:
    brief = card_brief(card)
    profile = brief["profile"]
    required_rank = PROFILE_RANK.get(profile, 0)
    provided_rank = PROFILE_RANK.get(evidence_level, 0)
    walls: list[str] = []
    asks: list[str] = []
    action = "continue"

    if not brief["active_no_rarity_target"]:
        action = "reject_premium_no_rarity"
        walls.append("caveat row: this is not an active No Rarity premium target")
        asks.append("do not market this as a premium No Rarity target")
    elif stance in {"want", "offer"} and provided_rank < required_rank:
        action = "request_evidence"
        walls.append(f"evidence floor: {profile} required, {evidence_level} offered")
        asks.extend(brief["recommended_evidence"][:5])
    elif stance == "offer" and profile == "NR-C" and seller_trust in {"thin", "unknown"}:
        action = "human_review"
        walls.append("high-value holo from thin seller needs verifier, bond, or local handoff")
        asks.extend(["verifier review", "fresh possession continuity", "bond scoped to wrong item and condition"])
    elif stance == "extra":
        action = "draft_sell_stance"
        walls.append("public sharing should be explicit and revocable")
        asks.extend(["full front/back", "symbol crop", "fresh nonce if responding to funded buyer"])
    elif stance == "have":
        action = "document_privately"
        walls.append("collection memory can start without making a public sell claim")
        asks.extend(["optional full front/back", "optional symbol crop", "condition guess can remain private"])
    elif stance == "want":
        action = "draft_want"
        walls.append("catalog row can anchor intent, not physical truth")
        asks.extend(brief["recommended_evidence"][:4])

    if card["tcgdex_id"] in QS_TEXT_CHECK_IDS:
        walls.append("Quick Starter text-layout trap")
        asks.append("readable Japanese text-layout comparison")

    if collector["risk"] == "low" and stance in {"want", "offer"} and profile in {"NR-C", "NR-D"}:
        walls.append("collector risk tolerance is low")
        asks.append("human review before funding")

    return {
        "action": action,
        "card": brief,
        "stance": stance,
        "collector": collector,
        "evidence_level": evidence_level,
        "seller_trust": seller_trust,
        "walls": walls,
        "asks": list(dict.fromkeys(asks)),
        "protocol_can_enforce": [
            "which packet was cited",
            "which evidence profile was declared",
            "signatures, hashes, role authority, explicit risk ownership",
            "later route and settlement state transitions",
        ],
        "still_judgment": [
            "seller possession",
            "seller-card authenticity",
            "true condition",
            "No Rarity truth of the physical card",
            "price truth",
        ],
    }


def qwen_agent(payload: dict[str, Any]) -> dict[str, Any]:
    prompt = f"""You are the Blank Corner Club house agent for a Japanese Pokemon No Rarity binder.

Return ONLY valid JSON with keys:
line, recommendation, next_action, human_question, seller_or_buyer_message, can_claim, cannot_claim.

Rules:
- Be collector-native and concise.
- Do not say the binder/catalog/protocol proves seller possession, authenticity, true condition, price truth, delivery, or No Rarity truth.
- Preserve the deterministic action. Do not upgrade request_evidence, human_review, or reject into proceed.
- next_action MUST exactly equal deterministic_read.action.
- If deterministic_read.action is continue, do not ask for required evidence. Only mention optional extra evidence if the human asked for more comfort.
- Mention the card by Japanese name first when possible.

Context:
{json.dumps(payload, ensure_ascii=False, sort_keys=True)}
"""
    request = {
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.1,
        "max_tokens": 700,
    }
    req = urllib.request.Request(
        QWEN_URL,
        data=json.dumps(request).encode("utf-8"),
        headers={"Content-Type": "application/json"},
    )
    started = time.time()
    with urllib.request.urlopen(req, timeout=90) as response:
        body = json.loads(response.read().decode("utf-8"))
    content = body["choices"][0]["message"]["content"].strip()
    parsed = extract_json(content)
    parsed["_latency_ms"] = int((time.time() - started) * 1000)
    parsed["_raw"] = content
    return parsed


def wall_bound_agent(read: dict[str, Any], agent: dict[str, Any]) -> dict[str, Any]:
    """Let Qwen write prose, but never let it move the protocol wall."""

    expected = str(read["action"])
    claimed = str(agent.get("next_action", "")).strip()
    recommendation = str(agent.get("recommendation", "")).lower()
    conflicts = claimed and claimed != expected
    if expected == "continue" and "request" in recommendation and "evidence" in recommendation:
        conflicts = True

    if conflicts:
        agent.update(fallback_agent_read(read))

    agent["next_action"] = expected
    agent.setdefault("can_claim", read["protocol_can_enforce"])
    agent.setdefault("cannot_claim", read["still_judgment"])
    return agent


def fallback_agent_read(read: dict[str, Any]) -> dict[str, Any]:
    card = read["card"]
    ja_name = card["name_ja"] or card["name_en"]
    name = f"{ja_name} ({card['romaji']})" if card.get("romaji") else ja_name
    action = read["action"]
    asks = ", ".join(read["asks"][:3])

    if action == "continue":
        line = f"{name} clears this declared gate. That is permission to continue, not proof of the physical card."
        recommendation = "Continue with the next protocol step while keeping possession, authenticity, condition, and price as judgment-bound."
        question = "Do you want me to draft the next step around this card?"
        message = "This packet is coherent enough for the declared gate. I am not treating it as final authenticity or condition proof."
    elif action == "request_evidence":
        line = f"{name} is not ready for this gate yet."
        recommendation = f"Ask for the missing evidence floor: {asks}."
        question = "Is this worth the seller attention cost, or should I pass?"
        message = f"Please send the missing evidence for {name}: {asks}."
    elif action == "human_review":
        line = f"{name} needs a human or verifier before money moves."
        recommendation = "Pause for review because the value, seller trust, or collector risk setting makes judgment too expensive to hide."
        question = "Do you want human review, verifier review, or a local handoff path?"
        message = "The buyer wants a bounded review path before funding or route lock."
    elif action == "reject_premium_no_rarity":
        line = f"{name} should not be treated as a premium No Rarity target from this row."
        recommendation = "Reject the No Rarity premium claim unless a stronger catalog row is supplied."
        question = "Should I keep it as ordinary collection memory instead?"
        message = "I cannot use this row as a premium No Rarity claim."
    elif action == "draft_sell_stance":
        line = f"{name} can become a sell stance, but public sharing should be explicit."
        recommendation = "Draft the sale posture and ask the human which evidence is public."
        question = "Which photos and condition notes should be public?"
        message = "I can share the declared sell packet once the owner confirms public visibility."
    elif action == "document_privately":
        line = f"{name} can enter private collection memory without becoming a sell claim."
        recommendation = "Save the private state first; harden later with photos, symbol crop, and condition notes."
        question = "Do you want to add photos now or keep this lightweight?"
        message = "This is private collection documentation, not a public sale claim."
    else:
        line = f"{name} is ready to become a bounded want."
        recommendation = "Draft the want with the catalog row, evidence floor, and open judgment fields."
        question = "What price and condition band should I use?"
        message = "The buyer has a bounded want anchored to this catalog row."

    return {
        "line": line,
        "recommendation": recommendation,
        "next_action": action,
        "human_question": question,
        "seller_or_buyer_message": message,
        "can_claim": read["protocol_can_enforce"],
        "cannot_claim": read["still_judgment"],
        "_wall_corrected": True,
    }


def extract_json(text: str) -> dict[str, Any]:
    stripped = text.strip()
    if stripped.startswith("```"):
        stripped = stripped.strip("`").strip()
        if stripped.startswith("json"):
            stripped = stripped[4:].strip()
    try:
        return json.loads(stripped)
    except json.JSONDecodeError:
        start = stripped.find("{")
        if start >= 0:
            decoder = json.JSONDecoder()
            parsed, _ = decoder.raw_decode(stripped[start:])
            if isinstance(parsed, dict):
                return parsed
    raise ValueError(f"Qwen did not return JSON: {text[:240]}")


def json_response(handler: BaseHTTPRequestHandler, payload: Any, status: int = 200) -> None:
    body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    handler.send_response(status)
    handler.send_header("Content-Type", "application/json; charset=utf-8")
    handler.send_header("Content-Length", str(len(body)))
    handler.send_header("Access-Control-Allow-Origin", "*")
    handler.end_headers()
    handler.wfile.write(body)


class Handler(BaseHTTPRequestHandler):
    server_version = "QwenHouseAgentDemo/0.1"

    def do_OPTIONS(self) -> None:
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.end_headers()

    def do_GET(self) -> None:
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path == "/api/demo/cards":
            qs = urllib.parse.parse_qs(parsed.query)
            query = qs.get("q", [""])[0]
            limit = int(qs.get("limit", ["40"])[0])
            json_response(self, {"cards": search_cards(query, limit), "collectors": COLLECTORS})
            return
        if parsed.path == "/api/demo/collectors":
            json_response(self, {"collectors": COLLECTORS})
            return
        path = parsed.path
        if path == "/":
            path = "/qwen-agent-demo.html"
        target = (ROOT / path.lstrip("/")).resolve()
        if not str(target).startswith(str(ROOT)) or not target.exists() or target.is_dir():
            self.send_error(404)
            return
        content_type = mimetypes.guess_type(str(target))[0] or "application/octet-stream"
        data = target.read_bytes()
        self.send_response(200)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def do_POST(self) -> None:
        parsed = urllib.parse.urlparse(self.path)
        length = int(self.headers.get("Content-Length", "0"))
        raw = self.rfile.read(length).decode("utf-8")
        try:
            payload = json.loads(raw or "{}")
        except json.JSONDecodeError:
            json_response(self, {"error": "invalid_json"}, status=400)
            return
        if parsed.path != "/api/demo/agent":
            self.send_error(404)
            return
        card_id = payload.get("card_id", "PMCG1-035")
        collector_id = payload.get("collector_id", "binder_completionist")
        card = CARD_BY_ID.get(card_id)
        collector = COLLECTOR_BY_ID.get(collector_id, COLLECTORS[0])
        if not card:
            json_response(self, {"error": "unknown_card_id"}, status=404)
            return
        read = deterministic_read(
            card=card,
            stance=payload.get("stance", "want"),
            evidence_level=payload.get("evidence_level", "NR-A"),
            seller_trust=payload.get("seller_trust", "known"),
            collector=collector,
        )
        agent_payload = {
            "deterministic_read": read,
            "human_note": payload.get("message", ""),
        }
        try:
            agent = wall_bound_agent(read, qwen_agent(agent_payload))
        except (urllib.error.URLError, TimeoutError, ValueError) as exc:
            json_response(
                self,
                {
                    "deterministic_read": read,
                    "agent": {
                        "line": "I can give the wall read, but Qwen is not answering right now.",
                        "recommendation": read["action"],
                        "next_action": read["asks"][:3],
                        "human_question": "",
                        "seller_or_buyer_message": "",
                        "can_claim": read["protocol_can_enforce"],
                        "cannot_claim": read["still_judgment"],
                        "error": str(exc),
                    },
                },
            )
            return
        json_response(self, {"deterministic_read": read, "agent": agent})


def main() -> int:
    port = int(os.environ.get("MARKETPLACE_DEMO_PORT", "8766"))
    server = ThreadingHTTPServer(("127.0.0.1", port), Handler)
    print(f"Serving Qwen house-agent demo at http://127.0.0.1:{port}/qwen-agent-demo.html")
    print(f"Proxying Qwen via {QWEN_URL}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
