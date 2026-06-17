# Japanese Pre-English Deck + Quick Starter Catalog Audit

Generated: 2026-06-17T14:55:13Z

## Scope

This pass extends the Japanese pre-English catalog from seven regular release families to thirteen release catalogs by adding four pre-English Gym deck row catalogs and two Quick Starter Gift Set child deck catalogs.

Added release catalogs:

| Release | Source | Rows | Exact image witnesses |
|---|---|---:|---:|
| Nivi City Gym / Brock | https://www.pokecardex.com/en/series/jp/NCGYM | 25 | 25 |
| Hanada City Gym / Misty | https://www.pokecardex.com/en/series/jp/HCGYM | 24 | 24 |
| Kuchiba City Gym / Lt. Surge | https://www.pokecardex.com/en/series/jp/KCGYM | 25 | 25 |
| Tamamushi City Gym / Erika | https://www.pokecardex.com/en/series/jp/TCGYM | 28 | 28 |
| Quick Starter Gift Set Red Deck | https://www.pokecardex.com/en/series/jp/QSGSR | 32 | 32 |
| Quick Starter Gift Set Green Deck | https://www.pokecardex.com/en/series/jp/QSGSG | 32 | 32 |

Current aggregate:

| Metric | Value |
|---|---:|
| Release catalogs | 13 |
| Card rows | 548 |
| Exact external image witnesses | 548 |
| TCGdex-enriched rows | 257 |
| Deterministic audit status | passed |

## Source Method

The original seven release catalogs continue to use Pokellector row pages plus TCGdex where a stable set id exists.

The six new deck catalogs use PokéCardex Japanese series pages. The site carries its row payload as encrypted initial data; the builder decrypts that payload locally with the key exposed in the public page bundle and derives image witnesses from the same row order:

`https://www.pokecardex.com/assets/images/sets_jp/{CODE}/{sort}.jpg`

The image witness policy remains fail-closed:

- exact row reference image only
- external reference witness
- no approved in-app display rights
- no training use
- no seller evidence use
- no authenticity, condition, possession, or price claim

## Important Boundaries

The deck product counts and the catalog row counts are deliberately different. The Gym deck products are known as decks plus additional cards, while this slice catalogs the unique rows exposed by the exact source pages. The Quick Starter Gift Set is one parent product, but the data is represented as two child row catalogs, red and green, because the source pages expose the decks separately.

Japanese print names are still missing for the six PokéCardex-derived families. Those rows are marked `name_ja_status: missing_from_exact_source`. The catalog does not promote English or French source names into Japanese print-name authority.

The six added families are marked `prints_without_rarity_symbol: yes`, with medium-high confidence for the Gym decks and high confidence for the Quick Starter child catalogs. That status is release-family context only. It is not row-level proof that a seller's physical card lacks or has a symbol.

## Audit Checks

Deterministic checks passed:

- row count equals expected source row count for all 13 releases
- every row has a release-scoped row id
- every row has an exact image witness
- every image witness stays bounded by the reference-only policy
- manifest hashes reproduce from the release JSON bytes
- no generated illustrator field renders as `Illus. None`
- source labels distinguish Pokellector and PokéCardex instead of laundering one adapter into the other
- missing Japanese names remain explicit gaps
- manifest and audit schema now match the builder's `main()` output shape
- catalog hashes no longer include volatile per-release or per-row retrieval timestamps
- Quick Starter child decks carry structured parent-symbol inheritance fields
- deck products carry structured `product_card_count` and `unique_catalog_row_count` fields

Multi-agent audit frame:

- Hegel previously flagged Quick Starter and the pre-English deck products as priority overlap/trap surfaces for No Rarity interpretation.
- Hubble previously required exact image or no image, with image provenance explicit about rights and non-evidence status.
- This slice applies both constraints: Quick Starter and Gym deck rows are cataloged, and images are exact external witnesses only.
- Rawls audited this slice after generation. Their consistency check passed, and their P1 schema-drift finding plus several P2/P3 boundary findings were folded back into the builder/output before commit.

## Fresh Audit Findings Folded In

Rawls found six issues:

| Severity | Finding | Disposition |
|---|---|---|
| P1 | Builder `main()` would have written a different manifest/audit schema than the checked-in files. | Fixed in builder; future runs preserve the current manifest/audit shape. |
| P2 | Catalog hashes included volatile `generated_at` / `retrieved_at` clock fields. | Fixed by removing volatile timestamps from release-catalog bytes; manifest/audit still record run time. |
| P2 | PokéCardex image exactness was generated from source row order and URL pattern, not byte-hashed image content. | Documented residual. All 166 new image URLs returned `200 image/jpeg` in Rawls' HEAD check, but image bytes are not pinned yet. |
| P2 | All six new catalogs lack row-level Japanese names. | Documented explicit gap; rows remain `missing_from_exact_source`. |
| P2 | Quick Starter child deck symbol status inherits from a parent-family source id. | Fixed by adding `source_mode: inherited_from_parent_release_family` and `source_release_family_id`. |
| P3 | Product count vs. unique-row count was prose-only. | Fixed by adding structured product and unique-row count fields. |

The remaining hardening item from this slice is image byte pinning. The current image entries are exact external reference witnesses by source-row path and live availability; they are not content-addressed image assets.

## Open Gaps

This is not yet the full Japanese pre-English corpus. Remaining families include the Starter Pack / Gift Set ambiguity surfaces, trainer/promo clusters, and additional cutoff-safe promo releases.

The six newly added families still need a stronger Japanese-name source before a human-facing binder should display Japanese names as print authority.

The builder's full network refresh remains sensitive to slow Pokellector card-detail pages. The current JSON, manifest, and audit are byte-consistent and generated from already-fetched source rows, but a future hardening pass should add durable source caching or cached snapshots so the build does not depend on live page availability.

The image witness layer should eventually store fetched image byte hashes or local source snapshots. This pass verifies source-row identity and live image availability, not image-byte immutability.
