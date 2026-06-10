#!/usr/bin/env python3
"""Pokemon TCG API reference contact for the alpha harness.

The catalog layer is deliberately narrow: it gives agents and humans a shared
card row and image, not proof that a seller possesses or ships that card.
"""

from __future__ import annotations

import hashlib
import json
import os
import re
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import quote, urlencode
from urllib.request import Request, urlopen

from protocol_wall_packets import canonical_hash


ROOT = Path(__file__).resolve().parents[1]
CACHE_DIR = ROOT / ".cache" / "pokemon_tcg_api"
API_BASE = "https://api.pokemontcg.io/v2"
DOCS_URL = "https://docs.pokemontcg.io/"
TCGDEX_API_BASE = "https://api.tcgdex.net/v2"
TCGDEX_DOCS_URL = "https://tcgdex.dev/rest"
OLLAMA_HOST = os.environ.get("MARKETPLACE_OLLAMA_HOST", "http://127.0.0.1:11434")
OLLAMA_MODEL = os.environ.get("MARKETPLACE_CATALOG_AGENT_MODEL", "gemma4:31b")
VINTAGE_YEAR_FILTER = "(set.releaseDate:1999* OR set.releaseDate:2000* OR set.releaseDate:2001* OR set.releaseDate:2002* OR set.releaseDate:2003*)"
DEFAULT_TIMEOUT_SECONDS = 8
DEFAULT_TTL_SECONDS = 60 * 60
DEFAULT_OLLAMA_TIMEOUT_SECONDS = 45
CATALOG_CACHE_VERSION = "catalog-agent-v3"

NO_RARITY_BASE_SET_HINTS = {
    "charizard": {
        "tcgdex_ja_card_id": "PMCG1-021",
        "tcgdex_ja_set_id": "PMCG1",
        "set_name": "Expansion Pack",
        "local_number": "021",
    },
}


class PokemonTcgCatalog:
    def __init__(self, api_key: str | None = None) -> None:
        self.api_key = api_key if api_key is not None else os.environ.get("POKEMON_TCG_API_KEY", "")
        CACHE_DIR.mkdir(parents=True, exist_ok=True)

    def get_card(self, card_id: str, *, trade_id: str = "alpha-espeon-001") -> dict[str, Any]:
        path = f"/cards/{quote(card_id, safe='')}"
        result = self._request(path, {})
        if result["ok"]:
            card = self._normalize_card(result["body"]["data"])
            return self._wrap_contact(
                contact_type="catalog_card_lookup",
                trade_id=trade_id,
                path=path,
                params={},
                cards=[card],
                result=result,
                selected_card_id=card["id"],
            )

        fallback = self._fallback_card(card_id)
        if fallback:
            return self._wrap_contact(
                contact_type="catalog_card_lookup",
                trade_id=trade_id,
                path=path,
                params={},
                cards=[fallback],
                result=result | {"cache_hit": False, "fallback_static_reference": True},
                selected_card_id=fallback["id"],
            )
        return self._wrap_contact(
            contact_type="catalog_card_lookup",
            trade_id=trade_id,
            path=path,
            params={},
            cards=[],
            result=result,
            selected_card_id="",
        )

    def search(
        self,
        query: str,
        *,
        trade_id: str = "ad_hoc_catalog_search",
        page_size: int = 8,
        page: int = 1,
    ) -> dict[str, Any]:
        q = self._query_for_human_text(query)
        params = {
            "q": q,
            "page": max(1, page),
            "pageSize": max(1, min(page_size, 50)),
            "select": "id,name,set,number,artist,rarity,images,tcgplayer,cardmarket",
        }
        result = self._request("/cards", params)
        cards = []
        page_info = {
            "page": params["page"],
            "pageSize": params["pageSize"],
            "count": 0,
            "totalCount": 0,
        }
        if result["ok"]:
            body = result["body"]
            cards = [self._normalize_card(card) for card in body.get("data", [])]
            page_info = {
                "page": body.get("page", params["page"]),
                "pageSize": body.get("pageSize", params["pageSize"]),
                "count": body.get("count", len(cards)),
                "totalCount": body.get("totalCount", len(cards)),
            }
        return self._wrap_contact(
            contact_type="catalog_search",
            trade_id=trade_id,
            path="/cards",
            params=params,
            cards=cards,
            result=result,
            selected_card_id=cards[0]["id"] if cards else "",
            human_query=query,
            page_info=page_info,
        )

    def agent_search(
        self,
        query: str,
        *,
        trade_id: str = "ad_hoc_catalog_agent_search",
        page_size: int = 12,
        page: int = 1,
    ) -> dict[str, Any]:
        rule_read = self._interpret_human_query(query)
        if self._should_use_fast_rule_path(rule_read):
            interpretation = rule_read
            interpretation["agent_provider"] = "rule_parser_fast_path"
            interpretation["agent_model"] = ""
        else:
            interpretation = self._gemma_interpret_human_query(query, fallback_rule=rule_read)
        if interpretation is None:
            interpretation = rule_read
            interpretation["agent_provider"] = "rule_parser"
            interpretation["agent_model"] = ""
        else:
            interpretation.setdefault("agent_provider", "ollama")
            interpretation.setdefault("agent_model", OLLAMA_MODEL)
        result = self.search(
            interpretation["api_query"],
            trade_id=trade_id,
            page_size=page_size,
            page=page,
        )
        interpretation["reference_paths"] = self._reference_paths_for_interpretation(interpretation)
        result["agent"] = interpretation
        return result

    def _should_use_fast_rule_path(self, interpretation: dict[str, Any]) -> bool:
        detected = interpretation.get("detected", {})
        return (
            detected.get("variant_hint") == "no_rarity"
            and bool(detected.get("name"))
            and bool(detected.get("set") or detected.get("year"))
        )

    def _request(self, path: str, params: dict[str, Any]) -> dict[str, Any]:
        url = f"{API_BASE}{path}"
        if params:
            url = f"{url}?{urlencode(params)}"
        cache_key = f"{CATALOG_CACHE_VERSION}|{url}"
        cache_file = CACHE_DIR / f"{hashlib.sha256(cache_key.encode('utf-8')).hexdigest()}.json"

        cached = self._read_cache(cache_file)
        if cached:
            return {
                "ok": True,
                "status": 200,
                "url": url,
                "body": cached["body"],
                "fetched_at": cached["fetched_at"],
                "cache_hit": True,
            }

        headers = {"User-Agent": "MarketplaceAlpha/0.1 (+local protocol harness)"}
        if self.api_key:
            headers["X-Api-Key"] = self.api_key
        request = Request(url, headers=headers)

        try:
            with urlopen(request, timeout=DEFAULT_TIMEOUT_SECONDS) as response:
                body = json.loads(response.read().decode("utf-8"))
                fetched_at = utc_now()
                self._write_cache(cache_file, {"fetched_at": fetched_at, "body": body})
                return {
                    "ok": True,
                    "status": response.status,
                    "url": url,
                    "body": body,
                    "fetched_at": fetched_at,
                    "cache_hit": False,
                }
        except HTTPError as error:
            return {
                "ok": False,
                "status": error.code,
                "url": url,
                "error": error.reason,
                "fetched_at": utc_now(),
                "cache_hit": False,
            }
        except (URLError, TimeoutError, json.JSONDecodeError, OSError) as error:
            return {
                "ok": False,
                "status": 0,
                "url": url,
                "error": str(error),
                "fetched_at": utc_now(),
                "cache_hit": False,
            }

    def _read_cache(self, cache_file: Path) -> dict[str, Any] | None:
        try:
            if time.time() - cache_file.stat().st_mtime > DEFAULT_TTL_SECONDS:
                return None
            return json.loads(cache_file.read_text(encoding="utf-8"))
        except (FileNotFoundError, json.JSONDecodeError, OSError):
            return None

    def _write_cache(self, cache_file: Path, payload: dict[str, Any]) -> None:
        try:
            cache_file.write_text(json.dumps(payload, indent=2, sort_keys=True), encoding="utf-8")
        except OSError:
            return

    def _tcgdex_card(self, language: str, card_id: str) -> dict[str, Any]:
        path = f"/{quote(language, safe='')}/cards/{quote(card_id, safe='')}"
        url = f"{TCGDEX_API_BASE}{path}"
        cache_key = f"{CATALOG_CACHE_VERSION}|{url}"
        cache_file = CACHE_DIR / f"{hashlib.sha256(cache_key.encode('utf-8')).hexdigest()}.json"

        cached = self._read_cache(cache_file)
        if cached:
            return {
                "ok": True,
                "status": 200,
                "url": url,
                "body": cached["body"],
                "fetched_at": cached["fetched_at"],
                "cache_hit": True,
            }

        request = Request(url, headers={"User-Agent": "MarketplaceAlpha/0.1 (+local protocol harness)"})
        try:
            with urlopen(request, timeout=DEFAULT_TIMEOUT_SECONDS) as response:
                body = json.loads(response.read().decode("utf-8"))
                fetched_at = utc_now()
                self._write_cache(cache_file, {"fetched_at": fetched_at, "body": body})
                return {
                    "ok": True,
                    "status": response.status,
                    "url": url,
                    "body": body,
                    "fetched_at": fetched_at,
                    "cache_hit": False,
                }
        except HTTPError as error:
            return {
                "ok": False,
                "status": error.code,
                "url": url,
                "error": error.reason,
                "fetched_at": utc_now(),
                "cache_hit": False,
            }
        except (URLError, TimeoutError, json.JSONDecodeError, OSError) as error:
            return {
                "ok": False,
                "status": 0,
                "url": url,
                "error": str(error),
                "fetched_at": utc_now(),
                "cache_hit": False,
            }

    def _reference_paths_for_interpretation(self, interpretation: dict[str, Any]) -> list[dict[str, Any]]:
        detected = interpretation.get("detected", {})
        if detected.get("variant_hint") != "no_rarity":
            return []

        paths: list[dict[str, Any]] = [
            {
                "label": "Catalog anchor",
                "status": "available",
                "source": "Pokemon TCG API",
                "source_url": f"{API_BASE}/cards",
                "role": "English card-row and color-image reference when available.",
                "not_claiming": ["Japanese print truth", "No Rarity truth", "seller possession"],
            },
            {
                "label": "Variant overlay",
                "status": "required",
                "source": "Marketplace alpha",
                "source_url": "",
                "role": "Carry No Rarity as a scoped missing-symbol variant claim, not as a normal rarity field.",
                "not_claiming": ["authenticity", "condition", "possession"],
            },
            {
                "label": "Evidence gate",
                "status": "required",
                "source": "Seller evidence plus verifier if needed",
                "source_url": "",
                "role": "Full front, lower-right symbol crop, back, nonce possession, and slab label when graded.",
                "not_claiming": ["automatic verification"],
            },
        ]

        name = (detected.get("name") or "").strip().lower()
        hint = NO_RARITY_BASE_SET_HINTS.get(name)
        if hint:
            tcgdex = self._tcgdex_card("ja", hint["tcgdex_ja_card_id"])
            body = tcgdex.get("body", {}) if tcgdex.get("ok") else {}
            paths.insert(
                1,
                {
                    "label": "Japanese set anchor",
                    "status": "available" if tcgdex.get("ok") else "unavailable",
                    "source": "TCGdex",
                    "source_url": tcgdex.get("url", f"{TCGDEX_API_BASE}/ja/cards/{hint['tcgdex_ja_card_id']}"),
                    "source_card_id": hint["tcgdex_ja_card_id"],
                    "source_set_id": hint["tcgdex_ja_set_id"],
                    "source_name": body.get("name", ""),
                    "source_rarity": body.get("rarity", ""),
                    "source_variants": body.get("variants", {}),
                    "role": "Japanese Expansion Pack row; still not a separate No Rarity row.",
                    "not_claiming": ["No Rarity truth", "seller possession", "authenticity"],
                },
            )
        else:
            paths.insert(
                1,
                {
                    "label": "Japanese set anchor",
                    "status": "manual_mapping_needed",
                    "source": "TCGdex",
                    "source_url": f"{TCGDEX_API_BASE}/ja/sets/PMCG1",
                    "source_set_id": "PMCG1",
                    "role": "Use the Japanese Expansion Pack set row, then map the exact card manually.",
                    "not_claiming": ["No Rarity truth", "seller possession", "authenticity"],
                },
            )

        return paths

    def _wrap_contact(
        self,
        *,
        contact_type: str,
        trade_id: str,
        path: str,
        params: dict[str, Any],
        cards: list[dict[str, Any]],
        result: dict[str, Any],
        selected_card_id: str,
        human_query: str = "",
        page_info: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        page_info = page_info or {
            "page": 1,
            "pageSize": len(cards),
            "count": len(cards),
            "totalCount": len(cards),
        }
        receipt_body = {
            "schema": "marketplace.contact_receipt.external.v0.1",
            "packet_id": f"contact:pokemon_tcg_api:{contact_type}:{selected_card_id or 'no_match'}",
            "trade_id": trade_id,
            "receipt_family": "ExternalContactReceipt",
            "contact_type": contact_type,
            "source": {
                "name": "Pokemon TCG API",
                "base_url": API_BASE,
                "docs_url": DOCS_URL,
                "role": "catalog_reference",
            },
            "request": {
                "method": "GET",
                "path": path,
                "params": params,
                "human_query": human_query,
            },
            "response": {
                "status": result.get("status", 0),
                "ok": result.get("ok", False),
                "cache_hit": result.get("cache_hit", False),
                "fallback_static_reference": result.get("fallback_static_reference", False),
                "fetched_at": result.get("fetched_at"),
                "result_count": len(cards),
                "page": page_info.get("page"),
                "page_size": page_info.get("pageSize"),
                "total_count": page_info.get("totalCount"),
                "card_ids": [card["id"] for card in cards],
                "error": result.get("error", ""),
            },
            "observed_fields": [
                "source_card_id",
                "name",
                "set",
                "number",
                "rarity",
                "artist",
                "catalog_images",
                "source_price_refs_when_available",
            ],
            "positive_claims": [
                "a catalog source returned or supplied this card row",
                "this catalog image can be used as a reference image",
            ],
            "not_claiming": [
                "seller possession",
                "authenticity",
                "condition",
                "language or edition truth",
                "seller inventory existence",
                "price fairness",
                "delivery success",
            ],
        }
        return {
            "ok": result.get("ok", False),
            "source": receipt_body["source"],
            "request_url": result.get("url", ""),
            "cards": cards,
            "selected_card": cards[0] if cards else None,
            "pagination": page_info,
            "contact_receipt": {
                "schema": receipt_body["schema"],
                "packet_id": receipt_body["packet_id"],
                "hash": canonical_hash(receipt_body),
                "payload": receipt_body,
            },
        }

    def _normalize_card(self, card: dict[str, Any]) -> dict[str, Any]:
        card_set = card.get("set", {}) or {}
        images = card.get("images", {}) or {}
        tcgplayer = card.get("tcgplayer", {}) or {}
        cardmarket = card.get("cardmarket", {}) or {}
        return {
            "id": card.get("id", ""),
            "name": card.get("name", ""),
            "supertype": card.get("supertype", ""),
            "subtypes": card.get("subtypes", []),
            "set": {
                "id": card_set.get("id", ""),
                "name": card_set.get("name", ""),
                "series": card_set.get("series", ""),
                "printedTotal": card_set.get("printedTotal"),
                "total": card_set.get("total"),
                "releaseDate": card_set.get("releaseDate", ""),
                "images": card_set.get("images", {}),
            },
            "number": card.get("number", ""),
            "artist": card.get("artist", ""),
            "rarity": card.get("rarity", ""),
            "images": {
                "small": images.get("small", ""),
                "large": images.get("large", ""),
            },
            "pricing_refs": {
                "tcgplayer_url": tcgplayer.get("url", ""),
                "tcgplayer_updated_at": tcgplayer.get("updatedAt", ""),
                "tcgplayer_prices": tcgplayer.get("prices", {}),
                "cardmarket_url": cardmarket.get("url", ""),
                "cardmarket_updated_at": cardmarket.get("updatedAt", ""),
                "cardmarket_prices": cardmarket.get("prices", {}),
            },
        }

    def _fallback_card(self, card_id: str) -> dict[str, Any] | None:
        if card_id != "neo2-1":
            return None
        return {
            "id": "neo2-1",
            "name": "Espeon",
            "supertype": "Pokemon",
            "subtypes": ["Stage 1"],
            "set": {
                "id": "neo2",
                "name": "Neo Discovery",
                "series": "Neo",
                "printedTotal": 75,
                "total": 75,
                "releaseDate": "2001/06/01",
                "images": {
                    "symbol": "https://images.pokemontcg.io/neo2/symbol.png",
                    "logo": "https://images.pokemontcg.io/neo2/logo.png",
                },
            },
            "number": "1",
            "artist": "Atsuko Nishida",
            "rarity": "Rare Holo",
            "images": {
                "small": "https://images.pokemontcg.io/neo2/1.png",
                "large": "https://images.pokemontcg.io/neo2/1_hires.png",
            },
            "pricing_refs": {
                "tcgplayer_url": "https://prices.pokemontcg.io/tcgplayer/neo2-1",
                "tcgplayer_updated_at": "",
                "tcgplayer_prices": {},
                "cardmarket_url": "",
                "cardmarket_updated_at": "",
                "cardmarket_prices": {},
            },
        }

    def _sets(self) -> list[dict[str, Any]]:
        result = self._request(
            "/sets",
            {
                "pageSize": 250,
                "select": "id,name,series,releaseDate,total,printedTotal",
            },
        )
        if not result["ok"]:
            return []
        return result["body"].get("data", [])

    def _interpret_human_query(self, query: str) -> dict[str, Any]:
        raw = " ".join(query.strip().split())
        if ":" in raw:
            return {
                "raw_query": raw,
                "api_query": raw,
                "detected": {"advanced_query": True},
                "query_plan": [
                    {
                        "label": "advanced_catalog_query",
                        "q": raw,
                        "why": "caller supplied Pokemon TCG API field syntax",
                    }
                ],
                "caveats": ["advanced field syntax passed through without agent rewriting"],
                "not_claiming": [
                    "seller possession",
                    "authenticity",
                    "condition",
                    "variant truth",
                    "language truth",
                    "price fairness",
                ],
            }
        lowered = raw.lower()
        detected: dict[str, Any] = {}
        caveats: list[str] = []
        filters: list[str] = []
        removed_phrases: list[str] = []

        set_match = self._find_set(lowered)
        if set_match:
            set_name = set_match.get("name", "")
            detected["set"] = {
                "id": set_match.get("id", ""),
                "name": set_name,
                "series": set_match.get("series", ""),
                "releaseDate": set_match.get("releaseDate", ""),
            }
            if set_match.get("id"):
                filters.append(f"set.id:{set_match['id']}")
            else:
                filters.append(f'set.name:"{escape_query_value(set_name)}"')
            removed_phrases.append(set_match.get("matched_phrase", set_name).lower())

        year_match = re.search(r"\b(199[6-9]|20[0-2][0-9]|2030)\b", lowered)
        if year_match:
            year = year_match.group(1)
            detected["year"] = year
            filters.append(f"set.releaseDate:{year}*")
            removed_phrases.append(year)

        number_match = re.search(r"(?:#|number\s+)([a-z]?\d+[a-z]?)\b", lowered)
        if number_match:
            number = number_match.group(1)
            detected["number"] = number
            filters.append(f"number:{escape_query_value(number)}")
            removed_phrases.append(number_match.group(0))

        if any(word in lowered for word in ["holo", "holographic", "foil"]):
            detected["rarity_hint"] = "holo"
            filters.append("rarity:*Holo*")
            removed_phrases.extend(["holo", "holographic", "foil"])
        elif "rare" in lowered:
            detected["rarity_hint"] = "rare"
            filters.append("rarity:Rare")
            removed_phrases.append("rare")

        if any(phrase in lowered for phrase in ["first edition", "1st edition", "1st ed"]):
            detected["edition_hint"] = "first_edition"
            caveats.append("first edition is usually a variant or price lane, not a reliable catalog identity filter in this API")
            removed_phrases.extend(["first edition", "1st edition", "1st ed"])

        if "japanese" in lowered or "japan" in lowered:
            detected["language_hint"] = "japanese"
            caveats.append("Pokemon TCG API is strongest for English catalog rows; Japanese vintage may need TCGdex or a manual reference gap")
            removed_phrases.extend(["japanese", "japan"])

        if "shadowless" in lowered:
            detected["variant_hint"] = "shadowless"
            caveats.append("shadowless is not promoted to a physical truth claim by the catalog row")
            removed_phrases.append("shadowless")

        if "no rarity" in lowered or "no rarity symbol" in lowered:
            detected["variant_hint"] = "no_rarity"
            caveats.append("no rarity is a visual print-variant claim; the catalog row cannot confirm it")
            removed_phrases.extend(["no rarity symbol", "no rarity"])

        if "vintage" in lowered or "old" in lowered or "wotc" in lowered:
            detected["era_hint"] = "vintage"
            if "year" not in detected and "set" not in detected:
                filters.append(VINTAGE_YEAR_FILTER)
                detected["era_filter"] = "1999-2003"
                caveats.append("vintage narrowed the catalog to 1999-2003 release years")
            else:
                caveats.append("vintage is already narrowed by the detected set or year")
            removed_phrases.extend(["vintage", "old", "wotc"])

        name = self._guess_card_name(raw, removed_phrases)
        if name:
            detected["name"] = name
            filters.insert(0, field_query("name", name))

        if not filters:
            api_query = self._query_for_human_text(raw)
            caveats.append("no structured fields detected; using basic name search")
        else:
            api_query = " ".join(filters)

        if not name:
            caveats.append("no clear card name detected; results may be set-wide or broad")

        return {
            "raw_query": raw,
            "api_query": api_query,
            "detected": detected,
            "query_plan": [
                {
                    "label": "structured_catalog_query",
                    "q": api_query,
                    "why": "detected human phrases mapped into Pokemon TCG API fields",
                }
            ],
            "caveats": caveats,
            "not_claiming": [
                "seller possession",
                "authenticity",
                "condition",
                "variant truth",
                "language truth",
                "price fairness",
            ],
        }

    def _gemma_interpret_human_query(
        self,
        query: str,
        *,
        fallback_rule: dict[str, Any] | None = None,
    ) -> dict[str, Any] | None:
        rule_read = fallback_rule or self._interpret_human_query(query)
        prompt = {
            "task": "Extract Pokemon card catalog search fields from a human phrase.",
            "human_query": query,
            "rule_parser_baseline": {
                "api_query": rule_read.get("api_query"),
                "detected": rule_read.get("detected"),
            },
            "allowed_json_shape": {
                "card_name": "string or null",
                "set_name": "string or null",
                "year": "YYYY string or null",
                "year_min": "YYYY string or null",
                "year_max": "YYYY string or null",
                "number": "card number string or null",
                "rarity_hint": "holo | rare | none",
                "language_hint": "japanese | english | other | none",
                "edition_hint": "first_edition | unlimited | none",
                "variant_hint": "shadowless | no_rarity | reverse_holo | none",
                "era_hint": "vintage | modern | none",
                "era_interpretation": "short explanation of what era_hint means for this query",
                "caveats": ["short caveat strings"],
            },
            "rules": [
                "Return JSON only.",
                "Do not include markdown.",
                "Do not say a catalog row proves seller possession, authenticity, condition, variant truth, language truth, or price fairness.",
                "No Rarity means a missing rarity symbol print-variant claim, especially Japanese Base Set; it does not mean non-holo.",
                "Do not treat a set name as detected when it appears only as part of a card name, e.g. Dragon is not a set inside Dragonite.",
                "Prefer the collector's named Pokemon/card as card_name.",
                "If the human says vintage/old/WotC or modern/recent and no explicit set or year is supplied, choose year_min and year_max for this particular query and explain that interpretation in one short sentence.",
                "Keep caveats and era_interpretation complete and under 18 words each.",
                "Do not use the word verified.",
                "Use null when uncertain.",
            ],
        }
        payload = json.dumps(
            {
                "model": OLLAMA_MODEL,
                "messages": [
                    {
                        "role": "system",
                        "content": "You are a Pokemon TCG catalog search interpreter. Return strict JSON only.",
                    },
                    {
                        "role": "user",
                        "content": json.dumps(prompt, ensure_ascii=True),
                    },
                ],
                "stream": False,
                "think": False,
                "keep_alive": "20m",
                "options": {
                    "temperature": 0,
                    "num_ctx": 8192,
                    "num_predict": 650,
                },
            },
            ensure_ascii=True,
        ).encode("utf-8")
        request = Request(
            f"{OLLAMA_HOST.rstrip('/')}/api/chat",
            data=payload,
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        try:
            start = time.monotonic()
            with urlopen(request, timeout=DEFAULT_OLLAMA_TIMEOUT_SECONDS) as response:
                data = json.loads(response.read().decode("utf-8"))
            content = (data.get("message", {}).get("content") or "").strip()
            parsed = parse_json_object(content)
            if not isinstance(parsed, dict):
                return None
            return self._agent_fields_to_interpretation(
                query=query,
                fields=parsed,
                elapsed_s=round(time.monotonic() - start, 3),
                fallback_rule=rule_read,
            )
        except (HTTPError, URLError, TimeoutError, json.JSONDecodeError, OSError):
            return None

    def _agent_fields_to_interpretation(
        self,
        *,
        query: str,
        fields: dict[str, Any],
        elapsed_s: float,
        fallback_rule: dict[str, Any],
    ) -> dict[str, Any]:
        filters: list[str] = []
        caveats = listify(fields.get("caveats"))
        detected: dict[str, Any] = {}

        name = clean_optional_string(fields.get("card_name"))
        if name:
            detected["name"] = name
            filters.append(field_query("name", name))

        set_name = clean_optional_string(fields.get("set_name"))
        if set_name:
            set_match = self._set_by_name(set_name)
            if set_match:
                detected["set"] = {
                    "id": set_match.get("id", ""),
                    "name": set_match.get("name", ""),
                    "series": set_match.get("series", ""),
                    "releaseDate": set_match.get("releaseDate", ""),
                }
                if set_match.get("id"):
                    filters.append(f"set.id:{set_match['id']}")
                else:
                    filters.append(f'set.name:"{escape_query_value(set_match.get("name", ""))}"')
            else:
                caveats.append(f"set name '{set_name}' was inferred but not found as an exact Pokemon TCG API set")

        year = clean_year(fields.get("year"))
        if year:
            detected["year"] = year
            filters.append(f"set.releaseDate:{year}*")
        year_min = clean_year(fields.get("year_min"))
        year_max = clean_year(fields.get("year_max"))

        number = clean_card_number(fields.get("number"))
        if number:
            detected["number"] = number
            filters.append(f"number:{escape_query_value(number)}")

        rarity = clean_hint(fields.get("rarity_hint"), {"holo", "rare", "none"})
        if rarity == "holo":
            detected["rarity_hint"] = "holo"
            filters.append("rarity:*Holo*")
        elif rarity == "rare":
            detected["rarity_hint"] = "rare"
            filters.append("rarity:Rare")

        language = clean_hint(fields.get("language_hint"), {"japanese", "english", "other", "none"})
        if language and language != "none":
            detected["language_hint"] = language
        if language == "japanese":
            caveats.append("Pokemon TCG API is strongest for English catalog rows; Japanese vintage may need TCGdex or a manual reference gap")

        edition = clean_hint(fields.get("edition_hint"), {"first_edition", "unlimited", "none"})
        if edition and edition != "none":
            detected["edition_hint"] = edition
        if edition == "first_edition":
            caveats.append("first edition is usually a variant or price lane, not a reliable catalog identity filter in this API")

        variant = clean_hint(fields.get("variant_hint"), {"shadowless", "no_rarity", "reverse_holo", "none"})
        if variant and variant != "none":
            detected["variant_hint"] = variant
        if variant == "shadowless":
            caveats.append("shadowless is not promoted to a physical truth claim by the catalog row")
        if variant == "no_rarity":
            caveats.append("no rarity is a visual print-variant claim; the catalog row cannot confirm it")

        era = clean_hint(fields.get("era_hint"), {"vintage", "modern", "none"})
        if era and era != "none":
            detected["era_hint"] = era
        era_interpretation = clean_optional_string(fields.get("era_interpretation"))
        if era_interpretation:
            detected["era_interpretation"] = era_interpretation
        if era in {"vintage", "modern"}:
            if "year" not in detected and "set" not in detected:
                if year_min or year_max:
                    year_filter, year_label = build_year_window_filter(year_min, year_max)
                    filters.append(year_filter)
                    detected["year_window"] = year_label
                    caveats.append(f"Gemma interpreted {era} as release years {year_label} for this search")
                else:
                    caveats.append(f"Gemma treated {era} as a broad preference but did not choose a year window")
            else:
                caveats.append(f"{era} is already narrowed by the detected set or year")

        api_query = " ".join(filters) if filters else fallback_rule.get("api_query", self._query_for_human_text(query))
        if not name:
            caveats.append("no clear card name detected; results may be set-wide or broad")

        return {
            "raw_query": query,
            "api_query": api_query,
            "detected": detected,
            "query_plan": [
                {
                    "label": "gemma_catalog_query",
                    "q": api_query,
                    "why": "Gemma extracted search fields; deterministic code built the Pokemon TCG API query",
                }
            ],
            "caveats": dedupe_preserve_order(clean_agent_caveats(caveats)),
            "llm_elapsed_s": elapsed_s,
            "not_claiming": [
                "seller possession",
                "authenticity",
                "condition",
                "variant truth",
                "language truth",
                "price fairness",
            ],
        }

    def _find_set(self, lowered_query: str) -> dict[str, Any] | None:
        aliases = {
            "base set 2": "Base Set 2",
            "base set": "Base",
            "team rocket": "Team Rocket",
            "gym challenge": "Gym Challenge",
            "gym heroes": "Gym Heroes",
            "neo discovery": "Neo Discovery",
            "neo destiny": "Neo Destiny",
            "neo genesis": "Neo Genesis",
            "neo revelation": "Neo Revelation",
            "expedition": "Expedition Base Set",
            "aquapolis": "Aquapolis",
            "skyridge": "Skyridge",
        }
        sets = self._sets()
        by_name = {card_set.get("name", "").lower(): card_set for card_set in sets}

        for phrase, set_name in sorted(aliases.items(), key=lambda item: len(item[0]), reverse=True):
            if phrase_in_query(phrase, lowered_query):
                match = by_name.get(set_name.lower())
                if match:
                    return match | {"matched_phrase": phrase}

        for card_set in sorted(sets, key=lambda item: len(item.get("name", "")), reverse=True):
            name = card_set.get("name", "").lower()
            if name and phrase_in_query(name, lowered_query):
                return card_set | {"matched_phrase": name}
        return None

    def _set_by_name(self, set_name: str) -> dict[str, Any] | None:
        lowered = set_name.strip().lower()
        aliases = {
            "base set": "base",
            "base": "base",
            "expedition": "expedition base set",
        }
        target = aliases.get(lowered, lowered)
        for card_set in self._sets():
            if card_set.get("name", "").lower() == target:
                return card_set
        return None

    def _guess_card_name(self, raw_query: str, removed_phrases: list[str]) -> str:
        text = raw_query
        for phrase in sorted(set(removed_phrases), key=len, reverse=True):
            text = re.sub(re.escape(phrase), " ", text, flags=re.IGNORECASE)
        text = re.sub(r"\b(19\d{2}|20\d{2})\b", " ", text)
        text = re.sub(r"[$][\d,.]+|\b\d+\s*(?:usd|dollars?)\b", " ", text, flags=re.IGNORECASE)
        text = re.sub(r"[/(),;:]", " ", text)
        text = re.sub(r"\s+", " ", text).strip()

        stop_words = {
            "a", "an", "and", "any", "around", "better", "buy", "buying",
            "card", "cards", "cgc", "condition", "english", "for", "from",
            "graded", "greater", "looking", "light", "lp", "mint", "near",
            "nm", "or", "over", "played", "pokemon", "psa", "raw", "sealed",
            "sell", "selling", "shipped", "slab", "slabbed", "than", "the",
            "this", "to", "tcg", "under", "want", "with",
        }
        tokens = [
            token
            for token in text.split()
            if token.lower() not in stop_words and not token.startswith("#")
        ]
        return " ".join(tokens[:4]).strip()

    def _query_for_human_text(self, query: str) -> str:
        stripped = " ".join(query.strip().split())
        if not stripped:
            return 'name:"Espeon" set.name:"Neo Discovery"'
        if ":" in stripped:
            return stripped

        lower = stripped.lower()
        known_sets = [
            "base set",
            "jungle",
            "fossil",
            "team rocket",
            "gym heroes",
            "gym challenge",
            "neo genesis",
            "neo discovery",
            "neo revelation",
            "neo destiny",
            "expedition",
            "aquapolis",
            "skyridge",
        ]
        set_name = next((name for name in known_sets if name in lower), "")
        name_part = stripped
        if set_name:
            start = lower.index(set_name)
            name_part = (stripped[:start] + stripped[start + len(set_name) :]).strip()
        if set_name and name_part:
            return f'name:"{name_part}" set.name:"{set_name.title()}"'
        return f'name:"{stripped}"'


def escape_query_value(value: str) -> str:
    return value.replace('"', '\\"')


def field_query(field: str, value: str) -> str:
    stripped = value.strip()
    if re.fullmatch(r"[A-Za-z0-9_'.-]+", stripped):
        return f"{field}:{stripped}"
    return f'{field}:"{escape_query_value(stripped)}"'


def phrase_in_query(phrase: str, lowered_query: str) -> bool:
    pattern = r"(?<![a-z0-9])" + re.escape(phrase.lower()) + r"(?![a-z0-9])"
    return bool(re.search(pattern, lowered_query))


def parse_json_object(content: str) -> dict[str, Any] | None:
    try:
        data = json.loads(content)
        return data if isinstance(data, dict) else None
    except json.JSONDecodeError:
        match = re.search(r"\{.*\}", content, flags=re.DOTALL)
        if not match:
            return None
        try:
            data = json.loads(match.group(0))
            return data if isinstance(data, dict) else None
        except json.JSONDecodeError:
            return None


def clean_optional_string(value: Any) -> str:
    if not isinstance(value, str):
        return ""
    stripped = " ".join(value.strip().split())
    if not stripped or stripped.lower() in {"null", "none", "unknown", "n/a"}:
        return ""
    return stripped[:180]


def clean_year(value: Any) -> str:
    text = str(value).strip() if value is not None else ""
    match = re.fullmatch(r"(199[6-9]|20[0-2][0-9]|2030)", text)
    return match.group(1) if match else ""


def build_year_window_filter(year_min: str, year_max: str) -> tuple[str, str]:
    start = int(year_min) if year_min else 1999
    end = int(year_max) if year_max else 2003
    start = max(1996, min(start, 2030))
    end = max(start, min(end, 2030))
    years = list(range(start, end + 1))
    query = "(" + " OR ".join(f"set.releaseDate:{year}*" for year in years) + ")"
    return query, f"{start}-{end}"


def clean_card_number(value: Any) -> str:
    text = clean_optional_string(value)
    return text if re.fullmatch(r"[a-zA-Z]?\d+[a-zA-Z]?", text) else ""


def clean_hint(value: Any, allowed: set[str]) -> str:
    if not isinstance(value, str):
        return ""
    hint = value.strip().lower().replace(" ", "_").replace("-", "_")
    return hint if hint in allowed else ""


def listify(value: Any) -> list[str]:
    if not isinstance(value, list):
        return []
    return [clean_optional_string(item) for item in value if clean_optional_string(item)]


def dedupe_preserve_order(values: list[str]) -> list[str]:
    seen = set()
    output = []
    for value in values:
        if value and value not in seen:
            seen.add(value)
            output.append(value)
    return output


def clean_agent_caveats(values: list[str]) -> list[str]:
    stale_phrases = {
        "vintage narrowed the catalog to 1999-2003 release years",
    }
    cleaned: list[str] = []
    for value in values:
        if value in stale_phrases:
            continue
        cleaned.append(value)
    return cleaned


def utc_now() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
