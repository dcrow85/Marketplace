# Marketplace Access Assembly Note

Generated: 2026-05-22

Authority: design synthesis for the Marketplace protocol line. This note borrows
the HaPPY access-assembly framing as vocabulary pressure only; it does not import
HaPPY evidence or mechanism claims into Marketplace.

## Clean Claim

The Marketplace Protocol is not a scalar trust-pressure program. It is an
access-assembly program.

Seller history, catalog contact, shop ownership, eBay receipts, photographs,
route history, buyer convenience, and agent confidence can all inform the trade.
But none of them can spend by themselves. They become action-bearing only when
assembled into gate-specific placement: packet refs, wall bundles, scoped
policies, waivers, assembly provenance, spendability hashes, and route
witnesses.

In protocol terms:

```text
trajectory_capacity = remembered actor/pathway capacity
assembly_placement  = situated admissibility at a named trade gate
spendability        = permission to use an assembly at that gate
```

The core invariant remains:

```text
trajectory_capacity cannot move funds, route, bond, claim, or reputation by itself.
assembly_placement can become spendable only at the named gate.
```

## Access Variables

The protocol assembles access from variables that must stay separate:

- `CardReferenceCandidate`: catalog anchor, not possession or truth.
- `item_fingerprint_hash`: object-contact anchor for this trade.
- `inventory_lock_hash`: seller availability and anti-double-sell placement.
- `proof_vector_scope_packet`: what the evidence is allowed to claim.
- `bond_scope_packet`: which failures the bond can cover.
- `route_insurance_risk_owner_packet`: who owns route loss or gap risk.
- `arbiter_policy_hash`: which closure matrix governs disputes.
- `BuyerRiskAcceptance`: waiver-bearing placement, not verification.
- `wall_bundle_hash`: current wall packet assembly.
- `assembly_history_hash`: provenance graph proving the route gate inherited its
  authority from the named packets, contact receipts, subject, and wall bundle.
- `route_spendability_hash`: permission to spend the assembled provenance and
  wall bundle at route commitment.
- `routeAssemblyWitnessHash`: typed EVM witness binding route, spendability,
  wall bundle, assembly history, item fingerprint, inventory lock, and route gate.
- `delivery_spendability_hash`: permission to spend route-bound delivery evidence
  at inspection opening.
- `deliveryWitnessHash`: typed EVM witness for the delivery confirmation gate.

These are not interchangeable. A strong seller trajectory cannot replace an
inventory lock. A catalog row cannot replace possession evidence. A waiver cannot
be rewritten as verification. A spendability packet cannot prove authenticity.
Resemblance is not inheritance: a visible coordinate, plausible API response, or
strong seller history remains inert until the assembly history names how it was
placed at the current gate.

## Gate Surfaces

The same evidence can be useful, inert, waiver-bearing, or blocking depending on
which gate reads it.

- Offer evaluation asks whether the trade can proceed toward acceptance.
- Funding asks whether unresolved ambiguity has been placed or blocked.
- Route commitment asks whether item, inventory, route risk, wall bundle, and
  assembly-bound route spendability are all present for this route.
- Delivery confirmation asks whether route-bound delivery evidence, delivery
  spendability, and a typed delivery witness are present before inspection opens.
- Claim opening asks which claim matrix row applies and what evidence is missing.
- Bond action asks whether the scoped policy and bond coverage authorize movement.

This is the Marketplace version of access assembly: the route is not in any one
evidence packet. The route appears when local evidence, remembered context, risk
placement, and gate authority line up.

## Terminal Floor

The terminal wall decision is not truth. It is a floor over assembled access
variables:

```text
pass             = required placement exists for this gate
block            = a hard placement variable is absent
waiver_required  = the route can proceed only with explicit risk placement
escalate         = scoped judgment is required
```

The latest wall-bundle route drill and Pokemon alpha stress runs support the
current route-lock floor:

```text
valid wall bundle + assembly history + route spendability citing both -> RouteLocked
missing wall bundle / assembly history / route spendability / route witness -> blocked
stale or wrong wall bundle reference -> blocked
spendability that does not inherit assembly provenance -> blocked
```

The contract can consume the route spendability hash and store typed route
witnesses. The alpha harness now also builds `AssemblyProvenance`, an off-chain
packet whose hash is cited by route spendability. Full wall semantics remain
off-chain. This is an important boundary: the EVM witness proves that the route
gate received the right typed commitment shape; it does not prove the card is
real, correctly graded, fairly priced, or safely delivered.

Delivery now has the same shape at the next gate: old seller-only delivery calls
fail closed, and inspection opens only when a delivery spendability hash and
typed `deliveryWitnessHash` are supplied. This still does not prove delivery
truth by itself; it proves that delivery contact was placed at the correct
gate and made legible for buyer inspection, claim, or later arbitration.

## Design Rules

1. Do not let trajectory capacity spend.
2. Do not collapse assembly placement into generic trust.
3. Do not let spendability become truth.
4. Do not let a waiver become verification.
5. Do not let scalar cost summaries move gates unless native cost dimensions are
   recoverable.
6. Do not let claim closure improvise; name the matrix row and missing evidence.
7. Do not let hash anchoring hide off-chain semantic dependence.
8. Do not let resemblance imply inherited authority; require assembly
   provenance before spendability can act.

## Next Probe

Run an access-assembly audit across the same trade candidate and several gates.

For each gate, predict before execution:

- trajectory capacity present
- assembly placement present
- hard missing access variables
- waiver-bearing variables
- expected terminal floor: `pass`, `block`, `waiver_required`, or `escalate`
- whether validator / EVM replay agrees

Acceptance target:

- no route lock from trajectory capacity alone
- no ordinary accept when unresolved ambiguity remains waived
- no claim escalation without a named matrix row
- no route lock without current wall bundle, assembly provenance, route
  spendability, and typed route assembly witness
- no route spendability without assembly provenance
- no evidence packet promoted beyond its `not_claiming` boundary

## Executable Probe

Runner:

```text
simulations/access_assembly_audit.py
```

Latest passing run:

```text
runs/access_assembly_audit_assembly_layer_final_20260609T150227Z/REPORT.md
```

Current result:

```text
pass: true
cases: 15
terminal_floor_counts:
  block: 6
  escalate: 3
  pass: 4
  waiver_required: 2
validator_replay_agrees: true
```

The probe operationalizes the access-assembly rule across offer evaluation,
funding, route commitment, claim opening, and bond action. It confirms that
trajectory-only seller memory cannot fund or route a trade, waived ambiguity
does not become ordinary acceptance, claim escalation names the matrix row, and
route lock requires wall bundle, assembly provenance, route spendability, and
typed route witness.
