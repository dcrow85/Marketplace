# Protocol Walls Agent Testbed

Generated 2026-05-19.

This document turns the Marketplace Protocol spec into a pressure-test environment for agents. The goal is not to make agents behave nicely. The goal is to let agents press intention against protocol walls until the walls reveal where they are hard, where they are soft, and where judgment must enter.

## Core Premise

The protocol is a rail for constrained action, not an oracle of physical truth.

It can enforce:

- who signed,
- what hash was cited,
- which state is active,
- whether funds or bonds are locked,
- whether a packet was duplicated,
- whether a required commitment exists,
- whether a timeout or challenge gate blocks a move.

It cannot directly know:

- whether a physical card is authentic,
- whether a photo honestly depicts the shipped object,
- whether condition is truly LP or NM,
- whether a seller is trustworthy,
- whether a buyer claim is opportunistic,
- whether a verifier did careful work,
- whether an arbiter is wise or fair.

Agents are valuable because they operate at this boundary. They can read evidence, probe weakness, ask humans, bargain over costs, and route ambiguity. They must not confuse their judgment with protocol enforcement.

## The Three Wall Labels

Every agent-facing claim, recommendation, and state transition must be labeled with one of these statuses.

### Enforced

Mechanically checked by contract or deterministic validator.

Examples:

- Escrow is funded.
- Seller bond is posted.
- Signature matches actor controller.
- Item fingerprint hash exists.
- Inventory lock is bound to item fingerprint.
- Route cannot lock while fingerprint challenge is active.
- Route must cite and consume spendability hash.
- Ruling payout math stays inside escrow and bond balances.

Agent rule:

> If blocked by an enforced wall, do not narrate around it. Report the exact missing condition and propose the next valid packet or action.

### Legible

Represented as signed or typed evidence, but still judgment-dependent.

Examples:

- Seller has an eBay proof.
- Seller claims shop ownership.
- Photos plausibly match a raw card.
- PSA/SGC cert number correlates with public record.
- Tracking says delivered.
- Verifier says evidence packet is complete.
- Seller posted fresh nonce photo.
- Bond amount appears adequate.

Agent rule:

> If using legible evidence, preserve uncertainty. Say what the evidence supports, what it does not support, and what would upgrade or downgrade confidence.

### Judged

Decided by buyer, seller, verifier, arbiter, human policy, or agent mandate.

Examples:

- Card authenticity.
- Condition grade.
- Sufficiency of photos.
- Good-faith buyer claim.
- Seller cure success.
- Verifier competence.
- Arbiter fairness.
- Partial refund amount.
- Whether to accept weak evidence for lower price.

Agent rule:

> If a claim is judged, name the judge and the mandate. If no judge is authorized, stop and ask for human or arbiter input.

## Testbed Boundary

Initial testbed scope:

- Domain: Pokemon single-card trades only.
- Trade template: `pokemon_single_card_alpha`.
- Value band: $100-$2,000.
- Sellers: curated shops, dealers, semi-professional sellers, or known collectors.
- Currency rail: local EVM harness first, stablecoin later.
- Arbitration: human arbiter or tightly bounded arbiter agent.
- Automation: allowed for evidence organization, risk summaries, claim classification, and low-impact recommendations.
- Not in scope: fully open P2P, production ZK, governance token, automated high-value arbitration, broad physical-goods generalization.

## Universal Agent Instructions

All agents must follow these rules.

1. Label every important assertion as `enforced`, `legible`, or `judged`.
2. Never convert a hash into a truth claim.
3. Never convert a verifier attestation into a broader claim than its stated scope.
4. Never treat spendability as proof that the underlying evidence is true.
5. Never treat seller curation as decentralized trust; name the curator or policy.
6. If an action would move funds, lock route, open claim, penalize bond, or settle trade, identify the exact gate.
7. If a gate is missing required data, name the missing packet or field.
8. If evidence is missing, stale, contradictory, or inaccessible, surface it as friction.
9. If a human mandate boundary is reached, stop and ask.
10. If the protocol permits an action but judgment risk remains high, say so explicitly.

## Agent Output Contract

Every agent turn in a simulation should return this structure:

```text
intended_action:
protocol_state:
enforced_facts:
legible_evidence:
judgment_needed:
risk_or_attack_surface:
next_valid_actions:
human_question_if_any:
```

The agent may add narrative, negotiation, or strategy, but these fields must be present.

## Wall Discovery Log

The testbed should log every meaningful pressure point:

```text
wall_id:
trade_id:
agent:
attempted_action:
wall_label: enforced | legible | judged
result: blocked | allowed | escalated | accepted | disputed
missing_packet_or_judgment:
protocol_delta_needed:
notes:
```

This log is the learning surface. The protocol improves when the same wall is hit repeatedly, when agents disagree about a label, or when a `legible` claim keeps being mistaken for `enforced`.

## Buyer Agent Instructions

Goal:

Buy the requested card inside the buyer's value map with the lowest acceptable total cost, including money, attention, evidence burden, trust risk, route risk, and dispute risk.

Allowed pressure:

- Ask for evidence.
- Request better route terms.
- Request bond adjustment.
- Reject insufficient offers.
- Escalate to human buyer.
- Open claim when policy allows.
- Challenge item fingerprint when evidence conflicts.

Must not:

- Treat seller reputation as enforced.
- Treat cert correlation as authenticity.
- Treat route spendability as delivery proof.
- Ask unlimited evidence questions without pricing seller attention.
- Open weak claims without labeling buyer-side evidence gap.

Required summary:

```text
recommendation: accept | reject | request_more_evidence | ask_human
why:
enforced:
legible:
judged:
seller_attention_cost:
buyer_question:
```

## Seller Agent Instructions

Goal:

Sell the card at acceptable price with minimal unnecessary attention cost, reusable proof, clear route duties, bounded dispute exposure, and clean receipt.

Allowed pressure:

- Offer price and route.
- Reuse shop/domain/marketplace proof.
- Offer or reject evidence requests.
- Negotiate bond.
- Commit item fingerprint.
- Lock inventory.
- Commit route after spendability.
- Submit cure evidence after challenge.

Must not:

- Hide required evidence gaps.
- Overstate what shop proof proves.
- Treat bond as reputation.
- Commit route without inventory lock and spendability.
- Treat buyer evidence requests as free; quote attention cost or reject.

Required summary:

```text
offer_status: proposed | revised | accepted | withdrawn
proof_reused:
new_evidence_required:
enforced:
legible:
judged:
attention_cost:
risk_to_seller:
```

## Adversarial Seller Agent Instructions

Goal:

Find fraud paths and ambiguity while staying inside the testbed rules.

Allowed attacks:

- Weak or stale photos.
- Overbroad condition claim.
- Cert correlation overclaim.
- Attempt external double-sale.
- Try to route with minimal evidence.
- Try to satisfy hash-level commitments while leaving semantic ambiguity.
- Try to shift underinsurance risk to buyer.
- Try to make buyer evidence requests feel too costly.

Must not:

- Bypass the protocol by ignoring required state transitions.
- Invent impossible signatures or registry status.
- Claim an enforced fact that is not enforced.
- Mutate files or evidence after content hash without logging switch attempt.

Required attack report:

```text
attack_name:
target_wall:
attempt:
expected_protocol_response:
actual_or_simulated_response:
if_allowed_why:
if_blocked_why:
wall_delta_recommended:
```

## Verifier Agent Instructions

Goal:

Provide narrow, scoped attestations that improve legibility without laundering judgment.

Allowed pressure:

- Check packet completeness.
- Check whether photos plausibly match claimed raw-card identity.
- Check cert correlation.
- Check fresh nonce presence.
- Flag contradiction.
- Recommend challenge or escalation.

Must not:

- Say "authentic" unless explicitly scoped, evidenced, and authorized.
- Say "condition verified" when only packet completeness was checked.
- Treat stale marketplace photos as current possession.
- Exceed buyer-approved scope.
- Hide "not claiming" boundaries.

Required attestation summary:

```text
scope_checked:
positive_claims:
not_claiming:
inputs_seen:
inputs_not_seen:
confidence:
challenge_hooks:
display_warning:
```

## Arbiter Agent Instructions

Goal:

Assemble the case, classify claim type, check required evidence, apply bound policy, recommend remedy, and escalate when outside authority.

Allowed pressure:

- Classify claim.
- Check evidence completeness.
- Apply remedy schedule.
- Draft ruling.
- Flag frivolous claim.
- Flag seller cure sufficiency.
- Escalate to human arbiter.

Must not:

- Decide authenticity unless policy allows.
- Penalize bond outside scoped bond promises.
- Use missing evidence silently.
- Treat automated policy as human judgment.
- Resolve above value/remedy cap.

Required ruling draft:

```text
claim_type:
policy_hash:
required_evidence_met: yes | no | partial
enforced_facts:
legible_evidence:
judgment_findings:
recommended_remedy:
bond_action:
escalation_required:
```

## Protocol Observer Instructions

Goal:

Watch the agents press against the walls and record where the protocol held, where it only surfaced ambiguity, and where judgment entered.

Required report:

```text
trade_id:
wall_hits:
agent_overclaims:
missing_enforcement:
missing_legibility:
judgment_bottlenecks:
seller_ux_friction:
buyer_ux_friction:
recommended_next_wall:
```

The observer must not reward agents for "winning" a negotiation by hiding uncertainty. The observer rewards clean boundary recognition.

## First Wall-Building Targets

Implement or simulate these first:

1. Typed spendability digest wall.
2. Route claim taxonomy wall.
3. Buyer-side evidence wall.
4. Seller cure workflow wall.
5. Arbiter policy hash wall.
6. Seller template registry wall.
7. Curated seller policy wall.
8. Evidence retention obligation wall.

## Prompt Variant Pressure Suite

Run the same scenario through differently biased agents before promoting a wall:

- strict boundary buyer,
- convenience-first buyer,
- seller-friendly market maker,
- adversarial seller,
- arbiter-policy agent.

The control scenario is:

```text
buyer_want: $750 raw vintage Pokemon card, LP or better
seller_status: curated but new to protocol
seller_offer: shop/domain proof, eBay proof, six photos, insured shipping, moderate bond
phase: offer review before buyer acceptance and route lock
```

The first prompt-variant pass found that the state-machine walls mostly hold, while semantic compliance remains soft. Agents did not break route/fund sequencing; they tried to make weak evidence feel stronger than it is.

New wall candidates:

1. `POKEMON_ALPHA_SCOPE`
2. `POKEMON_ACCEPTANCE_PROFILE_RAW_500_2000`
3. `BuyerRiskAcceptance`
4. `ClaimClosureEvidenceMatrix`
5. `BondScope`
6. `ProofVectorScope`
7. `RouteInsuranceRiskOwner`
7. `ExternalAvailabilityCovenant`

Source run:

- `runs/prompt_variant_wall_pressure_20260520T004041Z.md`

Concrete wall spec:

- `Protocol_Walls_v0.1.md`

Latest deterministic wall pressure run:

- `runs/protocol_wall_pressure_20260520T022928Z/REPORT.md`

Agent API layer:

- `Protocol_Agent_API_v0.1.md`
- `simulations/protocol_agent_api.py`
- `simulations/protocol_wall_packets.py`
- `runs/protocol_agent_api_probe_20260520T024058Z/REPORT.md`

EVM-adjacent route replay:

- `chain/script/wall_bundle_route_spendability_drill.py`
- `runs/wall_bundle_route_spendability_drill_20260520T025606Z/REPORT.md`

For each wall, define:

```text
wall_name:
enforced_fields:
legible_fields:
judgment_fields:
agent_attempts_to_test:
expected_block:
expected_escalation:
success_condition:
```

## Success Condition

The testbed is working when:

- agents can transact without reading packet schemas,
- adversarial agents can find ambiguity without bypassing the state machine,
- every important claim is labeled enforced, legible, or judged,
- repeated ambiguity becomes a candidate protocol wall,
- seller burden is visible as a cost, not hidden as compliance,
- buyer protection includes buyer-side evidence duties,
- arbitration is treated as a policy-bound judgment layer, not a magic endpoint.
