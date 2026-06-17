# Japanese Pre-English UPC Promo Source-Slice Audit

Generated: 2026-06-17T15:18:20Z

## Scope

This pass adds the first pre-English promo row catalog from PokéCardex's Japanese `UPC` / Unnumbered Promotional source.

Added release catalog:

| Release | Source | Rows | Provider-path image witnesses |
|---|---|---:|---:|
| Unnumbered Promotional Pre-English Source Slice | https://www.pokecardex.com/en/series/jp/UPC | 55 | 55 |

Current aggregate after this pass:

| Metric | Value |
|---|---:|
| Release catalogs | 14 |
| Card rows | 603 |
| External image witnesses | 603 |
| Exact-source image witnesses | 382 |
| Provider-path image witnesses | 221 |
| TCGdex-enriched rows | 257 |
| Deterministic audit status | passed |

## Inclusion Rule

Rows are included only when one of these is true:

1. The PokéCardex UPC row comment gives a date or date range before the English Base Set cutoff of 1999-01-09.
2. The row comment names a known promo distribution, and `Japanese_Pre_English_Release_Map_v0.1.md` places that distribution before the cutoff.

The catalog preserves the UPC source sort as `local_id`; gaps in local ids are intentional because the source payload does not expose every image-numbered object as a separate row.

## What This Is Not

This is not a final per-family promo taxonomy. It is a source-attributed UPC slice that keeps `promo_family_id`, `date_label`, and `date_source` on every row so later work can split CoroCoro, tournament, ANA, Card GB, and other promo families into separate catalogs if needed. Rows in this synthetic source slice are marked as source-slice members, not strict release-family members.

This is not a complete pre-English promo catalog. Rows without source comments or release-map support remain excluded, even if a later expert pass may prove they belong before the cutoff.

This is not image-rights approval. Every image remains an external reference witness only.

## Verification

Deterministic checks passed:

- row count equals expected filtered row count: 55 / 55
- every selected UPC row has a release-scoped row id
- every selected row has `promo_context`
- every selected row has a provider-path-derived external image witness
- every image witness stays fail-closed for display/training/seller evidence/authentication
- promo context matches the static UPC source-sort selection table
- UPC `local_id` equals the provider source sort
- aggregate promo rows do not claim strict release-family membership
- manifest hashes reproduce from release JSON bytes
- catalog aggregate is internally consistent: 14 releases, 603 rows, 603 image witnesses

Network check:

- HEAD checked all 55 selected UPC image URLs.
- Result: 55 / 55 returned `200 image/jpeg`.

## Important Boundaries

The UPC source gives English/French/German names and distribution comments. It does not give row-level Japanese print names. All 55 rows remain `name_ja_status: missing_from_exact_source`.

The UPC source row comments are useful catalog evidence, not physical card evidence. The row can help an agent recognize that a card belongs to a distribution lane; it does not prove seller possession, authenticity, condition, or copy count.

The release-level `prints_without_rarity_symbol` value is `mixed` with medium confidence because this is an aggregate promo slice, not one uniform print family. Agents must not convert that into row-level symbol truth.

The aggregate release date is `1996-10-15/1999-01-31` with `date_precision: source_slice_mixed_range_crosses_cutoff`, because the ANA campaign rows begin before the cutoff but carry a campaign window that extends past it. The row-level `promo_context.date_label` is the authority for the narrower distribution timing.

## Fresh Audit Findings Folded In

Lagrange audited cutoff and inclusion. Sartre audited schema, provenance, and image overclaim. Their findings changed the implementation before commit:

| Auditor | Finding | Disposition |
|---|---|---|
| Lagrange | Song Best Collection is cutoff-safe but absent from this UPC slice. | Documented as known exclusion because Song Best did not appear in the inspected UPC payload; it remains a separate promo target. |
| Lagrange | ANA rows cross the cutoff but the aggregate date hid the post-cutoff tail. | Fixed by changing the aggregate release date to `1996-10-15/1999-01-31` and date precision to `source_slice_mixed_range_crosses_cutoff`. |
| Lagrange | Synthetic aggregate rows overclaimed `strict_release_member: true`. | Fixed by setting source-slice rows and release metadata to `strict_release_member: false` with a membership note. |
| Sartre | Deterministic audit did not cover the promo-specific contract. | Fixed by auditing `promo_context`, source-sort/local-id alignment, selected sort membership, symbol-status scope, and aggregate membership. |
| Sartre | PokéCardex images were labeled as exact source images despite being provider-path-derived. | Fixed by changing status to `provider_path_reference_image` and verification to `provider_path_derived_external_reference_witness`. |
| Sartre | Manifest did not expose Japanese-name gaps. | Fixed by adding source-labeled and missing Japanese-name counts to manifest release entries. |

## Known Exclusions

The following source-visible objects are deliberately not included in this pass:

- post-cutoff UPC rows, including CoroCoro February 1999 Meowth and Pokémon Card GB Official Guidebook Venusaur
- source rows with no pre-cutoff date and no matching release-map family
- image-numbered UPC files that exist but are not represented as card rows in the decrypted source payload
- Pokémon Song Best Collection promos, which did not appear in the UPC payload inspected here and remain a separate cutoff-safe promo target

## Open Hardening

The image witness layer still does not pin fetched image bytes. For PokéCardex, it verifies source-row linkage, provider path convention, and live image availability, not image immutability or a per-row image field in the decrypted payload.

The source slice should eventually be split into per-distribution release catalogs once row-level Japanese names, stronger primary citations, and image byte hashes are available.
