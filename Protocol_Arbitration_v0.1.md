# Protocol Arbitration v0.1

Generated 2026-06-12.

The judgment-supply layer. This concretizes the `JudgmentSupplyCommitment` the
audit found missing (AUD-D6-001), supplies the liveness fallback for a stuck
claim (AUD-D6-002), and defines the tier ladder, the reproducibility and
anti-gaming requirements, and the symmetric, action-gated evidence chain that
makes a dispute arbitrable in the first place.

Architectural placement: arbitration is off-chain judgment, anchored on-chain by
a commitment hash and measured by the calibration loop — the
`Protocol_Architecture_Boundary` pattern (anchor the hash, validate off-chain,
disclose, measure). The aperture's risk budget picks the tier.

## Principles

```text
1. The floor is always present. There is an agreed cheap arbiter at the bottom
   of every trade, so judgment supply is never absent and no claim ever
   deadlocks (the wave at the bottom).
2. The arbiter judges the legible record, never the physical card. It rules on
   signed evidence packets; it never renders a physical-authenticity verdict.
3. Arbitration is a tiered cost field. The buyer buys the level of judgment they
   want; escalation is staged and bounded.
4. Agreed at formation, anchored on-chain. The arbitration ladder is a mutual
   buyer+seller commitment, hashed into the trade — not imposed.
5. Reproducible is legible, but reproducible is gameable. A pinned model on
   signed inputs yields a re-runnable ruling (good), which also means it can be
   probed offline (hardening required).
6. Evidence is symmetric and action-gated. Accepting is free; disputing requires
   the buyer to enter the chain on the same terms the seller did.
7. Accountable, not impossible. The physical gaps persist; arbitration prices and
   routes them, it does not close them.
```

## The tier ladder (the cost field)

| tier | cost | what it rules / buys | calibration source |
|---|---|---|---|
| 0 — LLM floor | cents–$ | always-available, reproducible ruling on record coherence/completeness/comparison | the pinned config's track record |
| 1 — LLM panel | $–$$ | diverse models reduce correlated error (breaks single-model exploits) | panel track record |
| 2 — human arbiter | $$–$$$ | a person with an SLA and real-world authority | their settlement history |
| 3 — specialist | $$$+ | a domain expert for grail forensic/authenticity disputes | expert track record |

Escalation is **staged and bounded**: the floor rules first; either party may
escalate one tier by posting an escalation deposit; **loser-pays-or-deposit-
forfeit** so escalation deters frivolous appeals without pricing out legitimate
ones. Most disputes die at the cheap floor. The ladder and the who-pays rules are
fixed in the commitment below.

## The Judgment Supply Commitment (concretizes AUD-D6-001)

Agreed by buyer and seller at trade formation, hashed and bound on-chain (the
contract anchors the hash; it does not parse the content):

```text
schema: marketplace.judgment_supply_commitment.v0.1
jsc_id
trade_ref
floor_arbiter:
  model_id              # pinned snapshot, not a moving alias
  model_version
  sampling: temperature=0, top_p, seed   # deterministic for reproducibility
  prompt_template_hash  # the fixed instruction shape
  input_schema_ref      # which signed evidence packets are the inputs
  fallback_model_id     # if the pinned snapshot is deprecated
ladder                  # tiers 0..3 available for this trade
escalation:
  who_may_escalate
  deposit
  cost_allocation: loser_pays | escalator_deposit_forfeit
human_tiers:
  provider_refs         # arbiters with calibration history
  conflict_disclosure_ref
  fee_source
  response_sla
  remedy_cap
default_remedy_if_unresolvable   # see liveness, below
not_claiming:
  - physical_authenticity
  - that a ruling proves the card is real
signature_buyer
signature_seller
```

Liveness (resolves AUD-D6-002): a claim that cannot reach a human arbiter — the
arbiter is revoked, no replacement is proposed, the SLA lapses — **escalates to
the floor, which produces a ruling on the record.** The floor is the default
fallback. A blunt refund-to-buyer is used only if even the floor cannot rule
(missing inputs), per `default_remedy_if_unresolvable`. This is a stronger D6-002
default than a unilateral refund: a ruling, not a payout by inaction.

## What the floor arbiter rules on (scoped competence)

The floor judges the **package, not the card.** It is scoped to what an LLM does
well on a legible record:

```text
- coherence:     does the evidence package internally cohere; do the claims match
                 the packets?
- completeness:  were all agreed-profile views actually provided? (a missing
                 required view -> "evidence floor not met", NOT a merits ruling)
- consistency:   do the timestamps / nonces / custody chain hold?
- comparison:    does the returned-item evidence match the pre-committed item
                 fingerprint? (the swap test — the floor's strongest competence)
```

It is **explicitly NOT** scoped to physical authentication ("is this holo a
genuine 1996 print?"). Forensic disputes escalate to tier 2/3 by design. The
floor's low forensic ceiling is handled by scope, not by pretending.

## Reproducibility requirements

```text
- The floor model is a pinned snapshot at temperature 0 with a fixed seed and a
  hashed prompt template. The ruling is a deterministic function of (model,
  prompt, signed inputs) — re-runnable by anyone.
- The ruling packet cites model_id, prompt_template_hash, and the input packet
  hashes, so the computation is auditable: re-run and check.
- Model drift / deprecation is a real failure: the JSC names a fallback_model_id,
  and high-value commitments may pin a frozen local model.
```

Reproducibility makes the floor's ruling `legible` (recomputable from inputs)
even though it is `judged` (a model's call) — the same anchor-and-reproduce
pattern as the typed digest, applied to judgment.

## Gameability hardening (red-team)

The evidence packets are **untrusted input that becomes part of the arbiter's
prompt.** Arbitration design is as much a prompt-injection problem as a judgment
problem.

```text
- Prompt injection (the new, LLM-specific surface): a crafted condition note or
  claim narrative can carry instructions to the arbiter ("rule for the seller").
  Defenses: typed/enum packets over free prose; the arbiter treats all evidence
  text as quoted DATA, never instructions (delimited, escaped); a hardened prompt
  template; signatures so nothing is injected after commitment. Reproducibility
  helps the defender too — probe the pinned model offline to find and patch holes.
- Forensic ceiling: scope the floor away from physical authentication (above);
  escalate forensics.
- Offline probing (reproducible = probeable): defend with the panel (tier 1),
  a ROTATING POOL of floor models so the adversary does not know which model
  until formation (pinned per-trade for reproducibility, unpredictable across
  trades), and the calibration loop catching a model whose rulings stop
  correlating with outcomes.
- The structural lever: the adversary's whole job reduces to producing
  fake-but-profile-compliant evidence — exactly cost_to_fake. A richer agreed
  evidence floor (fresh nonce, corners, holo angle, cert, comparison) raises
  cost_to_fake and makes the arbiter harder to game. The floor is set by the
  buyer's aperture risk budget: "pay for less risk" = richer floor = less
  gameable arbitration.
```

## The evidence-symmetry rule

A dispute is arbitrable only because the buyer supplies the second half of the
comparison. The evidence chain is symmetric and **action-gated**:

```text
to ACCEPT ("received"): nothing. free. the inspection window times out into
  accept by inaction.
to DISPUTE: the buyer enters the chain on the seller's terms.
```

| to **sell** | to **dispute** |
|---|---|
| commit item fingerprint (nonce-bound) | fresh protocol nonce on the *received* item |
| provide the evidence profile | the received item shot against the *committed* fingerprint views |
| post a seller bond | post the buyer **dispute bond** (already in the contract) |

Buyer-side evidence required to open a claim:

```text
- a fresh protocol nonce photographed with the received card (proves the buyer
  holds THIS card now)
- the received item shot against the committed fingerprint views (the arbiter's
  comparison input — without it there is nothing to arbitrate)
- a continuous opening video from the carrier-sealed package (binds the received
  item to the delivery; ROUTES the claim — damage from a sealed box points at
  carrier/insurance, not the seller's bond)
- the claim type: fake | damaged_in_transit | not_as_described | wrong_item
```

Design rules:

```text
- Receipt != settlement. There is an inspection window between delivery and
  settlement. Dispute is available during the window, with evidence; inaction
  times out into accept. The buyer's NON-action is the accept; the buyer's
  action carries the burden.
- Reserved-judgment protection: the aperture's reserved arrival judgment makes
  the agent SURFACE the inspection decision, so a buyer never time-out-accepts a
  bad card by inattention. Without this, action-gating quietly favors sellers via
  buyer inattention.
- Proportionate and pre-agreed: the buyer-side evidence floor is tiered by value
  like the seller's profile and is set at formation (a $50 dispute cannot require
  a forensic dossier). The calibration loop watches for DETERRED LEGITIMATE
  disputes, not only frivolous ones.
- The forensic ceiling still bites: if the fake is good enough that buyer and
  seller photos look identical, the comparison passes and the card is still fake.
  Buyer-side evidence STARTS and ROUTES the dispute; the deep authenticity
  question escalates to tier 2/3. The rule makes disputes legible and bounded; it
  does not close the binding gap.
```

## The calibration market

```text
- Arbiters (LLM configs AND humans) accrue source_calibration through the
  settlement loop: appeal rate, overturn rate, acceptance rate, correlation with
  eventual outcomes.
- They compete on calibration x cost x speed. The aperture's calibration_floor
  picks the tier/provider. Calibration records are portable, like reputation.
- The calibration loop is the ultimate backstop against systematic gaming: an
  arbiter being gamed shows up as rulings that diverge from outcomes.
```

## Honesty constraints

```text
- The floor never renders a physical-authenticity verdict. Disclose the gaps the
  arbitration prices; never claim it closes them.
- The floor must be neutral — an agreed function paid by a protocol fee or the
  loser, never party-funded. Human tiers carry conflict disclosure (AUD-D6-004).
- A ruling is legible (reproducible from inputs) and judged (a model/human call);
  it is never enforced truth about the physical world.
```

## Relationship to the rest

```text
- AUD-D6-001 JSC = this commitment, anchored on-chain.
- AUD-D6-002 liveness = the floor is the default fallback; a stuck claim escalates
  to a ruling, not a refund. (Updates the Lane-1 contract brief recommendation.)
- The aperture risk budget picks the tier and sets the evidence floor.
- The legibility vector's source_calibration measures arbiter quality; cost_to_fake
  sets gameability.
- The custody ledger's claim-path leg renders this evidence chain.
```

## Open questions

```text
- default_remedy_if_unresolvable when even the floor cannot rule: refund, split,
  or hold pending physical return?
- Who runs and pays the floor inference; reproducibility lets anyone re-run and
  check, so trust is in the recomputation, not the runner.
- Rotating-pool granularity vs per-trade reproducibility.
- Calibrating the buyer-side evidence floor so legitimate disputes are not
  deterred (the hardest measurement — absence of a dispute is silent).
```
