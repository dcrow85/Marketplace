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
        ROOT / "web" / "dist" / "catalogs" / "azuki-tcg.json",
        ROOT / "web" / "public" / "catalogs" / "azuki-tcg.json",
        ROOT / "data" / "azuki-tcg" / "ui" / "azuki-catalog-sample.json",
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
        return (
            "You translate a collector's loose browse CALL into a structured filter over an Azuki TCG "
            "catalog, using their standing COST FIELD. The catalog has NO dollar prices; it has rarity, "
            "star/alternate-art signals, and issue flags. Do not infer condition, authenticity, or market value.\n\n"
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
            " - product_channel: booster | starter | promo | null\n\n"
            "The call may instead be one or more INSTRUCTIONS about the collector's own cards. Then ALSO set "
            "action: a LIST of steps, IN ORDER. Each step:\n"
            ' {"op": "mark_have" | "mark_want" | "unmark_have" | "unmark_want" | "list_for_sale" | "open_to_trade" | "unlist" | "close_trade" | "find_market" | "match_value",\n'
            '  "ask": number or null,  (per-card price if named; strip $ and units)\n'
            '  "scope": {"rarity":.., "release_family":.., "product_channel":.., "star_alt":.., "category":.., "element":.., "set":.., "character":.., "duplicates":..}}\n'
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
            'Return ONLY JSON: {"holo":..,"star_alt":..,"owned":..,"exclude_grails":..,"set":..,"character":..,"category":..,"element":..,"rarity":..,"release_family":..,"product_channel":..,"card_type":..,"sort":..,"action":..,"reading":"ONE line spoken TO the collector in Anko\'s voice — \'You want\u2026\' / \'Putting\u2026\', plain words, never \'the user\'"}'
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
    "Do NOT infer condition, foil presence, surface, centering, authenticity, price, or defects from these flags — condition is "
    "unconfirmed and attention tier is not a price. Never SELL a card. Then pick up to 6 uids to "
    "surface first.\n\n"
    'Return ONLY JSON: {"commentary":"2-4 sentences in Anko\'s voice", "picks":["uid",..], "caveat":"one honest limitation, said the way Anko would say it"}'
)


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
        out = [c for c in out if ch in (c.get("name_en") or "").lower() or ch in (c.get("name_ja") or "").lower()]
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
    tags.append("in-collection" if c["owned"] else "unowned")
    return f"{c['uid']} · {c['num']} {nm(c)} · {setlabel.get(c['set_id'],'?')} · {c.get('category','')} · {c.get('rarity','')} · {' '.join(tags)}"


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


ACTION_OPS = {"mark_have", "mark_want", "unmark_have", "unmark_want", "list_for_sale", "open_to_trade", "unlist", "close_trade", "find_market", "match_value"}
SCOPE_KEYS = {"rarity", "release_family", "product_channel", "star_alt", "holo", "category", "element", "set", "character", "exclude_grails", "duplicates", "card_type"}


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
    f = call_model(MODEL, filter_system(data), fuser, ENDPOINT, 180)
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
    pool = diverse_pool(survivors, cap)
    n_sets = len({c["set_id"] for c in survivors})
    cuser = (
        f"COST FIELD: {json.dumps(COST_FIELD)}\n\nThe collector called: \"{call}\"\n\n"
        f"Catalog: {data.get('profile', {}).get('title') or data.get('title','catalog')} ({data.get('profile',{}).get('id', data.get('_catalog_id'))})\n"
        f"The filter resolved to: {json.dumps({k: f.get(k) for k in ('holo','star_alt','owned','exclude_grails','set','character','category','element','rarity') if k in f or f.get(k) is not None})}\n"
        f"It cut the {len(data['cards'])}-row catalog to {len(survivors)} candidates across {n_sets} sets"
        + (f" (showing a sample of {len(pool)} spread across those sets)" if len(survivors) > len(pool) else "")
        + ":\n" + "\n".join(brief(c, setlabel) for c in pool) + "\n\nWrite the commentary JSON."
    )
    c = call_model(MODEL, COMMENT_SYS, cuser, ENDPOINT, 220) if pool else {"commentary": "Nothing in the box answers that call. Loosen a term and I'll look again.", "picks": [], "caveat": ""}
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
    print(f"FILTER (Qwen read): {json.dumps({k: f.get(k) for k in ('holo','star_alt','owned','exclude_grails','set','character','category','element','rarity')})}")
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
