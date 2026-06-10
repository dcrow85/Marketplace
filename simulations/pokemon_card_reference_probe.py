#!/usr/bin/env python3
"""Probe Pokemon card reference sources and emit a bounded candidate packet."""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
RUNS = ROOT / "runs"

REQUIRED_NOT_CLAIMING = [
    "authenticity",
    "condition",
    "possession",
    "price_truth",
    "seller_card_language",
    "seller_inventory_existence",
]


def canonical_hash(payload: dict[str, Any]) -> str:
    body = json.dumps(payload, sort_keys=True, separators=(",", ":"), ensure_ascii=True).encode("utf-8")
    return "sha256:" + hashlib.sha256(body).hexdigest()


def fetch_json(url: str, headers: dict[str, str] | None = None) -> Any:
    request_headers = {
        "Accept": "application/json",
        "User-Agent": "MarketplacePokemonAlpha/0.1",
    }
    request_headers.update(headers or {})
    request = urllib.request.Request(url, headers=request_headers)
    with urllib.request.urlopen(request, timeout=20) as response:
        return json.loads(response.read().decode("utf-8"))


def pokemon_tcg_search(name: str, set_name: str, page_size: int = 5) -> dict[str, Any]:
    query = f'name:{name} set.name:"{set_name}"'
    params = {
        "q": query,
        "pageSize": str(page_size),
        "select": "id,name,set,number,rarity,images",
    }
    url = "https://api.pokemontcg.io/v2/cards?" + urllib.parse.urlencode(params)
    headers = {}
    api_key = os.environ.get("POKEMONTCG_API_KEY")
    if api_key:
        headers["X-Api-Key"] = api_key
    return {"source_url": url, "response": fetch_json(url, headers)}


def tcgdex_list(language: str, name: str) -> dict[str, Any]:
    url = f"https://api.tcgdex.net/v2/{language}/cards?" + urllib.parse.urlencode({"name": name})
    return {"source_url": url, "response": fetch_json(url)}


def tcgdex_card(language: str, card_id: str) -> dict[str, Any]:
    url = f"https://api.tcgdex.net/v2/{language}/cards/{urllib.parse.quote(card_id)}"
    try:
        response = fetch_json(url)
    except urllib.error.HTTPError as exc:
        response = {"status": exc.code, "error": exc.reason}
    return {"source_url": url, "response": response}


def build_reference_packet(pokemon_tcg_card: dict[str, Any], fetched_at: str) -> dict[str, Any]:
    card_set = pokemon_tcg_card["set"]
    return {
        "schema": "marketplace.pokemon_card_reference.v0.1",
        "trade_id": "probe:japanese_neo_espeon",
        "domain": "tcg",
        "game": "pokemon",
        "source": "pokemontcg.io",
        "source_card_id": pokemon_tcg_card["id"],
        "source_url": f"https://api.pokemontcg.io/v2/cards/{pokemon_tcg_card['id']}",
        "source_language": "en",
        "printed_name": pokemon_tcg_card["name"],
        "set_name": card_set["name"],
        "card_number": pokemon_tcg_card["number"],
        "rarity": pokemon_tcg_card.get("rarity", ""),
        "variant": "",
        "catalog_image_url": pokemon_tcg_card.get("images", {}).get("large", ""),
        "match_kind": "language_equivalent",
        "source_coverage": "english_catalog_anchor_for_japanese_claim",
        "selected_by": "buyer_agent",
        "fetched_at": fetched_at,
        "not_claiming": REQUIRED_NOT_CLAIMING,
    }


def run_probe() -> dict[str, Any]:
    fetched_at = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    ptcg = pokemon_tcg_search("espeon", "Neo Discovery")
    ptcg_cards = ptcg["response"].get("data", [])
    selected = next((card for card in ptcg_cards if card.get("id") == "neo2-1"), ptcg_cards[0] if ptcg_cards else None)

    tcgdex_en = tcgdex_card("en", "neo2-1")
    tcgdex_ja = tcgdex_card("ja", "neo2-1")
    tcgdex_ja_name = tcgdex_list("ja", "エーフィ")

    reference_packet = build_reference_packet(selected, fetched_at) if selected else {}
    if reference_packet:
        reference_packet["packet_hash"] = canonical_hash(reference_packet)

    japanese_exact_missing = tcgdex_ja["response"].get("status") == 404
    pass_status = bool(selected) and selected.get("id") == "neo2-1" and japanese_exact_missing

    return {
        "generated_at": fetched_at,
        "pass": pass_status,
        "interpretation": (
            "PokemonTCG.io anchors the English Neo Discovery Espeon catalog row. "
            "TCGdex anchors the English row but does not return the Japanese neo2-1 row in this probe, "
            "so the Japanese-language claim stays evidence-dependent instead of becoming database truth."
        ),
        "reference_packet": reference_packet,
        "source_results": {
            "pokemontcg_search": {
                "source_url": ptcg["source_url"],
                "count": len(ptcg_cards),
                "ids": [card.get("id") for card in ptcg_cards],
            },
            "tcgdex_en_neo2_1": {
                "source_url": tcgdex_en["source_url"],
                "status": tcgdex_en["response"].get("status", 200),
                "name": tcgdex_en["response"].get("name", ""),
                "variants": tcgdex_en["response"].get("variants", {}),
            },
            "tcgdex_ja_neo2_1": {
                "source_url": tcgdex_ja["source_url"],
                "status": tcgdex_ja["response"].get("status", 200),
                "error": tcgdex_ja["response"].get("error", ""),
            },
            "tcgdex_ja_espeon_name": {
                "source_url": tcgdex_ja_name["source_url"],
                "count": len(tcgdex_ja_name["response"]),
                "ids": [card.get("id") for card in tcgdex_ja_name["response"][:10]],
            },
        },
    }


def report_lines(summary: dict[str, Any]) -> list[str]:
    packet = summary["reference_packet"]
    lines = [
        f"# Pokemon Card Reference Probe: {summary['generated_at']}",
        "",
        f"- Pass: `{summary['pass']}`",
        f"- Packet hash: `{packet.get('packet_hash', '')}`",
        f"- Catalog candidate: `{packet.get('printed_name', '')} / {packet.get('set_name', '')} / #{packet.get('card_number', '')}`",
        f"- Match kind: `{packet.get('match_kind', '')}`",
        f"- Source coverage: `{packet.get('source_coverage', '')}`",
        "",
        "## Interpretation",
        "",
        summary["interpretation"],
        "",
        "## Non-Claims",
        "",
    ]
    for item in packet.get("not_claiming", []):
        lines.append(f"- `{item}`")
    lines.extend(["", "## Source Results", ""])
    for key, result in summary["source_results"].items():
        lines.append(f"### {key}")
        lines.append("")
        for result_key, value in result.items():
            lines.append(f"- `{result_key}`: `{value}`")
        lines.append("")
    return lines


def main() -> None:
    parser = argparse.ArgumentParser(description="Probe Pokemon card reference APIs.")
    parser.add_argument("--out-dir", type=Path, default=None)
    args = parser.parse_args()

    summary = run_probe()
    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    run_dir = args.out_dir or (RUNS / f"pokemon_card_reference_probe_{stamp}")
    run_dir.mkdir(parents=True, exist_ok=True)
    (run_dir / "summary.json").write_text(json.dumps(summary, indent=2, sort_keys=True) + "\n")
    (run_dir / "REPORT.md").write_text("\n".join(report_lines(summary)) + "\n")
    print(run_dir)
    print(json.dumps({"pass": summary["pass"], "packet_hash": summary["reference_packet"].get("packet_hash", "")}))


if __name__ == "__main__":
    main()
