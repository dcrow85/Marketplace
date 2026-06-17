# Team Rocket Gift Pack Product-Component Catalog Audit

Generated: 2026-06-17T18:34:06Z

## Scope

Added `jp_tcg_team_rocket_gift_pack_19971219` as a product-component context slice, not a strict fixed deck list. The source product is documented as a fixed 120-card product with two 60-card decks, but this pass does not have a source-pinned per-deck card list. The catalog therefore models unresolved deck-component candidate rows over the Rocket Gang source catalog:

- `rocket_deck_a`: 65 Rocket Gang candidate rows
- `rocket_deck_b`: 65 Rocket Gang candidate rows
- modeled candidate rows: 130
- physical product card count: 120
- exact source image rows: 0
- component-inherited reference image rows: 130

The catalog does not claim fixed deck membership, sealed-unit contents, per-deck counts for modeled rows, seller possession, authenticity, condition, price truth, or direct Team Rocket Gift Pack image evidence.

## Source Pinning

The local Rocket Gang catalog is the row source and is hash-linked per row. The product-level Team Rocket Gift Pack context is pinned to a selected rendered-lines snapshot:

- snapshot: `data/japanese-pre-english/source-snapshots/pokemonwiki_team_rocket_gift_pack_19971219_selected_lines.json`
- snapshot hash: `afb9cb3776cf5aa9e521be8bb27d610018a5d673e82270122bdc3a48ae902fc4`
- snapshot caveat: selected rendered lines only, not a raw HTML snapshot and not a source-pinned per-deck card list

The auditor now checks that extracted product claims remain supported by selected rendered lines for date, product card count, fixed-product status, and two 60-card decks.

## Deterministic Checks

`audit.json` passed after bounded local regeneration:

- release count: 21
- total rows: 1217
- active No Rarity rows: 384
- Basic Energy caveat rows: 24
- strict booster rows: 96
- reference image witness rows: 1193
- exact source image rows: 489
- component-inherited reference image rows: 322
- TCGdex-enriched rows: 795

Team Rocket Gift Pack release checks:

- row count: 130
- modeled candidate rows: 130
- physical product card count: 120
- strict release member: false
- catalog treatment: Product-component context
- unresolved fixed deck lists: true
- exact source image rows: 0
- component-inherited reference image rows: 130

## Mutation Probes

All eleven negative probes were detected:

- fixed deck member overclaim
- product-context snapshot hash drift
- fixed per-deck boundary removed
- direct exact Team Rocket Gift Pack image overclaim
- legacy `component_source_image_status: exact_source_image` reintroduced
- legacy `source_image_status: exact_source_image` reintroduced
- direct exact image-role wording reintroduced
- `information_audit` primary image overclaim
- product-count basis boundary removed
- fixed deck lists marked as modeled
- selected-line text changed while extracted claims stayed stale

## Agent Audit Findings

### Zeno

Low: summary count fields could still be misread by consumers that ignore nearby scope fields.

Disposition: fixed. Manifest and audit summaries now carry `modeled_candidate_rows`, `physical_product_card_count`, product context snapshot pins, strict membership state, catalog treatment, and unresolved fixed-deck flags.

Low: release-level source counters used generic names such as `cards_found` and `possible_content_rows`.

Disposition: partially fixed. The source block now adds `modeled_candidate_rows` and `physical_product_card_count` aliases while preserving existing generic fields for compatibility.

### Banach

High: inherited rows still carried path-insensitive `exact_source_image` through `component_source_image_status`.

Disposition: fixed. Team Rocket Gift Pack rows now use path-safe `component_source_image_lineage_status: source-row exact reference image`, and the auditor rejects reintroduced `component_source_image_status` or legacy `source_image_status`.

High: inherited rows kept the source `image_role` wording, which said exact external reference witness for the catalog row.

Disposition: fixed. Team Rocket Gift Pack rows now use a component-inherited image role that explicitly says the image is not a direct Team Rocket Gift Pack witness, and the auditor rejects the old direct-exact wording.

Medium: summary field `exact_image_witness_rows` counted inherited/component images.

Disposition: fixed. The broad bucket is now `reference_image_witness_rows`; `exact_source_image_rows` remains the exact-source-only count.

Low: build console printed generic `images=...`.

Disposition: fixed. The console summary now prints `reference_images=...`.

### Lorentz

Medium: product-context pinning was strong in the release file but absent from manifest/audit summaries.

Disposition: fixed. Manifest and audit rows now expose product context snapshot path, snapshot hash, oldid URL, and source URL.

Low: audit compared generated product facts to extracted claims but did not compare extracted claims to selected rendered lines.

Disposition: fixed. The auditor now checks selected rendered lines for the Team Rocket Gift Pack product date, 120-card count, fixed status, and two 60-card deck line. The same semantic line check was added to the 1996 Gift Pack snapshot.

## Residual Risks

- The fixed per-deck card lists remain unresolved. This slice should be replaced or tightened if a source-pinned deck list is found.
- The PokemonWiki product snapshot is selected rendered text, not raw HTML. This is explicit and should be upgraded if a stable raw source becomes available.
- Component-inherited Rocket Gang images are useful for agent comparison only; they should remain behind lineage/reference controls, not direct card display or seller evidence surfaces.
