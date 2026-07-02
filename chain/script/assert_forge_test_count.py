#!/usr/bin/env python3
"""Run forge tests and fail if the committed total test count drifts."""

from __future__ import annotations

import pathlib
import re
import subprocess
import sys


CHAIN_ROOT = pathlib.Path(__file__).resolve().parents[1]
EXPECTED_COUNT_PATH = CHAIN_ROOT / "expected_forge_test_count.txt"
SUMMARY_RE = re.compile(
    r"Ran\s+\d+\s+test suites?\s+in .+?:\s+"
    r"(?P<passed>\d+)\s+tests passed,\s+"
    r"(?P<failed>\d+)\s+failed,\s+"
    r"(?P<skipped>\d+)\s+skipped\s+"
    r"\((?P<total>\d+)\s+total tests\)"
)


def main() -> int:
    expected = int(EXPECTED_COUNT_PATH.read_text(encoding="utf-8").strip())
    proc = subprocess.run(
        ["forge", "test"],
        cwd=CHAIN_ROOT,
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        check=False,
    )
    print(proc.stdout, end="")
    if proc.returncode != 0:
        return proc.returncode

    matches = list(SUMMARY_RE.finditer(proc.stdout))
    if not matches:
        print("Could not find forge test summary line for test-count assertion.", file=sys.stderr)
        return 1

    summary = matches[-1].groupdict()
    passed = int(summary["passed"])
    failed = int(summary["failed"])
    skipped = int(summary["skipped"])
    total = int(summary["total"])
    if failed != 0 or skipped != 0 or passed != expected or total != expected:
        print(
            "Forge test count drifted: "
            f"expected {expected} passed/total with 0 failed/skipped; "
            f"saw passed={passed}, failed={failed}, skipped={skipped}, total={total}.",
            file=sys.stderr,
        )
        return 1

    print(f"Forge test count OK: {passed}/{total}.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
