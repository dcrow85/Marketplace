# Japanese Pre-English Catalog Slice Audit: Kamex Mega Battle

Run: `japanese_pre_english_kamex_mega_battle_audit_20260618T001958Z`

## Target

- Release family: `jp_promo_kamex_mega_battle_199807`
- Catalog treatment: `Promo target source-slice`
- Modeled rows: 4
- Expected source cards: 4
- Source gaps: 0
- Scope: the four currently source-pinned UPC aggregate rows for the July-August 1998 Kamex Mega Battle regional tournament card identities. This run does not claim a complete tournament archive, complete venue schedule, complete participant/winner ledger, official copy count, trophy-plaque coverage, side-event prize coverage, national-final object coverage, complete Computer Error variant census, seller possession, authenticity, condition, price, or display/training rights for images.

## Source Inputs

- Primary context: `https://pokumon.com/kamex-blastoise-mega-battle-tournaments/`
- Supporting context:
  - `https://pokumon.com/card/computer-error-regional-kamex-mega-battle-1998-unnumbered/`
  - `https://pokumon.com/card/no-1-trainer-regional-kamex-mega-battle-1998-unnumbered/`
  - `https://pokumon.com/card/no-2-trainer-regional-kamex-mega-battle-1998-unnumbered/`
  - `https://pokumon.com/card/no-3-trainer-regional-kamex-mega-battle-1998-unnumbered/`
  - `https://bulbapedia.bulbagarden.net/wiki/Computer_Error_(Wizards_Promo_16)`
  - `https://bulbapedia.bulbagarden.net/wiki/Unnumbered_Promotional_cards_(TCG)/1996-2005`
- Snapshot: `data/japanese-pre-english/source-snapshots/pokumon_bulbapedia_kamex_mega_battle_1998_selected_lines.json`
- Snapshot file SHA-256: `a9fe70bedd77fb842832c756a45ae5929add0a690fcacf63583c1c293758eeff`
- Canonical snapshot hash in catalog: `e2629126e1481c782ab0a635eeb6c0fa267d8144e91cce3c835d151fd05bd597`

## Rows Added

| Row | Card | Japanese | UPC reference image | Status |
| --- | --- | --- | --- | --- |
| `jp_promo_kamex_mega_battle_199807:045` | Computer Error (Rocket's Secret Machine) | `パソコン大暴走！` | `https://www.pokecardex.com/assets/images/sets_jp/UPC/45.jpg` | `provider_path_reference_image` |
| `jp_promo_kamex_mega_battle_199807:046` | No.1 Trainer | not source-labeled | `https://www.pokecardex.com/assets/images/sets_jp/UPC/46.jpg` | `provider_path_reference_image` |
| `jp_promo_kamex_mega_battle_199807:047` | No.2 Trainer | not source-labeled | `https://www.pokecardex.com/assets/images/sets_jp/UPC/47.jpg` | `provider_path_reference_image` |
| `jp_promo_kamex_mega_battle_199807:048` | No.3 Trainer | not source-labeled | `https://www.pokecardex.com/assets/images/sets_jp/UPC/48.jpg` | `provider_path_reference_image` |

Image boundary: all four images are reference witnesses only with `display_allowed: false`; they are not seller evidence, authentication proof, condition proof, or approved display/training assets.

## Agent Audits

### Source / Context Honesty

Initial finding: P2.

The source/context audit found that the Kamex Computer Error child row inherited aggregate provider version metadata containing `Appearance (Red R logo)`, even though the selected source lines distinguish the Kamex print as matte/non-glossy with a white Team Rocket R shadow. Fix: the promo-family child builder now supports source-provider version filters; for source sort `45`, it filters the red-R aggregate version and adds a row-level boundary note stating that glossy CoroCoro/Song Best Collection Computer Error prints are outside this child slice.

Recheck: fixed. The Kamex Computer Error child row now keeps only the standard provider version, carries `source_provider_version_boundary.applied: true`, records `dropped_provider_version_count: 1`, and states the Kamex non-glossy white-drop-shadow boundary explicitly.

### Image / Row Identity

Result: clean.

The row/image audit confirmed rows `045` through `048` map to Computer Error, No.1 Trainer, No.2 Trainer, and No.3 Trainer, with provider-path images `UPC/45.jpg` through `UPC/48.jpg`. It also confirmed the CoroCoro glossy Computer Error is not reused for this Kamex child slice.

Residual risk: this verifies row identity, provider-path URLs, and metadata boundaries, not live visual content behind PokéCardex-hosted images.

### Schema / No-Overclaim Hardening

Initial findings: P2 and P3.

The schema/no-overclaim audit found that `count_confidence: promo_family_child_source_slice_closed` could over-signal completeness when paired with `complete tournament source` as a boundary. Fix: closed zero-gap promo-family children now use `promo_family_child_source_pinned_card_identity_slice_closed`; release-level `not_claiming` carries the complete-source boundary, including `complete tournament source`.

The schema/no-overclaim audit also found that inherited PokéCardex hashes are not fully self-reproducible from the child slice alone. Fix: inherited contacts carrying `card_data_hash` or `encrypted_page_sha256` now add `hash_preimage_scope` and `hash_reproducibility`, making clear that the raw decrypted provider payload is inherited from the parent UPC source-slice and builder/live-fetch lineage, not embedded in the child row.

Recheck: fixed. The Kamex release reports `count_confidence: promo_family_child_source_pinned_card_identity_slice_closed`, `not_claiming` includes `complete tournament source`, and inherited provider contacts carry the hash preimage-scope labels.

## Deterministic Checks

Full rebuild:

- `python3 -m py_compile scripts/build_japanese_pre_english_catalogs.py`
- `python3 scripts/build_japanese_pre_english_catalogs.py`

Final build totals:

- Release catalogs: 34
- Total rows: 1245
- Source gaps: 4
- Reference image witness rows: 1221
- Provider-path reference image rows: 314
- `audit_passed=True`

Kamex release:

- Release file SHA-256: `8816a5d1797ce619dda5179447e63a2596eef03f662facf016d34efa567e4eb7`
- Manifest SHA-256: `3a05b0d4130132ae0d00d6a68cf44a501c3ba7f8a57c205700e364f946c147ac`
- Audit SHA-256: `39aa17ac22b757ee7a785ecbe1431a74b784bb8e4c3a550f7d7ea570a3c474f4`
- Audit row: `passed=true`, `row_count=4`, `expected_source_card_count=4`, `source_gap_count=0`, `provider_path_reference_image_rows=4`
- Japanese name audit: `missing_japanese_name_rows=3`, `source_labeled_japanese_name_rows=1`
- Expected complete-source boundary: `complete tournament source`

Additional sweeps:

- No generated Kamex child row contains `Appearance (Red R logo)` or `Apparence (logo R rouge)`.
- All Kamex image rows keep `display_allowed: false`.
- All image rows retain `seller possession`, `seller card match`, `condition`, and `authenticity` in image `not_claiming`.
- Kamex rows verify as source sorts `[45, 46, 47, 48]`.
- Kamex image URLs verify as `UPC/45.jpg`, `UPC/46.jpg`, `UPC/47.jpg`, and `UPC/48.jpg`.
- Kamex family context and card contacts carry `raw HTML snapshot` and `complete tournament source` boundaries.

## Mutation Checks

The following deliberate bad states were rejected by `audit_release()`:

- expected source count drift
- source gap count drift
- old ambiguous count confidence (`promo_family_child_source_slice_closed`)
- release-level complete-source boundary removal
- complete-family overclaim
- source sort smuggling
- modeled source sort list removal
- source contact catalog hash drift
- direct exact-image overclaim
- image display-rights overclaim
- provider version boundary removal
- red-R provider version reintroduction
- inherited hash preimage-scope removal
- card-level context snapshot hash drift
- card-level supporting URL removal
- card-level raw snapshot boundary removal
- card-level wrong complete-source boundary (`complete UPC source` instead of `complete tournament source`)
- family context selected text drift
- family context wrong complete-source boundary
- source-labeled Japanese name removal
- source-labeled Japanese name drift

Result: 21 / 21 mutation checks passed.

## Residual Risks

- This is a four-card source-pinned tournament card-identity slice, not a complete Kamex tournament-object catalog.
- The selected-line snapshot is not a raw HTML/archive snapshot.
- Computer Error variant handling is intentionally narrow: the Kamex participation print is distinguished from glossy CoroCoro/Song Best Collection prints, but this is not a complete Computer Error variant census.
- Copy counts, complete venue schedule, participant/winner ledgers, trophy plaques, national-final objects, and side-event prizes remain outside row authority.
