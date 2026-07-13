#!/usr/bin/env python3
"""First wiring of the agent INTO the catalog — the 'browse with an agent' loop.

A call -> Qwen3.6 reads it into a structured filter (given the cost field) ->
CODE applies the filter deterministically over catalog-sample.json (the mechanical,
enforced part) -> Qwen3.6 writes a bit of commentary over the survivors (the judged
part), labeling what it cut and flagging anything judged. Trichotomy by construction:
code does facts, the model does judgment + words. No-overclaim is INSTRUCTED (the
prompt forbids selling and requires judged-caveats) AND post-checked: commentary_flags
scans the model's words for selling/hype or asserted physical-facts and surfaces any
hits (heuristic, not a hard proof — it catches the blatant cases). The catalog has
attention/value BANDS, not prices.

Usage:
  python3 simulations/cairn_browse.py "holos I'm missing that won't break the bank"
Requires the Qwen3.6 mlx_lm.server running on :8081 (see session notes).
"""

from __future__ import annotations

import json
import os
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

# heuristic no-overclaim guard on the model's WORDS: selling/hype, or asserting a
# physical/authenticity/condition fact the agent has no standing to assert.
_SELL_PAT = re.compile(
    # hype / selling
    r"you'?ll love|great deal|\bsteal\b|must[- ]have|don'?t miss|grab it|snap it up|"
    r"\bbargain\b|perfect for you|worth every|once[- ]in[- ]a[- ]lifetime|can'?t go wrong|"
    r"sure thing|undervalued|underpriced|"
    # asserting a physical/authenticity/condition/price fact the agent can't stand behind.
    # NOTE: positive assertions only — must NOT fire on honest hedges ("condition is unconfirmed").
    r"\bauthentic\b|\bgenuine\b|\bguaranteed\b|mint condition|\bgem mint\b|"
    r"condition (is |looks |reads )?(confirmed|verified|mint|near[- ]mint|gem)|"
    r"\bconfirmed (authentic|genuine|real|mint|grade|condition)|"
    r"(is|reads|looks) (authentic|genuine|real)\b|"
    r"price is fair|fairly priced|fair (price|value|deal)|good (price|value|deal)|"
    r"will appreciate|great investment|holds? (its )?value",
    re.I,
)


def commentary_flags(*texts: str) -> list[str]:
    """Flag blatant selling/overclaim in the model's commentary. Heuristic, not proof —
    it catches the cases the prompt is supposed to prevent so they never reach the human."""
    hits: list[str] = []
    for t in texts:
        hits += [m.group(0).lower() for m in _SELL_PAT.finditer(t or "")]
    return sorted(set(hits))
sys.path.insert(0, str(ROOT / "simulations"))
from interrupt_bar_probe import call_model  # noqa: E402  (reuse the proven mlx call)

# Model endpoint is env-overridable so the same loop runs against the local MLX server
# (default) OR a hosted OpenAI-compatible endpoint (DeepInfra) for the off-Mac deploy.
# CAIRN_MODEL_API_KEY (read in interrupt_bar_probe.call_model) adds the bearer header when set.
MODEL = os.environ.get("CAIRN_MODEL_ID", "/Users/che/models/mlx/Qwen3.6-35B-A3B-4bit")
ENDPOINT = os.environ.get("CAIRN_MODEL_ENDPOINT", "http://127.0.0.1:8081/v1/chat/completions")

# The standing cost field — the USER's own editable preferences, and EMPTY by default.
# No-overclaim: the protocol must not assert a motive/budget/condition/trust the user never
# gave, so we don't seed a fabricated persona here. Filters are driven purely by the user's
# actual call unless they set these fields themselves (e.g. a call that says "cheap" still
# sets exclude_grails — that comes from the user's words, not an invented budget).
COST_FIELD = {
    "motive": "",
    "budget": "",
    "condition": "",
    "trust": "",
}

CATALOG_PATHS = {
    "japanese-pre-english": [
        ROOT / "mockups" / "catalog-sample.json",
        ROOT / "web" / "public" / "catalog-sample.json",
        ROOT / "web" / "dist" / "catalog-sample.json",
    ],
    "azuki-tcg": [
        ROOT / "web" / "public" / "catalogs" / "azuki-tcg.json",
        ROOT / "data" / "azuki-tcg" / "ui" / "azuki-catalog-sample.json",
        ROOT / "web" / "dist" / "catalogs" / "azuki-tcg.json",
    ],
}
_CATALOG_CACHE: dict[str, dict] = {}


def nm(c: dict) -> str:
    return c.get("name_ja") or c.get("name_en") or c["uid"]


def normalize_catalog_id(catalog: str | None) -> str:
    cid = (catalog or "japanese-pre-english").strip().lower()
    if cid in ("azuki", "azuki-tcg", "azuki_tcg"):
        return "azuki-tcg"
    return "japanese-pre-english"


def load_catalog(catalog: str | None) -> dict:
    cid = normalize_catalog_id(catalog)
    if cid in _CATALOG_CACHE:
        return _CATALOG_CACHE[cid]
    for path in CATALOG_PATHS[cid]:
        if path.exists():
            data = json.loads(path.read_text(encoding="utf-8"))
            data["_catalog_id"] = cid
            data["_catalog_path"] = str(path)
            data["_set_label"] = {s["id"]: s["label"] for s in data["sets"]}
            _CATALOG_CACHE[cid] = data
            return data
    raise FileNotFoundError(f"No catalog payload found for {cid}")


def filter_system(data: dict) -> str:
    profile = data.get("profile", {})
    if profile.get("id") == "azuki-tcg":
        cats = " | ".join(data.get("ui", {}).get("category_chips") or ["Leader", "Gate", "Entity", "Weapon", "Spell", "IKZ"])
        elements = " | ".join(data.get("ui", {}).get("element_chips") or ["Neutral", "Water", "Lightning", "Earth", "Fire"])
        world = data.get("azuki_world", {})
        guide = world.get("world_guide", {})
        lore_terms = " | ".join(item["term"] for item in guide.get("subtype_vocabulary", []))
        themes = " | ".join(sorted({
            theme
            for card in data.get("cards", [])
            for theme in card.get("azuki_world", {}).get("motifs", [])
        }))
        threads = " | ".join(item["id"] for item in guide.get("character_threads", []))
        events = " | ".join(item["name"] for item in guide.get("event_contexts", []))
        products = " | ".join(item["name"] for item in guide.get("product_contexts", []))
        return (
            "You translate a collector's loose browse CALL into a structured filter over an Azuki TCG "
            "catalog, using their standing COST FIELD. The catalog has NO dollar prices; it has rarity, "
            "star/alternate-art signals, and issue flags. Do not infer condition, authenticity, or market value.\n\n"
            f"WORLD CONTEXT: {profile.get('azuki_world_context') or guide.get('agent_context') or ''}\n"
            "Authority discipline: official card fields and official site facts are facts; setting cues and visual notes "
            "are labelled card-art observations; character links may be declared catalog inferences. Never turn an art "
            "cue into a canon event or treat every subtype as a political faction.\n\n"
            "Available filter dimensions (use only these):\n"
            " - star_alt: true | false | null   (for ★, alternate art, portrait rare, or star treatment)\n"
            " - holo: true | false | null       (same physical UI field as star_alt; prefer star_alt for Azuki)\n"
            " - owned: true | false | null      (for 'missing' / 'don't have', set false)\n"
            " - exclude_grails: true | false    (use for 'cheap' / 'not the big ones'; it removes high-attention rows)\n"
            " - set: a set-name substring, or null\n"
            " - character: a name substring, or null\n"
            f" - category: {cats} | null\n"
            f" - element: {elements} | null\n"
            " - rarity: an EXACT rarity code — C (common), UC (uncommon), R (rare), SR, SR ★, SR ★★, L, L ★, G, G ★, IKZ, IKZ ★ — or null\n"
            " - card_type: a tribe/type word from the card's TYPE LINE — e.g. Beanz, Steelborn, Black Jade, "
            "Scorchweaver, Wavecaller, Dawnling, Blazerker, Elder — or null\n"
            " - release_family: alpha | gates_awakened | null   ('Alpha' vs 'Gates Awakened' printings)\n"
            " - product_channel: booster | starter | promo | special_collection | null\n"
            " - plane: alley | garden | threshold | null (a labelled visual cue, not canon-location proof)\n"
            f" - lore_term: one official card-vocabulary term, or null. Terms: {lore_terms}\n"
            f" - theme: one catalog motif, or null. Motifs: {themes}\n"
            f" - character_thread: one repeated identity thread, or null. Threads: {threads}\n"
            f" - event: one named event substring, or null. Events: {events}\n"
            f" - Special Collection product names resolve to product_channel=special_collection. Products: {products}\n"
            " - lore: one exact, atomic substring expected in world metadata (for example 'Azuki', '187', or 'big brother'), "
            "or null. Never put a paraphrase, sentence, or restatement of the request here; prefer the structured fields above.\n\n"
            "The call may instead be one or more INSTRUCTIONS about the collector's own cards. Then ALSO set "
            "action: a LIST of steps, IN ORDER. Each step:\n"
            ' {"op": "mark_have" | "mark_want" | "unmark_have" | "unmark_want" | "list_for_sale" | "open_to_trade" | "unlist" | "close_trade" | "find_market" | "match_value",\n'
            '  "ask": number or null,  (per-card price if named; strip $ and units)\n'
            '  "scope": {"rarity":.., "release_family":.., "product_channel":.., "star_alt":.., "category":.., "element":.., "set":.., "character":.., "card_type":.., "plane":.., "lore_term":.., "theme":.., "character_thread":.., "event":.., "lore":.., "duplicates":..}}\n'
            "scope.duplicates: true when they say duplicates/dupes/extras/spares — cards they hold more than one copy of.\n"
            "match_value is for BALANCING a trade ('match the value of that Mizuki', 'make my side even'): scope "
            "optionally narrows which of THEIR OWN cards to offer; code does the matching from recorded settlements.\n"
            "'unmark'/'remove'/'clear' my haves -> unmark_have; my wants -> unmark_want (both also drop any "
            "listing on the card). "
            "find_market is for SHOPPING — 'I'd like to buy…', 'looking to trade for…', 'who's selling…': "
            'add "mode": "buy" or "trade", scope describes the card they want, ask = their max per-card '
            "price if they named one. "
            "Steps run in order — a card marked have by step 1 can be listed by step 2. Scope carries ONLY what "
            "the collector said: 'all commons including alpha' -> {\"rarity\":\"C\"} with NO family key; "
            "'the rest' means the complement of the families already handled.\n"
            "Example — 'mark that I have all commons including alpha; list alpha commons at $2 and the rest at $1' ->\n"
            ' [{"op":"mark_have","ask":null,"scope":{"rarity":"C"}},\n'
            '  {"op":"list_for_sale","ask":2,"scope":{"rarity":"C","release_family":"alpha"}},\n'
            '  {"op":"list_for_sale","ask":1,"scope":{"rarity":"C","release_family":"gates_awakened"}}]\n'
            "For browse calls, action is null. You only ever PROPOSE — code resolves the exact set from the "
            "collector's own records and they confirm.\n"
            "sort: when they ask to ORDER listings ('sort highest to lowest cost', 'cheapest first') set "
            '"sort": "price_desc" or "price_asc" (top level, beside the filter dims); null otherwise.\n\n"'
            'Return ONLY JSON: {"holo":..,"star_alt":..,"owned":..,"exclude_grails":..,"set":..,"character":..,"category":..,"element":..,"rarity":..,"release_family":..,"product_channel":..,"card_type":..,"plane":..,"lore_term":..,"theme":..,"character_thread":..,"event":..,"lore":..,"sort":..,"action":..,"reading":"ONE line spoken TO the collector in Anko\'s voice — \'You want\u2026\' / \'Putting\u2026\', plain words, never \'the user\'"}'
        )
    return (
        "You translate a collector's loose browse CALL into a structured filter over a Japanese Pokemon "
        "card catalog, using their standing COST FIELD. The catalog has NO dollar prices, only value bands.\n\n"
        "Available filter dimensions (use only these):\n"
        " - holo: true | false | null\n"
        " - owned: true | false | null   (for 'missing' / 'don't have', set false)\n"
        " - exclude_grails: true | false  (the top value tier is 'high-scrutiny holo' grails; set true for "
        "'cheap' / 'affordable' / \"won't break the bank\")\n"
        " - set: a set-name substring, or null\n"
        " - character: a pokemon-name substring, or null\n"
        " - category: \"Pokemon\" | \"Trainer\" | \"Energy\" | null\n\n"
        'Return ONLY JSON: {"holo":..,"owned":..,"exclude_grails":..,"set":..,"character":..,"category":..,"reading":"one line on how you read the call against the cost field"}'
    )

COMMENT_SYS = (
    "You are ANKO — the house agent of cairn.cards: Azuki Elemental #4193, Fire domain, a red panda in a "
    "hoodie whose left eye burns with an onibi (the blue ghost light of the old stories — it shows, it never "
    "leads). Voice: steady eyes, a grin in the phrasing; short sentences; warm but precise; a card-shop "
    "regular who knows every card in the box and won't lie about a single one. You speak in three registers "
    "and name them when it matters: RECORDED (the protocol saw it), CLAIMED (someone said it), MY READ "
    "(your judgment, labeled as judgment). You never sell, never hype, never assert condition or "
    "authenticity you cannot see.\n\n"
    "A deterministic filter has ALREADY narrowed the catalog (you did not see every row).\n\n"
    "Write 2-4 sentences the way ANKO talks: first person, TO the collector ('you'), contractions, short "
    "sentences, one dry grin where it fits. NEVER narrate machinery — the words 'filter', 'rows', 'catalog', "
    "'candidates', 'query' must not appear. Say what a shop kid would say across the counter: what's in front "
    "of them, what stayed on the shelf and why, what you'd flip over first.\n"
    "TONE ONLY — these two lines are about an IMAGINARY shelf that has nothing to do with this call; copy the "
    "voice, never the words, and never import their facts:\n"
    " - 'Seven of the old lanterns, none of the new. The paper one everybody sleeps on? That's the one I'd "
    "pull first.'\n"
    " - 'Three of these carry a note in the record — read those before you fall in love.'\n"
    "HARD RULE: every fact in your sentences (counts, names, sets, flags, what was excluded) must come from "
    "the card lines and filter given below — nothing else. If the collector didn't ask for a cut, don't claim "
    "they did.\n\n"
    "Each card row ends with flags. Read them EXACTLY as defined; never infer more:\n"
    " - 'holo' = the card is holographic.\n"
    " - 'star-alt' = the catalog row carries a star/alternate-art signal.\n"
    " - 'no-reference-photo' = the catalog deliberately suppressed or lacks a usable reference image for this row.\n"
    " - 'unowned' / 'in-collection' = whether it is in the collection. This is an OWNERSHIP fact, NOT a "
    "condition. 'unowned' does NOT mean a missing foil, a defect, or anything physical.\n"
    " - 'value-tierN' or 'attention-tierN' = a catalogue attention band. NOT a grade, NOT centering, "
    "NOT a defect.\n"
    " - 'issues:...' means the catalog carries a source disagreement or review note. It is not proof the card is wrong.\n"
    " - 'world-cue:...' is a confidence-labelled observation from card art, not proof of a canon location.\n"
    " - 'thread:...' is a declared repeated-character thread. Read its attached authority before asserting identity.\n"
    " - 'motifs:...' are search tags grounded in card fields plus reviewed art; they are not story events.\n"
    " - 'authenticity:user-confirmed[assertion]' records the user's own authenticity status; it is not independent verification by the image, model, catalogue, or official gallery.\n"
    " - 'event:...[authority]' records a typed event association. Preserve whether it is official context, visible-card evidence, user assertion, or a combination; do not invent a booth activity or recipient.\n"
    " - 'collection:...[authority]' records observed product membership. It is not an official card-by-card checklist unless its attached authority says so.\n"
    "Call an official subtype a lore term or subtype, not a faction, unless an attached official source explicitly identifies it as one.\n"
    "Use supplied lore summaries and visual notes to speak in Azuki vocabulary while preserving those boundaries.\n"
    "Do NOT infer condition, foil presence, surface, centering, authenticity, price, or defects from these flags — condition is "
    "unconfirmed and attention tier is not a price. Never SELL a card. Then pick up to 6 uids to "
    "surface first.\n\n"
    'Return ONLY JSON: {"commentary":"2-4 sentences in Anko\'s voice", "picks":["uid",..], "caveat":"one honest limitation, said the way Anko would say it"}'
)


def world_search_text(card: dict) -> str:
    world = card.get("azuki_world") or {}
    parts = [
        world.get("lore_summary") or "",
        world.get("character_thread") or "",
        world.get("variant_role") or "",
        world.get("visual_note") or "",
        card.get("stamp") or "",
        (world.get("setting_cue") or {}).get("value") or "",
        " ".join(world.get("official_subtypes") or []),
        " ".join(world.get("motifs") or []),
        " ".join(world.get("search_terms") or []),
    ]
    for connection in world.get("connections") or []:
        parts.extend([connection.get("related_card_id") or "", connection.get("relation") or ""])
    for ref in world.get("source_identity_refs") or []:
        parts.extend([ref.get("collection") or "", ref.get("token_or_reference_id") or ""])
    event = card.get("event_assertion") or {}
    collection = card.get("collection_assertion") or {}
    parts.extend([
        event.get("event") or "",
        event.get("distribution") or "",
        event.get("authority_label") or "",
        collection.get("collection_id") or "",
        collection.get("name") or "",
        collection.get("position") or "",
        collection.get("membership_authority") or "",
    ])
    return " ".join(parts).casefold()


def exact_card_name_in_call(call: str, cards: list[dict]) -> str | None:
    """Return the longest explicit catalogue name in the call, if one exists."""
    names = {
        card.get("name_en") or card.get("name_ja") or ""
        for card in cards
    }
    for name in sorted((name for name in names if len(name) >= 4), key=lambda value: (-len(value), value.casefold())):
        if re.search(rf"(?<!\w){re.escape(name)}(?!\w)", call, flags=re.IGNORECASE):
            return name
    return None


def apply_filter(cards: list[dict], f: dict, setlabel: dict[str, str]) -> list[dict]:
    out = cards
    if f.get("release_family"):
        out = [c for c in out if (c.get("release_family") or "").lower() == str(f["release_family"]).lower()]
    if f.get("product_channel"):
        ch = str(f["product_channel"]).lower()
        out = [c for c in out if str(c.get("product_channel") or "").startswith("starter_deck_")] if ch == "starter" \
            else [c for c in out if (c.get("product_channel") or "").lower() == ch]
    if f.get("holo") is not None:
        out = [c for c in out if bool(c["holo"]) == bool(f["holo"])]
    if f.get("star_alt") is not None:
        out = [c for c in out if bool(c.get("star_alt")) == bool(f["star_alt"])]
    if f.get("owned") is not None:
        out = [c for c in out if bool(c["owned"]) == bool(f["owned"])]
    if f.get("exclude_grails"):
        out = [c for c in out if (c.get("band_rank") or 0) < 3]  # band 3 = high-scrutiny holo grail
    if f.get("category"):
        out = [c for c in out if (c.get("category") or "").lower() == str(f["category"]).lower()]
    if f.get("card_type"):
        t = str(f["card_type"]).lower()
        out = [c for c in out if any(t in (x or "").lower() for x in (c.get("types") or []) + (c.get("subtypes") or []))]
    if f.get("element"):
        out = [c for c in out if (c.get("element") or "").lower() == str(f["element"]).lower()]
    if f.get("rarity"):
        r = str(f["rarity"]).strip().lower()
        known = {(c.get("rarity") or "").strip().lower() for c in cards}
        if r in known:  # exact code — 'c' must not swallow 'uc'
            out = [c for c in out if (c.get("rarity") or "").strip().lower() == r]
        else:
            out = [c for c in out if r in (c.get("rarity") or "").lower()]
    if f.get("set"):
        s = str(f["set"]).lower()
        out = [c for c in out if s in setlabel.get(c["set_id"], "").lower()]
    if f.get("character"):
        ch = str(f["character"]).lower()
        out = [
            c for c in out
            if ch in (c.get("name_en") or "").lower()
            or ch in (c.get("name_ja") or "").lower()
            or ch in world_search_text(c)
        ]
    if f.get("plane"):
        plane = str(f["plane"]).casefold()
        plane_needles = {
            "alley": ["alley"],
            "garden": ["garden"],
            "threshold": ["threshold", "gate"],
        }.get(plane, [plane])
        out = [
            c for c in out
            if any(
                needle in ((c.get("azuki_world") or {}).get("setting_cue") or {}).get("value", "").casefold()
                for needle in plane_needles
            )
        ]
    if f.get("lore_term"):
        term = str(f["lore_term"]).casefold()
        out = [
            c for c in out
            if term in " ".join((c.get("azuki_world") or {}).get("official_subtypes") or []).casefold()
        ]
    if f.get("theme"):
        theme = str(f["theme"]).casefold()
        out = [
            c for c in out
            if theme in " ".join((c.get("azuki_world") or {}).get("motifs") or []).casefold()
        ]
    if f.get("character_thread"):
        thread = str(f["character_thread"]).casefold()
        out = [
            c for c in out
            if thread == str((c.get("azuki_world") or {}).get("character_thread") or "").casefold()
        ]
    if f.get("event"):
        event = str(f["event"]).casefold()
        out = [c for c in out if event in world_search_text(c)]
    if f.get("lore"):
        lore = str(f["lore"]).casefold()
        out = [c for c in out if lore in world_search_text(c)]
    return out


def brief(c: dict, setlabel: dict[str, str]) -> str:
    # Self-describing tags: the model used to read cryptic "missing"/"band2" as
    # physical facts ("foil absent", "spine defect"). Name them for what they are.
    tags = []
    if c["holo"]:
        tags.append("star-alt" if c.get("star_alt") else "holo")
    if c.get("element"):
        tags.append(str(c["element"]))
    if c.get("band_rank"):
        tags.append(f"attention-tier{c['band_rank']}")
    if c.get("issues"):
        severities = sorted({i.get("severity", "info") for i in c.get("issues", [])})
        tags.append("issues:" + ",".join(severities))
    if not c.get("image"):
        tags.append("no-reference-photo")
    source_photo_refs = {
        ref
        for observation in c.get("observations", [])
        for ref in [
            observation.get("source_image_public_path") or observation.get("source_image_sha256"),
            *[
                source.get("source_image_public_path") or source.get("source_image_sha256")
                for source in observation.get("corroborating_sources", [])
            ],
        ]
        if ref
    }
    if len(source_photo_refs) > 1:
        tags.append(f"source-photos:{len(source_photo_refs)}[observation]")
    world = c.get("azuki_world") or {}
    cue = world.get("setting_cue") or {}
    if cue.get("value"):
        tags.append(f"world-cue:{cue['value']}[{cue.get('confidence', 'unrated')};observation]")
    if world.get("character_thread"):
        tags.append(f"thread:{world['character_thread']}")
    if world.get("motifs"):
        tags.append("motifs:" + ",".join(world["motifs"][:4]))
    if (c.get("authenticity_assertion") or {}).get("status") == "confirmed_real":
        tags.append("authenticity:user-confirmed[assertion]")
    event = c.get("event_assertion") or {}
    if event.get("event"):
        tags.append(f"event:{event['event']}[{event.get('authority_label', 'unrated')}]")
    collection = c.get("collection_assertion") or {}
    if collection.get("name"):
        tags.append(f"collection:{collection['name']}[{collection.get('membership_authority', 'unrated')}]")
    tags.append("in-collection" if c["owned"] else "unowned")
    lore = world.get("lore_summary") or ""
    visual = world.get("visual_note") or ""
    context = " | ".join(part for part in [lore, visual] if part)
    row = f"{c['uid']} · {c['num']} {nm(c)} · {setlabel.get(c['set_id'],'?')} · {c.get('category','')} · {c.get('rarity','')} · {' '.join(tags)}"
    return row + (f" · {context}" if context else "")


def diverse_pool(cards: list[dict], cap: int) -> list[dict]:
    """Survivors arrive in catalog (set) order, so a naive [:cap] traps the model in
    the earliest set(s) — it never sees, and so never picks, later sets. Round-robin
    across sets (set order preserved) so the shown pool spans the whole match set."""
    if len(cards) <= cap:
        return cards
    by_set: dict[str, list[dict]] = {}
    for c in cards:
        by_set.setdefault(c["set_id"], []).append(c)
    out: list[dict] = []
    while len(out) < cap:
        progressed = False
        for bucket in by_set.values():
            if bucket:
                out.append(bucket.pop(0))
                progressed = True
                if len(out) >= cap:
                    break
        if not progressed:
            break
    return out


def resolve_pick_uids(picks: list[str], pool: list[dict]) -> list[str]:
    """Resolve model shorthand back to exact row UIDs without inventing rows."""
    by_uid = {c["uid"]: c["uid"] for c in pool}
    by_source = {
        str(c["source_entry_id"]): c["uid"]
        for c in pool
        if c.get("source_entry_id")
    }
    by_num: dict[str, list[dict]] = {}
    for card in pool:
        by_num.setdefault(str(card.get("num") or ""), []).append(card)

    resolved = []
    for raw in picks:
        value = str(raw)
        uid = by_uid.get(value) or by_source.get(value)
        if not uid and value in by_num:
            candidates = by_num[value]
            preferred = next(
                (card for card in candidates if card.get("source_authority") == "official_gallery_api_fact"),
                candidates[0],
            )
            uid = preferred["uid"]
        if uid and uid not in resolved:
            resolved.append(uid)
    return resolved[:6]


ACTION_OPS = {"mark_have", "mark_want", "unmark_have", "unmark_want", "list_for_sale", "open_to_trade", "unlist", "close_trade", "find_market", "match_value"}
SCOPE_KEYS = {
    "rarity", "release_family", "product_channel", "star_alt", "holo", "category",
    "element", "set", "character", "exclude_grails", "duplicates", "card_type",
    "plane", "lore_term", "theme", "character_thread", "event", "lore",
}


def _valid_step(a, fallback_scope: dict) -> dict | None:
    if not isinstance(a, dict) or a.get("op") not in ACTION_OPS:
        return None
    ask = a.get("ask")
    if ask is not None:
        try:
            ask = float(ask)
        except (TypeError, ValueError):
            return None
        if not (0 <= ask < 1e9):
            return None
        if ask == int(ask):
            ask = int(ask)
    raw = a.get("scope") if isinstance(a.get("scope"), dict) else fallback_scope
    scope = {k: v for k, v in raw.items() if k in SCOPE_KEYS and v is not None}
    step = {"op": a["op"], "ask": ask, "scope": scope}
    if a["op"] == "find_market":
        step["mode"] = a.get("mode") if a.get("mode") in ("buy", "trade") else "buy"
    return step


def valid_plan(a, f: dict) -> list[dict] | None:
    """The model PROPOSES; this gate types it. A plan is an ordered list of steps, each
    with its own scope. Anything malformed dies here — the frontend only ever sees
    well-formed steps it can resolve deterministically against the collector's store.
    A bare dict (the old single-action shape) normalizes to a one-step plan scoped by
    the top-level filter, so older model emissions stay valid."""
    fallback = {k: v for k, v in (f or {}).items() if k in SCOPE_KEYS and v is not None}
    if isinstance(a, dict):
        st = _valid_step(a, fallback)
        return [st] if st else None
    if isinstance(a, list) and 0 < len(a) <= 8:
        steps = [_valid_step(x, fallback) for x in a]
        return steps if all(steps) else None
    return None


def browse(call: str, catalog: str | None = None, cap: int = 42) -> dict:
    data = load_catalog(catalog)
    setlabel = data["_set_label"]
    fuser = f"COST FIELD: {json.dumps(COST_FIELD)}\n\nCALL: \"{call}\"\n\nReturn the filter JSON."
    f = call_model(MODEL, filter_system(data), fuser, ENDPOINT, 260)
    exact_name = exact_card_name_in_call(call, data["cards"])
    if exact_name:
        parsed_name = str(f.get("character") or "")
        if parsed_name.casefold() != exact_name.casefold():
            for key in ("category", "lore_term", "theme", "character_thread", "lore"):
                f[key] = None
            f["overrode_model_identity"] = parsed_name or None
            f["reading"] = (
                f"Exact catalogue-name matching selected {exact_name} and rejected the model's "
                f"{parsed_name or 'empty'} identity parse."
            )
        f["character"] = exact_name
        f["deterministic_name_match"] = exact_name
        exact_name_cards = [
            card
            for card in data["cards"]
            if exact_name.casefold() == (card.get("name_en") or card.get("name_ja") or "").casefold()
        ]
        if "winner" in call.casefold() and any("winner" in world_search_text(card) for card in exact_name_cards):
            f["lore"] = "winner"
            f["deterministic_lore_match"] = "winner"
            f["reading"] = (
                f"Exact catalogue-name matching selected {exact_name}; the visible/user-observed winner tag "
                "narrows the result without promoting tournament context to an official fact."
            )
    for event_context in data.get("azuki_world", {}).get("world_guide", {}).get("event_contexts", []):
        event_name = event_context.get("name") or ""
        if event_name and event_name.casefold() in call.casefold():
            f["event"] = event_name
            f["deterministic_event_match"] = event_name
            break
    for product_context in data.get("azuki_world", {}).get("world_guide", {}).get("product_contexts", []):
        product_name = product_context.get("name") or ""
        product_id = product_context.get("collection_id") or ""
        call_folded = call.casefold()
        if (
            (product_name and product_name.casefold() in call_folded)
            or (product_id and product_id.casefold() in call_folded)
            or "special collection" in call_folded
        ):
            f["product_channel"] = "special_collection"
            f["deterministic_product_match"] = product_name or product_id
            break
    action = valid_plan(f.get("action"), f) if isinstance(f, dict) else None
    if action:
        # Instruction, not a browse: the model's whole job was language -> typed action.
        # The client resolves the scope against the collector's OWN store (which never
        # leaves their device) and shows the exact set for confirmation. No commentary
        # call — the proposal bar carries the numbers.
        return {"call": call, "catalog": data.get("profile", {}).get("id", data.get("_catalog_id")),
                "filter": f, "action": action,
                "result": {"commentary": "", "picks": [], "caveat": ""}, "overclaim_flags": []}
    survivors = apply_filter(data["cards"], f, setlabel)
    if not survivors and f.get("lore"):
        fallback_filter = {**f, "lore": None}
        fallback_survivors = apply_filter(data["cards"], fallback_filter, setlabel)
        if fallback_survivors:
            f["ignored_unmatched_lore"] = f["lore"]
            f["lore"] = None
            survivors = fallback_survivors
    pool = diverse_pool(survivors, cap)
    n_sets = len({c["set_id"] for c in survivors})
    cuser = (
        f"COST FIELD: {json.dumps(COST_FIELD)}\n\nThe collector called: \"{call}\"\n\n"
        f"Catalog: {data.get('profile', {}).get('title') or data.get('title','catalog')} ({data.get('profile',{}).get('id', data.get('_catalog_id'))})\n"
        f"The filter resolved to: {json.dumps({k: f.get(k) for k in ('holo','star_alt','owned','exclude_grails','set','character','category','element','rarity','release_family','product_channel','card_type','plane','lore_term','theme','character_thread','event','lore','sort','ignored_unmatched_lore','deterministic_name_match','deterministic_lore_match','deterministic_event_match','deterministic_product_match','overrode_model_identity') if k in f or f.get(k) is not None})}\n"
        f"It cut the {len(data['cards'])}-row catalog to {len(survivors)} candidates across {n_sets} sets"
        + (f" (showing a sample of {len(pool)} spread across those sets)" if len(survivors) > len(pool) else "")
        + ":\n" + "\n".join(brief(c, setlabel) for c in pool) + "\n\nWrite the commentary JSON."
    )
    if not pool:
        c = {"commentary": "Nothing matched that call.", "picks": [], "caveat": ""}
    elif f.get("deterministic_name_match") and len(pool) == 1:
        card = pool[0]
        observed = card.get("source_authority") == "user_photo_observation_not_official_gallery_fact"
        user_confirmed = (card.get("authenticity_assertion") or {}).get("status") == "confirmed_real"
        event_assertion = card.get("event_assertion") or {}
        c = {
            "commentary": (
                f"Exact catalogue-name matching isolated {card.get('name_en') or card['uid']}"
                + (f" with its {card.get('stamp')} treatment" if card.get("stamp") else "")
                + ". The displayed fields and image come from the recorded catalogue row."
            ),
            "picks": [card["uid"]],
            "caveat": (
                "The catalogue records user-supplied authenticity and event-distribution assertions, supported for event association by the visible event stamp and official event context. It does not independently verify authenticity, the exact award activity, recipient, condition, possession, or value."
                if observed and user_confirmed and event_assertion
                else
                "The user supplied a confirmed-real status; the catalogue records that claimant assertion without independently verifying authenticity. The photo also does not establish official variant enumeration, tournament details, recipient, condition, possession, or value."
                if observed and user_confirmed
                else "This is user-photo evidence linked to the official card identity; it does not establish official variant enumeration, tournament details, recipient, authenticity, condition, possession, or value."
                if observed
                else "Catalogue identity and source fields do not establish physical-card authenticity, condition, possession, or value."
            ),
        }
    else:
        c = call_model(MODEL, COMMENT_SYS, cuser, ENDPOINT, 220)
    c["picks"] = resolve_pick_uids(c.get("picks") or [], pool)
    flags = commentary_flags(c.get("commentary", ""), c.get("caveat", ""))
    return {"call": call, "catalog": data.get("profile", {}).get("id", data.get("_catalog_id")), "filter": f, "n_survivors": len(survivors), "result": c, "overclaim_flags": flags}


def main() -> int:
    catalog = "japanese-pre-english"
    args = sys.argv[1:]
    if args[:2] and args[0] == "--catalog":
        catalog = args[1]
        args = args[2:]
    call = " ".join(args) or "holos I'm missing that won't break the bank"
    print(f'CALL: "{call}"\n')
    out = browse(call, catalog=catalog)
    f = out["filter"]
    data = load_catalog(catalog)
    setlabel = data["_set_label"]
    print(f"CATALOG: {out['catalog']}")
    print(f"FILTER (Qwen read): {json.dumps({k: f.get(k) for k in ('holo','star_alt','owned','exclude_grails','set','character','category','element','rarity','release_family','product_channel','card_type','plane','lore_term','theme','character_thread','event','lore','sort','ignored_unmatched_lore','deterministic_name_match','deterministic_lore_match','deterministic_event_match','deterministic_product_match','overrode_model_identity')})}")
    print(f"  reading: {f.get('reading','')}")
    print(f"  -> {out['n_survivors']} of {len(data['cards'])} cards survive\n")
    r = out["result"]
    print(f"COMMENTARY: {r.get('commentary','')}")
    print(f"CAVEAT:     {r.get('caveat','')}")
    print("PICKS:")
    by = {c["uid"]: c for c in data["cards"]}
    for uid in (r.get("picks") or [])[:6]:
        c = by.get(uid)
        print(f"  - {brief(c, setlabel)}" if c else f"  - {uid} (?)")
    if out.get("overclaim_flags"):
        print(f"\n!! NO-OVERCLAIM CHECK flagged selling/overclaim language: {out['overclaim_flags']} — surface for review, do not present as-is.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
