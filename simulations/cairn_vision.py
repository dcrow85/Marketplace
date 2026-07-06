#!/usr/bin/env python3
"""Vision read for the photo-import path.

A collector's photo of their PHYSICAL card + the catalog's "what to look for"
(the card it should be) -> a structured, no-overclaim read: does it match, is the
Alpha "α" glyph present, any red flags. Calls a hosted vision model (Qwen3-VL on
DeepInfra by default; the model picked by the bake-off in azuki_vision_probe.py),
fully env-configurable. Pure stdlib.

  CAIRN_MODEL_API_KEY=<key> python3 -c "import cairn_vision, sys; \
      print(cairn_vision.read_photo(open(sys.argv[1]).read(), {'name':'Penny','num':'AZK01-001'}))"
"""
from __future__ import annotations

import json
import os
import re
import urllib.request

ENDPOINT = os.environ.get("CAIRN_VISION_ENDPOINT") or os.environ.get(
    "CAIRN_MODEL_ENDPOINT", "https://api.deepinfra.com/v1/openai/chat/completions")
MODEL = os.environ.get("CAIRN_VISION_MODEL", "Qwen/Qwen3-VL-30B-A3B-Instruct")
_KEY = os.environ.get("CAIRN_MODEL_API_KEY", "")
MAX_IMAGE_CHARS = 12_000_000  # ~9MB of base64; the frontend down-reses before upload

# Post-check the model's words for anything it has no standing to assert (the prompt
# already forbids it; this catches the blatant cases so they never reach the human).
_OVERCLAIM = re.compile(
    r"\b(authentic|genuine|verified|guaranteed|certified|real deal|mint condition|gem mint)\b", re.I)


def _prompt(expect: dict | None) -> str:
    e = expect or {}
    name, num, rel = e.get("name") or "this card", e.get("num") or "", e.get("release") or ""
    should = f'This card SHOULD be: name "{name}"' + (f", number {num}" if num else "") + \
             (f', release "{rel}"' if rel else "") + ".\n"
    return (
        "You help a collector add a photo of their PHYSICAL trading card to a catalog. "
        "You do NOT verify authenticity, condition, or grade.\n" + should +
        'Check for a small printed Greek letter "α" (alpha) glyph on the card face. MOST prints do NOT have '
        'one; answer "present" only if you clearly see the actual "α" glyph, and say where in alpha_where. '
        'Otherwise "absent". Do not guess it from the art, the set, or the name.\n'
        "Report ONLY what you can see. Return STRICT JSON, no prose, no markdown:\n"
        '{"name_read":"","number_read":"","alpha_stamp":"present|absent|unsure","alpha_where":"",'
        '"matches_expected":true,"red_flags":[],"confidence":0.0}\n'
        "Put a red_flag in red_flags if: blurry/unreadable, clearly a DIFFERENT card, looks like a screenshot "
        "of an official image rather than a photo of a physical card, or heavily watermarked.\n"
        "Never state or imply the card is authentic, genuine, real, verified, mint, or graded."
    )


def _page_prompt() -> str:
    """Open recognition + grounding over a WHOLE frame. Uses Qwen-VL's NATIVE grounding
    dialect (bbox_2d in 0-1000 space): in our JSON-fractions format the model emitted
    idealized/reordered boxes (mislabeled crops on spreads); in its own dialect the boxes
    land on the right cards with the right labels. Collector NUMBER is deliberately NOT
    requested here: under the grounding schema the model enumerates (1,2,3…) instead of
    reading, and a hallucinated number can steer alt-art matching wrong."""
    return (
        "You help a collector catalog trading cards from a photo of their PHYSICAL cards. "
        "You do NOT verify authenticity, condition, or grade.\n"
        "Locate every trading card in the image; report each physical card exactly once "
        "(duplicates of the same card are separate physical cards — report each). For each "
        'card also check the card face for a small printed Greek letter "α" (alpha) glyph '
        '(MOST cards have none — answer "present" ONLY if you clearly see the actual "α" '
        'glyph, else "absent"; do not guess it from the art, set, or name).\n'
        "Output ONLY a JSON list, no prose, no markdown:\n"
        '[{"label": "<the card\'s printed name>", "bbox_2d": [x1, y1, x2, y2], '
        '"alpha_stamp": "present|absent|unsure"}]\n'
        "with bbox_2d as integers in the 0-1000 normalized coordinate space, top-left origin.\n"
        "Never state or imply that any card is authentic, genuine, real, verified, mint, or graded."
    )


def _parse_list(raw: str):
    """Parse the grounding response: a JSON list (possibly fenced), or a dict with a
    cards/list field. Returns a list or None."""
    s = re.sub(r"```(json)?", "", raw).strip()
    m = re.search(r"\[.*\]", s, re.S)
    if m:
        try:
            v = json.loads(m.group(0))
            if isinstance(v, list):
                return v
        except Exception:
            pass
    d = _parse(s)
    if isinstance(d, dict) and isinstance(d.get("cards"), list):
        return d["cards"]
    return None


def _parse(raw: str):
    s = re.sub(r"```(json)?", "", raw).strip()
    m = re.search(r"\{.*\}", s, re.S)
    try:
        return json.loads(m.group(0) if m else s)
    except Exception:
        return None


def read_photo(image_uri: str, expect: dict | None = None) -> dict:
    """image_uri: a `data:` URI (or http URL). expect: {name, num, release}. Returns the
    structured read (+ overclaim_flags), or {"error": ...}."""
    if not image_uri or not isinstance(image_uri, str):
        return {"error": "no_image"}
    if len(image_uri) > MAX_IMAGE_CHARS:
        return {"error": "image_too_large"}
    payload = {
        "model": MODEL, "temperature": 0, "max_tokens": 500,
        "messages": [{"role": "user", "content": [
            {"type": "text", "text": _prompt(expect)},
            {"type": "image_url", "image_url": {"url": image_uri}},
        ]}],
    }
    headers = {"Content-Type": "application/json"}
    if _KEY:
        headers["Authorization"] = f"Bearer {_KEY}"
    req = urllib.request.Request(ENDPOINT, data=json.dumps(payload).encode(), headers=headers)
    r = json.load(urllib.request.urlopen(req, timeout=120))
    raw = r["choices"][0]["message"]["content"]
    res = _parse(raw)
    if res is None:
        return {"error": "unparseable", "raw": raw[:200]}
    res["overclaim_flags"] = sorted({m.group(0).lower() for m in _OVERCLAIM.finditer(raw)})
    res["model"] = MODEL
    return res


def read_page(image_uri: str) -> dict:
    """One-pass detect+read over a whole frame (one card or a page of many). Returns
    {"cards":[{name_read,number_read,alpha_stamp,box:[x0,y0,x1,y1]}, ...], "total", ...}
    or {"error": ...}. Boxes are model-emitted (fractions, occasionally pixels — the surface
    normalizes); a slightly-loose box never changes the read, only the thumbnail crop."""
    if not image_uri or not isinstance(image_uri, str):
        return {"error": "no_image"}
    if len(image_uri) > MAX_IMAGE_CHARS:
        return {"error": "image_too_large"}
    payload = {
        "model": MODEL, "temperature": 0, "max_tokens": 3200,
        "messages": [{"role": "user", "content": [
            {"type": "text", "text": _page_prompt()},
            {"type": "image_url", "image_url": {"url": image_uri}},
        ]}],
    }
    headers = {"Content-Type": "application/json"}
    if _KEY:
        headers["Authorization"] = f"Bearer {_KEY}"
    req = urllib.request.Request(ENDPOINT, data=json.dumps(payload).encode(), headers=headers)
    r = json.load(urllib.request.urlopen(req, timeout=240))
    raw = r["choices"][0]["message"]["content"]
    items = _parse_list(raw)
    if items is None:
        return {"error": "unparseable", "raw": raw[:200]}
    cards = []
    for it in items:
        if not isinstance(it, dict):
            continue
        b = it.get("bbox_2d") or []
        try:
            b = [float(v) for v in b[:4]]
        except (TypeError, ValueError):
            b = []
        if len(b) != 4:
            continue
        # 0-1000 -> fractions; tolerate stray 0..1 outputs
        scale = 1000.0 if max(b) > 1.5 else 1.0
        x0, y0, x1, y1 = (min(b[0], b[2]) / scale, min(b[1], b[3]) / scale,
                          max(b[0], b[2]) / scale, max(b[1], b[3]) / scale)
        box = [max(0.0, x0), max(0.0, y0), min(1.0, x1), min(1.0, y1)]
        if box[2] - box[0] < 0.01 or box[3] - box[1] < 0.01:
            continue
        cards.append({
            "name_read": str(it.get("label") or it.get("name") or "")[:120],
            "number_read": "",
            "alpha_stamp": str(it.get("alpha_stamp") or "unsure")[:10],
            "box": box,
        })
    # the model sometimes emits the whole list twice — drop near-identical boxes
    deduped = []
    for c in cards:
        dup = False
        for k in deduped:
            a, bb = c["box"], k["box"]
            ix = max(0.0, min(a[2], bb[2]) - max(a[0], bb[0]))
            iy = max(0.0, min(a[3], bb[3]) - max(a[1], bb[1]))
            inter = ix * iy
            union = (a[2] - a[0]) * (a[3] - a[1]) + (bb[2] - bb[0]) * (bb[3] - bb[1]) - inter
            if union > 0 and inter / union > 0.6:
                dup = True
                break
        if not dup:
            deduped.append(c)
    return {
        "cards": deduped, "total": len(deduped),
        "overclaim_flags": sorted({m.group(0).lower() for m in _OVERCLAIM.finditer(raw)}),
        "model": MODEL,
    }
