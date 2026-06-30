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
    """Open recognition over a WHOLE frame — one card or a full binder page. The model
    detects every card, reads each, and returns a box so the surface can crop a per-card
    thumbnail. No `expect` — the catalog match happens client-side, name-primary."""
    return (
        "You help a collector catalog trading cards from a photo of their PHYSICAL cards. "
        "You do NOT verify authenticity, condition, or grade.\n"
        "The photo shows ONE card or a binder page of MANY. Detect EVERY distinct card. "
        "For EACH card: read the printed NAME exactly; read the collector NUMBER if legible; "
        'check for a small printed Greek letter "α" (alpha) glyph on the card face (MOST cards '
        'have none — answer "present" ONLY if you clearly see the actual "α" glyph, else "absent"; '
        "do not guess it from the art, set, or name); and give a bounding box as [x0,y0,x1,y1] in "
        "FRACTIONS of the image width and height, top-left origin (x rightward, y downward, 0..1).\n"
        "List cards in reading order (left-to-right, top-to-bottom); include one entry per copy.\n"
        "Return STRICT JSON only, no prose, no markdown:\n"
        '{"cards":[{"name_read":"","number_read":"","alpha_stamp":"present|absent|unsure","box":[0,0,0,0]}],"total":0}\n'
        "Never state or imply that any card is authentic, genuine, real, verified, mint, or graded."
    )


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
    res = _parse(raw)
    if res is None or not isinstance(res.get("cards"), list):
        return {"error": "unparseable", "raw": raw[:200]}
    res["overclaim_flags"] = sorted({m.group(0).lower() for m in _OVERCLAIM.finditer(raw)})
    res["model"] = MODEL
    return res
