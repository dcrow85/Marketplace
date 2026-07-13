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
    require("Anime Expo 2026" in system_prompt, "event vocabulary left the filter prompt")
    require("special_collection" in system_prompt, "Special Collection product channel left the filter prompt")

    alley = apply_filter(cards, {"plane": "alley"}, set_labels)
    garden = apply_filter(cards, {"plane": "garden"}, set_labels)
    threshold = apply_filter(cards, {"plane": "threshold"}, set_labels)
    black_jade = apply_filter(cards, {"lore_term": "Black Jade"}, set_labels)
    shao = apply_filter(cards, {"character_thread": "shao"}, set_labels)
    anime_expo = apply_filter(cards, {"event": "Anime Expo 2026"}, set_labels)
    special_collection = apply_filter(cards, {"product_channel": "special_collection"}, set_labels)
    yojin_winner = next(
        (
            card
            for card in cards
            if card["uid"] == "azuki_tcg_observation:tournament-winner-photo-20260710-001"
        ),
        None,
    )
    misaki_winner = next(
        (
            card
            for card in cards
            if card["uid"] == "azuki_tcg_observation:tournament-winner-photo-20260710-002"
        ),
        None,
    )
    shao_ax_winner = next(
        (
            card
            for card in cards
            if card["uid"] == "azuki_tcg_observation:anime-expo-winner-photo-20260710-001"
        ),
        None,
    )
    emberheart_winner = next(
        (
            card
            for card in cards
            if card["uid"] == "azuki_tcg_observation:tournament-winner-photo-20260710-003"
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
    require(misaki_winner is not None, "Misaki WINNER observation row is missing")
    require(
        misaki_winner["source_authority"] == "user_photo_observation_not_official_gallery_fact"
        and misaki_winner["image_status"] == "user_photo_observation"
        and misaki_winner["azuki_world"]["variant_role"] == "user-observed-tournament-winner-treatment",
        "Misaki WINNER row lost its observation authority, image, or variant role",
    )
    require(
        misaki_winner["authenticity_assertion"] == {
            "status": "confirmed_real",
            "authority_label": "user_assertion",
            "catalog_disposition": "recorded_not_independently_verified",
        },
        "Misaki WINNER row lost the user-asserted authenticity boundary",
    )
    require(
        "authenticity:user-confirmed[assertion]" in brief(misaki_winner, set_labels),
        "Misaki agent brief lost the claimant-labelled authenticity status",
    )
    require(
        exact_card_name_in_call("show Serene Fist, Misaki winner", cards) == "Serene Fist, Misaki",
        "exact-name enforcement does not recognize Serene Fist, Misaki",
    )
    require(shao_ax_winner is not None, "Anime Expo Shao WINNER observation row is missing")
    require(
        {card["uid"] for card in anime_expo} == {shao_ax_winner["uid"], *(card["uid"] for card in special_collection)},
        "Anime Expo event filter escaped the typed event and Special Collection rows",
    )
    require(
        shao_ax_winner["event_assertion"] == {
            "event": "Anime Expo 2026",
            "distribution": "given_out_at_event_exact_activity_unresolved",
            "authority_label": "user_assertion_plus_visible_event_stamp_plus_official_event_context",
            "official_context_url": "https://tcg.azuki.com/blog/019f1597-e79c-7cce-bbd4-5508892e6c8f",
            "catalog_disposition": "event_association_recorded_exact_award_activity_unresolved",
        },
        "Anime Expo Shao row lost its typed event boundary",
    )
    require(
        shao_ax_winner["azuki_world"]["variant_role"] == "user-observed-anime-expo-winner-treatment"
        and "event:Anime Expo 2026[" in brief(shao_ax_winner, set_labels),
        "Anime Expo Shao row lost its event role or agent tag",
    )
    require(
        exact_card_name_in_call("show Shao's Perseverance Anime Expo winner", cards) == "Shao's Perseverance",
        "exact-name enforcement does not recognize Shao's Perseverance",
    )
    expected_special_ids = {
        "AZK01-009", "AZK01-022", "AZK01-066", "AZK01-074", "AZK01-088",
        "AZK01-108", "STT01-010", "STT01-014", "STT03-009", "STT04-009",
    }
    require(len(special_collection) == 10, "Special Collection does not resolve to exactly ten rows")
    require(
        {card["card_id"] for card in special_collection} == expected_special_ids,
        "Special Collection checklist drifted",
    )
    require(
        sum(bool(card.get("image")) for card in special_collection) == 8
        and {
            card["card_id"] for card in special_collection if not card.get("image")
        } == {"AZK01-108", "STT01-010"},
        "Special Collection exact-image boundary drifted",
    )
    require(
        all(
            card["azuki_world"]["variant_role"] == "user-observed-special-collection-treatment"
            and card["collection_assertion"]["membership_authority"] == "user_product_photo_observation"
            for card in special_collection
        ),
        "Special Collection rows lost their observed-treatment or checklist authority",
    )
    reported_price = special_collection[0]["collection_assertion"]["reported_sale_price"]
    require(
        reported_price == {
            "amount": 38,
            "currency": "USD",
            "authority_label": "user_assertion",
            "catalog_disposition": "recorded_not_independently_verified",
        },
        "Special Collection reported price lost its claimant boundary",
    )
    special_red_bean = next(card for card in special_collection if card["card_id"] == "AZK01-009")
    require(
        "AX" not in special_red_bean["stamp"]
        and "no AX stamp observed" in special_red_bean["observations"][0]["observed_stamp"],
        "Special Collection Red Bean was conflated with the AX-stamped promo",
    )
    require(
        "collection:Azuki TCG Special Collection Volume 01[user_product_photo_observation]"
        in brief(special_red_bean, set_labels),
        "Special Collection agent brief lost its product-membership authority",
    )
    require(emberheart_winner is not None, "Lady Emberheart WINNER observation row is missing")
    require(
        emberheart_winner["azuki_world"]["variant_role"] == "user-observed-winner-treatment"
        and emberheart_winner.get("event_assertion") is None
        and emberheart_winner["illustrator"] == "Aflorane",
        "Lady Emberheart row lost its non-AX winner boundary or artist credit",
    )
    require(len(guide.get("event_contexts", [])) == 1, "Anime Expo event context is missing or duplicated")
    require(len(guide.get("product_contexts", [])) == 1, "Special Collection product context is missing or duplicated")
    require(
        guide["promo_contexts"][0]["image_status"] == "no_matching_ax_stamped_image_supplied"
        and guide["promo_contexts"][0]["user_reported_distribution"]["authority_label"] == "user_assertion",
        "AX Red Bean promo boundary drifted",
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
