#!/usr/bin/env python3
"""Azuki vision probe — bake-off / regression harness for the photo-import vision agent.

Runs a vision-LLM over photos of PHYSICAL cards and scores how well it:
  - reads each card's printed NAME and detects the Alpha 'α' stamp,
  - anchors that read to a real catalog row (name-match -> number + release),
  - on a known Gates *official* image, correctly reports the α stamp ABSENT (rejection),
  - never asserts authenticity (no-overclaim).

The catalog is the ground truth: a read passes when its name resolves to a catalog
row and the α detection agrees with the expected release. Photos stay OUT of the
repo — pass a local dir via --images-dir.

  CAIRN_MODEL_API_KEY=<deepinfra key> python3 simulations/azuki_vision_probe.py \
      --images-dir ~/Desktop/zuki --catalog web/public/catalogs/azuki-tcg.json --gates-sample 2

Model + endpoint are env/flag configurable (default: Qwen3-VL-30B-A3B on DeepInfra).
"""
from __future__ import annotations
import argparse, base64, difflib, json, os, re, sys, time, urllib.request
from pathlib import Path

DEFAULT_MODEL = os.environ.get("CAIRN_VISION_MODEL", "Qwen/Qwen3-VL-30B-A3B-Instruct")
DEFAULT_ENDPOINT = os.environ.get("CAIRN_VISION_ENDPOINT", "https://api.deepinfra.com/v1/openai/chat/completions")

PROMPT = (
    "You help a collector catalog trading cards from a photo of their PHYSICAL cards. "
    "You do NOT verify authenticity, condition, or grade.\n"
    "The photo may show ONE card or a full binder page of MANY. For EACH distinct card, read the "
    "printed NAME exactly, read the collector NUMBER if legible, and count copies.\n"
    'Also check for a small printed Greek letter "α" (alpha) glyph on the card face. MOST cards do '
    'NOT have one. Answer "present" ONLY if you can clearly see the actual "α" glyph, and say where '
    'it is in alpha_where. If you cannot clearly see an "α", answer "absent". Do NOT guess it from the '
    "art, the set, or the card name.\n"
    "Return STRICT JSON only, no prose, no markdown:\n"
    '{"cards":[{"name":"","number":"","copies":1,"alpha_stamp":"present|absent|unsure","alpha_where":""}],'
    '"total":0,"red_flags":[]}\n'
    "Never state or imply that any card is authentic, genuine, real, verified, or graded."
)
OVERCLAIM = re.compile(r"\b(authentic|genuine|verified|guaranteed|certified|real deal)\b", re.I)


def load_catalog(path):
    cards = json.load(open(path))["cards"]
    idx = {}
    for c in cards:
        for nm in (c.get("name_en"), c.get("name_ja")):
            if nm:
                idx.setdefault(nm.lower(), []).append((c.get("num"), c.get("release_family")))
    return cards, idx, list(idx.keys())


def call(model, endpoint, key, src, is_url=False):
    url = src if is_url else "data:image/jpeg;base64," + src
    payload = {"model": model, "temperature": 0, "max_tokens": 800,
               "messages": [{"role": "user", "content": [
                   {"type": "text", "text": PROMPT},
                   {"type": "image_url", "image_url": {"url": url}}]}]}
    req = urllib.request.Request(endpoint, data=json.dumps(payload).encode(),
                                 headers={"Content-Type": "application/json", "Authorization": f"Bearer {key}"})
    t = time.time()
    r = json.load(urllib.request.urlopen(req, timeout=180))
    return r["choices"][0]["message"]["content"], time.time() - t


def parse(raw):
    s = re.sub(r"```(json)?", "", raw).strip()
    m = re.search(r"\{.*\}", s, re.S)
    try:
        return json.loads(m.group(0) if m else s)
    except Exception:
        return None


def match(name, names, idx):
    hit = difflib.get_close_matches((name or "").lower(), names, n=1, cutoff=0.82)
    return (hit[0], idx[hit[0]]) if hit else None


def score(label, raw, dt, names, idx, expect_alpha):
    res = parse(raw)
    overclaim = bool(OVERCLAIM.search(raw))
    if not res or "cards" not in res:
        return {"label": label, "ok": False, "dt": dt, "overclaim": overclaim, "raw": raw[:160]}
    rows = []
    for c in res.get("cards", []):
        mn = match(c.get("name", ""), names, idx)
        alpha = (c.get("alpha_stamp") or "").lower()
        rows.append({"read": c.get("name"), "copies": c.get("copies", 1), "alpha": alpha,
                     "where": (c.get("alpha_where") or "")[:32],
                     "matched": mn[0] if mn else None,
                     "nums": sorted({n for n, _ in mn[1]}) if mn else [],
                     "alpha_row": bool(mn and any(r == "alpha" for _, r in mn[1])),
                     "alpha_ok": (alpha == "present") == expect_alpha})
    return {"label": label, "ok": True, "dt": dt, "overclaim": overclaim, "rows": rows,
            "n": len(rows), "matched": sum(r["matched"] is not None for r in rows),
            "alpha_ok": sum(r["alpha_ok"] for r in rows)}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--images-dir", required=True)
    ap.add_argument("--catalog", default="web/public/catalogs/azuki-tcg.json")
    ap.add_argument("--model", default=DEFAULT_MODEL)
    ap.add_argument("--endpoint", default=DEFAULT_ENDPOINT)
    ap.add_argument("--gates-sample", type=int, default=2)
    ap.add_argument("--min-bytes", type=int, default=30000)
    a = ap.parse_args()
    key = os.environ.get("CAIRN_MODEL_API_KEY") or os.environ.get("CAIRN_VISION_API_KEY")
    if not key:
        sys.exit("set CAIRN_MODEL_API_KEY (DeepInfra key)")
    cards, idx, names = load_catalog(a.catalog)
    imgs = sorted(p for p in Path(a.images_dir).expanduser().glob("*")
                  if p.suffix.lower() in (".jpg", ".jpeg", ".png") and p.stat().st_size >= a.min_bytes)
    print(f"model = {a.model}\nimages = {len(imgs)}   catalog rows = {len(cards)}\n")
    results = []

    print("=== USER PHOTOS  (physical Alpha cards · expect α present) ===")
    for p in imgs:
        try:
            raw, dt = call(a.model, a.endpoint, key, base64.b64encode(p.read_bytes()).decode())
        except Exception as e:
            print(f"  {p.name}: CALL ERROR {type(e).__name__}: {e}"); continue
        s = score(p.name, raw, dt, names, idx, expect_alpha=True); results.append(s)
        if not s["ok"]:
            print(f"  {p.name:32} PARSE FAIL :: {s['raw']}"); continue
        print(f"  {p.name:32} {s['dt']:4.1f}s  cards={s['n']:2}  name-match={s['matched']}/{s['n']}  "
              f"α-ok={s['alpha_ok']}/{s['n']}  overclaim={'HIT!' if s['overclaim'] else 'no'}")
        for r in s["rows"]:
            tag = "OK " if r["matched"] else "MISS"
            rel = "[alpha]" if r["alpha_row"] else ("[no-alpha-row]" if r["matched"] else "")
            where = f" @{r['where']}" if r["alpha"] == "present" and r["where"] else ""
            print(f"       {tag} '{r['read']}' x{r['copies']} α={r['alpha']:7}{where} -> {r['matched']} {r['nums']} {rel}")

    print("\n=== GATES OFFICIAL IMAGES  (control · expect α absent) ===")
    for c in [c for c in cards if c.get("image") and c.get("release_family") == "gates_awakened"][:a.gates_sample]:
        try:
            raw, dt = call(a.model, a.endpoint, key, c["image"], is_url=True)
        except Exception as e:
            print(f"  {c['num']}: CALL ERROR {type(e).__name__}: {e}"); continue
        s = score(c.get("name_en") or c["num"], raw, dt, names, idx, expect_alpha=False); results.append(s)
        r = s["rows"][0] if s.get("rows") else {}
        ok = "OK" if r.get("alpha_ok") else "WRONG"
        print(f"  {(c.get('name_en') or '')[:26]:26} {c['num']}  α-read={r.get('alpha','?'):7} (want absent) "
              f"-> {ok}  match={r.get('matched')}  overclaim={'HIT!' if s.get('overclaim') else 'no'}")

    good = [s for s in results if s.get("ok")]
    tc = sum(s["n"] for s in good); tm = sum(s["matched"] for s in good); ta = sum(s["alpha_ok"] for s in good)
    oc = sum(s["overclaim"] for s in good)
    print("\n=== SUMMARY ===")
    print(f"  images scored : {len(good)}/{len(results)}")
    print(f"  cards read    : {tc}")
    print(f"  name-matched  : {tm}/{tc}  ({100*tm//max(tc,1)}%)")
    print(f"  α correct     : {ta}/{tc}  ({100*ta//max(tc,1)}%)")
    print(f"  no-overclaim  : {len(good)-oc}/{len(good)} clean")


if __name__ == "__main__":
    main()
