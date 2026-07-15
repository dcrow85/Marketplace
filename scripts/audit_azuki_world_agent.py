#!/usr/bin/env python3
"""Check that Azuki world metadata remains usable by the browse agent."""

from __future__ import annotations

import json
import sys
from pathlib import Path
from unittest.mock import patch


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

import simulations.cairn_browse as cairn_browse_module  # noqa: E402
from simulations.cairn_browse import (  # noqa: E402
    apply_filter,
    brief,
    community_notes_for_call,
    community_prompt_block,
    deck_signal_prompt_block,
    deterministic_deck_signal_result,
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
    community = data["azuki_world"]["community_knowledge"]
    deck_signals = data["azuki_world"]["community_deck_signals"]

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
    require(
        community["source"]["authority_label"] == "independent_community_source",
        "The Gate lost its independent-community authority label",
    )
    require(
        data["azuki_world"]["community_knowledge_hash"]
        == data["source_artifacts"]["the_gate_community_knowledge"]["sha256"],
        "community knowledge hash drifted from its source-artifact record",
    )
    require(
        data["azuki_world"]["community_deck_signals_hash"]
        == data["source_artifacts"]["the_gate_community_deck_signals"]["sha256"],
        "community deck-signal hash drifted from its source-artifact record",
    )
    require(
        len(community["claims"]) == data["summary"]["community_claims"]
        and len(community["archetypes"]) == data["summary"]["community_archetypes"]
        and len(community["sources"]) == data["summary"]["community_source_pages"],
        "community knowledge counts drifted from the generated summary",
    )
    source_ids = {source["id"] for source in community["sources"]}
    require(
        all(set(claim["source_ids"]) <= source_ids for claim in community["claims"]),
        "a community claim references an unknown source",
    )
    require(
        all(not claim["authority_label"].startswith("official") for claim in community["claims"]),
        "a The Gate claim was promoted to official authority",
    )
    require(
        deck_signals["source"]["authority_label"] == "independent_community_source",
        "The Gate deck signals lost their independent-community authority label",
    )
    require(
        deck_signals["schema"] == "cairn.azuki.community_deck_signals.v2",
        "public deck search index schema changed without review",
    )
    require(
        deck_signals["coverage"] == {
            "public_or_author_published_decks": 105,
            "complete_50_plus_leader_gate": 101,
            "published_tournaments": 3,
            "published_placements": 14,
        },
        "dated public deck coverage changed without a refreshed review",
    )
    recent_14d = deck_signals["recent_windows"]["14d"]
    require(
        recent_14d["public_record_count"] == 37
        and recent_14d["deck_count"] == 36
        and recent_14d["excluded_non_50_record_count"] == 1,
        "14-day public-deck basis changed or lost its non-50 exclusion",
    )
    require(
        sum(item["deck_count"] for item in recent_14d["leader_frequency"]) == 36
        and sum(item["deck_count"] for item in recent_14d["element_frequency"]) == 36,
        "14-day deck frequencies do not sum to their declared basis",
    )
    require(
        deck_signals["engagement_availability"]["public_aggregate_available"] is False,
        "unavailable engagement data was promoted into a popularity rank",
    )
    search_index = deck_signals["deck_search_index"]
    require(len(search_index) == 105, "public deck search index lost gallery coverage")
    require(
        "deck_cards" not in json.dumps(deck_signals)
        and all(
            int(deck["main_card_count"])
            == sum(int(card["quantity"]) for card in deck.get("main_cards") or [])
            for deck in search_index
        ),
        "bounded deck search data leaked raw rows or lost recorded quantities",
    )
    conflicts = {
        item["id"]: item for item in community["official_rules_crosscheck"]["known_conflicts"]
    }
    require(
        set(conflicts) == {
            "gate-turn-order-conflict-2026-07-15",
            "gate-alley-play-conflict-2026-07-15",
        }
        and all(item["status"] == "open_source_conflict" for item in conflicts.values()),
        "The Gate rules conflicts disappeared or changed disposition without review",
    )

    system_prompt = filter_system(data)
    require("card-art observations" in system_prompt, "authority boundary left the filter prompt")
    require("political faction" in system_prompt, "subtype boundary left the filter prompt")
    require("Anime Expo 2026" in system_prompt, "event vocabulary left the filter prompt")
    require("special_collection" in system_prompt, "Special Collection product channel left the filter prompt")
    require(
        "The Gate is an independent community source" in system_prompt,
        "The Gate authority boundary left the filter prompt",
    )
    require(
        "Recent public-deck names" in system_prompt and "Mill Forge" in system_prompt,
        "dated public-deck vocabulary left the filter prompt",
    )
    shao_notes = {note["id"] for note in community_notes_for_call("How should Shao use responses?", data)}
    require("gate-shao-plan" in shao_notes, "Shao strategy retrieval missed The Gate guide")
    black_jade_notes = {
        note["id"] for note in community_notes_for_call("What does The Gate think about Black Jade lore?", data)
    }
    require(
        "gate-black-jade-analysis" in black_jade_notes,
        "Black Jade community-lore retrieval missed its source",
    )
    rules_notes = {
        note["id"] for note in community_notes_for_call("What is the start of turn draw and ramp order?", data)
    }
    rules_block = community_prompt_block("What is the start of turn draw and ramp order?", data)
    require("gate-rules-conflict" in rules_notes, "rules retrieval did not surface the known conflict")
    require(
        "official Azuki TCG rules cross-check" in rules_block
        and "Start of Turn Phase (Reset, start-of-turn Effects, Draw)" in rules_block
        and "The Gate's guide/report reads" in rules_block,
        "rules prompt lost its official precedence or community attribution",
    )
    popular_block = deck_signal_prompt_block(
        "What popular new decks are people building right now?", data
    )
    require(
        "37 public records; 36 records" in popular_block
        and "Bobu / Stonehaven Gate (Earth): 9" in popular_block
        and "Rengoku by Ronin Lotus" in popular_block
        and "no usable public view/save/share aggregate" in popular_block
        and "Separate dated tournament evidence" not in popular_block,
        "popular/new deck retrieval lost its dated frequency basis or engagement boundary",
    )
    competitive_block = deck_signal_prompt_block(
        "What decks are winning the current meta?", data
    )
    require(
        "Separate dated tournament evidence" in competitive_block
        and "2026-03-03 Azuki Online Pre-Season" in competitive_block
        and "These events predate the July gallery window" in competitive_block
        and "the current global meta" in competitive_block,
        "competitive retrieval blurred dated placements into current meta",
    )
    mill_forge_block = deck_signal_prompt_block("Tell me about Mill Forge", data)
    require(
        "Named public record: Mill Forge by THECountBasie" in mill_forge_block
        and "Raizan with Surge Gate" in mill_forge_block
        and "Recorded main deck (name and quantity only)" in mill_forge_block
        and "4 Alpine Prowler" in mill_forge_block,
        "exact deck-name retrieval missed its public list data",
    )
    with patch.object(
        cairn_browse_module,
        "call_model",
        return_value={"lore_term": "Forge", "action": None, "reading": "Misread deck name as a lore term."},
    ):
        mill_forge_browse = cairn_browse_module.browse("Tell me about Mill Forge", catalog="azuki-tcg")
    require(
        0 < mill_forge_browse["n_survivors"] < len(cards)
        and mill_forge_browse["filter"]["lore_term"] is None
        and mill_forge_browse["filter"]["ignored_unmatched_deck_filter"] == {"lore_term": "Forge"}
        and {"Raizan", "Surge Gate", "Alpine Prowler"} <= set(mill_forge_browse["filter"]["deck_card_names"]),
        "named deck browse did not replace a failed model filter with recorded membership",
    )
    require(
        "highest-copy recorded entries" in mill_forge_browse["result"]["commentary"]
        and "not a judgment about which cards matter most" in mill_forge_browse["result"]["commentary"]
        and "sixty" not in json.dumps(mill_forge_browse["result"]).casefold()
        and "engine" not in json.dumps(mill_forge_browse["result"]).casefold(),
        "named deck result lost recorded membership or invented strategy",
    )
    require(
        mill_forge_browse["result"]["picks"][:2] == [
            "azuki_tcg_official_gallery:S1-STT01-001_Raizan_L_L_die",
            "azuki_tcg_official_gallery:S1-STT01-002_Surge-Gate_G_G_die",
        ],
        "named deck result did not prefer base official Leader/Gate identities",
    )
    with patch.object(
        cairn_browse_module,
        "call_model",
        return_value={"character": "Zero", "action": None, "reading": "Read Zero as a card name."},
    ):
        zero_deck_browse = cairn_browse_module.browse("Key cards in a Zero deck", catalog="azuki-tcg")
    require(
        "22 complete public Zero deck records" in zero_deck_browse["result"]["commentary"]
        and "Collateral Burst in 21" in zero_deck_browse["result"]["commentary"]
        and zero_deck_browse["filter"]["character"] is None
        and "Collateral Burst" in zero_deck_browse["filter"]["deck_card_names"]
        and len(zero_deck_browse["result"]["picks"]) == 6,
        "plain-language deck-family search did not resolve to recorded deck cards",
    )
    popular_result = deterministic_deck_signal_result(
        "What popular new decks are people building right now?", data, cards
    )
    require(
        popular_result is not None
        and "Bobu / Stonehaven Gate at 9" in popular_result["commentary"]
        and "Rengoku (Zero / Rushfire Gate)" in popular_result["commentary"]
        and "Quicksand in 12" in popular_result["commentary"]
        and "not copy count or an endorsement" in popular_result["commentary"]
        and "no public view/save/share ranking was available" in popular_result["caveat"],
        "deterministic popular-deck result lost its current signal or caveat",
    )
    require(
        deck_signal_prompt_block("What does the Black Jade art imply?", data) == "",
        "deck signals leaked into a non-deck lore question",
    )

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
    emberheart_observation = emberheart_winner["observations"][0]
    require(
        emberheart_observation["source_image_sha256"]
        == "49102cc3eabd412bb85903c700d4b2b1de6af70e9ffac38d2416929bee2b2638"
        and emberheart_observation["corroborating_sources"]
        == [
            {
                "source_key": "lady-emberheart-winner-corroboration-20260713",
                "source_image_public_path": "assets/observations/lady-emberheart-winner-corroboration-2026-07-13.jpg",
                "source_image_sha256": "e16a9886e717c2d424ace0f0a089f55ad3d4b9983ae88cdcc56dabe24256512f",
            }
        ],
        "Lady Emberheart row lost one of its two photo-source anchors",
    )
    require(
        "that multiple source photos depict the same physical copy"
        in emberheart_winner["not_claiming"],
        "Lady Emberheart row lost its physical-copy identity boundary",
    )
    require(
        "source-photos:2[observation]" in brief(emberheart_winner, set_labels),
        "Lady Emberheart agent brief lost the corroborating-photo count",
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
        f"{len(community['claims'])} community claims | "
        f"{recent_14d['public_record_count']}/{recent_14d['deck_count']} recent deck records/basis | "
        f"planes {len(alley)}/{len(garden)}/{len(threshold)}"
    )


if __name__ == "__main__":
    main()
