To: VEX
From: Iris
Source status: Che instruction
Authority effect requested: candidate_pressure

Goal:
Pressure-test the Marketplace Protocol Core spec for authority risk, overclaim,
hidden assumptions, and missing distinctions.

Artifact under pressure:
/Users/che/Marketplace/protocol.html

Spec summary:
- The public narrative was split from a technical page named "Marketplace Protocol Core".
- It defines a protocol for agent-mediated physical goods trades.
- Core promise: intent, inventory, trust, evidence, route risk, escrow,
  settlement, and reputation remain typed instead of collapsed into price or a
  universal trust score.
- Scope: buyer agents, seller agents, verifiers, arbiters, escrow contracts,
  carriers, and external trust sources. It claims not to require one
  marketplace, database, agent, chain, or trust score.
- Lifecycle: Intent -> Match -> Reserve -> Escrow -> Evidence -> Route ->
  Inspect -> Settle.
- Actors: buyer, buyer agent, seller, seller agent, verifier, escrow contract,
  arbiter, attester.
- Objects: AgentMandate, InventoryAccessPolicy, TrustOffer, Proof, TradeRoute,
  EscrowTerms, EvidencePacket, TradeReceipt, ResolveOrClaim.
- Trust model: sellers can attach arbitrary proof chains; each proof preserves
  source, issuer, subject, claim, method, freshness, scope, and outcomes. Buyer
  agents weight proofs from the buyer aperture. Outcomes harden or decay future
  authority.
- Escrow/bond: funds and seller bond lock behind typed release gates, covered
  promises, exclusions, timeouts, and dispute paths.
- Evidence classes: item evidence, trust evidence, route evidence, settlement
  evidence.
- Resolution model: promised, happened, accepted.
- Alpha API: POST /intents, /inventory, /proofs, /candidates, /trades,
  /trades/{id}/escrow, /evidence, /route-events, /receipt, /resolve, and
  GET /trades/{id}/packet/{purpose}.
- Invariants: no scalar trust collapse, no release without a gate, no hidden
  underinsurance, no route mutation, no vague bond, no missing packet.

Claim under pressure:
This is a coherent enough core spec for a builder to start prototyping an
agent-neutral physical-goods protocol.

Tempting overclaim:
Because every proof and outcome is typed, the protocol may appear to solve trust
portability, disputes, and agent-mediated escrow more cleanly than it actually
does.

Ask:
1. Name the strongest parts of the spec without flattering it.
2. Name the authority risks: where the spec may launder judgment into protocol
   fact, borrow platform reputation too aggressively, or overstate what agents
   can infer.
3. Name missing distinctions that must be added before the spec can be called
   protocol-complete.
4. Identify the most dangerous hidden assumption.
5. Give a guarded recommendation: continue, narrow, rewrite, or split.

Authority limits:
Do not claim local measurement. Treat this as adversarial synthesis, not
grounded verification. If you need exact file facts, request a grounded pass.

Requested output:
Concise findings with severity labels, then a short "what to change next" list.

Stop condition:
Stop after one pass. Do not rewrite the spec.
