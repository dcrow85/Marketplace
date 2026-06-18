# Japanese Pre-English ANA Get in a Jet Audit

Run: `japanese_pre_english_ana_get_in_a_jet_audit_20260618T003011Z`

Scope: add the `jp_promo_ana_get_in_a_jet_199811` source slice in the same catalog format as the No Rarity-derived Japanese pre-English catalog rows.

## Slice

- Release: `jp_promo_ana_get_in_a_jet_199811`
- Name: ANA Get in a Jet! Double Chance Campaign source slice
- Window: `1998-11-01/1999-01-31`
- Rows: `2`
- Source gaps: `0`
- Cards:
  - `jp_promo_ana_get_in_a_jet_199811:051` — Flying Pikachu, UPC sort `51`, provider-path reference image `https://www.pokecardex.com/assets/images/sets_jp/UPC/51.jpg`
  - `jp_promo_ana_get_in_a_jet_199811:052` — Dragonite, UPC sort `52`, provider-path reference image `https://www.pokecardex.com/assets/images/sets_jp/UPC/52.jpg`

## Sources

- Pokumon Flying Pikachu page: `https://pokumon.com/card/flying-pikachu-get-in-a-jet-double-chance-campaign-1998-unnumbered/`
- Pokumon Dragonite page: `https://pokumon.com/card/dragonite-get-in-a-jet-double-chance-campaign-1998-unnumbered/`
- Pokumon timeline: `https://pokumon.com/timeline/`
- Bulbapedia unnumbered promo table: `https://bulbapedia.bulbagarden.net/wiki/Unnumbered_Promotional_cards_(TCG)/1996-2005`

The selected-line snapshot preserves the useful source tension: Pokumon gives `November 1, 1998 - January 31, 1999`; Bulbapedia renders `November 1-31, 1998`. The generated release uses the Pokumon date range and records Bulbapedia's wording as a caveat, not as a campaign end-date authority.

## Output Totals

- `audit.passed`: `true`
- `release_count`: `35`
- `total_rows`: `1247`
- `source_gap_count`: `4`
- `reference_image_witness_rows`: `1223`
- `provider_path_reference_image_rows`: `316`

## Verification

- `python3 -m py_compile scripts/build_japanese_pre_english_catalogs.py`
- `python3 -m json.tool` over the ANA source snapshot, ANA release, manifest, and audit.
- Local regeneration of all `promo_family_child_rollup` releases plus manifest/audit, avoiding a slow live Pokellector full refresh.
- Current-code `audit_release()` over all 35 release files: `passed true`.
- Legacy wording scan: no generated data contains `expected_complete_source_boundary`, `source_slice_boundary_claim`, or `family_context_expected_complete_source_boundary`; those strings remain only as audit rejection checks in the builder.

## Mutation Proofs

All deliberate bad states were rejected by `audit_release()`:

- Expected source count inflated.
- Modeled source sort erased.
- Complete-family flag promoted.
- Family-context snapshot hash mutated.
- `complete campaign source` denial removed from family-context `not_claiming`.
- Provider-path image promoted to `exact_source_image`.
- Primary source `complete_source_boundary_denial` mutated.
- Family-context `complete_source_boundary_denial` mutated.
- Family-context `source_slice_authority_label` mutated to `complete campaign source`.
- Legacy `expected_complete_source_boundary` key injected.

Result: `10 / 10` mutation checks passed.

## Multi-Agent Audit

Three read-only audit chairs reviewed the slice:

- Confucius audited source/date authority.
- Euclid audited row/image/provenance mechanics.
- Helmholtz audited schema/no-overclaim/fail-closed behavior.

Findings and dispositions:

| Chair | Finding | Disposition |
|---|---|---|
| Confucius | Machine-readable fields used `complete campaign source` as a positive-looking `expected_complete_source_boundary`, contradicting the snapshot's own caveat that this is not a complete campaign source. | Fixed. The builder now emits `source_slice_authority_label` for the positive claim and `complete_source_boundary_denial` for the negative boundary. All promo-child releases were regenerated. |
| Euclid | No row/image/provenance findings. UPC sorts `51`/`52`, provider image paths, display-rights boundaries, and inherited hash-preimage caveats hold. | No change needed. |
| Helmholtz | `audit_release()` did not compare the serialized boundary fields back to the family spec. | Fixed. The audit now validates authority labels and boundary-denial fields in source, family-context, product, and row scopes, and rejects legacy positive boundary keys. |

## Residual Boundaries

- This is a source-pinned campaign card-identity slice, not a complete airline campaign archive.
- It does not claim redemption mechanics, passenger/flight/customer records, official copy counts, seller possession, authenticity, condition, image rights, or market price truth.
- Japanese card names remain unresolved from the exact selected source lines and stay explicit missing-name rows.
