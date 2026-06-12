# Protocol Audit Execution: Domain 7 v0.1

Date: 2026-06-12

Scope: blind Domain 7 audit of catalog lineage tooling and agent-facing catalog probes. Task 1 / Solidity / `AUD-D2-SW-003` were out of scope and untouched.

Canonical claim under test: catalog facts are content-addressed and separated from policy; rows grow only through evidence-weighted challenge; poison is blocked or held, never hardened; citations bind to bytes; head-count never outweighs evidence.

## AUD-D7-001

id: AUD-D7-001
domain: Domain 7
severity: high
type: proven_bypass
claim: Poisoned catalog-row changes must be blocked or held even when the claim text and diff shape are restructured.
attack: Propose a basic Energy caveat row as an active No Rarity premium target by setting `no_rarity_target` with a scalar boolean instead of the previously covered `{from,to}` diff shape.
observed: Source inspection showed the detector only flagged Energy poison when `no_rarity_target` was a dict with `to: true`; a scalar rewrite could avoid the flag and harden through the default path.
expected: Semantically equivalent field rewrites must hit the same poison detector and hold at `flag` unless independent evidence justifies a block.
runnable case or citation: `scalar_energy_poison_held_at_flag` in `simulations/catalog_evolution_drill.py`; current run `runs/catalog_evolution_drill_20260612T140742Z/summary.json` reports outcome `flag`, flags `energy_caveat_poison`, passed `true`.
disposition: fixed_in_code

## AUD-D7-002

id: AUD-D7-002
domain: Domain 7
severity: high
type: proven_bypass
claim: Policy and evidence-profile changes must not harden as fact-catalog row revisions.
attack: Submit a row revision that changes `agent_decision_profile.baseline_evidence_profile_id` and `recommended_evidence`, presenting an evidence burden reduction as a catalog fact change.
observed: The drill previously only checked for a top-level `evidence_requirements` key in catalog bytes and had no proposed-change detector for policy-shaped row fields.
expected: Policy-shaped proposed changes are blocked from fact-catalog hardening and must move through the policy artifact/process instead.
runnable case or citation: `policy_profile_change_blocked_as_policy_fact` in `simulations/catalog_evolution_drill.py`; current run `runs/catalog_evolution_drill_20260612T140742Z/summary.json` reports outcome `block`, flags `policy_as_fact_smuggle`, passed `true`.
disposition: fixed_in_code

## AUD-D7-003

id: AUD-D7-003
domain: Domain 7
severity: medium
type: suspected_weakness
claim: Challenger weight must depend on evidence and measured independence, not on agent count or monoculture agreement.
attack: Submit many decisive, evidence-citing challenges that all share the same model-family independence vector and request `block`.
observed: Domain 7 already named monoculture independence as an open frontier; the drill had an `independence_vector_ref` field but did not measure it before treating decisive challenges as evidence-weighted.
expected: Monoculture or missing independence vectors do not become independent contradictions; a poisoned row may remain held at `flag`, but monoculture agreement must not carry the decision to `block`.
runnable case or citation: `monoculture_challengers_do_not_carry_block` in `simulations/catalog_evolution_drill.py`; current run `runs/catalog_evolution_drill_20260612T140742Z/summary.json` reports outcome `flag`, flags `energy_caveat_poison, missing_challenger_independence`, passed `true`.
disposition: fixed_in_code

## AUD-D7-004

id: AUD-D7-004
domain: Domain 7
severity: low
type: closed_negative_case
claim: Tool-emitted card references must cite the current catalog bytes and the row id actually returned.
attack: Search a row, then compare the emitted row citation against the release metadata returned by the same tool surface.
observed: Generated citations bind `catalog_hash` to the current release and bind `row_id` to the returned `card_ref`. I found no downstream tool path that accepts an arbitrary external `(catalog_hash,row_id)` citation as validated input.
expected: Generated citations cite current bytes; externally supplied citations require a separate validator before any downstream acceptance.
runnable case or citation: `agent_tests/no_rarity_catalog_probe.py` checks `catalog_citation.catalog_hash == catalog_release.catalog_hash` and `catalog_citation.row_id == card_ref`; `python3 agent_tests/no_rarity_catalog_probe.py` passed.
disposition: closed_as_false_positive_with_case

## AUD-D7-005

id: AUD-D7-005
domain: Domain 7
severity: high
type: proven_bypass
claim: Off-set named wants and cross-set name collisions must not bind to an in-set row.
attack: Ask for `Team Rocket Pikachu`; `Pikachu` exists in the Base Set catalog, but the set-family qualifier points outside the release.
observed: The named-match path accepted exact card names before checking cross-set qualifiers, so a cross-set intent could bind to the Base Set Pikachu row.
expected: Cross-set qualifiers return `candidate_source: no_in_set_match`, no candidates, and agent guidance to disambiguate the intended set.
runnable case or citation: `agent_tests/no_rarity_catalog_probe.py` checks `I want a Team Rocket Pikachu` returns `no_in_set_match`; `python3 agent_tests/no_rarity_catalog_probe.py` passed.
disposition: fixed_in_code

## AUD-D7-006

id: AUD-D7-006
domain: Domain 7
severity: low
type: suspected_weakness
claim: A blank `variant_traps` list must not be surfaced as "checked clean" when it means unexamined or no cataloged trap.
attack: Fetch a row with `variant_traps: []` and inspect whether the agent-facing output gives a clean/checked implication.
observed: The tool previously emitted the raw empty list with no explicit status. I did not find code that labeled it checked, but the output was ambiguous for downstream agents.
expected: Empty trap lists carry an explicit non-clean status.
runnable case or citation: `agent_tools/no_rarity_catalog_tools.py` now emits `variant_trap_status: unexamined_or_no_cataloged_trap`; `agent_tests/no_rarity_catalog_probe.py` asserts that status for `PMCG1-001`; probe passed.
disposition: fixed_in_code

## AUD-D7-007

id: AUD-D7-007
domain: Domain 7
severity: low
type: closed_negative_case
claim: Off-set named wants must return `no_in_set_match` and never bind to a catalog row.
attack: Ask for `Japanese Umbreon no rarity`, a named want outside the Japanese Expansion Pack Base Set catalog.
observed: The tool returns `candidate_source: no_in_set_match` with no candidates.
expected: No row binding occurs, and the agent is told to confirm a different set or era.
runnable case or citation: `agent_tests/no_rarity_catalog_probe.py` asserts the Umbreon no-match behavior; `python3 agent_tests/no_rarity_catalog_probe.py` passed.
disposition: closed_as_false_positive_with_case

## Commands Run

```text
python3 agent_tests/no_rarity_catalog_probe.py
```

Result: passed; direct probe summary had `cross_set_candidate_source: no_in_set_match`, `off_set_candidate_source: no_in_set_match`, and `variant_trap_status: unexamined_or_no_cataloged_trap`; MCP probe returned `tool_count: 7`, `evaluate_decision: request_evidence`.

```text
python3 simulations/catalog_evolution_drill.py
```

Result: passed; wrote `runs/catalog_evolution_drill_20260612T140742Z/REPORT.md`; summary had 8/8 revision cases passed and 4/4 overclaim attempts passed.

```text
python3 - <<'PY'
...in-memory mutation of scalar poison, policy field, and independence clauses...
PY
```

Result: mutation proof passed. Removing the scalar poison guard made `scalar_energy_poison_held_at_flag` fail with outcome `harden`; removing the policy-field detector made `policy_profile_change_blocked_as_policy_fact` fail with outcome `harden`; treating monoculture vectors as independent made `monoculture_challengers_do_not_carry_block` fail with outcome `block`.

## Verdict

Catalog lineage can no longer be poisoned at the tested tool/lineage layer by scalar Energy rewrites, policy-as-fact row diffs, monoculture challenge count, blank trap ambiguity, or cross-set named wants; the boundary remains that the catalog cites and filters bytes/rows but does not prove physical-card truth.
