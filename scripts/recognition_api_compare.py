#!/usr/bin/env python3
"""Compare card-recognition witnesses against the No Rarity catalog wall.

This is deliberately conservative:
- local VLMs may propose rows, but the validator only accepts allowed catalog ids;
- external recognition APIs are treated as optional witnesses and require API keys;
- No Rarity and condition are never promoted from this binder-page fixture.
"""

from __future__ import annotations

import base64
import json
import os
import subprocess
import time
import urllib.error
import urllib.request
from dataclasses import dataclass
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FIXTURE = ROOT / "test-fixtures" / "no-rarity-binder-page-9-holos.png"
RUN_DIR = ROOT / "runs" / "recognition_api_compare_latest"
CATALOG = ROOT / "data" / "no-rarity-base-set.json"

EXPECTED = [
    ("(1,1)", "PMCG1-049", "Alakazam", "フーディン", "Fuudin"),
    ("(1,2)", "PMCG1-032", "Blastoise", "カメックス", "Kamekkusu"),
    ("(1,3)", "PMCG1-068", "Chansey", "ラッキー", "Rakkii"),
    ("(2,1)", "PMCG1-021", "Charizard", "リザードン", "Rizaadon"),
    ("(2,2)", "PMCG1-067", "Clefairy", "ピッピ", "Pippi"),
    ("(2,3)", "PMCG1-034", "Gyarados", "ギャラドス", "Gyarados"),
    ("(3,1)", "PMCG1-058", "Hitmonchan", "エビワラー", "Ebiwaraa"),
    ("(3,2)", "PMCG1-057", "Machamp", "カイリキー", "Kairikii"),
    ("(3,3)", "PMCG1-039", "Magneton", "レアコイル", "Reakoiru"),
]

ROUGH_CROPS = {
    "PMCG1-049": (30, 60, 380, 310),
    "PMCG1-032": (35, 377, 375, 295),
    "PMCG1-068": (35, 684, 380, 260),
    "PMCG1-021": (452, 65, 370, 310),
    "PMCG1-067": (456, 385, 365, 280),
    "PMCG1-034": (455, 680, 365, 270),
    "PMCG1-058": (840, 74, 360, 300),
    "PMCG1-057": (842, 392, 360, 270),
    "PMCG1-039": (835, 680, 365, 270),
}


@dataclass
class WitnessResult:
    name: str
    status: str
    elapsed_s: float | None
    output: str
    notes: list[str]


def run(cmd: list[str]) -> subprocess.CompletedProcess[str]:
    return subprocess.run(cmd, check=True, capture_output=True, text=True)


def catalog_rows() -> str:
    with CATALOG.open() as f:
        data = json.load(f)
    by_id = {card["tcgdex_id"]: card for card in data["cards"]}
    lines = []
    for _slot, cid, english, japanese, romaji in EXPECTED:
        row = by_id[cid]
        rarity = row.get("rarity_source", "unknown")
        lines.append(f"{cid} | {english} | {japanese} | {romaji} | {rarity}")
    return "\n".join(lines)


def local_gemma(model: str, grounded: bool) -> WitnessResult:
    image_b64 = base64.b64encode(FIXTURE.read_bytes()).decode()
    if grounded:
        prompt = f"""You are inspecting the attached binder page image for a No Rarity collection import.

Allowed catalog rows, and ONLY these rows:
{catalog_rows()}

Task:
- Map each visible 3x3 slot to exactly one allowed catalog row.
- Do not invent names or IDs.
- The no_rarity_status field MUST be exactly candidate_not_verified for every row.
- The condition_status field MUST be exactly unknown for every row.
- Do not put catalog rarity such as Holo Rare into no_rarity_status.

Return exactly 9 lines as:
slot | id | English / Japanese | confidence | no_rarity_status | condition_status
Then one short note."""
    else:
        prompt = """You are inspecting a collector-uploaded binder page image for a Japanese Pokemon No Rarity collection intake.

Identify the 3x3 slots if possible. Be strict:
- do not verify No Rarity unless the lower-right rarity-symbol area is readable;
- do not assign condition grades.

Return concise Markdown."""

    payload = {
        "model": model,
        "prompt": prompt,
        "images": [image_b64],
        "stream": False,
        "options": {"temperature": 0.05, "top_p": 0.8},
    }
    started = time.time()
    try:
        req = urllib.request.Request(
            "http://127.0.0.1:11434/api/generate",
            data=json.dumps(payload).encode(),
            headers={"content-type": "application/json"},
        )
        with urllib.request.urlopen(req, timeout=240) as response:
            body = json.loads(response.read())
        return WitnessResult(
            name=f"{model} {'catalog-grounded' if grounded else 'raw'}",
            status="ran",
            elapsed_s=round(time.time() - started, 2),
            output=body.get("response", ""),
            notes=score_output(body.get("response", "")),
        )
    except Exception as exc:
        return WitnessResult(
            name=f"{model} {'catalog-grounded' if grounded else 'raw'}",
            status="failed",
            elapsed_s=round(time.time() - started, 2),
            output=str(exc),
            notes=["local model call failed or timed out"],
        )


def score_output(output: str) -> list[str]:
    notes = []
    missing = [cid for _slot, cid, *_rest in EXPECTED if cid not in output]
    if missing:
        notes.append(f"missing expected catalog ids: {', '.join(missing)}")
    else:
        notes.append("all expected catalog ids present")
    expected_uncertainty_count = output.count("candidate_not_verified") + output.lower().count("not verified")
    if expected_uncertainty_count < 9:
        notes.append("wall failure: No Rarity uncertainty not preserved on every row")
    else:
        notes.append("No Rarity uncertainty preserved on every row")
    if output.count("unknown") + output.count("Unknown") < 9:
        notes.append("wall failure: condition unknown not preserved on every row")
    else:
        notes.append("condition unknown preserved on every row")
    if "Holo Rare" in output:
        notes.append("danger: catalog rarity leaked into decision/status field")
    if "Hitmonlee" in output or "サワムラー" in output:
        notes.append("danger: confused Hitmonchan/Hitmonlee")
    if "No Rarity Verified" in output or "Verified" in output and "Not Verified" not in output:
        notes.append("danger: may overclaim No Rarity")
    return notes


def generate_crops() -> list[str]:
    crop_dir = RUN_DIR / "crops"
    crop_dir.mkdir(parents=True, exist_ok=True)
    made = []
    for cid, (y, x, h, w) in ROUGH_CROPS.items():
        out = crop_dir / f"{cid}.png"
        # sips uses height,width for crop size and offsetY,offsetX for offset.
        subprocess.run(
            [
                "sips",
                "-c",
                str(h),
                str(w),
                "--cropOffset",
                str(y),
                str(x),
                str(FIXTURE),
                "--out",
                str(out),
            ],
            check=True,
            capture_output=True,
            text=True,
        )
        made.append(str(out))
    return made


def external_probe_status() -> list[WitnessResult]:
    results = []
    external = [
        (
            "Scrydex Vision",
            ["SCRYDEX_API_KEY", "SCRYDEX_TEAM_ID"],
            "POST https://api.scrydex.com/vision/v1/cards/identify",
            "Supports image_url or multipart file, game scoping, returns matches plus analysis.",
        ),
        (
            "GIBL predict-card",
            ["GIBL_API_KEY"],
            "POST https://gibltcg.com/api/v1/predict-card?key=...",
            "Accepts file or image_url according to docs; returns set/name/variation candidates.",
        ),
        (
            "TCGAPIs recognition",
            ["TCGAPIS_API_KEY"],
            "Card-recognition endpoint behind paid/API access",
            "Advertises top-10 product-id matches with confidence scores.",
        ),
        (
            "eBay Browse searchByImage",
            ["EBAY_OAUTH_TOKEN"],
            "POST /buy/browse/v1/item_summary/search_by_image",
            "Useful for listing discovery, not catalog authority.",
        ),
    ]
    for name, env_keys, endpoint, note in external:
        missing = [key for key in env_keys if not os.getenv(key)]
        status = "skipped_missing_credentials" if missing else "ready_credentials_present"
        output = f"{endpoint}\n{note}\nMissing env: {', '.join(missing) if missing else 'none'}"
        results.append(WitnessResult(name, status, None, output, [note]))
    return results


def write_report(results: list[WitnessResult], crops: list[str]) -> None:
    RUN_DIR.mkdir(parents=True, exist_ok=True)
    summary = {
        "fixture": str(FIXTURE),
        "expected_rows": [
            {
                "slot": slot,
                "id": cid,
                "english": english,
                "japanese": japanese,
                "romaji": romaji,
                "no_rarity_status": "candidate_not_verified",
                "condition_status": "unknown",
            }
            for slot, cid, english, japanese, romaji in EXPECTED
        ],
        "crops": crops,
        "results": [result.__dict__ for result in results],
    }
    (RUN_DIR / "summary.json").write_text(json.dumps(summary, ensure_ascii=False, indent=2))

    lines = [
        "# Recognition API Comparison",
        "",
        f"Fixture: `{FIXTURE}`",
        "",
        "## Ground Truth Wall",
        "",
        "The fixture is a binder-page intake image. It can support identity/import suggestions, but it cannot verify No Rarity or condition.",
        "",
        "| Slot | Catalog ID | Card | No Rarity | Condition |",
        "|---|---|---|---|---|",
    ]
    for slot, cid, english, japanese, romaji in EXPECTED:
        lines.append(f"| {slot} | {cid} | {english} / {japanese} ({romaji}) | candidate, not verified | unknown |")

    lines += [
        "",
        "## Witness Results",
        "",
        "| Witness | Status | Time | Notes |",
        "|---|---|---:|---|",
    ]
    for result in results:
        elapsed = "" if result.elapsed_s is None else f"{result.elapsed_s}s"
        notes = "<br>".join(result.notes)
        lines.append(f"| {result.name} | {result.status} | {elapsed} | {notes} |")

    lines += [
        "",
        "## Raw Outputs",
        "",
    ]
    for result in results:
        lines += [
            f"### {result.name}",
            "",
            "```text",
            result.output.strip(),
            "```",
            "",
        ]

    lines += [
        "## External API Harness Notes",
        "",
        "External card-recognition APIs are intentionally treated as witnesses. They may propose card identity, set, product id, variation, slab details, or listing matches. They may not promote No Rarity or condition without the required evidence packet.",
        "",
        "Generated rough single-card crops are under `runs/recognition_api_compare_latest/crops/` for APIs that expect one card per request.",
    ]
    (RUN_DIR / "REPORT.md").write_text("\n".join(lines))


def main() -> None:
    RUN_DIR.mkdir(parents=True, exist_ok=True)
    crops = generate_crops()
    results = [
        local_gemma("gemma4:e4b", grounded=False),
        local_gemma("gemma4:e4b", grounded=True),
        local_gemma("gemma4:31b", grounded=True),
        *external_probe_status(),
    ]
    write_report(results, crops)
    print(RUN_DIR / "REPORT.md")
    print(RUN_DIR / "summary.json")


if __name__ == "__main__":
    main()
