# Codex Handoff — 2026-06-12

Two tasks for a Codex session. Read standalone (no prior context assumed). Do
Task 1 first (small, decided), then Task 2 (a blind audit round). Standing rules
and hand-back are at the bottom.

Repo is at `HEAD == origin/main`. The untracked `mockups/` and
`/Users/che/.claude/launch.json` are the reviewer's design work — do not touch,
commit, or delete them.

---

## Task 1 — AUD-D2-SW-003: remove the dead `RouteWallBundleMismatch` error (decided)

Mode: directive cleanup. This is decided, not a discovery task.

Context: `chain/src/MarketplaceEscrow.sol` declares an error
`RouteWallBundleMismatch(bytes32 expectedWallBundleHash, bytes32 providedWallBundleHash)`
that is never thrown anywhere in `chain/src/`. Its presence in the ABI implies
an on-chain wall-bundle coherence check that the project deliberately chose NOT
to build: under the hybrid decision, wall-bundle and assembly-history graph
coherence stay an off-chain validation responsibility by design. The dead error
is an ABI fossil implying a guarantee that is intentionally off-chain.

Do:
```text
- Delete the RouteWallBundleMismatch error declaration.
- grep chain/src and chain/test to confirm nothing references it (it is unused).
- Confirm the contract compiles and forge test stays 81/81.
```

Do NOT:
```text
- Do NOT wire a real derived wall-bundle check. That would contradict the
  documented design (graph coherence is off-chain). If you believe a check is
  warranted, raise it as a finding for the reviewer — do not implement it here.
```

On landing: update the `AUD-D2-SW-003` row in `Protocol_Audit_Findings_Ledger.md`
to `fixed_in_code` ("declared-but-unused error removed; wall-bundle coherence is
off-chain by design"). One focused commit.

---

## Task 2 — Domain 7 blind audit: catalog lineage cannot be poisoned

Mode: BLIND round against `Protocol_Audit_v0.1.md`, Domain 7. The reviewer has
pre-registered sealed expectations and will not reveal them until your round is
done. Do not seek them. The value is your independent conclusion. Investigate
the source and answer each question with a runnable case or a precise citation —
do not assume the answer.

Claim under test:
```text
Catalog facts are content-addressed and separated from policy; rows grow only
through evidence-weighted challenge; poison is blocked or held, never hardened;
citations bind to bytes; head-count never outweighs evidence.
```

Attacker goal: get a poisoned or incoherent catalog row to harden; or get a
wrong-bytes citation to validate; or smuggle policy into the fact hash; or carry
a decision by agent-count / monoculture agreement.

Source surface (read `simulations/catalog_evolution_drill.py`,
`agent_tools/no_rarity_catalog_tools.py`, `mcp/no_rarity_catalog_server.py`,
`data/no-rarity-base-set.json`, `data/no-rarity-catalog-policy.json`,
`data/no-rarity-catalog-manifest.json`):
```text
1. What makes a revision harden vs flag vs block? Can a poison flag harden with
   the right challenger set, or with zero challengers? (This path was hardened
   once — structured diffs, held-at-flag. Re-attack it freshly with reworded
   claims and restructured diffs; do not assume the prior fix is complete.)
2. Does challenge weight depend on challenger COUNT anywhere, or only on
   evidence? Can many identical-model (monoculture) challengers carry weight
   that should not outvote one evidenced dissent? Is challenger independence
   measured at all?
3. Citation integrity: can a card reference cite a catalog_hash that does not
   match the bytes, or a row_id absent from the cited release, and still be
   accepted downstream?
4. Fact/policy separation: can an evidence-profile or policy change be smuggled
   into the fact-catalog hash?
5. Blank variant_traps: is an empty trap list ever treated as "checked / clean"
   rather than "unexamined"? (ties to the prints_without_rarity_symbol overlap
   matrix in Japanese_Pre_English_Release_Map_v0.1.md)
6. Identity binding: confirm off-set named wants still return no_in_set_match
   (do not bind to a row), and check cross-set name collisions.
```

Produce:
```text
- Runnable cases (extend the catalog evolution drill / catalog probe).
- A findings register Protocol_Audit_Execution_Domain7_v0.1.md: one packet per
  finding (id, domain, severity, type, claim, attack, observed, expected,
  runnable case or citation, exactly one disposition).
- Your one-line verdict: can catalog lineage be poisoned at the tool/lineage
  layer, and where is the boundary?
```

If you find nothing material: record `weak_audit_suspected` AND show your cases
could have caught a real defect — mutation-test by breaking one validator clause
in a scratch edit and confirming a case fails, then revert.

---

## Standing rules

```text
- Independence: author cases against source, not copied from existing fixtures.
- Expectation independence: state what the attacker wants, then check what
  happens — not what you hope happens.
- Honesty typing: proven_bypass ships the runnable case that proves it;
  suspected_weakness is reasoned-only; do not inflate one to the other.
- Severity by buyer impact, not cleverness.
- Exactly one disposition per finding, from the canonical vocabulary in
  Protocol_Audit_v0.1.md. A finding with no disposition is still open.
- Do not close a finding by editing only docs unless it is doc drift, overclaim,
  stale guidance, or a deliberately documented residual risk.
- Do not weaken a test to make a case pass.
```

## Hand-back

```text
- forge test stays 81/81 (Task 1); catalog probe + evolution drill stay green
  or you explain why (Task 2).
- Push focused commits; leave mockups/ and .claude/ untouched.
- Report: Task 1 result + the ledger row update; Task 2 per-finding register,
  new test names, pass counts, and your one-line Domain 7 verdict.
- The reviewer will independently re-run the key Domain 7 case and compare your
  findings against the sealed pre-registration before flipping any disposition.
```
