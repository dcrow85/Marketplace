# CoroCoro January 1998 Source Slice Audit

Run timestamp: `20260617T221650Z`

## Slice

- Release family: `jp_promo_corocoro_19971215`
- Release: CoroCoro Comic January 1998 promos source slice
- Date: `1997-12-15`
- Modeled row count: `1`
- Expected source card count: `2`
- Source gap count: `1`
- Modeled card: `Meowth (CoroCoro 1997)` from UPC aggregate sort `30`
- Explicit source gap: `Computer Error (CoroCoro, Pokemon Song Best Collection CD 1997)`

## Source Witnesses

- Context snapshot: `data/japanese-pre-english/source-snapshots/pokumon_bulbapedia_corocoro_jan1998_selected_lines.json`
- Snapshot bytes SHA-256: `bc7cd1693e906cee6f3ec7e4da88b0b1e1f9920aca9ffdbbf5dfe669bb6261b8`
- Context snapshot canonical hash in release: `0a00fcd18bb24d05716e9948b66af89570d82ab8bb905869dda75b2cb76266aa`
- UPC aggregate source catalog hash in release: `33f493bfded198cf6b73312e0433aacff860e67c664f7d37d72952dab4cf631b`
- Release map SHA-256 in release source contacts: `a8d97949f4bf7d34be26035ce4f2a3cf76f74c2e62e29d572df946e767798771`

The selected lines document the December 15, 1997 CoroCoro Comic January 1998 issue context, the two-card Meowth/Computer Error claim, and the Computer Error variant distinction: glossy CoroCoro/Song Best Collection red-drop-shadow `R` versus later non-glossy Kamex Mega Battle white-drop-shadow `R`.

## Image Witness

- Modeled row: `jp_promo_corocoro_19971215:030`
- Reference image: `https://www.pokecardex.com/assets/images/sets_jp/UPC/30.jpg`
- Status: `provider_path_reference_image`
- Rights status: `external_reference_witness`
- Display allowed: `false`
- Not allowed by default: `training`, `seller evidence`, `authentication proof`

The Kamex Computer Error UPC row `045` and image `UPC/45.jpg` remain in the parent aggregate under `jp_promo_kamex_mega_battle_199807` and are not reused as CoroCoro evidence.

## Rebuild Result

Command:

```sh
python3 scripts/build_japanese_pre_english_catalogs.py
```

Result:

- Release catalogs: `31`
- Total rows: `1235`
- Source gaps: `4`
- Reference image witness rows: `1211`
- Provider-path reference image rows: `304`
- Audit passed: `true`

Current file hashes:

- `data/japanese-pre-english/manifest.json`: `bf027bec84f5f6f1e01585ec0090eeca7c108cb0fbe8e2e14dd7dcdc2742a948`
- `data/japanese-pre-english/audit.json`: `67ca3360ac87c839af39f9aabdbb9c159aec91b12f4dbd9db7f9604c83e40340`
- `data/japanese-pre-english/releases/jp_promo_corocoro_19971215.json`: `b44a7e012c298e3a93692408ff8c1aa1427370e02f06bf57c64436a5cd7ed0f1`

## Deterministic Checks

Passed:

- Python compile: `python3 -m py_compile scripts/build_japanese_pre_english_catalogs.py`
- Full rebuild/audit: `audit_passed=True`
- Image boundary sweep: zero rows with display/use-rights overclaim
- Release-map source-contact pins: `13` checked, `0` errors
- CoroCoro row identity: one modeled row, UPC sort `30`, image `UPC/30.jpg`
- Count closure: `expected_source_card_count == modeled rows + source gaps == 2`

Mutation checks passed:

- Selected text drift rejected
- Source gap removal rejected
- Complete-family overclaim rejected
- Kamex Computer Error sort smuggling rejected
- Image display overclaim rejected
- Supporting URL removal rejected
- Card-level context `snapshot_hash` drift rejected

## Multi-Agent Audit

### Source / Context Chair

Result: no findings.

The chair verified the source snapshot, map row, builder spec, and generated release all preserve the same boundary: CoroCoro January 1998 is a two-card context, Meowth is the only currently modeled source-pinned row, and glossy Computer Error is an explicit source gap rather than a reused Kamex row.

### Image / Row Identity Chair

Result: no findings.

The chair verified `jp_promo_corocoro_19971215:030` is sourced from UPC sort `30`, uses `UPC/30.jpg`, remains fail-closed for display/training/seller/authentication use, and does not reuse the Kamex Computer Error row or image.

### Schema / No-Overclaim Chair

Initial finding: medium.

The chair found that release-level `family_context_source.snapshot_hash` was pinned, but the per-card context contact `snapshot_hash` could be mutated without audit failure.

Fix:

- Hardened promo-family child audit checks so card-level context contacts must match exact `snapshot_hash`, `snapshot_path`, and `source_page_url`.

Re-audit result: no findings.

The chair verified in-memory mutations of card-level context contact `snapshot_hash`, `snapshot_path`, and `source_page_url` now fail deterministically.

## Verdict

Passed after one audit finding was fixed and reverified.

The CoroCoro January 1998 source slice is suitable to commit as a bounded catalog increment. It improves the Japanese pre-English catalog without pretending to complete the CoroCoro promo family or the Computer Error variant catalog.
