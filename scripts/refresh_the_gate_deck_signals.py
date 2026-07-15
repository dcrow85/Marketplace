#!/usr/bin/env python3
"""Capture dated public deck signals and a bounded card-membership search index.

The public gallery is useful evidence of what builders are sharing. It is not a
win-rate feed or a census of the global metagame. This script keeps that
distinction explicit while producing a small, refreshable agent artifact.
"""

from __future__ import annotations

import argparse
import base64
import json
import re
import sys
from collections import Counter
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any
from urllib.parse import urlencode, urljoin
from urllib.request import Request, urlopen


ROOT = Path(__file__).resolve().parents[1]
SNAPSHOT_DIR = ROOT / "data" / "azuki-tcg" / "source-snapshots"
SNAPSHOT_GLOB = "the_gate_deck_signals_*.json"
THE_GATE = "https://thegateikz.com/"
SCHEMA = "cairn.azuki.community_deck_signals.v2"
WINDOW_DAYS = (7, 14, 30)
CARD_NAME_ALIASES = {
    "Fire Brand Renji": "Firebrand Renji",
    "Lounge Siren, Saiko": "Lounge Siren, Saeko",
}


def fetch_text(url: str) -> str:
    request = Request(url, headers={"User-Agent": "CairnCatalogResearch/1.0"})
    with urlopen(request, timeout=30) as response:
        return response.read().decode("utf-8")


def decode_jwt_payload(token: str) -> dict[str, Any]:
    payload = token.split(".")[1]
    payload += "=" * (-len(payload) % 4)
    return json.loads(base64.urlsafe_b64decode(payload))


def discover_public_client() -> tuple[str, str, str]:
    homepage = fetch_text(THE_GATE)
    asset_match = re.search(r"[\"'](/assets/index-[^\"']+\.js)[\"']", homepage)
    if not asset_match:
        raise RuntimeError("The Gate client asset was not discoverable")
    asset_url = urljoin(THE_GATE, asset_match.group(1))
    client = fetch_text(asset_url)
    base_match = re.search(r"https://[a-z]+\.supabase\.co", client)
    if not base_match:
        raise RuntimeError("The Gate public data endpoint was not discoverable")
    tokens = re.findall(r"eyJ[A-Za-z0-9._-]{100,}", client)
    anon_key = next(
        (token for token in tokens if decode_jwt_payload(token).get("role") == "anon"),
        None,
    )
    if not anon_key:
        raise RuntimeError("The Gate public anonymous client credential was not discoverable")
    return base_match.group(0) + "/rest/v1", anon_key, asset_url


def api_get(base: str, key: str, table: str, **params: str) -> list[dict[str, Any]]:
    query_params = {
        (name[:-1] if name.endswith("_") else name): value
        for name, value in params.items()
    }
    query = urlencode(query_params, safe=",()*!:.|")
    request = Request(
        f"{base}/{table}?{query}",
        headers={
            "apikey": key,
            "Authorization": f"Bearer {key}",
            "Accept": "application/json",
            "User-Agent": "CairnCatalogResearch/1.0",
        },
    )
    with urlopen(request, timeout=30) as response:
        value = json.loads(response.read().decode("utf-8"))
    if not isinstance(value, list):
        raise RuntimeError(f"Unexpected {table} response shape")
    return value


def parse_time(value: str) -> datetime:
    parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    return parsed if parsed.tzinfo else parsed.replace(tzinfo=timezone.utc)


def canonical_name(value: str | None) -> str:
    name = str(value or "Unknown").strip()
    name = re.sub(r"\s*\([^)]*\)(?:\s*\d+)?\s*$", "", name).strip()
    name = re.sub(r"\s+\d+$", "", name).strip()
    return CARD_NAME_ALIASES.get(name, name) or "Unknown"


def card_type(row: dict[str, Any]) -> str:
    return str((row.get("card") or {}).get("card_type") or "").casefold()


def is_leader(row: dict[str, Any]) -> bool:
    return "leader" in card_type(row) or "legend" in card_type(row)


def is_gate(row: dict[str, Any]) -> bool:
    return card_type(row) == "gate"


def is_main_card(row: dict[str, Any]) -> bool:
    card = row.get("card") or {}
    return not is_leader(row) and not is_gate(row) and str(card.get("element") or "").casefold() != "ikz"


def named_card(deck: dict[str, Any], predicate: Any) -> dict[str, Any]:
    row = next((item for item in deck.get("deck_cards") or [] if predicate(item)), {})
    return row.get("card") or {}


def summarize_deck(deck: dict[str, Any]) -> dict[str, Any]:
    leader = named_card(deck, is_leader)
    gate = named_card(deck, is_gate)
    creator = deck.get("creator") or {}
    main_count = sum(
        int(row.get("quantity") or 0)
        for row in deck.get("deck_cards") or []
        if is_main_card(row)
    )
    return {
        "name": deck.get("name") or "Untitled deck",
        "url": urljoin(THE_GATE, f"decks/{deck.get('slug', '')}"),
        "creator": creator.get("display_name") or creator.get("username") or "The Gate contributor",
        "created_at": deck.get("created_at"),
        "updated_at": deck.get("updated_at"),
        "leader": leader.get("name") or "Unknown",
        "leader_family": canonical_name(leader.get("name")),
        "gate": gate.get("name") or "Unknown",
        "gate_family": canonical_name(gate.get("name")),
        "element": str(leader.get("element") or "unknown").title(),
        "main_card_count": main_count,
        "complete_50_plus_leader_gate": main_count == 50 and bool(leader) and bool(gate),
    }


def searchable_deck(deck: dict[str, Any]) -> dict[str, Any]:
    """Keep only factual public-list membership needed to resolve a deck search.

    Card art, rules text, notes, and copied page prose stay out of the artifact. Print
    treatment suffixes collapse to the catalogue-facing family name, and duplicate
    rows combine into one recorded quantity.
    """
    quantities: Counter[str] = Counter()
    for row in deck.get("deck_cards") or []:
        if not is_main_card(row):
            continue
        name = canonical_name((row.get("card") or {}).get("name"))
        quantity = max(0, int(row.get("quantity") or 0))
        if name != "Unknown" and quantity:
            quantities[name] += quantity
    return {
        **summarize_deck(deck),
        "main_cards": [
            {"name": name, "quantity": quantity}
            for name, quantity in sorted(
                quantities.items(), key=lambda item: (-item[1], item[0].casefold())
            )
        ],
    }


def count_rows(counter: Counter[str]) -> list[dict[str, Any]]:
    return [
        {"name": name, "deck_count": count}
        for name, count in sorted(counter.items(), key=lambda item: (-item[1], item[0].casefold()))
    ]


def window_summary(
    decks: list[dict[str, Any]], capture_at: datetime, days: int
) -> dict[str, Any]:
    cutoff = capture_at - timedelta(days=days)
    selected_records = [deck for deck in decks if parse_time(str(deck["created_at"])) >= cutoff]
    selected = [
        deck for deck in selected_records if summarize_deck(deck)["complete_50_plus_leader_gate"]
    ]
    summaries = [summarize_deck(deck) for deck in selected]
    leader_counts = Counter(item["leader_family"] for item in summaries)
    gate_counts = Counter(item["gate_family"] for item in summaries)
    element_counts = Counter(item["element"] for item in summaries)
    family_counts: Counter[tuple[str, str, str]] = Counter(
        (item["leader_family"], item["gate_family"], item["element"])
        for item in summaries
    )
    family_examples: dict[tuple[str, str, str], list[str]] = {}
    for item in summaries:
        key = (item["leader_family"], item["gate_family"], item["element"])
        family_examples.setdefault(key, [])
        if item["name"] not in family_examples[key] and len(family_examples[key]) < 3:
            family_examples[key].append(item["name"])

    inclusion_counts: Counter[str] = Counter()
    for deck in selected:
        included = {
            canonical_name((row.get("card") or {}).get("name"))
            for row in deck.get("deck_cards") or []
            if is_main_card(row)
        }
        inclusion_counts.update(included)

    total = len(selected)
    archetypes = [
        {
            "leader": leader,
            "gate": gate,
            "element": element,
            "deck_count": count,
            "share_of_window": round(count / total, 3) if total else 0,
            "example_deck_names": family_examples[(leader, gate, element)],
        }
        for (leader, gate, element), count in sorted(
            family_counts.items(),
            key=lambda item: (-item[1], item[0][0].casefold(), item[0][1].casefold()),
        )
    ]
    common_cards = [
        {
            "name": name,
            "included_in_decks": count,
            "share_of_window": round(count / total, 3) if total else 0,
        }
        for name, count in sorted(
            inclusion_counts.items(), key=lambda item: (-item[1], item[0].casefold())
        )[:20]
    ]
    return {
        "days": days,
        "cutoff_at": cutoff.isoformat().replace("+00:00", "Z"),
        "public_record_count": len(selected_records),
        "deck_count": total,
        "frequency_basis": "Records with exactly 50 main cards plus one Leader and one Gate.",
        "excluded_non_50_record_count": len(selected_records) - total,
        "leader_frequency": count_rows(leader_counts),
        "gate_frequency": count_rows(gate_counts),
        "element_frequency": count_rows(element_counts),
        "leader_gate_frequency": archetypes,
        "common_card_inclusion": common_cards,
    }


def summarize_tournaments(
    tournaments: list[dict[str, Any]], placements: list[dict[str, Any]]
) -> list[dict[str, Any]]:
    by_tournament: dict[str, list[dict[str, Any]]] = {}
    for placement in placements:
        deck = placement.get("deck")
        deck_summary = summarize_deck(deck) if deck else None
        by_tournament.setdefault(str(placement.get("tournament_id")), []).append(
            {
                "placement": placement.get("placement"),
                "player": placement.get("player_name") or "Unknown player",
                "record": placement.get("record"),
                "deck": deck_summary,
            }
        )
    output = []
    for tournament in tournaments:
        rows = sorted(
            by_tournament.get(str(tournament.get("id")), []),
            key=lambda item: int(item.get("placement") or 999),
        )
        output.append(
            {
                "name": tournament.get("name"),
                "url": urljoin(THE_GATE, f"tournaments/{tournament.get('slug', '')}"),
                "date": tournament.get("date"),
                "attendance": tournament.get("attendance"),
                "placements": rows,
            }
        )
    return output


def build_snapshot() -> dict[str, Any]:
    capture_at = datetime.now(timezone.utc)
    base, key, client_asset = discover_public_client()
    deck_select = (
        "id,slug,name,official_tag,created_at,updated_at,is_public,is_author_published,"
        "creator:profiles!creator_id(display_name,username),"
        "deck_cards(quantity,card:cards(id,name,element,card_type,ikz_cost))"
    )
    decks = api_get(
        base,
        key,
        "decks",
        select=deck_select,
        or_="(is_public.eq.true,is_author_published.eq.true)",
        order="created_at.desc",
    )
    homepage_decks = api_get(
        base,
        key,
        "decks",
        select=deck_select,
        is_public="eq.true",
        order="updated_at.desc",
        limit="4",
    )
    tournaments = api_get(
        base,
        key,
        "tournaments",
        select="*",
        status="eq.published",
        order="date.desc",
    )
    placement_select = (
        "placement,player_name,record,tournament_id,"
        "deck:decks(id,slug,name,created_at,updated_at,"
        "creator:profiles!creator_id(display_name,username),"
        "deck_cards(quantity,card:cards(name,element,card_type,ikz_cost)))"
    )
    placements = api_get(
        base,
        key,
        "tournament_placements",
        select=placement_select,
        order="placement.asc",
    )
    summaries = [summarize_deck(deck) for deck in decks]
    complete_summaries = [item for item in summaries if item["complete_50_plus_leader_gate"]]
    all_leaders = Counter(item["leader_family"] for item in complete_summaries)
    all_elements = Counter(item["element"] for item in complete_summaries)
    event_summaries = summarize_tournaments(tournaments, placements)
    return {
        "schema": SCHEMA,
        "snapshot_date": capture_at.date().isoformat(),
        "captured_at": capture_at.isoformat().replace("+00:00", "Z"),
        "source": {
            "id": "the-gate-ikz-public-decks",
            "name": "The Gate",
            "url": THE_GATE,
            "deck_gallery_url": urljoin(THE_GATE, "decks"),
            "tournaments_url": urljoin(THE_GATE, "tournaments"),
            "client_asset_url": client_asset,
            "authority_label": "independent_community_source",
            "capture_method": "Anonymous read-only records requested through the same public data interface used by The Gate client.",
            "copyright_boundary": "This artifact stores aggregate counts, compact deck summaries, and a factual public-deck search index of card names and quantities. It does not copy article text, card text, card images, or builder notes.",
        },
        "signal_definitions": {
            "newest_public_records": "Public or author-published gallery records ordered by their created_at timestamp. A record may have been made public later.",
            "homepage_recent": "The four public records The Gate homepage would select by most recent updated_at timestamp at capture time. This is visibility/recency, not engagement rank.",
            "recent_public_frequency": "Counts among records with exactly 50 main cards plus one Leader and one Gate within an exact trailing created_at window. This is a self-selected public-submission signal, not a player-population estimate or a ruling that the list is otherwise legal.",
            "common_card_inclusion": "Number of records in a window containing a gameplay card at least once, with print-treatment suffixes collapsed. It is not copy count, recommendation, or win rate.",
            "tournament_result": "A dated placement attached to a published The Gate tournament record. It is competitive evidence for that event only.",
            "popular_language_policy": "Anko may call a leader, gate, or card frequent in recent public submissions. He must not call it the global meta, most played, best, or proven from this signal alone.",
            "deck_search_entry": "A public deck name plus its recorded Leader, Gate, and main-card names and quantities. This supports exact deck-name and archetype search; it is not strategic analysis or a recommendation.",
        },
        "engagement_availability": {
            "public_aggregate_available": False,
            "note": "The public deck pages do not display aggregate view, save, or share counts, and anonymous reads did not provide a usable engagement aggregate at capture time. No engagement ranking is claimed.",
        },
        "coverage": {
            "public_or_author_published_decks": len(decks),
            "complete_50_plus_leader_gate": sum(item["complete_50_plus_leader_gate"] for item in summaries),
            "published_tournaments": len(tournaments),
            "published_placements": len(placements),
        },
        "all_time_public_gallery_context": {
            "leader_frequency": count_rows(all_leaders),
            "element_frequency": count_rows(all_elements),
            "frequency_basis_decks": len(complete_summaries),
            "note": "All-time gallery counts use records with exactly 50 main cards plus one Leader and one Gate. They do not establish current activity, unique players, or legality beyond that shape.",
        },
        "homepage_recent_decks": [summarize_deck(deck) for deck in homepage_decks],
        "newest_decks": complete_summaries[:16],
        "deck_search_index": [searchable_deck(deck) for deck in decks],
        "recent_windows": {
            f"{days}d": window_summary(decks, capture_at, days) for days in WINDOW_DAYS
        },
        "tournament_results": event_summaries,
        "not_claiming": [
            "This is not an official Azuki TCG source or deck ranking.",
            "Public gallery frequency is not view, save, share, ownership, sales, attendance, or unique-player popularity.",
            "A newly created or recently updated record is not necessarily a new archetype.",
            "A deck name is user-authored and does not establish a canonical archetype label.",
            "Tournament placements establish only the reported result at the named dated event, not a current global metagame or expected win rate.",
            "The snapshot is time-bound and should be refreshed before making current claims after its capture date.",
        ],
    }


def newest_snapshot() -> Path:
    paths = sorted(SNAPSHOT_DIR.glob(SNAPSHOT_GLOB))
    if not paths:
        raise FileNotFoundError(f"No {SNAPSHOT_GLOB} snapshot exists")
    return paths[-1]


def validate_snapshot(snapshot: dict[str, Any]) -> None:
    if snapshot.get("schema") != SCHEMA:
        raise ValueError("deck-signal schema is missing or changed")
    if (snapshot.get("source") or {}).get("authority_label") != "independent_community_source":
        raise ValueError("The Gate authority label changed")
    if (snapshot.get("engagement_availability") or {}).get("public_aggregate_available") is not False:
        raise ValueError("engagement is being treated as publicly ranked")
    coverage = snapshot.get("coverage") or {}
    total = int(coverage.get("public_or_author_published_decks") or 0)
    if total <= 0:
        raise ValueError("public deck coverage is empty")
    for key in ("7d", "14d", "30d"):
        window = (snapshot.get("recent_windows") or {}).get(key) or {}
        count = int(window.get("deck_count") or 0)
        if not 0 <= count <= total:
            raise ValueError(f"{key} deck count is invalid")
        if sum(int(row["deck_count"]) for row in window.get("leader_frequency") or []) != count:
            raise ValueError(f"{key} leader frequencies do not sum to the window")
        if sum(int(row["deck_count"]) for row in window.get("element_frequency") or []) != count:
            raise ValueError(f"{key} element frequencies do not sum to the window")
        if any(int(row["included_in_decks"]) > count for row in window.get("common_card_inclusion") or []):
            raise ValueError(f"{key} card inclusion exceeds the window")
    if len(snapshot.get("homepage_recent_decks") or []) != 4:
        raise ValueError("homepage recent-deck signal no longer has four records")
    search_index = snapshot.get("deck_search_index") or []
    if len(search_index) != total:
        raise ValueError("public deck search index does not cover every public record")
    if any("deck_cards" in deck for deck in search_index):
        raise ValueError("raw deck-card rows leaked into the bounded search index")
    if any(
        int(deck.get("main_card_count") or 0)
        != sum(int(card.get("quantity") or 0) for card in deck.get("main_cards") or [])
        for deck in search_index
    ):
        raise ValueError("a deck search entry lost or added main-card quantities")
    if not snapshot.get("tournament_results"):
        raise ValueError("published tournament evidence is missing")
    policy = json.dumps(snapshot.get("signal_definitions") or {}).casefold()
    if "not a player-population estimate" not in policy or "must not call it the global meta" not in policy:
        raise ValueError("no-overclaim policy is missing")


def main() -> int:
    parser = argparse.ArgumentParser()
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--refresh", action="store_true", help="Fetch and write today's public snapshot")
    mode.add_argument("--check", action="store_true", help="Validate the newest committed snapshot")
    args = parser.parse_args()

    if args.refresh:
        snapshot = build_snapshot()
        validate_snapshot(snapshot)
        SNAPSHOT_DIR.mkdir(parents=True, exist_ok=True)
        path = SNAPSHOT_DIR / f"the_gate_deck_signals_{snapshot['snapshot_date']}.json"
        path.write_text(json.dumps(snapshot, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        print(
            f"Wrote {path.relative_to(ROOT)}: "
            f"{snapshot['coverage']['public_or_author_published_decks']} public deck records, "
            f"{snapshot['recent_windows']['14d']['public_record_count']} recent records / "
            f"{snapshot['recent_windows']['14d']['deck_count']} exact-50 frequency basis"
        )
        return 0

    path = newest_snapshot()
    snapshot = json.loads(path.read_text(encoding="utf-8"))
    validate_snapshot(snapshot)
    print(
        f"OK {path.relative_to(ROOT)}: "
        f"{snapshot['coverage']['public_or_author_published_decks']} public deck records, "
        f"{snapshot['recent_windows']['14d']['public_record_count']} recent records / "
        f"{snapshot['recent_windows']['14d']['deck_count']} exact-50 frequency basis"
    )
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (OSError, RuntimeError, ValueError) as exc:
        print(f"The Gate deck-signal refresh failed: {exc}", file=sys.stderr)
        raise SystemExit(1)
