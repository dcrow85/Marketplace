#!/usr/bin/env python3
"""Deterministic accessors for the Card Dossier corpus.

Agents use this as a retrieval seam. It returns sourced legible claims; it does
not authenticate cards, price cards, verify condition, or authorize spendability.
"""

from __future__ import annotations

import argparse
import json
import re
from functools import lru_cache
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
CORPUS_PATH = ROOT / "data" / "japanese-pre-english" / "dossiers.json"
MANIFEST_PATH = ROOT / "data" / "japanese-pre-english" / "dossiers-manifest.json"
TOKEN_RE = re.compile(r"[A-Za-z0-9一-龯ぁ-んァ-ンー]+")


@lru_cache(maxsize=1)
def load_corpus() -> dict[str, Any]:
    return json.loads(CORPUS_PATH.read_text(encoding="utf-8"))


@lru_cache(maxsize=1)
def load_manifest() -> dict[str, Any]:
    return json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))


def _tokens(text: str) -> set[str]:
    return {tok.lower() for tok in TOKEN_RE.findall(text)}


def _source_map(dossier: dict[str, Any]) -> dict[str, dict[str, Any]]:
    return {source["id"]: source for source in dossier.get("sources", [])}


def _claim_with_sources(dossier: dict[str, Any], claim: dict[str, Any]) -> dict[str, Any]:
    sources = _source_map(dossier)
    return {
        **claim,
        "resolved_sources": [sources[sid] for sid in claim.get("sources", []) if sid in sources],
        "authority_label": "legible",
        "not_claiming": [
            "seller possession",
            "authenticity",
            "condition truth",
            "price truth",
            "physical-card No Rarity truth",
            "spendability",
        ],
    }


def get_dossier(uid: str) -> dict[str, Any]:
    """Return one dossier with sourced claims resolved inline."""
    for dossier in load_corpus().get("dossiers", []):
        if dossier.get("uid") == uid:
            claims = [_claim_with_sources(dossier, claim) for claim in dossier.get("claims", [])]
            return {
                "uid": uid,
                "card": dossier.get("card", {}),
                "foreign_keys": dossier.get("foreign_keys", {}),
                "claims": claims,
                "agent_notes": dossier.get("agent_notes", []),
                "coverage": dossier.get("coverage", {}),
                "authority_label": "legible",
                "not_claiming": load_corpus().get("not_claiming", []),
            }
    raise KeyError(f"unknown dossier uid: {uid}")


def search_claims(query: str = "", uid: str | None = None, k: int = 10) -> dict[str, Any]:
    """Lexical claim search for P0.

    This intentionally avoids an embedding dependency until the pilot schema is
    stable. The seam shape already returns claims with sources, so Claude's agent
    can wire against it before vector retrieval exists.
    """
    qtokens = _tokens(query)
    hits: list[dict[str, Any]] = []
    for dossier in load_corpus().get("dossiers", []):
        if uid and dossier.get("uid") != uid:
            continue
        card_text = " ".join(str(v) for v in dossier.get("card", {}).values())
        for claim in dossier.get("claims", []):
            haystack = " ".join([claim.get("field", ""), claim.get("text", ""), card_text])
            ctokens = _tokens(haystack)
            score = len(qtokens & ctokens) if qtokens else 1
            if score <= 0:
                continue
            hits.append(
                {
                    "uid": dossier["uid"],
                    "card": dossier.get("card", {}),
                    "score": score,
                    "claim": _claim_with_sources(dossier, claim),
                }
            )
    hits.sort(key=lambda hit: (-hit["score"], hit["uid"], hit["claim"]["id"]))
    return {
        "query": query,
        "uid": uid,
        "k": k,
        "hits": hits[:k],
        "authority_label": "legible",
        "not_claiming": load_corpus().get("not_claiming", []),
    }


def corpus_release() -> dict[str, Any]:
    manifest = load_manifest()
    return {
        "schema": manifest.get("schema"),
        "corpus_hash": manifest.get("corpus", {}).get("corpus_hash"),
        "dossier_count": manifest.get("corpus", {}).get("dossier_count"),
        "claim_count": manifest.get("corpus", {}).get("claim_count"),
        "source_count": manifest.get("corpus", {}).get("source_count"),
        "canonicalization": manifest.get("canonicalization"),
        "hash_algorithm": manifest.get("hash_algorithm"),
        "not_claiming": manifest.get("not_claiming", []),
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Card Dossier retrieval tools")
    sub = parser.add_subparsers(dest="cmd", required=True)
    sub.add_parser("release")
    get = sub.add_parser("get")
    get.add_argument("uid")
    search = sub.add_parser("search")
    search.add_argument("query")
    search.add_argument("--uid")
    search.add_argument("-k", type=int, default=10)
    args = parser.parse_args()

    if args.cmd == "release":
        out = corpus_release()
    elif args.cmd == "get":
        out = get_dossier(args.uid)
    else:
        out = search_claims(args.query, uid=args.uid, k=args.k)
    print(json.dumps(out, ensure_ascii=False, indent=2, sort_keys=True))


if __name__ == "__main__":
    main()
