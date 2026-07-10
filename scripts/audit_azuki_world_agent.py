#!/usr/bin/env python3
"""Check that Azuki world metadata remains usable by the browse agent."""

from __future__ import annotations

import json
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from simulations.cairn_browse import (  # noqa: E402
    apply_filter,
    brief,
    exact_card_name_in_call,
    filter_system,
    resolve_pick_uids,
)


CATALOG = ROOT / "web" / "public" / "catalogs" / "azuki-tcg.json"


def require(condition: bool, message: str) -> None:
    if not condition:
        raise SystemExit(f"Azuki world-agent audit failed: {message}")


def main() -> None:
    data = json.loads(CATALOG.read_text(encoding="utf-8"))
    cards = data["cards"]
    set_labels = {item["id"]: item["label"] for item in data["sets"]}
    guide = data["azuki_world"]["world_guide"]

    image_cards = [card for card in cards if card.get("image")]
    require(len(cards) == data["summary"]["world_enriched_rows"], "not every row is enriched")
    require(
        all(card.get("azuki_world", {}).get("metadata_hash") for card in cards),
        "an enriched row lacks its metadata hash",
    )
    require(
        all(card["azuki_world"].get("visual_review") for card in image_cards),
        "an image-bearing row lacks a visual review",
    )
    require(
        len(image_cards) == data["summary"]["world_image_reviewed_rows"],
        "visual-review count does not match image-bearing rows",
    )
    require(len(guide["claims"]) == data["summary"]["world_claims"], "claim count drifted")
    require(
        len(guide["character_threads"]) == data["summary"]["world_character_threads"],
        "character-thread count drifted",
    )

    system_prompt = filter_system(data)
    require("card-art observations" in system_prompt, "authority boundary left the filter prompt")
    require("political faction" in system_prompt, "subtype boundary left the filter prompt")

    alley = apply_filter(cards, {"plane": "alley"}, set_labels)
    garden = apply_filter(cards, {"plane": "garden"}, set_labels)
    threshold = apply_filter(cards, {"plane": "threshold"}, set_labels)
    black_jade = apply_filter(cards, {"lore_term": "Black Jade"}, set_labels)
    shao = apply_filter(cards, {"character_thread": "shao"}, set_labels)
    yojin_winner = next(
        (
            card
            for card in cards
            if card["uid"] == "azuki_tcg_observation:tournament-winner-photo-20260710-001"
        ),
        None,
    )

    require(alley and garden and threshold, "one or more world-plane filters are empty")
    require(
        all("Black Jade" in card["azuki_world"]["official_subtypes"] for card in black_jade),
        "lore-term filter escaped official subtype vocabulary",
    )
    require(
        {card["name_en"] for card in shao} == {"Shao", "Shao's Perseverance", "Young Shao"},
        "Shao thread lost or gained an identity",
    )
    require(yojin_winner is not None, "Yojin WINNER observation row is missing")
    require(
        yojin_winner["source_authority"] == "user_photo_observation_not_official_gallery_fact"
        and yojin_winner["image_status"] == "user_photo_observation"
        and yojin_winner["azuki_world"]["variant_role"] == "user-observed-tournament-winner-treatment",
        "Yojin WINNER row lost its observation authority, image, or variant role",
    )
    require(
        "observed_variant_not_in_current_official_gallery_snapshot"
        in {code for issue in yojin_winner["issues"] for code in issue.get("codes", [])},
        "Yojin WINNER row no longer discloses its official-gallery boundary",
    )
    require(
        exact_card_name_in_call("show me the Yojin tournament winner card", cards) == "Yojin",
        "exact-name enforcement does not recognize Yojin",
    )
    require("world-cue:" in brief(garden[0], set_labels), "agent brief lost observation labels")

    official_shao = next(
        card
        for card in shao
        if card["source_authority"] == "official_gallery_api_fact"
    )
    require(
        resolve_pick_uids([official_shao["source_entry_id"]], shao) == [official_shao["uid"]],
        "source-entry shorthand did not resolve to an exact candidate UID",
    )
    resolved_number = resolve_pick_uids([official_shao["num"]], shao)
    resolved_card = next(card for card in shao if card["uid"] == resolved_number[0])
    require(
        resolved_card["source_authority"] == "official_gallery_api_fact",
        "ambiguous card-number shorthand did not prefer an official row",
    )
    require(resolve_pick_uids(["not-a-candidate"], shao) == [], "resolver invented a row")

    print(
        "Azuki world-agent audit OK: "
        f"{len(cards)} enriched rows | {len(image_cards)} reviewed images | "
        f"{len(guide['claims'])} claims | {len(guide['character_threads'])} threads | "
        f"planes {len(alley)}/{len(garden)}/{len(threshold)}"
    )


if __name__ == "__main__":
    main()
