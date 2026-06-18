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
value BANDS, not prices.

Usage:
  python3 simulations/cairn_browse.py "holos I'm missing that won't break the bank"
Requires the Qwen3.6 mlx_lm.server running on :8081 (see session notes).
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

# heuristic no-overclaim guard on the model's WORDS: selling/hype, or asserting a
# physical/authenticity/condition fact the agent has no standing to assert.
_SELL_PAT = re.compile(
    r"you'?ll love|great deal|\bsteal\b|must[- ]have|don'?t miss|grab it|snap it up|"
    r"\bbargain\b|perfect for you|worth every|once[- ]in[- ]a[- ]lifetime|can'?t go wrong|"
    r"guaranteed|\bauthentic\b|\bgenuine\b|mint condition|will appreciate|great investment|sure thing",
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

MODEL = "/Users/che/models/mlx/Qwen3.6-35B-A3B-4bit"
ENDPOINT = "http://127.0.0.1:8081/v1/chat/completions"

# the standing cost field (the editable dashboard the human browses through)
COST_FIELD = {
    "motive": "completionist-leaning collector, here for the love of the set",
    "budget": "modest — skip the grails for now",
    "condition": "raw is fine",
    "trust": "leans on established shops",
}

DATA = json.loads((ROOT / "mockups" / "catalog-sample.json").read_text(encoding="utf-8"))
SETLABEL = {s["id"]: s["label"] for s in DATA["sets"]}


def nm(c: dict) -> str:
    return c.get("name_ja") or c.get("name_en") or c["uid"]


FILTER_SYS = (
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
    "You are a collector's browsing agent. A deterministic filter has ALREADY narrowed the catalog (you did "
    "not see all 711 rows). Write a brief bit of commentary, in the collector's cost-field terms: what the "
    "filter cut and why, and flag anything JUDGED (condition is unconfirmed; the value band is a proxy, not a "
    "price). Explain the filter; never SELL a card. Then pick up to 6 uids to surface first.\n\n"
    'Return ONLY JSON: {"commentary":"2-4 sentences", "picks":["uid",..], "caveat":"one honest limitation"}'
)


def apply_filter(cards: list[dict], f: dict) -> list[dict]:
    out = cards
    if f.get("holo") is not None:
        out = [c for c in out if bool(c["holo"]) == bool(f["holo"])]
    if f.get("owned") is not None:
        out = [c for c in out if bool(c["owned"]) == bool(f["owned"])]
    if f.get("exclude_grails"):
        out = [c for c in out if (c.get("band_rank") or 0) < 3]  # band 3 = high-scrutiny holo grail
    if f.get("category"):
        out = [c for c in out if (c.get("category") or "").lower() == str(f["category"]).lower()]
    if f.get("set"):
        s = str(f["set"]).lower()
        out = [c for c in out if s in SETLABEL.get(c["set_id"], "").lower()]
    if f.get("character"):
        ch = str(f["character"]).lower()
        out = [c for c in out if ch in (c.get("name_en") or "").lower() or ch in (c.get("name_ja") or "").lower()]
    return out


def brief(c: dict) -> str:
    tags = []
    if c["holo"]:
        tags.append("holo")
    if c.get("band_rank"):
        tags.append(f"band{c['band_rank']}")
    tags.append("OWNED" if c["owned"] else "missing")
    return f"{c['uid']} · {c['num']} {nm(c)} · {SETLABEL.get(c['set_id'],'?')} · {' '.join(tags)}"


def browse(call: str, cap: int = 30) -> dict:
    fuser = f"COST FIELD: {json.dumps(COST_FIELD)}\n\nCALL: \"{call}\"\n\nReturn the filter JSON."
    f = call_model(MODEL, FILTER_SYS, fuser, ENDPOINT, 180)
    survivors = apply_filter(DATA["cards"], f)
    pool = survivors[:cap]
    cuser = (
        f"COST FIELD: {json.dumps(COST_FIELD)}\n\nThe collector called: \"{call}\"\n\n"
        f"The filter resolved to: {json.dumps({k: f.get(k) for k in ('holo','owned','exclude_grails','set','character','category')})}\n"
        f"It cut the {len(DATA['cards'])}-row catalog to {len(survivors)} candidates"
        + (f" (showing the first {cap})" if len(survivors) > cap else "")
        + ":\n" + "\n".join(brief(c) for c in pool) + "\n\nWrite the commentary JSON."
    )
    c = call_model(MODEL, COMMENT_SYS, cuser, ENDPOINT, 220) if pool else {"commentary": "Nothing matched that call.", "picks": [], "caveat": ""}
    flags = commentary_flags(c.get("commentary", ""), c.get("caveat", ""))
    return {"call": call, "filter": f, "n_survivors": len(survivors), "result": c, "overclaim_flags": flags}


def main() -> int:
    call = " ".join(sys.argv[1:]) or "holos I'm missing that won't break the bank"
    print(f'CALL: "{call}"\n')
    out = browse(call)
    f = out["filter"]
    print(f"FILTER (Qwen read): {json.dumps({k: f.get(k) for k in ('holo','owned','exclude_grails','set','character','category')})}")
    print(f"  reading: {f.get('reading','')}")
    print(f"  -> {out['n_survivors']} of {len(DATA['cards'])} cards survive\n")
    r = out["result"]
    print(f"COMMENTARY: {r.get('commentary','')}")
    print(f"CAVEAT:     {r.get('caveat','')}")
    print("PICKS:")
    by = {c["uid"]: c for c in DATA["cards"]}
    for uid in (r.get("picks") or [])[:6]:
        c = by.get(uid)
        print(f"  - {brief(c)}" if c else f"  - {uid} (?)")
    if out.get("overclaim_flags"):
        print(f"\n!! NO-OVERCLAIM CHECK flagged selling/overclaim language: {out['overclaim_flags']} — surface for review, do not present as-is.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
