# Protocol Audit Execution Domain 4 v0.1

Generated 2026-06-12.

Execution slice against `Protocol_Audit_v0.1.md`, Domain 4 (Legibility Cannot
Become Spendability). Run by the reviewer chair directly — a code sweep across
the contract gates, the catalog tools, and the legibility/vector layer.

Claim under test: deterministic tool outputs and legibility vectors are legible,
never enforced, and cannot move funds, route, bond, claim, reputation, or
settlement by themselves; verdict-laundering (field / nested / prose /
structural) is blocked.

## What was swept, and the result

```text
Contract gates (commitRoute / markDelivered / buyerAccept / settle /
  resolveClaim / acceptAndBond): take only typed hashes, signatures, witnesses,
  spendability digests, and amounts. No catalog / score / verdict / legibility /
  tool_output field exists anywhere in the contract ABI. A legible artifact
  cannot reach a money-moving gate — it does not exist to the contract. PASS
  (structural).

Catalog tool decisions (evaluate_gate): the output carries an EMPTY `enforced`
  list and partitions every other claim into `legible`, `judgment_needed`, and
  `missing`, with an explicit boundary: "This evaluation can prepare actions. It
  cannot authorize spendability or prove the physical card." The `decision`
  field (continue / request_evidence / human_or_verifier_review / ...) is a
  next-step recommendation, not an authority. PASS.

Legibility vector / verdict laundering: the calibration drill blocks field-level
  (allowlist), nested, prose-heuristic, and band-as-score laundering, and
  requires the agent_policy_projection to be a separate `authority_label: judged`
  object. Vectors are not consumed as enforced authority anywhere. PASS.
```

Falsification symmetry: these passes are evidenced, not assumed. A catalog/score
field in a gate would have surfaced in the ABI grep (none); a vector-or-decision
wired into a spendability/route step would have surfaced in the consumer grep
(none); the tool output was confirmed to carry an empty `enforced` list and a
boundary string.

## Findings

### AUD-D4-001 — wall 13 packet shape vs tool emission (doc drift)

- Domain: 4. Severity: low. Type: spec/implementation mismatch (citation).
- Observed: wall 13 (`DeterministicToolBoundary`) specifies a
  `marketplace.tool_output_boundary.v0.1` packet with an `authority_label`
  field, but that packet is never emitted. The catalog tools instead satisfy the
  boundary via a per-claim `enforced`/`legible`/`judgment_needed`/`missing`
  partition plus a `protocol_boundary` string — substantively equivalent, but a
  different shape than the wall names. The `authority_label: judged` form *is*
  used, correctly, on the legibility/trust-import `agent_policy_projection`.
- Disposition: `fixed_in_docs_for_doc_drift`. Wall 13 now records that the
  per-claim partition is an acceptable equivalent form and states the actual
  invariant: every tool claim is authority-labeled and the output names no
  enforced authority it does not have.

### AUD-D4-002 — the boundary holds by absence of a consumption path

- Domain: 4. Severity: informational (coverage limit, `unfalsifiable_claim`-adjacent).
- Observed: the Domain 4 attack "promote a `low_friction_pass` / catalog match /
  legibility vector into an intent packet that a route or funding step consumes"
  is currently **vacuous** — no live path wires any tool decision or legibility
  vector into an intent → spendability → gate step. The legible→spendable
  boundary therefore holds partly because the dangerous integration does not yet
  exist. This is the project's long-standing "next hardening target" (connect the
  catalog tools to a transaction intent packet without letting catalog certainty
  leak into spendability) — still unbuilt.
- Why it is a finding, not a pass: the strongest Domain 4 risk cannot be tested
  today. A clean result here would overclaim if read as "the boundary is proven
  robust" — it is proven *absent*, which is weaker.
- Disposition: `deferred_with_owner_and_trigger`. Re-run Domain 4 when the
  intent→spendability integration lands, with cases proving a catalog decision /
  legibility vector requires a separate, named spendability authority and cannot
  be promoted into a consumed field. This is the same on-chain/off-chain boundary
  the rest of the audit has mapped: structure is enforced; semantic promotion is
  the deferred decision.

## Coverage honesty

This slice covered the contract ABI, the catalog tool emission, and the
legibility/vector layer against the four laundering vectors. It did NOT — could
not — test a live intent→spendability promotion path, because that path is
unbuilt (AUD-D4-002). Not a `weak_audit_suspected` round: it produced a doc fix
and identified the critical untestable boundary as the gating condition for a
re-run.

## Verdict

At the current implementation, legibility cannot become spendability: the
contract has no field for a legible artifact, the tools label every claim and
authorize nothing, and verdict-laundering is blocked. The one substantive caveat
is that this is partly a pass-by-absence — the catalog-decision/vector →
spendability integration is unbuilt, and Domain 4 must be re-run when it lands.
