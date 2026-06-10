#!/usr/bin/env python3
"""Build a local seed database for Japanese Base Set No Rarity research."""

from __future__ import annotations

import json
import re
import subprocess
import time
import unicodedata
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
OUT_PATH = ROOT / "data" / "no-rarity-base-set.json"
TCGDEX_SET_URL = "https://api.tcgdex.net/v2/ja/sets/PMCG1"
POKEMON_TCG_BASE = "https://api.pokemontcg.io/v2"
SCI_CARDS_TOP_URL = "https://www.sportscardinvestor.com/price-guide-api/cards/top"
SCI_SET_ID = 7297
SCI_CARD_INDEX_ID = "b"
SCI_SET_PAGE = "https://www.sportscardinvestor.com/sets/1996-japanese-base-set-pokemon"
PRICECHARTING_SET_BASE = "https://www.pricecharting.com/game/pokemon-japanese-expansion-pack"

BASIC_ENERGY_LOCAL_IDS = {"097", "098", "099", "100", "101", "102"}
QUICK_STARTER_TEXT_CHECK_NAMES = {
    "Energy Retrieval",
    "Gust of Wind",
    "Potion",
    "Pokémon Trader",
    "Switch",
}

JAPANESE_BOOSTER_ORDER_ROWS = [
    (1, "Bulbasaur", "フシギダネ", "Fushigidane", "Grass"),
    (2, "Ivysaur", "フシギソウ", "Fushigisou", "Grass"),
    (3, "Venusaur", "フシギバナ", "Fushigibana", "Grass"),
    (4, "Caterpie", "キャタピー", "Kyatapii", "Grass"),
    (5, "Metapod", "トランセル", "Toranseru", "Grass"),
    (6, "Weedle", "ビードル", "Biidoru", "Grass"),
    (7, "Kakuna", "コクーン", "Kokuun", "Grass"),
    (8, "Beedrill", "スピアー", "Supiaa", "Grass"),
    (9, "Nidoran \u2642", "ニドラン♂", "Nidoran♂", "Grass"),
    (10, "Nidorino", "ニドリーノ", "Nidoriino", "Grass"),
    (11, "Nidoking", "ニドキング", "Nidokingu", "Grass"),
    (12, "Koffing", "ドガース", "Dogaasu", "Grass"),
    (13, "Tangela", "モンジャラ", "Monjara", "Grass"),
    (14, "Charmander", "ヒトカゲ", "Hitokage", "Fire"),
    (15, "Charmeleon", "リザード", "Rizaado", "Fire"),
    (16, "Charizard", "リザードン", "Rizaadon", "Fire"),
    (17, "Vulpix", "ロコン", "Rokon", "Fire"),
    (18, "Ninetales", "キュウコン", "Kyuukon", "Fire"),
    (19, "Growlithe", "ガーディ", "Gaadi", "Fire"),
    (20, "Arcanine", "ウィンディ", "Windie", "Fire"),
    (21, "Ponyta", "ポニータ", "Poniita", "Fire"),
    (22, "Magmar", "ブーバー", "Buubaa", "Fire"),
    (23, "Squirtle", "ゼニガメ", "Zenigame", "Water"),
    (24, "Wartortle", "カメール", "Kameeru", "Water"),
    (25, "Blastoise", "カメックス", "Kamekkusu", "Water"),
    (26, "Poliwag", "ニョロモ", "Nyoromo", "Water"),
    (27, "Poliwhirl", "ニョロゾ", "Nyorozo", "Water"),
    (28, "Poliwrath", "ニョロボン", "Nyorobon", "Water"),
    (29, "Seel", "パウワウ", "Pauwau", "Water"),
    (30, "Dewgong", "ジュゴン", "Jugon", "Water"),
    (31, "Staryu", "ヒトデマン", "Hitodeman", "Water"),
    (32, "Starmie", "スターミー", "Sutaamii", "Water"),
    (33, "Magikarp", "コイキング", "Koikingu", "Water"),
    (34, "Gyarados", "ギャラドス", "Gyarados", "Water"),
    (35, "Pikachu", "ピカチュウ", "Pikachuu", "Lightning"),
    (36, "Raichu", "ライチュウ", "Raichuu", "Lightning"),
    (37, "Magnemite", "コイル", "Koiru", "Lightning"),
    (38, "Magneton", "レアコイル", "Reakoiru", "Lightning"),
    (39, "Voltorb", "ビリリダマ", "Biriridama", "Lightning"),
    (40, "Electrode", "マルマイン", "Marumain", "Lightning"),
    (41, "Electabuzz", "エレブー", "Erebuu", "Lightning"),
    (42, "Zapdos", "サンダー", "Sandaa", "Lightning"),
    (43, "Abra", "ケーシィ", "Keeshii", "Psychic"),
    (44, "Kadabra", "ユンゲラー", "Yungeraa", "Psychic"),
    (45, "Alakazam", "フーディン", "Fuudin", "Psychic"),
    (46, "Gastly", "ゴース", "Goosu", "Psychic"),
    (47, "Haunter", "ゴースト", "Goosuto", "Psychic"),
    (48, "Drowzee", "スリープ", "Suriipu", "Psychic"),
    (49, "Jynx", "ルージュラ", "Ruujura", "Psychic"),
    (50, "Mewtwo", "ミュウツー", "Myuutsuu", "Psychic"),
    (51, "Sandshrew", "サンド", "Sando", "Fighting"),
    (52, "Diglett", "ディグダ", "Diguda", "Fighting"),
    (53, "Dugtrio", "ダグトリオ", "Dagutorio", "Fighting"),
    (54, "Machop", "ワンリキー", "Wanrikii", "Fighting"),
    (55, "Machoke", "ゴーリキー", "Goorikii", "Fighting"),
    (56, "Machamp", "カイリキー", "Kairikii", "Fighting"),
    (57, "Onix", "イワーク", "Iwark", "Fighting"),
    (58, "Hitmonchan", "エビワラー", "Ebiwaraa", "Fighting"),
    (59, "Pidgey", "ポッポ", "Poppo", "Colorless"),
    (60, "Pidgeotto", "ピジョン", "Pijon", "Colorless"),
    (61, "Rattata", "コラッタ", "Koratta", "Colorless"),
    (62, "Raticate", "ラッタ", "Ratta", "Colorless"),
    (63, "Clefairy", "ピッピ", "Pippi", "Colorless"),
    (64, "Farfetch'd", "カモネギ", "Kamonegi", "Colorless"),
    (65, "Doduo", "ドードー", "Doodoo", "Colorless"),
    (66, "Chansey", "ラッキー", "Rakkii", "Colorless"),
    (67, "Porygon", "ポリゴン", "Porygon", "Colorless"),
    (68, "Dratini", "ミニリュウ", "Miniyuu", "Colorless"),
    (69, "Dragonair", "ハクリュウ", "Hakuryuu", "Colorless"),
    (70, "Super Potion", "いいきずぐすり", "Ii Kizugusuri", "Trainer"),
    (71, "Energy Retrieval", "エネルギー回収", "Enerugii Kaishuu", "Trainer"),
    (72, "Energy Removal", "エネルギー・リムーブ", "Enerugii Rimuubu", "Trainer"),
    (73, "Professor Oak", "オーキドはかせ", "Ookido Hakase", "Trainer"),
    (74, "Potion", "きずぐすり", "Kizugusuri", "Trainer"),
    (75, "Revive", "元気のかけら", "Genki no Kakera", "Trainer"),
    (76, "Devolution Spray", "退化スプレー", "Taika Supuree", "Trainer"),
    (77, "Item Finder", "ダウジングマシーン", "Daujingu Mashiin", "Trainer"),
    (78, "Super Energy Removal", "超エネルギーリムーブ", "Chou Enerugii Rimuubu", "Trainer"),
    (79, "Defender", "ディフェンダー", "Difendaa", "Trainer"),
    (80, "Gust of Wind", "突風", "Toppuu", "Trainer"),
    (81, "Full Heal", "なんでもなおし", "Nandemo Naoshi", "Trainer"),
    (82, "Impostor Professor Oak", "にせオーキドはかせ", "Nise Ookido Hakase", "Trainer"),
    (83, "Computer Search", "パソコン通信", "Pasokon Tsuushin", "Trainer"),
    (84, "Clefairy Doll", "ピッピ人形", "Pippi Ningyou", "Trainer"),
    (85, "PlusPower", "プラスパワー", "Purasu Pawaa", "Trainer"),
    (86, "Switch", "ポケモンいれかえ", "Pokemon Irekae", "Trainer"),
    (87, "Scoop Up", "ポケモン回収", "Pokemon Kaishuu", "Trainer"),
    (88, "Pokémon Trader", "ポケモン交換おじさん", "Pokemon Koukan Ojisan", "Trainer"),
    (89, "Pokédex", "ポケモン図鑑HANDY505", "Pokemon Zukan HANDY505", "Trainer"),
    (90, "Pokémon Center", "ポケモンセンター", "Pokemon Sentaa", "Trainer"),
    (91, "Pokémon Breeder", "ポケモン育て屋さん", "Pokemon Sodateyasan", "Trainer"),
    (92, "Pokémon Flute", "ポケモンの笛", "Pokemon no Fue", "Trainer"),
    (93, "Bill", "マサキ", "Masaki", "Trainer"),
    (94, "Lass", "ミニスカート", "Minisukaato", "Trainer"),
    (95, "Maintenance", "メンテナンス", "Mentenansu", "Trainer"),
    (96, "Double Colorless Energy", "無色2個エネルギー", "Mushoku 2-ko Enerugii", "Special Energy"),
]
JAPANESE_BOOSTER_ORDER_BY_ENGLISH_NAME = {
    english_name: {
        "order": order,
        "japanese_name": japanese_name,
        "romaji": romaji,
        "section": section,
        "authority": "User-supplied deep research packet, pending source-by-source verification against Japanese checklist pages.",
    }
    for order, english_name, japanese_name, romaji, section in JAPANESE_BOOSTER_ORDER_ROWS
}

SET_ENTRY = {
    "title": "Japanese No Rarity Base Set",
    "subtitle": "The blank corner before the market learned to label itself.",
    "short_read": (
        "No Rarity is the collector name for the earliest Japanese Expansion Pack print run, "
        "where the usual lower-right rarity mark is absent. The claim is historically powerful, "
        "but physically small: a blank corner only becomes meaningful when the rest of the card, "
        "its row, its print cues, and its seller evidence agree."
    ),
    "platform_context": (
        "This catalog is agent infrastructure first. It is not a buyer-facing price oracle or an authentication authority. "
        "It exists to make the No Rarity market legible to an agent: what the claim is, what evidence matters, "
        "what costs are being asked of the seller, what should be shown to the human, and what remains judgment."
    ),
    "agent_discretion_principles": [
        "The agent decides when to contact its human based on the human's risk tolerance, budget, attention preference, and agreed autonomy.",
        "The catalog should give the agent structured reasons, not commands.",
        "Human contact should be reserved for meaningful decisions: price uncertainty, evidence cost, trust gap, verifier escalation, bond size, route risk, or claim ambiguity.",
        "Agent-to-agent negotiation should preserve seller attention as a real cost and allow extra asks to be priced, refused, or credited back.",
        "The catalog's job is market legibility: expose claim structure, source weight, evidence profile, uncertainty, and unresolved judgment.",
    ],
    "pricing_uncertainty": {
        "human_sentence": "This card is priceable only after we know whether the evidence supports the No Rarity claim and what condition band it belongs in.",
        "agent_rule": "Never present a single price without price-state, source trail, condition band, and No Rarity evidence status.",
        "price_states": [
            "no reliable comp",
            "thin comps",
            "usable comps",
            "strong comps",
        ],
        "comp_risks": [
            "regular Japanese Base mixed into No Rarity comps",
            "No Rarity claim not visible in listing images",
            "raw condition described loosely",
            "slab label or cert not checked",
            "private sale or best-offer opacity",
            "stale comp in a volatile card",
            "venue-specific premium or discount",
        ],
        "agent_contact_triggers": [
            "funded price is outside likely range",
            "comps are thin or conflicting",
            "seller asks for high attention before buyer commitment",
            "evidence supports candidate status but not condition band",
            "verifier cost would materially change total price",
        ],
    },
    "historical_context": [
        "The Japanese Expansion Pack booster released on October 20, 1996 as the first main Pokémon Card Game booster product, with 96 possible cards and no basic Energy cards.",
        "The broader Japanese Base family is often counted as 102 rows because the six basic Energy cards came through the simultaneously released Starter Pack; this catalog tracks those six as caveats, not active No Rarity targets.",
        "It is not the first Pokémon card object overall: Bandai Carddass cards predate it as non-TCG collectible cards, and glossy CoroCoro Pikachu/Jigglypuff promos appeared five days before the set.",
        "It is the first full Pokémon TCG set: the point where the game became something children could open, sort, play, damage, trade, and lose.",
        "A Series 1 Starter Pack released alongside the Expansion Pack, giving the card game its first practical on-ramp: random set cards, basic Energy, coin, counters, rulebook, and checklist.",
        "The later rarity language is simple: circle for common, diamond for uncommon, star for rare. The No Rarity print is important because that small grammar had not yet settled onto the cards.",
    ],
    "why_collectors_care": [
        "It behaves like Japan's functional first-print marker for Base Set, even though Japanese Base did not use an English-style 1st Edition stamp.",
        "It reaches across the whole active set rather than only the holos: Caterpie, Diglett, Potion, and Lass matter because the variant lives in the ordinary rows too.",
        "It makes condition unusually meaningful. These were children's cards before they were protected artifacts, so clean copies carry preservation history as much as rarity.",
        "It is a perfect agent testbed: the meaningful difference is easy to point at but easy to overclaim, which forces the protocol to separate catalog fact, visual evidence, seller possession, and expert judgment.",
    ],
    "identification_rules": [
        "Identify the family first: Japanese Expansion Pack / Base Set only. A no-symbol Gym deck card, promo, theme-deck card, or later Japanese card is not the same claim.",
        "Anchor the catalog row second: exact card identity, artwork, language, era, and expected Japanese Pocket Monsters back. PMCG1 local IDs are database anchors, not printed set numbers.",
        "Separate strict product order from local protocol anchors. The 96-card Japanese booster order is useful context, while PMCG1 local ids remain stable catalog keys for the interface.",
        "Inspect the lower-right rarity-symbol field third. For active targets, the expected area is blank where later Base prints carry a circle, diamond, or star.",
        "Separate absence of rarity from absence of set logo. Base Set also lacks an expansion logo; that is a different fact and should not be confused with No Rarity.",
        "Apply the exception wall: local ids 001-096 are active targets; 097-102 basic Energy are caveats. Double Colorless Energy stays active because it is not a basic Energy caveat.",
        "Do not accept a crop by itself. Require full front, full back, sharp symbol-region crop, and enough surrounding card border to prove the crop belongs to the same card.",
        "Require fresh possession before money moves: nonce photo at minimum, and for high-value cards a short continuity video or staged photo sequence from full card to close-up.",
        "Use card-specific tells as supporting pressure, not automatic truth: Venusaur #68, Charizard height/weight text, Raichu Pokédex number, Gastly text, and holo/evolution-box behavior.",
        "For Potion, Switch, Gust of Wind, Energy Retrieval, and Pokémon Trader, compare Japanese text layout against a known Expansion Pack exemplar because Quick Starter Gift Set lookalikes can also lack rarity symbols.",
        "Check physical authenticity separately: print sharpness, color, fonts, back design, card stock/core, dimensions, corner shape, holo behavior, slab/cert data, and provenance.",
        "Keep the conclusion bounded: candidate, possession-supported candidate, verifier-supported No Rarity, or graded/certified No Rarity. Do not collapse those states into one label.",
    ],
    "identification_layers": [
        {
            "name": "Scope gate",
            "question": "Is this a Japanese Expansion Pack / Base Set card, not merely a no-symbol Japanese card?",
            "look_for": "Correct era, Japanese face, original Pocket Monsters back, Base/Expansion Pack artwork and layout, no Gym deck or promo identity.",
            "failure_mode": "No-symbol Gym deck, promo, or later product is mislabeled as Base No Rarity.",
            "protocol_state": "Out of scope until the row family is established.",
        },
        {
            "name": "Row gate",
            "question": "Which exact catalog row is being claimed?",
            "look_for": "Exact Pokémon/Trainer/Energy identity, artwork, attacks or text, type, stage, illustrator line when visible, and local row mapping.",
            "failure_mode": "Agent overfits from an English API image, a nearby card, or a modern database row.",
            "protocol_state": "Catalog row anchored, not physical-card authenticated.",
        },
        {
            "name": "Rarity-field gate",
            "question": "Is the lower-right rarity-symbol field visibly blank on the same physical card?",
            "look_for": "Full front plus sharp lower-right crop showing the symbol field with surrounding border and card context.",
            "failure_mode": "Seller crops away a circle, diamond, or star; low-res image hides a symbol; glare or sleeve edge masks the field.",
            "protocol_state": "No Rarity visual candidate.",
        },
        {
            "name": "Exception gate",
            "question": "Is the row inside the active No Rarity target range?",
            "look_for": "Local ids 001-096 are active; 097-102 basic Energy remain caveats; Double Colorless Energy is active.",
            "failure_mode": "A basic Energy is marketed as a premium No Rarity hit because the corner is blank.",
            "protocol_state": "Target accepted or downgraded to Energy caveat.",
        },
        {
            "name": "Possession gate",
            "question": "Does the seller possess this card now?",
            "look_for": "Fresh nonce photo, full front/back, matching crop, and high-value continuity evidence from the same physical object.",
            "failure_mode": "Seller uses an old auction image, reference image, borrowed card, or AI-cleaned photo.",
            "protocol_state": "Possession-supported candidate.",
        },
        {
            "name": "Physical-authenticity gate",
            "question": "Does the object look like a real 1996 Japanese card rather than a printed reproduction?",
            "look_for": "Sharp text, correct fonts, expected Japanese back, correct color and holo behavior, card stock/core, dimensions, corners, and cert/slab data when present.",
            "failure_mode": "Counterfeit has a blank corner but fails print, stock, back, or slab checks.",
            "protocol_state": "Verifier or expert review required for high-value trades.",
        },
        {
            "name": "Print-run-support gate",
            "question": "Do known card-specific tells support the early-print claim?",
            "look_for": "Card-specific correction prompts where applicable: Venusaur #68, Charizard height/weight text, Raichu Pokédex number, Gastly text, plus holo/evolution-box inspection.",
            "failure_mode": "A blank-corner claim passes visually but conflicts with a known correction tell for that card.",
            "protocol_state": "Evidence strengthened, weakened, or escalated.",
        },
    ],
    "identification_pressure_tests": [
        {
            "case": "Only a close crop of the blank corner",
            "risk": "The crop may be from another card or may hide the row identity.",
            "agent_response": "Ask for full front, full back, and a fresh nonce image that includes the same corner.",
        },
        {
            "case": "A regular Japanese Base card with the lower-right symbol blurred by glare",
            "risk": "Glare can turn a marked card into a false No Rarity candidate.",
            "agent_response": "Request a direct sharp crop and an angled-light crop before accepting the visual claim.",
        },
        {
            "case": "A Japanese Gym deck or promo card with no rarity symbol",
            "risk": "Some legitimate Japanese cards lack rarity symbols for reasons unrelated to Base No Rarity.",
            "agent_response": "Reject the Base No Rarity claim unless the card family and row match Japanese Expansion Pack.",
        },
        {
            "case": "A basic Energy card with a blank corner",
            "risk": "The visible absence is real but not distinctive enough to carry the No Rarity premium claim.",
            "agent_response": "Downgrade to Energy caveat and avoid premium No Rarity language.",
        },
        {
            "case": "A slab label says No Rarity but the listing has poor images",
            "risk": "The label may be misread, mis-entered, outdated, or detached from useful condition evidence.",
            "agent_response": "Ask for cert lookup, slab front/back, label close-up, and card surface photos before funding.",
        },
        {
            "case": "A high-value holo passes the blank-corner check",
            "risk": "Counterfeits and altered cards can copy the obvious missing-symbol feature.",
            "agent_response": "Escalate to holo behavior, print quality, card-specific tells, possession continuity, and verifier review.",
        },
    ],
    "cost_field_principles": [
        "Evidence should escalate only when it buys down a named uncertainty.",
        "Seller attention, handling risk, privacy exposure, time delay, buyer attention, agent compute, verifier cost, fraud resistance, and ambiguity reduction are separate currencies.",
        "The catalog should recommend evidence profiles; the protocol should bind what profile was used and what evidence was cited.",
        "A buyer may ask for more than the profile requires, but the seller's agent can price, reject, or credit-back that extra attention.",
        "Do not punish low-value honest trades with high-value ceremony. Do not let high-value cards move on low-value evidence.",
    ],
    "evidence_profiles": [
        {
            "id": "NR-A",
            "name": "Low-value active target",
            "applies_to": "Common or modest non-holo active No Rarity target from a seller with usable trust.",
            "required": [
                "full front image",
                "full back image",
                "lower-right rarity-symbol crop with surrounding border",
                "fresh nonce possession photo",
            ],
            "optional": [
                "angled-light crop if glare or sleeve reflection affects the symbol field",
                "one edge/corner close-up if condition is part of price",
            ],
            "cost_field": {
                "seller_attention": "low",
                "handling_risk": "low",
                "privacy_exposure": "low",
                "buyer_attention": "low",
                "agent_compute": "low",
                "verifier_cost": "none by default",
                "ambiguity_reduction": "row, blank-corner visual, current possession",
                "fraud_resistance": "blocks reference-image reuse and obvious marked-card substitutions",
            },
            "escalate_when": [
                "seller is new or weakly trusted",
                "images are low resolution",
                "symbol field has glare",
                "price is unusual for the row",
            ],
            "not_proving": [
                "professional authenticity",
                "precise grade",
                "full print-run confidence beyond visual candidate",
            ],
        },
        {
            "id": "NR-B",
            "name": "Mid-value desirable card",
            "applies_to": "Popular non-holo or desirable row where the fraud payoff justifies a little more seller work.",
            "required": [
                "NR-A required evidence",
                "front and back scans or high-resolution photos",
                "four-corner front close-ups",
                "four-corner back close-ups",
            ],
            "optional": [
                "short desk video from full card to symbol crop",
                "seller proof reuse such as shop/domain/marketplace reputation",
            ],
            "cost_field": {
                "seller_attention": "medium",
                "handling_risk": "medium",
                "privacy_exposure": "low to medium",
                "buyer_attention": "medium",
                "agent_compute": "medium",
                "verifier_cost": "optional",
                "ambiguity_reduction": "condition-sensitive identity, possession continuity, row-specific confidence",
                "fraud_resistance": "raises cost of borrowed-photo and condition-swap attacks",
            },
            "escalate_when": [
                "buyer is paying a large premium",
                "seller has no portable trust proof",
                "card-specific tell is relevant and not visible",
            ],
            "not_proving": [
                "slab-grade condition",
                "absence of all alteration",
            ],
        },
        {
            "id": "NR-C",
            "name": "High-value holo",
            "applies_to": "Charizard, Blastoise, Venusaur, Raichu, Mewtwo, and other high-value holo claims.",
            "required": [
                "NR-B required evidence",
                "angled holo-surface video",
                "card-specific tell close-ups when applicable",
                "fresh possession continuity sequence",
                "seller trust proof or bond recommendation",
                "verifier review before route lock",
            ],
            "optional": [
                "third-party in-person inspection",
                "insured shipping quote and route proof before final acceptance",
                "raw-card weight/dimension checks only if verifier requests them",
            ],
            "cost_field": {
                "seller_attention": "high",
                "handling_risk": "high",
                "privacy_exposure": "medium",
                "buyer_attention": "high",
                "agent_compute": "high",
                "verifier_cost": "expected",
                "ambiguity_reduction": "holo authenticity, condition, possession continuity, print-run support",
                "fraud_resistance": "targets counterfeit, altered-card, borrowed-card, and high-upside crop attacks",
            },
            "escalate_when": [
                "seller refuses continuity evidence",
                "holo behavior cannot be judged",
                "card-specific tell conflicts with claim",
                "price exceeds buyer's verifier threshold",
            ],
            "not_proving": [
                "legal-grade authenticity without expert custody",
                "future grading outcome",
            ],
        },
        {
            "id": "NR-D",
            "name": "Slabbed card",
            "applies_to": "Any graded No Rarity claim where the slab is part of the trust story.",
            "required": [
                "slab front image",
                "slab back image",
                "label close-up",
                "cert lookup screenshot or signed lookup receipt",
                "card front/back visible through slab",
                "fresh nonce photo with slab",
            ],
            "optional": [
                "video showing slab edges and label",
                "grader population or cert history as timestamped context",
            ],
            "cost_field": {
                "seller_attention": "medium",
                "handling_risk": "low",
                "privacy_exposure": "medium because cert numbers and collection signals may be exposed",
                "buyer_attention": "medium",
                "agent_compute": "medium",
                "verifier_cost": "optional unless value is high or cert conflicts",
                "ambiguity_reduction": "label identity, cert consistency, slab/card continuity",
                "fraud_resistance": "blocks label-only claims and stale-cert reuse",
            },
            "escalate_when": [
                "cert lookup conflicts with label",
                "slab photos are cropped",
                "label says No Rarity but card face is not inspectable",
            ],
            "not_proving": [
                "the grader never made a labeling mistake",
                "current market value",
            ],
        },
        {
            "id": "NR-E",
            "name": "New seller or weak trust",
            "applies_to": "Any No Rarity claim where seller reputation is thin, unportable, or newly introduced.",
            "required": [
                "base evidence profile for the card's value band",
                "fresh possession nonce",
                "seller proof chain or explicit lack-of-proof disclosure",
                "risk-adjusted bond recommendation",
            ],
            "optional": [
                "small paid attention ask credited back on purchase",
                "local pickup or shop-counter handoff if locations align",
                "trusted verifier custody for high-value cards",
            ],
            "cost_field": {
                "seller_attention": "medium to high",
                "handling_risk": "depends on card value",
                "privacy_exposure": "medium",
                "buyer_attention": "medium",
                "agent_compute": "medium",
                "verifier_cost": "recommended above modest value",
                "ambiguity_reduction": "seller identity, possession, willingness to stand behind claim",
                "fraud_resistance": "converts unknown trust into bond, proof, verifier, or route constraints",
            },
            "escalate_when": [
                "seller rejects bond and verifier alternatives",
                "seller cannot produce fresh possession evidence",
                "external reputation cannot be linked cleanly",
            ],
            "not_proving": [
                "long-term seller reliability",
                "that external reputation belongs to this wallet without proof",
            ],
        },
    ],
    "known_corrections_and_tells": [
        "Bulbapedia notes the No Rarity Venusaur print listed Venusaur as Pokémon #68 instead of #3, later corrected.",
        "Collector guides also report No Rarity-specific tells including Charizard height/weight text, Raichu's Pokédex number, and Gastly attack text. Use these as supporting inspection prompts until the exact physical card is reviewed.",
        "Holo cards with evolution boxes are worth inspecting carefully because early Japanese holo treatment can overlap the evolution box area; this is useful texture, not a standalone authenticity proof.",
        "Potion, Switch, Gust of Wind, Energy Retrieval, and Pokémon Trader require a Quick Starter text-layout check before an agent treats the missing-symbol claim as clean.",
    ],
    "product_context": [
        "Collector guides associate the earliest short 291-yen Japanese booster packs with the plausible No Rarity window, but sealed-product provenance should be treated as probabilistic, not proof of contents.",
        "Starter products matter because basic Energy distribution, Quick Starter trainer lookalikes, early rulebook/box details, and shop-channel context shape where cards entered collections.",
        "The December 1996 Gold Gift Box sits close to the origin story, but even collector guides frame No Rarity pulls from sealed early products as possible rather than likely.",
    ],
    "protocol_implications": [
        "The protocol can anchor the row, preserve evidence, and make claims legible. It cannot decide from catalog data alone that a seller's card is a true No Rarity copy.",
        "An agent should call the card a No Rarity candidate until the physical evidence packet supports the print-run claim.",
        "The catalog is not the platform authority; it is the agent's No Rarity lens. The agent remains responsible for when and how to contact its human.",
        "The strongest set-level gate is not price. It is contact legibility: the exact card, the blank corner, the row identity, the possession proof, and any verifier judgment must remain separate but connected.",
        "Ambiguity should stay visible. If the source is a collector guide, say collector guide. If the source is catalog metadata, say catalog metadata. If the source is the seller's photo, say seller photo.",
    ],
    "open_questions": [
        "The exact first-print quantity is not publicly nailed down by an official source. Treat scarcity as well-supported collector consensus, not a numeric protocol fact.",
        "The exact switchover date from no-rarity to rarity-symbol copies is not officially nailed down in this local catalog; store transition claims as source-weighted inference.",
        "Pokémon's official confirmation trail for the first-print interpretation is thinner than the hobby consensus. The protocol should store source weight, not flatten everything into one truth score.",
        "Quick Starter-sensitive trainer labels and population counts need caution because variant recognition and third-party labels can be imperfect.",
        "Market prices and graded populations move. They belong in agent calls and receipts with timestamps, not hard-coded set history.",
    ],
    "interesting_threads": [
        "The blank corner is a tiny visual fact carrying a large historical claim.",
        "The set lives between game history and market history: kids were learning rules, while future collectors would later read those same cards as origin artifacts.",
        "The ordinary commons are philosophically important here. If the protocol only cares about Charizard, it misses why a complete No Rarity hunt feels different.",
        "The early Japanese ecosystem was magazine inserts, starter products, small packaging changes, rulebooks, coins, and shop counters. That context is exactly the kind of non-scalar evidence an agent can preserve.",
    ],
}

COLLECTOR_NOTES_BY_LOCAL_ID = {
    "001": "Bulbasaur is #001 for a reason: sleepy, sturdy, and already carrying the promise of evolution on its back. A clean No Rarity copy feels like the first page of the binder waking up.",
    "002": "Caterpie should feel tiny and vulnerable. That is the charm: a card most people skip becomes a little test of whether the set was truly hunted.",
    "003": "Metapod's whole personality is waiting. A clean copy is funny in exactly the right way: the card barely moves, but the collector had to.",
    "004": "Weedle is all little danger: tiny body, big horn, poison waiting to happen. On this page it also asks whether you really checked the commons.",
    "005": "Nidoran male is small, spiky, and easy to misfile. That symbol in the name is part of the hunt before you even get to the symbol missing on the card.",
    "006": "Koffing should look like trouble in a basement: round, poisonous, and faintly ridiculous. The early card gets that weird charm.",
    "007": "Tangela is all vines and no answers. A good copy is satisfying because the character is basically texture already.",
    "008": "Ivysaur is the awkward beautiful middle: the bulb has opened, the body has weight, but Venusaur has not taken over yet.",
    "009": "Kakuna is all tension. It looks like nothing is happening, which is exactly why a clean, well-centered copy feels oddly satisfying.",
    "010": "Nidorino has that classic pre-evolution impatience, all horn and forward motion. It makes the Nidoking line feel alive before the holo arrives.",
    "011": "Venusaur is the garden becoming a tank. On a No Rarity copy, the huge flower and the holo surface both need room to breathe.",
    "012": "Beedrill is sharp, fast, and a little mean. It is a final evolution that does not need holo foil to feel dangerous.",
    "013": "Nidoking has old-school boss energy: heavy, spiked, poisonous, and loud even before the holo catches light.",
    "014": "Charmander is small flame anxiety in cardboard form. Everyone knows what it can become, which is why even the little one carries heat.",
    "015": "Vulpix is elegant before it is powerful. The curls, the quiet fire, the promise of Ninetales, it all makes the common row feel softer than filler.",
    "016": "Ponyta is motion first: mane, flame, speed. A clean copy should feel bright and simple, like the Fire page taking a breath.",
    "017": "Charmeleon is the teenage middle of the line: sharper, meaner, not yet Charizard, but clearly done being cute.",
    "018": "Growlithe is loyal little fire-dog energy. It is one of those cards people like before they remember whether it is worth anything.",
    "019": "Arcanine feels legendary even when the card is not a holo. Big, warm, and noble, it is the non-holo Fire card people actually linger on.",
    "020": "Magmar is pure old Pokémon weirdness: duck-billed, flame-bodied, and impossible to confuse with anything else in the binder.",
    "021": "Charizard is Charizard. Everyone arrives with feelings already, which is why the evidence has to be colder than the hype.",
    "022": "Ninetales is all grace and danger. The holo should feel like firelight, but every scratch in that light matters.",
    "023": "Squirtle is round, mischievous, and impossible not to like. A clean No Rarity copy feels like the calm before Blastoise's cannons.",
    "024": "Poliwag is just a little spiral with legs, and somehow that is enough. The line gets better when you can see the whole goofy progression.",
    "025": "Staryu is almost a symbol more than a creature: star, gem, clean silhouette. That makes the missing corner easy to read.",
    "026": "Starmie turns that little star into something stranger and sharper. It is one of the cleanest visual jumps in the Water page.",
    "027": "Wartortle is the stylish middle child: ears, tail, attitude. It makes the Squirtle line feel old and complete before Blastoise arrives.",
    "028": "Poliwhirl is early Pokémon comfort food. The spiral belly is so recognizable that the card feels familiar even when the variant is rare.",
    "029": "Seel is simple and sweet, almost too plain until you are building the full page. Then it becomes one of those quiet rows you need clean.",
    "030": "Dewgong is Seel grown into something sleek. It is not a loud chase, but it makes the Water section feel finished.",
    "031": "Magikarp is the joke that knows the ending. Pair it with Gyarados and the binder page suddenly has timing.",
    "032": "Blastoise is cannons, bulk, and childhood final-boss energy. A No Rarity copy needs evidence worthy of the weight people put on it.",
    "033": "Poliwrath is the spiral finally learning to throw hands. It gives the Poliwag line a strong holo finish.",
    "034": "Gyarados is the payoff to the dumbest little fish in the set. The card should feel dramatic, and the holo has to survive that drama.",
    "035": "Pikachu does not need rarity to stop people. The cheeks, the shape, the mascot gravity, it all works before price enters the room.",
    "036": "Magnemite is a screw, an eye, and a magnet, somehow alive. The best early Pokémon designs make no sense and still feel obvious.",
    "037": "Voltorb is the fake Poké Ball joke in its purest form. Simple shape, instant recognition, easy corner check.",
    "038": "Raichu is Pikachu with voltage and attitude. The holo gives the line its grown-up moment.",
    "039": "Magneton is just three Magnemite making the problem bigger. It is exactly the kind of strange evolution logic that makes Base Set fun.",
    "040": "Electrode is Voltorb after the joke got louder. The round art makes condition and centering easy to judge.",
    "041": "Electabuzz looks like it should be in a playground argument about strong basics. It still has that old deck-card swagger.",
    "042": "Zapdos is jagged lightning with wings. The holo has to carry that crackle, so photos matter.",
    "043": "Abra is asleep, fragile, and already famous for disappearing. It is a perfect first step into the Alakazam line.",
    "044": "Gastly is barely a body, just gas and a grin. The old Psychic typing makes it feel even more like early TCG translation magic.",
    "045": "Drowzee is strange in a way only first-generation Pokémon could be. Hypnosis, trunk, sleepy menace, it earns its spot.",
    "046": "Kadabra is all spoons and psychic tension. Whatever wider lore follows the name, the card itself still belongs in the classic Alakazam run.",
    "047": "Haunter has the grin. Even without Gengar waiting in this set, it brings the ghost-page personality immediately.",
    "048": "Jynx is unmistakable. The card is odd, theatrical, and very much part of the early Pokémon texture.",
    "049": "Alakazam feels like the brain of the set. Damage Swap made it memorable to players, and the holo makes collectors slow down.",
    "050": "Mewtwo arrives with myth already attached. A No Rarity copy does not need to shout; the name does enough.",
    "051": "Sandshrew is a little armored curl of a Pokémon. It is humble, but it gives the Fighting page its first bit of personality.",
    "052": "Diglett is basically a face in the ground, and everyone remembers it anyway. That is first-gen design magic.",
    "053": "Machop is the little gym kid before the whole line turns into muscle. It starts the Fighting run cleanly.",
    "054": "Onix feels enormous even on a small card. The art has weight, and a clean copy anchors the Fighting page.",
    "055": "Machoke is where the line stops being cute and starts flexing. It is the bridge you need before Machamp lands.",
    "056": "Dugtrio is Diglett's joke repeated three times, which is exactly why it works. The simple idea has real binder charm.",
    "057": "Machamp is all arms, belt, and old-school holo presence. Keep the release-history noise out of it and judge this Japanese card cleanly.",
    "058": "Hitmonchan is a boxer first and a collectible second. Player-collectors remember it because it felt usable, not just cool.",
    "059": "Pidgey is the route-one bird. It is not glamorous, but a Base page without it feels incomplete.",
    "060": "Rattata is the little purple nuisance everyone met early. In No Rarity, even that nuisance becomes a checkpoint.",
    "061": "Doduo is two heads, long legs, and pure first-gen oddness. It is small, but it has personality right away.",
    "062": "Raticate is Rattata after it got teeth. The pair is not fancy, just satisfying to finish.",
    "063": "Farfetch'd is memorable because it is absurd: bird, leek, apostrophe, done. Collectors know it before the database does.",
    "064": "Porygon is supposed to feel wrong, a polygonal lab-made thing in a set full of animals and monsters. That oddness is the whole charm.",
    "065": "Dratini is tiny myth. It barely looks like a dragon yet, which is what makes the line so good.",
    "066": "Pidgeotto is the route bird growing into itself. Without Pidgeot here, it becomes the line's stopping point.",
    "067": "Clefairy is moonlit and soft, but the holo makes it serious. Keep it separate from Clefairy Doll and check the surface hard.",
    "068": "Chansey is gentle until you remember the HP. It is the soft pink wall of the holo section.",
    "069": "Dragonair is elegant in a way Dratini is not yet. Since Dragonite is absent, this is the graceful endpoint.",
    "070": "Energy Removal is the card that made people groan. It is not a character, but it has table memory.",
    "071": "Potion is the simplest item in the world, and that is why it feels right. Every early adventure needed one.",
    "072": "Gust of Wind is the old trick of dragging up what your opponent wanted safe. Players remember that little cruelty.",
    "073": "Switch is as Pokémon as it gets: get the wrong thing out of the active spot and keep moving.",
    "074": "Bill is the weird computer guy who somehow became one of the cleanest draw cards. That is very early Pokémon.",
    "075": "Super Potion is Potion with a cost and a little more drama. The pair belongs together on the Trainer page.",
    "076": "Energy Retrieval feels like digging power back out of the discard. Quiet card, very real game memory.",
    "077": "Professor Oak is the hand reset everyone remembers: throw it all away, draw seven, trust the professor.",
    "078": "Revive is pure Game Boy logic on a card. Something fainted, bring it back, keep going.",
    "079": "Defender is not glamorous, but it feels like early TCG table talk: can I survive one more turn?",
    "080": "Full Heal is the status cure you know before you read the card. Poisoned, asleep, paralyzed, fix it and move on.",
    "081": "PlusPower is the little number that changed the math. Old players remember counting for it.",
    "082": "Pokédex is perfect here: a card about peeking at what comes next, sitting inside a catalog built for looking closer.",
    "083": "Pokémon Center is the safe place turned into cardboard. It feels familiar before the effect even matters.",
    "084": "Pokémon Flute is weirdly generous and weirdly annoying. Letting the opponent bring something back is exactly the kind of strange Base Set idea collectors remember.",
    "085": "Maintenance feels like rummaging through the deck to fix a bad hand. Quiet, practical, very early TCG.",
    "086": "Devolution Spray asks the funniest old rules question: what if evolution was not permanent?",
    "087": "Item Finder is digging through the discard pile for the exact tool you need. Player-collectors know why that feels powerful.",
    "088": "Super Energy Removal is Energy Removal with the volume turned up. If you played against it, you remember.",
    "089": "Impostor Professor Oak is the set having a sense of humor. It is Oak, but wrong, and the card plays like a prank.",
    "090": "Computer Search is every old deck's little act of desperation: discard two, find the exact answer.",
    "091": "Clefairy Doll is not Clefairy, and that is the point. It is a decoy, a weird little rules object with a familiar face.",
    "092": "Scoop Up is tempo in one phrase: pick it up, deny the damage, make your opponent do it again.",
    "093": "Pokémon Trader is the binder fantasy as a card effect: trade the Pokémon you have for the one you actually want.",
    "094": "Pokémon Breeder is the shortcut every kid understood. Skip the awkward middle and get to the big evolution.",
    "095": "Lass looks quiet, then messes with everyone's Trainers. It is gentle art wrapped around disruption.",
    "096": "Double Colorless Energy is not just another Energy. It is the acceleration card old players actually remember.",
    "097": "Grass Energy is here for completeness, not glory. For basic Energy, the blank corner is a caveat, not a trophy.",
    "098": "Fire Energy belongs in the binder, but it should not be sold like a chase. The card's job is to complete the page.",
    "099": "Water Energy teaches restraint. Blank corner, yes; No Rarity prize, no.",
    "100": "Lightning Energy keeps the resource row complete. The collector move is knowing when not to overhype it.",
    "101": "Psychic Energy is a boundary check. It belongs in the set, but outside the real missing-symbol hunt.",
    "102": "Fighting Energy closes the list quietly. By here, the No Rarity target range has already ended.",
}

ENGLISH_LOCAL_ORDER = [
    "Bulbasaur",
    "Caterpie",
    "Metapod",
    "Weedle",
    "Nidoran \u2642",
    "Koffing",
    "Tangela",
    "Ivysaur",
    "Kakuna",
    "Nidorino",
    "Venusaur",
    "Beedrill",
    "Nidoking",
    "Charmander",
    "Vulpix",
    "Ponyta",
    "Charmeleon",
    "Growlithe",
    "Arcanine",
    "Magmar",
    "Charizard",
    "Ninetales",
    "Squirtle",
    "Poliwag",
    "Staryu",
    "Starmie",
    "Wartortle",
    "Poliwhirl",
    "Seel",
    "Dewgong",
    "Magikarp",
    "Blastoise",
    "Poliwrath",
    "Gyarados",
    "Pikachu",
    "Magnemite",
    "Voltorb",
    "Raichu",
    "Magneton",
    "Electrode",
    "Electabuzz",
    "Zapdos",
    "Abra",
    "Gastly",
    "Drowzee",
    "Kadabra",
    "Haunter",
    "Jynx",
    "Alakazam",
    "Mewtwo",
    "Sandshrew",
    "Diglett",
    "Machop",
    "Onix",
    "Machoke",
    "Dugtrio",
    "Machamp",
    "Hitmonchan",
    "Pidgey",
    "Rattata",
    "Doduo",
    "Raticate",
    "Farfetch'd",
    "Porygon",
    "Dratini",
    "Pidgeotto",
    "Clefairy",
    "Chansey",
    "Dragonair",
    "Energy Removal",
    "Potion",
    "Gust of Wind",
    "Switch",
    "Bill",
    "Super Potion",
    "Energy Retrieval",
    "Professor Oak",
    "Revive",
    "Defender",
    "Full Heal",
    "PlusPower",
    "Pokédex",
    "Pokémon Center",
    "Pokémon Flute",
    "Maintenance",
    "Devolution Spray",
    "Item Finder",
    "Super Energy Removal",
    "Impostor Professor Oak",
    "Computer Search",
    "Clefairy Doll",
    "Scoop Up",
    "Pokémon Trader",
    "Pokémon Breeder",
    "Lass",
    "Double Colorless Energy",
    "Grass Energy",
    "Fire Energy",
    "Water Energy",
    "Lightning Energy",
    "Psychic Energy",
    "Fighting Energy",
]


def fetch_json(url: str) -> Any:
    request = urllib.request.Request(
        url,
        headers={
            "Accept": "application/json",
            "User-Agent": "MarketplaceNoRarityResearch/0.1",
        },
    )
    with urllib.request.urlopen(request, timeout=25) as response:
        return json.loads(response.read().decode("utf-8"))


def curl_json(url: str) -> Any:
    raw = subprocess.check_output(
        ["curl", "-L", "--compressed", "-s", url],
        timeout=30,
    )
    return json.loads(raw.decode("utf-8"))


def curl_text_with_effective_url(url: str) -> tuple[str, str]:
    marker = "\n__MARKETPLACE_EFFECTIVE_URL__"
    raw = subprocess.check_output(
        ["curl", "-L", "--compressed", "-s", "-w", f"{marker}%{{url_effective}}", url],
        timeout=30,
    ).decode("utf-8")
    if marker not in raw:
        return raw, url
    text, effective_url = raw.rsplit(marker, 1)
    return text, effective_url.strip()


def pokemon_tcg_base_cards() -> dict[str, dict[str, Any]]:
    params = urllib.parse.urlencode(
        {
            "q": "set.id:base1",
            "pageSize": 250,
            "select": "id,name,number,rarity,images,set,artist,supertype,subtypes",
        }
    )
    body = fetch_json(f"{POKEMON_TCG_BASE}/cards?{params}")
    return {card["name"]: card for card in body.get("data", [])}


def normalize_name(value: str) -> str:
    value = value.lower()
    value = value.replace("pokémon", "pokemon")
    value = value.replace("é", "e")
    value = value.replace("♀", "f")
    value = value.replace("♂", "m")
    value = value.replace("impostor", "imposter")
    return re.sub(r"[^a-z0-9]+", "", value)


def no_rarity_ref_key(english_name: str) -> str:
    if english_name == "Nidoran \u2642":
        return normalize_name("Nidoran")
    return normalize_name(english_name)


def slugify_pricecharting(value: str) -> str:
    value = unicodedata.normalize("NFKD", value)
    value = "".join(char for char in value if not unicodedata.combining(char))
    value = value.lower()
    value = value.replace("♀", " female ")
    value = value.replace("♂", " male ")
    value = value.replace("&", " and ")
    value = re.sub(r"[^a-z0-9]+", "-", value)
    return value.strip("-")


def pricecharting_slug_candidates(english_name: str) -> list[str]:
    base = slugify_pricecharting(english_name)
    candidates = [f"{base}-no-rarity"]
    if english_name == "Nidoran \u2642":
        candidates.insert(0, "nidoran-no-rarity")
    if english_name == "Farfetch'd":
        candidates.insert(0, "farfetchd-no-rarity")
    if english_name == "Impostor Professor Oak":
        candidates.insert(0, "imposter-professor-oak-no-rarity")
    return dedupe(candidates)


def empty_no_rarity_reference() -> dict[str, Any]:
    return {
        "source": "",
        "source_page_url": "",
        "image_small": "",
        "image_large": "",
        "image_role": "No source-labeled No Rarity reference image found yet.",
        "verification_status": "missing",
        "not_claiming": ["No Rarity truth"],
    }


def no_rarity_reference_from_sci(item: dict[str, Any]) -> dict[str, Any]:
    image_url = item.get("image_url", "")
    slug = item.get("slug_structured", "")
    return {
        "source": "Sports Card Investor",
        "source_page_url": f"https://www.sportscardinvestor.com{slug}" if slug else SCI_SET_PAGE,
        "image_small": f"{image_url}-M" if image_url else "",
        "image_large": f"{image_url}-L" if image_url else "",
        "image_role": "Source-labeled No Rarity Symbol reference image; expected empty lower-right rarity-symbol field.",
        "variation": item.get("variation", ""),
        "card_number": str(item.get("card_number", "")),
        "provider_id": str(item.get("collectible_id", "")),
        "verification_status": "source-labeled no-rarity; human/agent should still visually confirm no rarity mark",
        "not_claiming": [
            "seller possession",
            "seller card match",
            "condition",
            "authenticity",
        ],
    }


def no_rarity_reference_from_pricecharting(
    *,
    english_name: str,
    local_id: str,
    page_url: str,
    title: str,
    image_url: str,
) -> dict[str, Any]:
    card_number_match = re.search(r"\[No Rarity\]\s+#(\d+)", title)
    image_large = image_url.replace("/240.jpg", "/1600.jpg") if image_url.endswith("/240.jpg") else image_url
    return {
        "source": "PriceCharting",
        "source_page_url": page_url,
        "image_small": image_url,
        "image_large": image_large,
        "image_role": "Source-labeled No Rarity reference image; expected empty lower-right rarity-symbol field.",
        "variation": "No Rarity",
        "card_number": f"#{card_number_match.group(1)}" if card_number_match else f"PMCG1-{local_id}",
        "provider_id": f"pricecharting:{slugify_pricecharting(english_name)}-no-rarity",
        "provider_title": title,
        "verification_status": "source-labeled no-rarity; human/agent should still visually confirm no rarity mark",
        "not_claiming": [
            "seller possession",
            "seller card match",
            "condition",
            "authenticity",
        ],
    }


def probe_pricecharting_no_rarity_reference(
    *,
    english_name: str,
    local_id: str,
    attempts_per_slug: int,
) -> dict[str, Any] | None:
    for slug in pricecharting_slug_candidates(english_name):
        url = f"{PRICECHARTING_SET_BASE}/{slug}"
        for attempt in range(attempts_per_slug):
            try:
                text, effective_url = curl_text_with_effective_url(url)
            except Exception:
                time.sleep(1.0 + attempt)
                continue
            title_match = re.search(r"<title>([^<]+)", text)
            title = title_match.group(1).strip() if title_match else ""
            image_match = re.search(r"<div class=\"cover\">[\s\S]*?<img src='([^']+)'", text)
            image_url = image_match.group(1).strip() if image_match else ""
            if "[No Rarity]" in title and image_url:
                return no_rarity_reference_from_pricecharting(
                    english_name=english_name,
                    local_id=local_id,
                    page_url=effective_url,
                    title=title,
                    image_url=image_url,
                )
            time.sleep(1.0 + attempt)
    return None


def pricecharting_no_rarity_references() -> dict[str, dict[str, Any]]:
    references: dict[str, dict[str, Any]] = {}
    target_names = ENGLISH_LOCAL_ORDER[:96]
    for index, english_name in enumerate(target_names, start=1):
        local_id = f"{index:03d}"
        reference = probe_pricecharting_no_rarity_reference(
            english_name=english_name,
            local_id=local_id,
            attempts_per_slug=2,
        )
        if reference:
            references[normalize_name(english_name)] = reference
        time.sleep(0.55)
    for delay in (1.5, 2.5):
        missing = [
            (f"{index:03d}", english_name)
            for index, english_name in enumerate(target_names, start=1)
            if normalize_name(english_name) not in references
        ]
        if not missing:
            break
        time.sleep(delay)
        for local_id, english_name in missing:
            reference = probe_pricecharting_no_rarity_reference(
                english_name=english_name,
                local_id=local_id,
                attempts_per_slug=3,
            )
            if reference:
                references[normalize_name(english_name)] = reference
            time.sleep(delay)
    return references


def existing_no_rarity_references() -> dict[str, dict[str, Any]]:
    if not OUT_PATH.exists():
        return {}
    try:
        payload = json.loads(OUT_PATH.read_text(encoding="utf-8"))
    except Exception:
        return {}
    references: dict[str, dict[str, Any]] = {}
    for card in payload.get("cards", []) or []:
        reference = card.get("no_rarity_reference") or {}
        if not (reference.get("image_small") or reference.get("image_large")):
            continue
        if reference.get("source") == "PriceCharting":
            if str(reference.get("image_large", "")).endswith("/240.jpg"):
                reference["image_large"] = reference["image_large"].replace("/240.jpg", "/1600.jpg")
            title = reference.get("provider_title", "")
            card_number_match = re.search(r"\[No Rarity\]\s+#(\d+)", title)
            if card_number_match:
                reference["card_number"] = f"#{card_number_match.group(1)}"
        references[no_rarity_ref_key(card.get("name_en", ""))] = reference
    return references


def sci_no_rarity_references() -> dict[str, dict[str, Any]]:
    products: dict[str, dict[str, Any]] = {}
    for offset in (0, 120):
        params = {
            "limit": 120,
            "order": "rank",
            "setId": SCI_SET_ID,
            "cardIndexId": SCI_CARD_INDEX_ID,
            "offset": offset,
        }
        query = urllib.parse.urlencode({"params": json.dumps(params, separators=(",", ":"))})
        try:
            body = curl_json(f"{SCI_CARDS_TOP_URL}?{query}")
        except Exception:
            continue
        for item in body.get("cards", []) or []:
            if "No Rarity Symbol" not in str(item.get("variation", "")):
                continue
            player = item.get("player", "")
            key = normalize_name(player)
            if key and key not in products:
                products[key] = no_rarity_reference_from_sci(item)
    return products


NO_RARITY_REFERENCE_SUPPLEMENTS: dict[str, dict[str, Any]] = {
    "Caterpie": {
        "source": "PriceCharting",
        "source_page_url": "https://www.pricecharting.com/game/pokemon-japanese-expansion-pack/caterpie-no-rarity",
        "image_small": "https://storage.googleapis.com/collectors-sandbox.appspot.com/tmp_1748200285820_1748200415809Screenshot_20250525_141249_Google.jpg",
        "image_large": "https://storage.googleapis.com/collectors-sandbox.appspot.com/tmp_1748200285820_1748200415809Screenshot_20250525_141249_Google.jpg",
        "image_role": "Supplemental source-labeled No Rarity reference image; expected empty lower-right rarity-symbol field.",
        "variation": "No Rarity",
        "card_number": "#10",
        "provider_id": "pricecharting:caterpie-no-rarity",
        "verification_status": "source-labeled no-rarity supplement; human/agent should visually confirm no rarity mark",
        "not_claiming": [
            "seller possession",
            "seller card match",
            "condition",
            "authenticity",
        ],
    },
    "Blastoise": {
        "source": "PriceCharting",
        "source_page_url": "https://www.pricecharting.com/game/pokemon-japanese-expansion-pack/blastoise-no-rarity",
        "image_small": "https://storage.googleapis.com/collectors-sandbox.appspot.com/tmp_1747348018215_1747348021419Screenshot_20250515_164502_Google.jpg",
        "image_large": "https://storage.googleapis.com/collectors-sandbox.appspot.com/tmp_1747348018215_1747348021419Screenshot_20250515_164502_Google.jpg",
        "image_role": "Supplemental source-labeled No Rarity reference image; expected empty lower-right rarity-symbol field.",
        "variation": "No Rarity",
        "card_number": "#9",
        "provider_id": "pricecharting:blastoise-no-rarity",
        "verification_status": "source-labeled no-rarity supplement; human/agent should visually confirm no rarity mark",
        "not_claiming": [
            "seller possession",
            "seller card match",
            "condition",
            "authenticity",
        ],
    },
    "Nidoran \u2642": {
        "source": "PriceCharting",
        "source_page_url": "https://www.pricecharting.com/game/pokemon-japanese-expansion-pack/nidoran%E2%99%82-no-rarity-32?q=nidoran+no+rarity",
        "image_small": "https://storage.googleapis.com/images.pricecharting.com/q7iud2dvxbcq4onl/240.jpg",
        "image_large": "https://storage.googleapis.com/images.pricecharting.com/q7iud2dvxbcq4onl/1600.jpg",
        "image_role": "Supplemental source-labeled No Rarity reference image; expected empty lower-right rarity-symbol field.",
        "variation": "No Rarity",
        "card_number": "#32",
        "provider_id": "pricecharting:nidoran-no-rarity",
        "provider_title": "Nidoran\u2642 [No Rarity] #32 Prices | Pokemon Japanese Expansion Pack | Pokemon Cards",
        "verification_status": "source-labeled no-rarity supplement; human/agent should visually confirm no rarity mark",
        "not_claiming": [
            "seller possession",
            "seller card match",
            "condition",
            "authenticity",
        ],
    },
    "Clefairy": {
        "source": "PriceCharting",
        "source_page_url": "https://www.pricecharting.com/game/pokemon-japanese-expansion-pack/clefairy-no-rarity-35",
        "image_small": "https://storage.googleapis.com/images.pricecharting.com/vrtk3mdvcd6rnht3/240.jpg",
        "image_large": "https://storage.googleapis.com/images.pricecharting.com/vrtk3mdvcd6rnht3/1600.jpg",
        "image_role": "Supplemental source-labeled No Rarity reference image; expected empty lower-right rarity-symbol field.",
        "variation": "No Rarity",
        "card_number": "#35",
        "provider_id": "pricecharting:clefairy-no-rarity",
        "provider_title": "Clefairy [No Rarity] #35 Prices | Pokemon Japanese Expansion Pack | Pokemon Cards",
        "verification_status": "source-labeled no-rarity supplement; human/agent should visually confirm no rarity mark",
        "not_claiming": [
            "seller possession",
            "seller card match",
            "condition",
            "authenticity",
        ],
    },
    "Pokédex": {
        "source": "Sports Card Investor",
        "source_page_url": "https://www.sportscardinvestor.com/cards/pokedex-pokemon/1996-japanese-base-set-base-no-rarity-symbol",
        "image_small": "https://images.production.sportscardinvestor.com/7297_5474_16929-M",
        "image_large": "https://images.production.sportscardinvestor.com/7297_5474_16929-L",
        "image_role": "Supplemental source-labeled No Rarity Symbol reference image; expected empty lower-right rarity-symbol field.",
        "variation": "Base - No Rarity Symbol",
        "card_number": "PMCG1-082",
        "provider_id": "sci:pokedex-base-no-rarity-symbol",
        "provider_title": "Pokedex 1996 Japanese Base Set Base - No Rarity Symbol RAW TCG (LIGHTLY PLAYED) Price Guide",
        "verification_status": "source-labeled no-rarity supplement; human/agent should visually confirm no rarity mark",
        "not_claiming": [
            "seller possession",
            "seller card match",
            "condition",
            "authenticity",
        ],
    },
}


CARD_SPECIFIC_TELLS = {
    "Venusaur": [
        "Check the printed Pokédex number. Collector sources report the No Rarity Venusaur with an incorrect #68 before later correction; treat this as a supporting prompt, not automatic proof.",
    ],
    "Charizard": [
        "Check the height and weight text against known No Rarity correction prompts, and require sharp text plus symbol-region evidence before upgrading beyond candidate.",
    ],
    "Raichu": [
        "Check the Pokédex number against known No Rarity correction prompts; keep this separate from the blank-corner claim.",
    ],
    "Gastly": [
        "Check the attack text against known No Rarity correction prompts; use it as pressure on the physical-card claim, not as a catalog shortcut.",
    ],
}

DESIRABLE_NON_HOLO_NAMES = {
    "Bulbasaur",
    "Ivysaur",
    "Charmander",
    "Charmeleon",
    "Squirtle",
    "Wartortle",
    "Pikachu",
    "Eevee",
    "Dragonair",
    "Double Colorless Energy",
}


def build_tags(
    *,
    local_id: str,
    english_name: str,
    category: str,
    rarity: str,
    holo: bool,
    illustrator: str,
    detail: dict[str, Any],
    no_rarity_target: bool,
) -> list[str]:
    tags: list[str] = ["PMCG1", "1996 Japan", "Expansion Pack"]
    tags.append("No Rarity target" if no_rarity_target else "basic Energy caveat")
    booster_order = JAPANESE_BOOSTER_ORDER_BY_ENGLISH_NAME.get(english_name)
    if booster_order:
        tags.append(f"Japanese booster order {booster_order['order']:03d}")
        tags.append(f"Japanese booster section: {booster_order['section']}")
    if english_name in QUICK_STARTER_TEXT_CHECK_NAMES:
        tags.append("Quick Starter text-check")
        tags.append("variant trap")
    if category:
        tags.append(category)
    if rarity:
        tags.append(rarity)
    if holo:
        tags.append("holo")
    if illustrator:
        tags.append(f"illustrator: {illustrator}")
    for card_type in detail.get("types", []) or []:
        tags.append(card_type)
    if detail.get("stage"):
        tags.append(detail["stage"])
    if local_id == "021":
        tags.extend(["Charizard", "high scrutiny"])
    if english_name in {"Venusaur", "Blastoise", "Charizard"}:
        tags.append("final starter evolution")
    if english_name in {"Bulbasaur", "Charmander", "Squirtle", "Pikachu"}:
        tags.append("iconic early print")
    return dedupe(tags)


def build_product_scope(english_name: str, no_rarity_target: bool) -> dict[str, Any]:
    booster_order = JAPANESE_BOOSTER_ORDER_BY_ENGLISH_NAME.get(english_name)
    if booster_order:
        return {
            "strict_booster_member": True,
            "japanese_booster_order": booster_order["order"],
            "japanese_booster_section": booster_order["section"],
            "japanese_name_from_research": booster_order["japanese_name"],
            "romaji_from_research": booster_order["romaji"],
            "counting_note": "This row belongs to the 96-card First Expansion Pack booster checklist. PMCG1 local id remains the protocol anchor.",
            "authority": booster_order["authority"],
        }
    return {
        "strict_booster_member": False,
        "japanese_booster_order": None,
        "japanese_booster_section": "Starter Pack basic Energy caveat",
        "japanese_name_from_research": "",
        "romaji_from_research": "",
        "counting_note": "This row is tracked for broader Japanese Base-family completeness, but it is not part of the strict 96-card booster checklist.",
        "authority": "Local catalog policy derived from the 96 booster / 102 broader-family distinction.",
    }


def build_variant_traps(english_name: str) -> list[dict[str, Any]]:
    if english_name not in QUICK_STARTER_TEXT_CHECK_NAMES:
        return []
    return [
        {
            "id": "quick_starter_gift_set_text_check",
            "name": "Quick Starter Gift Set text-layout trap",
            "risk": "This Trainer has no-symbol lookalikes outside the Expansion Pack claim path. A missing rarity mark alone can be misleading.",
            "agent_rule": "Compare Japanese text layout line-by-line against a known Expansion Pack exemplar before treating the No Rarity claim as clean.",
            "evidence_request": [
                "full front image with readable Japanese text",
                "lower-right rarity-symbol crop with surrounding border",
                "text-area close-up sharp enough for line breaks and spacing",
                "known Expansion Pack exemplar or verifier note if value or trust gap is material",
            ],
            "not_claiming": [
                "not proof of Quick Starter origin",
                "not proof of Expansion Pack origin",
                "not proof that a grading label is correct",
            ],
        }
    ]


def build_agent_decision_profile(
    *,
    local_id: str,
    english_name: str,
    category: str,
    rarity: str,
    holo: bool,
    no_rarity_target: bool,
    no_rarity_reference: dict[str, Any],
    detail: dict[str, Any],
) -> dict[str, Any]:
    has_reference = bool(no_rarity_reference.get("image_small") or no_rarity_reference.get("image_large"))
    tells = CARD_SPECIFIC_TELLS.get(english_name, [])
    is_quick_starter_sensitive = english_name in QUICK_STARTER_TEXT_CHECK_NAMES
    if is_quick_starter_sensitive:
        tells = tells + [
            "Quick Starter text-check: compare the Japanese text layout line-by-line against a known Expansion Pack exemplar before treating the missing-symbol claim as clean.",
        ]
    is_desirable_non_holo = (
        rarity == "Rare"
        or english_name in DESIRABLE_NON_HOLO_NAMES
        or category == "Trainer"
    )

    if not no_rarity_target:
        band = "caveat row"
        baseline_profile = "NR-0"
        profile_name = "Basic Energy caveat"
        agent_summary = (
            f"{english_name} is a PMCG1 row, but it should not be treated as a premium No Rarity target from the blank corner alone."
        )
        recommended_evidence = [
            "full front image",
            "full back image",
            "fresh possession image if a trade is proposed",
            "explicit seller explanation for any premium claim",
        ]
        escalation = [
            "seller markets the card as a premium No Rarity chase",
            "buyer intent is specifically about the missing-symbol variant",
            "price implies a premium without a separate provenance story",
        ]
    elif holo:
        band = "high-scrutiny holo"
        baseline_profile = "NR-C"
        profile_name = "High-value holo"
        agent_summary = (
            f"{english_name} is an active No Rarity target and a holo row. Treat hype, condition, surface, and possession as separate gates."
        )
        recommended_evidence = [
            "full front and full back images",
            "sharp lower-right rarity-symbol crop with surrounding border",
            "front and back high-resolution scans or photos",
            "four-corner front close-ups",
            "four-corner back close-ups",
            "angled holo-surface video",
            "fresh possession continuity sequence",
            "seller trust proof or bond recommendation",
            "verifier review before route lock",
        ]
        escalation = [
            "holo surface cannot be judged",
            "seller refuses continuity evidence",
            "card-specific tell is relevant but not visible",
            "price exceeds buyer verifier threshold",
            "seller trust is weak or newly introduced",
        ]
    elif is_desirable_non_holo:
        band = "desirable non-holo or trainer"
        baseline_profile = "NR-B"
        profile_name = "Mid-value desirable card"
        agent_summary = (
            f"{english_name} is an active No Rarity target where collector demand or card role can justify more than the minimum evidence ask."
        )
        recommended_evidence = [
            "full front and full back images",
            "sharp lower-right rarity-symbol crop with surrounding border",
            "front and back scans or high-resolution photos",
            "front and back corner close-ups if condition affects price",
            "fresh nonce possession image",
            "seller proof reuse if trust is thin",
        ]
        escalation = [
            "seller has no portable trust proof",
            "price carries a noticeable No Rarity premium",
            "images are low resolution or cropped",
            "condition band drives most of the price",
        ]
    else:
        band = "low-value active target"
        baseline_profile = "NR-A"
        profile_name = "Low-value active target"
        agent_summary = (
            f"{english_name} is an active No Rarity target, but the agent should avoid high-cost ceremony unless price, trust, or image quality requires it."
        )
        recommended_evidence = [
            "full front image",
            "full back image",
            "sharp lower-right rarity-symbol crop with surrounding border",
            "fresh nonce possession image",
        ]
        escalation = [
            "seller is new or weakly trusted",
            "symbol field has glare or sleeve reflection",
            "price is unusual for the row",
            "buyer asks for condition-sensitive proof",
        ]

    what_agent_knows = [
        "PMCG1 catalog row",
        "active No Rarity target status" if no_rarity_target else "basic Energy caveat status",
        "source-labeled No Rarity reference is available" if has_reference else "no source-labeled No Rarity reference is available",
        f"category: {category or 'unknown'}",
        f"rarity metadata: {rarity or 'not supplied'}",
    ]
    if holo:
        what_agent_knows.append("holo surface makes condition and lighting evidence more important")
    if detail.get("types"):
        what_agent_knows.append(f"type metadata: {'/'.join(detail['types'])}")
    if detail.get("stage"):
        what_agent_knows.append(f"stage metadata: {detail['stage']}")
    what_agent_does_not_know = [
        "whether the seller possesses the card",
        "whether the seller's card matches the reference row",
        "whether the seller's card is authentic",
        "the condition band",
        "a reliable current price",
        "whether external comps accidentally mix regular Japanese Base with No Rarity copies",
    ]
    if is_quick_starter_sensitive:
        what_agent_does_not_know.append("whether a Quick Starter Gift Set lookalike has been excluded")

    return {
        "version": "agent_card_profile.v0.1",
        "agent_summary": agent_summary,
        "baseline_evidence_profile_id": baseline_profile,
        "baseline_evidence_profile_name": profile_name,
        "value_band": band,
        "conditional_overlays": [
            "NR-D if the offer is slabbed",
            "NR-E if seller trust is thin, new, or not portable",
        ],
        "pricing_state": "unpriced until comp packet, evidence status, and condition band are attached",
        "price_comp_requirements": [
            "same PMCG1 row",
            "listing or sale images show the No Rarity claim clearly",
            "condition band is legible",
            "slab cert or raw status is separated",
            "sale venue and timestamp are preserved",
        ],
        "what_agent_knows": dedupe(what_agent_knows),
        "what_agent_does_not_know": dedupe(what_agent_does_not_know),
        "recommended_evidence": dedupe(recommended_evidence + tells),
        "card_specific_tells": tells,
        "escalation_triggers": dedupe(
            escalation
            + (
                ["card is Quick Starter-sensitive and text layout has not been compared"]
                if is_quick_starter_sensitive
                else []
            )
        ),
        "spendability_boundaries": [
            "catalog row is not spendable as seller-card proof",
            "reference image is not seller possession evidence",
            "collector texture is not price evidence",
            "a blank-corner crop is not enough without same-card context",
            "price remains non-spendable until a timestamped comp packet is attached",
        ],
        "agent_to_agent_questions": [
            "What exact physical card are you offering?",
            "Can you provide fresh possession evidence tied to this conversation?",
            "Which evidence profile are you willing to satisfy?",
            "What additional attention cost do you want for evidence beyond the baseline?",
            "What trust proof, bond, verifier, or route constraint should buy down remaining uncertainty?",
        ],
    }


def build_history_notes(
    *,
    local_id: str,
    english_name: str,
    category: str,
    rarity: str,
    holo: bool,
    illustrator: dict[str, Any],
    detail: dict[str, Any],
    no_rarity_target: bool,
) -> list[str]:
    notes = [
        "This row belongs to Japan's 1996 Expansion Pack, the first Pokémon TCG expansion era.",
        "The Japanese PMCG1 local id and English Base Set number can differ; English crosswalk data is metadata only and should not be used as a reference image.",
    ]
    if no_rarity_target:
        notes.append("For this card, the No Rarity question lives in the lower-right rarity-symbol region of the seller's physical card.")
    else:
        notes.append("This is a basic Energy caveat: absence of a rarity symbol is not distinctive in the same way as the 001-096 No Rarity targets.")
    if holo:
        notes.append("As a holo row, the evidence pass should pay special attention to holo surface, scratches, print lines, dents, and edge wear.")
    if category == "Trainer":
        notes.append("Trainer cards need text, number, and lower-right-symbol evidence more than creature-art comparison.")
    if english_name in QUICK_STARTER_TEXT_CHECK_NAMES:
        notes.append("Quick Starter Gift Set lookalikes can also lack rarity symbols; compare Japanese text layout before accepting the No Rarity claim as clean.")
    if category == "Energy" and local_id == "096":
        notes.append("Double Colorless Energy is part of the active target range; treat it separately from basic Energy cards.")
    if category == "Pokemon":
        parts = []
        if detail.get("stage"):
            parts.append(detail["stage"])
        if detail.get("hp"):
            parts.append(f"{detail['hp']} HP")
        if detail.get("types"):
            parts.append("/".join(detail["types"]))
        if parts:
            notes.append(f"TCGdex lists this Pokémon profile as {', '.join(parts)}.")
    if illustrator.get("name"):
        notes.append(
            f"Illustrator: {illustrator['name']} ({illustrator.get('verification_status', 'metadata')})."
        )
    if english_name == "Charizard":
        notes.append("Charizard is the high-scrutiny No Rarity test case: demand crisp symbol-area evidence before calling it more than a candidate.")
    elif english_name == "Pikachu":
        notes.append("Pikachu is a low-number cultural signal inside the set even when the market value is far below the headline holos.")
    elif english_name in {"Venusaur", "Blastoise"}:
        notes.append("As one of the original final starter evolutions, this card is likely to draw more collector attention than ordinary set-fillers.")
    return notes


def build_collector_texture(
    *,
    local_id: str,
    english_name: str,
    category: str,
    rarity: str,
    holo: bool,
    illustrator: dict[str, Any],
    detail: dict[str, Any],
    no_rarity_target: bool,
    no_rarity_reference: dict[str, Any],
) -> dict[str, Any]:
    signals = [f"PMCG1-{local_id}", category, rarity]
    if holo:
        signals.append("holo surface")
    if illustrator.get("name"):
        signals.append(f"illustrator: {illustrator['name']}")
    if detail.get("types"):
        signals.append(f"type: {'/'.join(detail['types'])}")
    if detail.get("stage"):
        signals.append(f"stage: {detail['stage']}")
    if detail.get("dexId"):
        signals.append(f"National Pokédex: {', '.join(str(item) for item in detail['dexId'])}")
    if no_rarity_reference.get("source"):
        signals.append(f"No Rarity reference source: {no_rarity_reference['source']}")
    if english_name in QUICK_STARTER_TEXT_CHECK_NAMES:
        signals.append("Quick Starter text-check required")
    signals.append("active No Rarity target" if no_rarity_target else "basic Energy caveat")
    return {
        "note": COLLECTOR_NOTES_BY_LOCAL_ID.get(
            local_id,
            f"{english_name} has a catalog row in Japan's 1996 Expansion Pack; treat the collector angle as texture until evidence supports a specific seller card.",
        ),
        "signals": dedupe(signals),
        "basis": [
            "TCGdex PMCG1 Japanese card row",
            "Pokemon TCG API English Base Set crosswalk",
            "source-labeled No Rarity reference image when present",
            "agent catalog inference from row, type, stage, rarity, illustrator, and set position",
        ],
        "authority": "Collector texture only. It helps a human care about the row, but it is not possession, authenticity, condition, or No Rarity proof.",
    }


def build_illustrator(
    *,
    tcgdex_id: str,
    detail: dict[str, Any],
    english_ref: dict[str, Any],
) -> dict[str, Any]:
    tcgdex_illustrator = detail.get("illustrator") or ""
    english_artist = english_ref.get("artist", "") or ""
    if tcgdex_illustrator:
        return {
            "name": tcgdex_illustrator,
            "display": f"Illus. {tcgdex_illustrator}",
            "source": "TCGdex",
            "source_field": "illustrator",
            "source_card_id": tcgdex_id,
            "source_url": f"https://api.tcgdex.net/v2/ja/cards/{tcgdex_id}",
            "authority": "Japanese PMCG1 card-row metadata.",
            "verification_status": "direct Japanese row metadata",
            "not_claiming": [
                "seller card match",
                "seller possession",
                "authenticity",
                "condition",
            ],
        }
    if english_artist:
        return {
            "name": english_artist,
            "display": f"Illus. {english_artist}",
            "source": "Pokemon TCG API",
            "source_field": "artist",
            "source_card_id": english_ref.get("id", ""),
            "source_url": f"https://api.pokemontcg.io/v2/cards/{english_ref.get('id', '')}" if english_ref.get("id") else "",
            "authority": "English Base Set crosswalk metadata. Useful for catalog texture, but not direct Japanese-print proof.",
            "verification_status": "crosswalk metadata; inspect the exact card's Illus. line if illustrator becomes dispute-relevant",
            "not_claiming": [
                "Japanese print authority",
                "seller card match",
                "seller possession",
                "authenticity",
                "condition",
            ],
        }
    return {
        "name": "",
        "display": "Illus. not resolved",
        "source": "",
        "source_field": "",
        "source_card_id": "",
        "source_url": "",
        "authority": "No illustrator source resolved in this pass.",
        "verification_status": "missing",
        "not_claiming": ["illustrator truth"],
    }


def build_information_audit(
    *,
    local_id: str,
    english_name: str,
    category: str,
    rarity: str,
    holo: bool,
    detail: dict[str, Any],
    no_rarity_target: bool,
    no_rarity_reference: dict[str, Any],
    no_rarity_examples: list[dict[str, Any]],
    illustrator: dict[str, Any],
) -> dict[str, Any]:
    has_no_rarity_image = bool(no_rarity_reference.get("image_small") or no_rarity_reference.get("image_large"))
    keep = []
    if has_no_rarity_image:
        keep.append(
            {
                "field": "No Rarity reference image",
                "why": "The human needs to compare the exact missing-symbol region. If the image is not source-labeled No Rarity, it should not appear.",
                "surface": "primary",
            }
        )
    else:
        keep.append(
            {
                "field": "No-reference boundary",
                "why": "Showing no image is better than showing a nearby or regular Japanese print that teaches the wrong visual cue.",
                "surface": "primary",
            }
        )
    keep.extend(
        [
        {
            "field": "name, PMCG1 local id, and Japanese source name",
            "why": "These anchor the row before any agent or seller starts talking about a physical card.",
            "surface": "primary",
        },
        {
            "field": "No Rarity status and evidence focus",
            "why": "This is the claim boundary: active target or caveat, and where the buyer should look.",
            "surface": "primary",
        },
        {
            "field": "collector texture note",
            "why": "This gives the row a reason to matter to a collector without pretending to authenticate a seller card.",
            "surface": "primary",
        },
        {
            "field": "illustrator",
            "why": "Illustrator is real collector texture, but its current source is crosswalk metadata and should be labeled that way.",
            "surface": "primary",
        },
        {
            "field": "category and rarity",
            "why": "These help a buyer scan the card's role in the set and make filters useful.",
            "surface": "primary",
        },
        ]
    )
    if holo:
        keep.append(
            {
                "field": "holo status",
                "why": "Holo rows carry extra surface, print-line, scratch, and lighting risk.",
                "surface": "primary",
            }
        )
    if category == "Pokemon":
        keep.append(
            {
                "field": "type, stage, and National Pokédex number",
                "why": "These power evolution-line search and collector grouping without requiring gameplay text up front.",
                "surface": "primary",
            }
        )
    if category == "Trainer":
        keep.append(
            {
                "field": "Trainer identity and effect family",
                "why": "Trainer rows are interesting because of play memory and card-function history, not creature taxonomy.",
                "surface": "secondary",
            }
        )
        if english_name in QUICK_STARTER_TEXT_CHECK_NAMES:
            keep.append(
                {
                    "field": "Quick Starter text-layout trap",
                    "why": "This trainer can have no-symbol lookalikes outside the clean Expansion Pack claim path, so text layout earns visible agent attention.",
                    "surface": "primary",
                }
            )
    if category == "Energy" and no_rarity_target:
        keep.append(
            {
                "field": "active Energy target status",
                "why": "Double Colorless Energy is inside the 001-096 active target range and must be separated from basic Energy caveats.",
                "surface": "primary",
            }
        )
    elif category == "Energy":
        keep.append(
            {
                "field": "Energy caveat status",
                "why": "Energy rows prevent false excitement: most basic Energy absence-of-rarity is not the same chase as cards 001-096.",
                "surface": "primary" if not no_rarity_target else "secondary",
            }
        )
    if no_rarity_examples:
        keep.append(
            {
                "field": "curated example images",
                "why": "Examples can teach the eye, especially for high-scrutiny rows, but they should stay separate from the exact row reference.",
                "surface": "secondary",
            }
        )

    agent_only = [
        {
            "field": "TCGdex URL, set id, and variants",
            "why": "Useful provenance for agents and audits, too technical for the first buyer surface.",
        },
        {
            "field": "Pokemon TCG API English reference",
            "why": "Necessary crosswalk metadata, but it is not the Japanese No Rarity reference and should stay under the hood.",
        },
        {
            "field": "collector texture basis and signals",
            "why": "Good for search, explanation, and agent reasoning; too repetitive for the main human read.",
        },
        {
            "field": "not_claiming arrays",
            "why": "Protocol-critical guardrails, but repeated legalistic lists should collapse behind a boundary note.",
        },
        {
            "field": "raw provider ids and verification statuses",
            "why": "Important when investigating provenance, noisy during ordinary browsing.",
        },
    ]
    if category == "Pokemon":
        agent_only.append(
            {
                "field": "attack costs, damage, and translated effects",
                "why": "Useful for old-school player texture and search, but not needed for the basic buy/sell decision.",
            }
        )
    if category in {"Trainer", "Energy"}:
        agent_only.append(
            {
                "field": "empty Pokémon profile object",
                "why": "Structurally consistent for agents, but it should not be shown to humans as 'no profile' noise.",
            }
        )

    disposable = [
        {
            "field": "duplicate tag chips",
            "why": "Tags are excellent search metadata, but the UI already shows name, category, rarity, illustrator, and status elsewhere.",
            "action": "hide or collapse unless filtering/debugging",
        },
        {
            "field": "generic repeated history notes",
            "why": "The same set-level caveats appear on every row; they belong in the research boundary, not every card.",
            "action": "show only row-specific notes in the card panel",
        },
        {
            "field": "empty English image fields",
            "why": "They exist only to block fallback-image misuse and should never be visible.",
            "action": "keep in data only if needed for guardrails; omit from UI",
        },
        {
            "field": "long source/provider labels next to thumbnails",
            "why": "They slow scanning. A source link belongs in the detail panel, not every table row.",
            "action": "shorten table labels",
        },
    ]
    if not no_rarity_target:
        disposable.append(
            {
                "field": "No Rarity chase language",
                "why": "Basic Energy rows are caveats; chase language would teach the wrong lesson.",
                "action": "replace with caveat language",
            }
        )
    if not (no_rarity_reference.get("image_small") or no_rarity_reference.get("image_large")):
        disposable.append(
            {
                "field": "placeholder reference image panels",
                "why": "A question-mark box is useful once, but repeated missing-image panels become visual clutter.",
                "action": "show text-only missing state",
            }
        )

    primary_surface = [
        "reference image" if has_no_rarity_image else "no substitute image",
        "name and PMCG1 id",
        "No Rarity target/caveat",
        "collector texture note",
        "illustrator with authority label",
        "category, rarity, and holo flag",
    ]
    if category == "Pokemon":
        primary_surface.append("type/stage/Pokédex line")
    if category == "Trainer":
        primary_surface.append("Trainer effect identity")
    if category == "Energy":
        primary_surface.append("active Energy target" if no_rarity_target else "Energy caveat")

    return {
        "verdict": (
            "Primary surface should stay small: image, identity, variant boundary, one collector note, illustrator, and only the row traits that change decisions."
        ),
        "earns_keep": keep,
        "agent_only": agent_only,
        "disposable_from_primary_ui": disposable,
        "recommended_primary_surface": primary_surface,
        "audit_scope": "Information architecture only. This does not change evidence, authenticity, condition, possession, or price claims.",
    }


def dedupe(values: list[str]) -> list[str]:
    seen = set()
    out = []
    for value in values:
        value = str(value or "").strip()
        key = value.lower()
        if value and key not in seen:
            seen.add(key)
            out.append(value)
    return out


def build() -> dict[str, Any]:
    generated_at = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    tcgdex_set = fetch_json(TCGDEX_SET_URL)
    english_refs = pokemon_tcg_base_cards()
    no_rarity_refs = existing_no_rarity_references()
    for name, reference in NO_RARITY_REFERENCE_SUPPLEMENTS.items():
        no_rarity_refs.setdefault(no_rarity_ref_key(name), reference)
    if len(no_rarity_refs) < 96:
        for key, reference in pricecharting_no_rarity_references().items():
            no_rarity_refs.setdefault(key, reference)
    if len(no_rarity_refs) < 96:
        for key, reference in sci_no_rarity_references().items():
            no_rarity_refs.setdefault(key, reference)
    cards = []

    for source_row in tcgdex_set.get("cards", []):
        local_id = source_row["localId"]
        index = int(local_id) - 1
        english_name = ENGLISH_LOCAL_ORDER[index]
        tcgdex_id = source_row["id"]
        detail = fetch_json(f"https://api.tcgdex.net/v2/ja/cards/{urllib.parse.quote(tcgdex_id)}")
        time.sleep(0.015)

        english_ref = english_refs.get(english_name, {})
        no_rarity_ref = no_rarity_refs.get(no_rarity_ref_key(english_name), {})
        no_rarity_target = local_id not in BASIC_ENERGY_LOCAL_IDS
        product_scope = build_product_scope(english_name, no_rarity_target)
        variant_traps = build_variant_traps(english_name)
        category = detail.get("category", english_ref.get("supertype", ""))
        rarity = detail.get("rarity", english_ref.get("rarity", "")) or ""
        holo = bool((detail.get("variants") or {}).get("holo"))
        illustrator = build_illustrator(
            tcgdex_id=tcgdex_id,
            detail=detail,
            english_ref=english_ref,
        )
        tags = build_tags(
            local_id=local_id,
            english_name=english_name,
            category=category,
            rarity=rarity,
            holo=holo,
            illustrator=illustrator.get("name", ""),
            detail=detail,
            no_rarity_target=no_rarity_target,
        )
        history_notes = build_history_notes(
            local_id=local_id,
            english_name=english_name,
            category=category,
            rarity=rarity,
            holo=holo,
            illustrator=illustrator,
            detail=detail,
            no_rarity_target=no_rarity_target,
        )
        collector_texture = build_collector_texture(
            local_id=local_id,
            english_name=english_name,
            category=category,
            rarity=rarity,
            holo=holo,
            illustrator=illustrator,
            detail=detail,
            no_rarity_target=no_rarity_target,
            no_rarity_reference=no_rarity_ref,
        )
        no_rarity_examples = no_rarity_examples_for(english_name)
        information_audit = build_information_audit(
            local_id=local_id,
            english_name=english_name,
            category=category,
            rarity=rarity,
            holo=holo,
            detail=detail,
            no_rarity_target=no_rarity_target,
            no_rarity_reference=no_rarity_ref,
            no_rarity_examples=no_rarity_examples,
            illustrator=illustrator,
        )
        agent_decision_profile = build_agent_decision_profile(
            local_id=local_id,
            english_name=english_name,
            category=category,
            rarity=rarity,
            holo=holo,
            no_rarity_target=no_rarity_target,
            no_rarity_reference=no_rarity_ref,
            detail=detail,
        )
        card = {
            "local_id": local_id,
            "tcgdex_id": tcgdex_id,
            "name_en": english_name,
            "name_source_raw": detail.get("name", source_row.get("name", "")),
            "name_source_note": "TCGdex Japanese-name field is retained as source data, not treated as print-name truth.",
            "category": category,
            "rarity_source": rarity,
            "holo_source": holo,
            "pokemon_profile": {
                "dex_id": detail.get("dexId", []),
                "hp": detail.get("hp"),
                "types": detail.get("types", []),
                "stage": detail.get("stage", ""),
                "retreat": detail.get("retreat"),
                "abilities": detail.get("abilities", []),
                "attacks": detail.get("attacks", []),
            },
            "no_rarity_target": no_rarity_target,
            "no_rarity_profile": "missing_rarity_symbol_target" if no_rarity_target else "basic_energy_caveat",
            "product_scope": product_scope,
            "evidence_focus": (
                "lower-right rarity-symbol region"
                if no_rarity_target
                else "basic Energy cards need separate treatment because rarity-symbol absence is not distinctive"
            ),
            "tcgdex": {
                "url": f"https://api.tcgdex.net/v2/ja/cards/{tcgdex_id}",
                "set_id": "PMCG1",
                "variants": detail.get("variants", {}),
            },
            "english_reference": {
                "source": "Pokemon TCG API",
                "id": english_ref.get("id", ""),
                "number": english_ref.get("number", ""),
                "rarity": english_ref.get("rarity", ""),
                "artist": illustrator.get("name", "") if illustrator.get("source") == "Pokemon TCG API" else english_ref.get("artist", ""),
                "image_small": "",
                "image_large": "",
                "image_role": "English API image retained as raw metadata only; do not display as a Japanese No Rarity reference.",
            },
            "illustrator": illustrator,
            "no_rarity_reference": no_rarity_ref or empty_no_rarity_reference(),
            "no_rarity_examples": no_rarity_examples,
            "variant_traps": variant_traps,
            "collector_texture": collector_texture,
            "information_audit": information_audit,
            "agent_decision_profile": agent_decision_profile,
            "tags": tags,
            "history_notes": history_notes,
            "not_claiming": [
                "seller possession",
                "authenticity",
                "condition",
                "no-rarity truth without evidence",
                "price truth",
            ],
        }
        cards.append(card)

    return {
        "schema": "marketplace.no_rarity_base_set.v0.6",
        "generated_at": generated_at,
        "research_status": "seed database; useful for search, collector texture, and evidence targeting, not an authentication authority",
        "collector_texture_policy": "Collector texture is agent-readable context derived from catalog metadata, reference sources, and conservative card-row interpretation. It is never transaction evidence by itself.",
        "illustrator_policy": "Illustrator is a first-class metadata field. Prefer direct Japanese row metadata when available; otherwise use Pokemon TCG API English Base Set crosswalk metadata and label it as crosswalk-only.",
        "information_audit_policy": "Each row separates information that earns primary UI space from agent-only provenance and disposable primary-surface clutter.",
        "agent_catalog_contract": {
            "purpose": "Make the Japanese No Rarity market legible to agents before negotiation, funding, route lock, or dispute.",
            "row_authority": "The catalog may identify PMCG1 rows, target/caveat status, source-labeled references, and recommended evidence profiles.",
            "not_authority": [
                "seller possession",
                "seller-card authenticity",
                "condition grade",
                "current price",
                "verifier or arbiter judgment",
            ],
            "agent_must_preserve": [
                "catalog row",
                "strict booster order when relevant",
                "reference source",
                "seller-provided evidence",
                "price comps",
                "verifier judgment",
                "human preference",
            ],
            "recommended_agent_output": [
                "what I know",
                "what I do not know",
                "what evidence profile applies",
                "what it would cost the seller to satisfy the ask",
                "whether this is worth interrupting the human",
                "what remains judgment",
            ],
        },
        "set": {
            "tcgdex_set_id": "PMCG1",
            "name_en": "Japanese Base Set / Expansion Pack",
            "name_ja": "拡張パック",
            "release_date": "1996-10-20",
            "total_cards": len(cards),
            "strict_booster_checklist_cards": len(JAPANESE_BOOSTER_ORDER_ROWS),
            "broader_family_rows_tracked": len(cards),
            "no_rarity_target_cards": len([card for card in cards if card["no_rarity_target"]]),
            "basic_energy_caveat_cards": len([card for card in cards if not card["no_rarity_target"]]),
            "counting_note": "Strict Japanese First Expansion Pack booster checklist is 96 cards. This local catalog tracks 102 broader Base-family rows by adding six Starter Pack basic Energy caveats.",
        },
        "set_entry": SET_ENTRY,
        "research_claims": [
            {
                "claim": "The Japanese First Expansion Pack booster released on October 20, 1996 and is treated here as a strict 96-card booster checklist without basic Energy.",
                "source": "User-supplied deep research packet; Japanese product/checklist source pending direct local verification",
                "url": "",
            },
            {
                "claim": "Expansion Pack was the first main Pokémon Card Game expansion and was based on Generation I; Bandai Pokémon Cards predate it as non-TCG cards.",
                "source": "Bulbapedia Base Set",
                "url": "https://bulbapedia.bulbagarden.net/wiki/Base_Set",
            },
            {
                "claim": "Glossy CoroCoro Pikachu and Jigglypuff promos were released on October 15, 1996, five days before Expansion Pack.",
                "source": "Bulbapedia Unnumbered Promotional cards",
                "url": "https://bulbapedia.bulbagarden.net/wiki/Unnumbered_Promotional_cards_(TCG)/1996-2005",
            },
            {
                "claim": "The first Series 1 Starter Pack released alongside Expansion Pack on October 20, 1996 and included random cards, basic Energy, counters, coin, rulebook, and checklist.",
                "source": "Bulbapedia Original TCG Era merchandise",
                "url": "https://bulbapedia.bulbagarden.net/wiki/Original_TCG_Era_merchandise",
            },
            {
                "claim": "The Japanese Expansion Pack has cards both with and without rarity symbols; the no-symbol version is commonly called No Rarity Base Set.",
                "source": "Bulbapedia Base Set",
                "url": "https://bulbapedia.bulbagarden.net/wiki/Base_set",
            },
            {
                "claim": "Japanese first print Base Set cards lacked a rarity symbol in the bottom-right corner.",
                "source": "CGC No Rarity Charizard article",
                "url": "https://www.cgccards.com/news/article/11258/no-rarity-charizard/",
            },
            {
                "claim": "Collector guides commonly treat 96 non-basic-Energy cards as the No Rarity target because basic Energy cards are the exception case.",
                "source": "Poke Master Center Base Set guide",
                "url": "https://www.pokemastercenter.com/pokemon-base-set-guide/",
            },
            {
                "claim": "The broader 102-row Japanese Base-family count comes from adding six basic Energy cards associated with the simultaneous Starter Pack rather than the strict booster checklist.",
                "source": "User-supplied deep research packet; Japanese product/checklist source pending direct local verification",
                "url": "",
            },
            {
                "claim": "Potion, Switch, Gust of Wind, Energy Retrieval, and Pokémon Trader have Quick Starter Gift Set lookalike risk and need Japanese text-layout comparison before accepting a clean Expansion Pack No Rarity claim.",
                "source": "User-supplied deep research packet citing collector comparison research",
                "url": "",
            },
            {
                "claim": "Bulbapedia uses corrected print evidence such as No Rarity Venusaur's incorrect Pokémon #68 as support for the earlier-print interpretation.",
                "source": "Bulbapedia Venusaur Base Set card page",
                "url": "https://bulbapedia.bulbagarden.net/wiki/Venusaur_(Base_Set_15)",
            },
            {
                "claim": "Collector guides report additional No Rarity-specific tells, including Charizard height/weight text, Raichu's Pokédex number, and Gastly attack text.",
                "source": "Poke Master Center Base Set guide",
                "url": "https://www.pokemastercenter.com/pokemon-base-set-guide/",
            },
            {
                "claim": "One collector guide explicitly notes that the first-print interpretation is hobby-supported rather than officially confirmed by Pokémon.",
                "source": "TCGJapan No Rarity guide",
                "url": "https://tcgjapan.nl/nl/blog/pokemon/wat-zijn-japanse-no-rarity-symbol-pokemon-kaarten",
            },
            {
                "claim": "No-rarity-symbol Japanese cards exist in multiple forms, including Base Set cards, Gym deck cards, and promo cards; the protocol must distinguish those families.",
                "source": "TCGJapan No Rarity guide",
                "url": "https://tcgjapan.nl/nl/blog/pokemon/wat-zijn-japanse-no-rarity-symbol-pokemon-kaarten",
            },
            {
                "claim": "Collector guides associate early Japanese sealed-product variants, including 291-yen short packs and early starter products, with the plausible No Rarity window; this is context, not proof of contents.",
                "source": "Poke Master Center Base Set guide",
                "url": "https://www.pokemastercenter.com/pokemon-base-set-guide/",
            },
            {
                "claim": "General vintage-card authentication should combine print sharpness, color, fonts, card back, stock/core, dimensions, holo behavior, and provenance rather than relying on a single tell.",
                "source": "Poke Master Center legit-check guide",
                "url": "https://www.pokemastercenter.com/how-to-legit-check-pokemon-cards-and-graded-slabs/",
            },
            {
                "claim": "CGC states Japanese first-edition symbols began with Pokémon VS in 2001, so a 1996 Japanese Base card should not be expected to carry a Japanese first-edition stamp.",
                "source": "CGC first-edition guide",
                "url": "https://www.cgccards.com/news/article/10262/pokemon-first-editions/",
            },
        ],
        "evidence_requirements": [
            "full front image",
            "lower-right rarity-symbol region crop",
            "full back image",
            "fresh nonce possession image",
            "slab label or cert lookup if graded",
        ],
        "sources": [
            {
                "name": "TCGdex",
                "role": "Japanese Expansion Pack row source",
                "url": "https://api.tcgdex.net/v2/ja/sets/PMCG1",
                "docs": "https://tcgdex.dev/rest",
            },
            {
                "name": "Pokemon TCG API",
                "role": "English-name crosswalk metadata source; images are raw data only and hidden from the No Rarity reference UI",
                "url": "https://api.pokemontcg.io/v2/cards?q=set.id:base1",
                "docs": "https://docs.pokemontcg.io/api-reference/cards/search-cards/",
            },
            {
                "name": "PriceCharting",
                "role": "Primary source-labeled No Rarity reference images for active target rows",
                "url": PRICECHARTING_SET_BASE,
                "docs": "https://www.pricecharting.com/game/pokemon-japanese-expansion-pack/bulbasaur-no-rarity",
            },
            {
                "name": "Sports Card Investor",
                "role": "Fallback and cross-check source-labeled No Rarity Symbol pages when reachable",
                "url": SCI_SET_PAGE,
                "docs": "https://www.sportscardinvestor.com/sets/1996-japanese-base-set-pokemon",
            },
        ],
        "cards": cards,
    }


def no_rarity_examples_for(english_name: str) -> list[dict[str, Any]]:
    if english_name != "Charizard":
        return []
    return [
        {
            "source": "CGC",
            "label": "CGC 9.5 No Rarity Charizard front",
            "page_url": "https://www.cgccards.com/news/article/11258/no-rarity-charizard/",
            "image_url": "https://s3.amazonaws.com/ccg-corporate-production/news-images/Charizard_1996_Japanese 9.5_4189801-001_OBV_lg20230131154619793.jpg",
            "role": "Specific graded No Rarity example image; useful for the missing-symbol region and slab-label context.",
            "not_claiming": ["seller card match", "condition of any offered card"],
        },
        {
            "source": "CGC",
            "label": "CGC 9.5 No Rarity Charizard back",
            "page_url": "https://www.cgccards.com/news/article/11258/no-rarity-charizard/",
            "image_url": "https://s3.amazonaws.com/ccg-corporate-production/news-images/Charizard_1996_Japanese 9.5_4189801-001_REV_lg20230131154712903.jpg",
            "role": "Specific graded No Rarity example back image.",
            "not_claiming": ["seller card match", "condition of any offered card"],
        },
        {
            "source": "PokeJapan",
            "label": "No Rarity comparison image",
            "page_url": "https://pokejapan.nl/blog/pokemon/wat-zijn-japanse-no-rarity-symbol-pokemon-kaarten",
            "image_url": "https://pokejapan.nl/img/cms/no-rarity-charizard.png",
            "role": "Collector guide comparison image for rarity-symbol versus no-symbol visual learning.",
            "not_claiming": ["seller card match", "condition of any offered card"],
        },
    ]


def main() -> None:
    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    payload = build()
    OUT_PATH.write_text(json.dumps(payload, indent=2, ensure_ascii=False, sort_keys=True) + "\n", encoding="utf-8")
    print(OUT_PATH)
    print(json.dumps({"cards": len(payload["cards"]), "targets": payload["set"]["no_rarity_target_cards"]}))


if __name__ == "__main__":
    main()
