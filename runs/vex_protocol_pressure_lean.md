To: Lean VEX
From: Iris
Source status: Che instruction
Authority effect requested: candidate_pressure

Goal:
Pressure-test the Marketplace Protocol Core spec for implementability,
state-machine holes, exploit paths, and places where engineering would stall.

Artifact under pressure:
/Users/che/Marketplace/protocol.html

Spec summary:
- Physical-goods protocol for buyer agents, seller agents, verifiers, arbiters,
  escrow contracts, carriers, and external trust sources.
- Lifecycle: Intent -> Match -> Reserve -> Escrow -> Evidence -> Route ->
  Inspect -> Settle.
- Objects: AgentMandate, InventoryAccessPolicy, TrustOffer, Proof, TradeRoute,
  EscrowTerms, EvidencePacket, TradeReceipt, ResolveOrClaim.
- Trust proof fields: source, issuer, subject, claim, method, signed, scope,
  freshness, signature, outcomes.
- Escrow/bond rules: release gates, inspection windows, bond coverage,
  exclusions, arbitration.
- Evidence classes: item, trust, route, settlement.
- Resolution model: promised, happened, accepted.
- API sketch: intents, inventory, proofs, candidates, trades, escrow, evidence,
  route events, receipt, resolve, packets.
- Invariants: no scalar trust collapse, no release without a gate, no hidden
  underinsurance, no route mutation, no vague bond, no missing packet.

Claim under pressure:
An engineer could build an alpha from this spec without inventing too much
unstated machinery.

Ask:
1. Find the top implementation blockers.
2. Find state transitions that are ambiguous, reversible when they should not
   be, or irreversible without enough human consent.
3. Find the obvious exploit or abuse paths: fake proof, collusion, griefing,
   hostage escrow, seller attention spam, buyer dispute abuse, verifier capture,
   route fraud, reputation gaming.
4. Identify missing API endpoints/events that would be needed for a real alpha.
5. Recommend the smallest spec additions that would reduce implementation risk.

Authority limits:
This is adversarial implementation pressure, not a code review or empirical
measurement.

Requested output:
Bulleted findings with severity, then a minimal patch list for the spec.

Stop condition:
Stop after one pass. Do not rewrite the spec.
