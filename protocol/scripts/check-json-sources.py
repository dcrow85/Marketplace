#!/usr/bin/env python3
"""Reject ambiguous JSON before JavaScript tooling sees protocol source."""

from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_SOURCE_ROOTS = [
    ROOT / "manifest.json",
    ROOT / "minimum-trust-kernel.json",
    ROOT / "release",
    ROOT / "schemas",
    ROOT / "operations",
    ROOT / "fixtures",
    ROOT / "vectors",
]
MAX_IJSON_INTEGER = 9_007_199_254_740_991


class DuplicateMember(ValueError):
    pass


def strict_object(pairs: list[tuple[str, Any]]) -> dict[str, Any]:
    result: dict[str, Any] = {}
    for key, value in pairs:
        if key in result:
            raise DuplicateMember(f"duplicate member {key!r}")
        result[key] = value
    return result


def validate_ijson(value: Any, path: str = "$") -> None:
    if isinstance(value, float):
        raise ValueError(f"{path}: floating-point JSON source is forbidden")
    if isinstance(value, int) and not isinstance(value, bool) and abs(value) > MAX_IJSON_INTEGER:
        raise ValueError(f"{path}: integer is outside the I-JSON exact range")
    if isinstance(value, str):
        for char in value:
            if 0xD800 <= ord(char) <= 0xDFFF:
                raise ValueError(f"{path}: unpaired Unicode surrogate is forbidden")
    elif isinstance(value, list):
        for index, item in enumerate(value):
            validate_ijson(item, f"{path}[{index}]")
    elif isinstance(value, dict):
        for key, item in value.items():
            validate_ijson(key, f"{path}.<key>")
            validate_ijson(item, f"{path}.{key}")


def files() -> list[Path]:
    source_roots = [Path(argument).resolve() for argument in sys.argv[1:]] or DEFAULT_SOURCE_ROOTS
    found: list[Path] = []
    for source in source_roots:
        if source.is_file():
            found.append(source)
        elif source.is_dir():
            found.extend(source.rglob("*.json"))
    return sorted(found)


def main() -> int:
    checked = 0
    for path in files():
        try:
            value = json.loads(path.read_text(encoding="utf-8"), object_pairs_hook=strict_object)
            validate_ijson(value)
        except (UnicodeError, json.JSONDecodeError, DuplicateMember, ValueError) as error:
            try:
                label = path.relative_to(ROOT)
            except ValueError:
                label = path
            print(f"{label}: {error}", file=sys.stderr)
            return 1
        checked += 1
    print(f"strict JSON source check passed: {checked} files")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
