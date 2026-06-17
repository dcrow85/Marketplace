# Japanese Pre-English Catalog Slice Audit: Garura Parent/Child Tournament

Run: `japanese_pre_english_garura_parent_child_audit_20260617T233652Z`

## Target

- Release family: `jp_promo_garura_parent_child_199805`
- Catalog treatment: `Promo target source-slice`
- Modeled rows: 2
- Expected source cards: 2
- Source gaps: 0
- Scope: the two currently source-pinned UPC aggregate rows for the May 1998 Garura Parent/Child Tournament. This run does not claim a complete tournament archive, complete rules packet, official copy count, prize-threshold documentation, participant/winner ledger, proof that both cards were one physical packet, complete Touch Change! distribution census, seller possession, authenticity, condition, price, or display/training rights for images.

## Source Inputs

- Primary context: `https://bulbapedia.bulbagarden.net/wiki/Touch_Change%21_%28Garura_Parent/Child_promo%29`
- Supporting context:
  - `https://bulbapedia.bulbagarden.net/wiki/Kangaskhan_%28Garura_Parent/Child_promo%29`
  - `https://pokumon.com/card/kangaskhan-garura-parent-child-tournament-1998-unnumbered/`
  - `https://pokumon.com/card/touch-change-garura-parent-child-tournament-pokemon-card-fan-club-magazine-1998-unnumbered/`
  - `https://bulbapedia.bulbagarden.net/wiki/Unnumbered_Promotional_cards_%28TCG%29/1996-2005`
- Snapshot: `data/japanese-pre-english/source-snapshots/bulbapedia_pokumon_garura_parent_child_1998_selected_lines.json`
- Snapshot file SHA-256: `096f8ca8ec9f60cff60f3908ef153426a4a37377e6e7c044578282cc2f233ee1`
- Canonical snapshot hash in catalog: `2e3c46bb96ec49fa9590064cc2b5d9c610ffaac189b35bed6e66aec251b31126`

## Rows Added

| Row | Card | Japanese | UPC reference image | Status |
| --- | --- | --- | --- | --- |
| `jp_promo_garura_parent_child_199805:042` | Touch Change! | `タッチ交代！` / `Touch Change!` | `https://www.pokecardex.com/assets/images/sets_jp/UPC/42.jpg` | `provider_path_reference_image` |
| `jp_promo_garura_parent_child_199805:043` | Kangaskhan | `ガルーラ` / `Garura` | `https://www.pokecardex.com/assets/images/sets_jp/UPC/43.jpg` | `provider_path_reference_image` |

Image boundary: both images are reference witnesses only with `display_allowed: false`; they are not seller evidence, authentication proof, condition proof, or approved display/training assets.

## Agent Audits

### Source / Context Honesty

Initial finding: Medium.

The source/context audit found that the snapshot included Japanese names for both cards while the generated rows still said `missing_from_exact_source`. Fix: added source-backed Japanese-name overrides for UPC sorts `42` and `43`, applied them during promo-family child generation, and audited drift against those overrides.

Recheck: fixed. Garura rows now report `missing_japanese_name_rows: 0` and `source_labeled_japanese_name_rows: 2`.

No overclaims were found for copy counts, full rules packet, ledgers, exact prize thresholds, Touch Change! distribution census, authenticity, condition, or price.

### Image / Row Identity

Result: clean.

The image audit confirmed the two rows are exactly UPC sorts `42` and `43`, mapped to Touch Change! and Kangaskhan, with provider-path images `UPC/42.jpg` and `UPC/43.jpg`. It also confirmed the Fan Club Vol. 5 mention stays a reprint caveat and does not convert this Garura slice into the Fan Club Vol. 5 family.

### Schema / No-Overclaim Hardening

Initial finding: P2.

The schema audit found that the generic complete-source boundary gate accepted any complete-source token, so Garura could have passed with a semantically wrong boundary such as `complete UPC source`. Fix: added `expected_complete_source_boundary: complete tournament source` to the Garura family spec and audited that exact boundary at both release/family-context level and card-contact level.

Recheck: fixed. The expected complete-source boundary is now visible in generated release, audit, and manifest summaries.

## Deterministic Checks

Full rebuild:

- `python3 -m py_compile scripts/build_japanese_pre_english_catalogs.py`
- `python3 scripts/build_japanese_pre_english_catalogs.py`

Final build totals:

- Release catalogs: 33
- Total rows: 1241
- Source gaps: 4
- Reference image witness rows: 1217
- Provider-path reference image rows: 310
- `audit_passed=True`

Garura release:

- Release file SHA-256: `8bce3cb4af798f13a6cee684283932cb07c93ab72d9704332a937f326ae98bc0`
- Manifest catalog hash: `5137b6e23c7703ed9aad7d6deb03fd1db8bf95d20335acae7b45c442ece08419`
- Audit row: `passed=true`, `row_count=2`, `expected_source_card_count=2`, `source_gap_count=0`, `provider_path_reference_image_rows=2`
- Japanese name audit: `missing_japanese_name_rows=0`, `source_labeled_japanese_name_rows=2`
- Expected complete-source boundary: `complete tournament source`

Additional sweeps:

- All catalog image rows keep `display_allowed: false`.
- All image rows retain `seller possession` and `authenticity` in image `not_claiming`.
- Garura rows verify as source sorts `[42, 43]`.
- Garura image URLs verify as `UPC/42.jpg` and `UPC/43.jpg`.
- Garura family context and card contacts carry `raw HTML snapshot` and `complete tournament source` boundaries.

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
- card-level wrong complete-source boundary (`complete UPC source` instead of `complete tournament source`)
- family context selected text drift
- family context wrong complete-source boundary
- source-labeled Japanese name removal
- source-labeled romaji drift

Result: 16 / 16 mutation checks passed.

## Residual Risks

- This is a two-card tournament source slice, not a complete Garura tournament-object catalog.
- The selected-line snapshot is not a raw HTML/archive snapshot.
- Touch Change! has a Fan Club Vol. 5 reprint caveat; the reprint census remains outside this Garura row authority.
- Copy counts, exact prize thresholds, and participant/winner ledgers remain unproven.
