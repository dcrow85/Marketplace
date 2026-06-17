# Japanese Pre-English Catalog Slice Audit: Trade Please Campaign

Run: `japanese_pre_english_trade_please_audit_20260617T225011Z`

## Target

- Release family: `jp_promo_trade_please_199802`
- Catalog treatment: `Promo target source-slice`
- Modeled rows: 4
- Expected source cards: 4
- Source gaps: 0
- Scope: the four currently source-pinned UPC aggregate rows for the 1998 Trade Please mail-in campaign. This run does not claim a complete campaign archive, campaign flyer/envelope variants, fulfillment ledger, official copy count, seller possession, authenticity, condition, price, or display/training rights for images.

## Source Inputs

- Primary campaign context: `https://bulbapedia.bulbagarden.net/wiki/Trade_Please!_(Trade_Please_promo)`
- Supporting card identity pages:
  - `https://pokumon.com/card/venusaur-trade-please-campaign-1998-unnumbered/`
  - `https://pokumon.com/card/charizard-trade-please-campaign-1998-unnumbered/`
  - `https://pokumon.com/card/blastoise-trade-please-campaign-1998-unnumbered/`
  - `https://pokumon.com/card/trade-please-trade-please-campaign-1998-unnumbered/`
- Snapshot: `data/japanese-pre-english/source-snapshots/bulbapedia_pokumon_trade_please_1998_selected_lines.json`
- Snapshot file SHA-256: `6c8a78b60ea723667d2d3942072db67246b19ebf218e7d67bc271eab1f1de612`
- Canonical snapshot hash in catalog: `879291cd9bfcd0800cbac893d5772724a9d9a1b82956cfdada3975219f3bbf2a`

## Rows Added

| Row | Card | UPC reference image | Status |
| --- | --- | --- | --- |
| `jp_promo_trade_please_199802:033` | Venusaur | `https://www.pokecardex.com/assets/images/sets_jp/UPC/33.jpg` | `provider_path_reference_image` |
| `jp_promo_trade_please_199802:034` | Charizard | `https://www.pokecardex.com/assets/images/sets_jp/UPC/34.jpg` | `provider_path_reference_image` |
| `jp_promo_trade_please_199802:035` | Blastoise | `https://www.pokecardex.com/assets/images/sets_jp/UPC/35.jpg` | `provider_path_reference_image` |
| `jp_promo_trade_please_199802:036` | Trade Please! | `https://www.pokecardex.com/assets/images/sets_jp/UPC/36.jpg` | `provider_path_reference_image` |

Image boundary: all four images are reference witnesses only with `display_allowed: false`; they are not seller evidence, authentication proof, condition proof, or approved display/training assets.

## Agent Audits

### Source / Context Honesty

Result: clean.

The source/context audit found no overclaim in the release window, mail-in mechanic, A/B/C course structure, or four-card identity. Residual risk: all four Japanese card names remain unresolved from the exact source and are explicitly marked as `missing_from_exact_source`.

### Image / Row Identity

Result: one low wording issue, fixed.

The image audit confirmed the four rows are exactly UPC sorts `33`, `34`, `35`, `36`, mapped to Venusaur, Charizard, Blastoise, and Trade Please!, with no Kamex/CoroCoro/other promo context leakage. It flagged stale singular wording in row-level `product_scope`. The builder now says each row is "one member of a source-pinned child slice over UPC aggregate rows" and that family completeness is governed by source-slice counts and gaps.

### Schema / No-Overclaim Hardening

Result: one medium finding, fixed and rechecked.

Finding: card-level context contacts were pinned for snapshot path/hash/source URL/supporting URLs, but their `not_claiming` boundary was not audit-pinned. A mutation could have stripped `raw HTML snapshot` or `complete campaign source` from each card contact while leaving the release-level family context intact.

Fix: `audit_release()` now checks every card-level context contact for:

- `raw HTML snapshot`
- at least one complete-source boundary such as `complete campaign source`

Recheck result: fixed. The generated Trade Please rows carry the boundary on all four card context contacts, and the rebuilt audit is clean.

## Deterministic Checks

Full rebuild:

- `python3 -m py_compile scripts/build_japanese_pre_english_catalogs.py`
- `python3 scripts/build_japanese_pre_english_catalogs.py`

Final build totals:

- Release catalogs: 32
- Total rows: 1239
- Source gaps: 4
- Reference image witness rows: 1215
- Provider-path reference image rows: 308
- `audit_passed=True`

Trade Please release:

- Release file SHA-256: `4000d2658e3c71cfa8a42e3334f18ca10e449265e27f7f867caebb792c042154`
- Manifest catalog hash: `c2c94d76ac1b9d629ab6a76e6d7f788fa79b8f07585774a86b1179780fa61d10`
- Audit row: `passed=true`, `row_count=4`, `expected_source_card_count=4`, `source_gap_count=0`, `provider_path_reference_image_rows=4`

Additional sweeps:

- All catalog image rows keep `display_allowed: false`.
- All image rows retain `seller possession` and `authenticity` in image `not_claiming`.
- Trade Please rows verify as source sorts `[33, 34, 35, 36]`.
- Trade Please image URLs verify as `UPC/33.jpg` through `UPC/36.jpg`.
- All four Trade Please rows carry the selected-line snapshot contact with `raw HTML snapshot` and `complete campaign source` boundaries.

## Mutation Checks

The following deliberate bad states were rejected by `audit_release()`:

- expected source count drift
- source gap count drift
- complete-family overclaim
- source sort smuggling
- modeled source sort list removal
- source contact catalog hash drift
- direct exact-image overclaim
- image display-rights overclaim
- card-level context snapshot hash drift
- card-level supporting URL removal
- card-level raw snapshot boundary removal
- card-level complete-source boundary removal
- family context selected text drift
- release-level raw snapshot boundary removal

Result: 14 / 14 mutation checks passed.

## Residual Risks

- Japanese printed names are not yet source-pinned for these four rows. They remain explicit `missing_from_exact_source` fields, not hidden blanks.
- The selected-line snapshot is not a raw HTML/archive snapshot.
- This slice models the currently source-pinned four campaign card identities, not every campaign artifact, fulfillment object, or copy-count claim.
