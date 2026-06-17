# Quick Starter Parent Catalog Audit

Generated: 2026-06-17T16:42:00Z

## Scope

This run adds `jp_tcg_quick_starter_gift_set_19981204` as a parent-product catalog over the already source-backed Quick Starter red and green deck child catalogs.

The parent catalog is a deterministic rollup, not a new source page:

- Red child: `jp_tcg_quick_starter_gift_set_red_deck_19981204`
- Green child: `jp_tcg_quick_starter_gift_set_green_deck_19981204`
- Parent rows: 64, preserving red/green lanes rather than deduplicating by card name
- Parent product count: 120 cards, documented as two 60-card decks
- Images: inherited provider-path reference witnesses from the child rows

## Deterministic Results

- Parent catalog hash: `df532013e37c18cd0bfed18ab1dddae3950bcf2f967e3ac8f2c5eaaf78b4c790`
- Aggregate audit: passed
- Aggregate releases: 17
- Aggregate rows: 679
- Exact source image rows: 393
- Provider-path reference image rows: 286
- Parent audit: 64 rows, 64 provider-path reference images, 64 missing Japanese names

The parent was rebuilt from the current child catalog files and matched the on-disk parent hash byte-for-byte under `json_sorted_keys_no_whitespace_v0.1`.

## Mutation Checks

All tested parent mutations were detected by `audit_release`:

- Invalid lane
- Wrong child catalog hash
- Wrong image row id
- Missing row / broken lane balance
- Wrong parent product-scope release type
- Wrong symbol source release family
- Parent row name drift from child row
- Parent source-contact drift from child row
- Parent image provider drift from child row
- Parent child-row-id drift
- Parent `cards_found` drift
- Child source row-count drift
- Coupled bogus child hash in both source metadata and row metadata

The important hardening here is the coupled-hash case: the validator now loads the actual red/green child catalog files, recomputes child hashes/counts, verifies referenced child rows exist, and compares critical inherited fields against the child row.

## Fresh Agent Audit

Two fresh read-only agents audited the slice.

### Faraday: collector/product correctness

Verdict: no P0/P1 blockers.

Findings folded:

- P2 ambiguous child note: replaced "two 60-card decks plus extras" with "Parent package contains two 60-card decks; this source exposes 32 unique rows for one deck."
- P2 pseudo source URL: replaced the parent manifest source marker with a `local-rollup:` source identifier over the two concrete child catalog paths.

Checks Faraday confirmed:

- Parent honestly represents 64 catalog rows over a 120-card parent product.
- Duplicate names are preserved across red/green lanes without row-id collision.
- Missing-symbol claims are scoped to release context, not seller/authenticity truth.
- Japanese-name gaps are visible in manifest/audit counts.

### Galileo: schema/provenance/reproducibility

Verdict: no P0 blockers; one P1 hardening finding.

Findings folded:

- P1 parent derivation audit gap: hardened `audit_release` so the parent rollup is checked against actual child catalog files, not only its own shape.
- P2 parent tags carried child deck names: regenerated parent tags as parent release id, parent name, release date, lane, rarity/category.
- P2 parent source provenance not self-contained: child catalog source entries now include path, canonicalization, catalog hash, row count, and source page URL.
- P2 commit hygiene: parent JSON is included as a tracked artifact in this slice.

## Source-Contact Refresh Note

While preparing this slice, the PokéCardex-backed source-contact page hashes were refreshed for existing PokéCardex-derived catalogs. The payload hashes and row counts remain bounded by their source adapters; the refreshed hashes are tracked through the aggregate manifest. This report treats those changes as provenance refreshes, not new catalog coverage.

## Not Claiming

- This parent rollup is not an official source page.
- Provider-path images are reference witnesses only, not approved image-display rights.
- Missing-symbol status is release-context metadata, not physical-card truth.
- The catalog does not prove seller possession, authenticity, condition, or price.
