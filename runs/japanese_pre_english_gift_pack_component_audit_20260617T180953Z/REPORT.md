# Gift Pack Product-Component Catalog Audit

Generated: 2026-06-17T18:09:53Z

## Scope

Added `jp_tcg_gift_pack_19961212` as a product-component context slice, not a strict Gift Pack checklist. The slice models two inherited Series 1 Starter Pack possible-content lanes:

- `starter_a`: 102 possible-content rows
- `starter_b`: 102 possible-content rows
- modeled rows: 204
- documented product card count: 122
- unresolved special-card slots: 2

The catalog does not claim fixed Gift Pack deck contents, sealed-unit collation, special-card identities, possession, authenticity, condition, price truth, or direct Gift Pack reference imagery.

## Source Pinning

The local Starter Pack catalog is the row source and is hash-linked per row. The product-level Gift Pack context is pinned to a selected rendered-lines snapshot:

- snapshot: `data/japanese-pre-english/source-snapshots/pokemonwiki_gift_pack_19961212_selected_lines.json`
- snapshot hash: `b8ff3c56bb533a210d847be5327351792db2bc48b274f39ff8c5a4f8e10d0ba5`
- snapshot caveat: selected rendered lines only, not a raw HTML snapshot

## Deterministic Checks

`audit.json` passed after bounded local regeneration:

- release count: 20
- total rows: 1087
- active No Rarity rows: 384
- Basic Energy caveat rows: 24
- strict booster rows: 96
- exact source image rows: 489
- component-inherited reference image rows: 192
- TCGdex-enriched rows: 665

Gift Pack release checks:

- row count: 204
- strict release member: false
- catalog treatment: Product-component context
- exact source image rows: 0
- component-inherited reference image rows: 192
- Basic Energy caveat rows: 12
- unmodeled special-card slots: 2

## Mutation Probes

All seven negative probes were detected by the release auditor:

- product-context snapshot hash drift
- product-context oldid drift
- special-card identity boundary removed
- direct exact Gift Pack image overclaim
- legacy nested `source_image_status: exact_source_image` reintroduced
- `information_audit` primary image overclaim
- product-count basis boundary removed

## Agent Audit Findings

### Aquinas

High: product-level Gift Pack provenance was URL-only and not hash-pinned.

Disposition: fixed. Added the selected-lines source snapshot and auditor checks for snapshot path, hash, oldid URL, observed release date, product count, Starter component count, special-card slot count, and boundary language.

Medium: manifest/audit summaries could be misread as a 204-card checklist because they did not expose product-component caveats.

Disposition: fixed. Manifest entries and release audits now carry release type, product count, product count basis, strict release membership, catalog treatment, component lanes, unmodeled special-card slots, and release-level `not_claiming`.

### Noether

Low: nested image lineage carried `source_image_status: exact_source_image`, which a path-insensitive consumer could overcount as direct Gift Pack imagery.

Disposition: fixed. Gift Pack rows now use `source_image_lineage_status: source-row exact reference image` plus explicit lineage-only authority, while the top-level image status remains the only current authority. The auditor rejects reintroduced legacy nested `source_image_status`.

Low: inherited `information_audit` still described the No Rarity reference image as primary UI material.

Disposition: fixed. Gift Pack component rows now demote the inherited image to agent/reference lineage use and add a component override requiring the top-level image status to govern UI authority.

Low: product-context source fields were under-audited.

Disposition: fixed with Aquinas provenance patch.

### Hypatia

Medium: generator/manifest policy drift. The manifest output contained product-component inherited image wording, but the generator still emitted the older policy string.

Disposition: fixed. The generator-owned manifest policy now includes product-component inherited reference images.

Low: Gift Pack product-count lineage was caveated but not externally hash-pinned.

Disposition: fixed with Aquinas provenance patch.

## Residual Risks

- The snapshot is selected rendered text, not a raw-source capture. This is explicitly labeled and should be upgraded if a stable raw source becomes available.
- The two special-card slots remain unresolved. They should become their own source-pinned promo rows only after identities are confirmed.
- Component-inherited images remain useful for agent comparison, but are not direct Gift Pack imagery and should stay behind lineage/reference controls.
