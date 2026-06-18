# Claude Code Rundown: Marketplace / Pokemon Alpha

> **SYNC FIRST** — every session, before working any lane:
> 1. read `SYNC.md` (the stable live coordination head — lanes, seams, handshake log);
> 2. run `git log --oneline main..@ ; git worktree list ; git branch -a` (see Codex's moves);
> 3. check `SYNC.md`'s `UNREAD-FOR` line; if it names `claude`, read the new handshake
>    entries, act, then clear the bit.
>
> Everything below is LEGACY orientation (2026-05-20). `SYNC.md` + the dated Codex
> Briefs (`Protocol_Codex_Brief_2026_06_17.md`) are current; the rest is history.

source: Codex local session
destination: Claude Code
status: active prototype
updated: 2026-05-20

## Human Summary

This project is an agentic physical-goods trade protocol, currently narrowed to
Pokemon card alpha trades. The core idea is: agents can negotiate buyer intent,
seller inventory, evidence, route risk, escrow, bonds, and settlement, while the
protocol keeps clear boundaries between what is mechanically enforced, what is
legible as signed evidence, and what still requires intelligent/human judgment.

Current north star: a buyer says what card they want; agents surface candidates;
money, terms, evidence, and seller accountability are locked before the card
moves; the buyer sees the card and only gets interrupted when there is a real
decision.

## Project Root

Workspace:

```text
/Users/che/Marketplace
```

There is currently no git repo at this root.

Active local web/API server:

```text
http://127.0.0.1:8765/index.html
http://127.0.0.1:8765/alpha-interface.html
http://127.0.0.1:8765/protocol.html
```

Server process observed on 2026-05-20:

```text
python simulations/alpha_active_server.py --port 8765
```

If needed:

```bash
lsof -nP -iTCP:8765 -sTCP:LISTEN
python3 simulations/alpha_active_server.py --port 8765
```

## Key Files

Buyer-facing and docs:

```text
/Users/che/Marketplace/index.html
/Users/che/Marketplace/alpha-interface.html
/Users/che/Marketplace/protocol.html
/Users/che/Marketplace/Marketplace_Protocol_Full_Spec.md
/Users/che/Marketplace/Protocol_Agent_API_v0.1.md
/Users/che/Marketplace/Protocol_Walls_v0.1.md
/Users/che/Marketplace/Protocol_Walls_Agent_Testbed.md
/Users/che/Marketplace/Pokemon_Card_Reference_Layer_v0.1.md
```

Local active alpha / simulation layer:

```text
/Users/che/Marketplace/simulations/alpha_active_server.py
/Users/che/Marketplace/simulations/protocol_agent_api.py
/Users/che/Marketplace/simulations/protocol_agent_api_probe.py
/Users/che/Marketplace/simulations/protocol_agent_market_sim.py
/Users/che/Marketplace/simulations/protocol_edge_case_sim.py
/Users/che/Marketplace/simulations/protocol_wall_packets.py
/Users/che/Marketplace/simulations/protocol_wall_pressure_sim.py
/Users/che/Marketplace/simulations/pokemon_card_reference_probe.py
```

Role prompts for adversarial / wall testing:

```text
/Users/che/Marketplace/agent_instructions/README.md
/Users/che/Marketplace/agent_instructions/buyer_agent.md
/Users/che/Marketplace/agent_instructions/seller_agent.md
/Users/che/Marketplace/agent_instructions/adversarial_seller_agent.md
/Users/che/Marketplace/agent_instructions/verifier_agent.md
/Users/che/Marketplace/agent_instructions/arbiter_agent.md
/Users/che/Marketplace/agent_instructions/protocol_observer_agent.md
/Users/che/Marketplace/agent_instructions/prompt_variants.md
/Users/che/Marketplace/agent_instructions/wall_runner.md
```

Foundry / Anvil harness:

```text
/Users/che/Marketplace/chain/README.md
/Users/che/Marketplace/chain/src/MarketplaceActorRegistry.sol
/Users/che/Marketplace/chain/src/MarketplaceEscrow.sol
/Users/che/Marketplace/chain/src/MarketplacePredicateVerifierStub.sol
/Users/che/Marketplace/chain/test/MarketplaceEscrow.t.sol
/Users/che/Marketplace/chain/script/protocol_e2e.py
/Users/che/Marketplace/chain/script/replay_agent_sim_trades.py
/Users/che/Marketplace/chain/script/evidence_manifest_drill.py
/Users/che/Marketplace/chain/script/evidence_manifest_v0_3_drill.py
/Users/che/Marketplace/chain/script/evidence_spendability_drill.py
/Users/che/Marketplace/chain/script/fingerprint_collision_drill.py
/Users/che/Marketplace/chain/script/spendability_gate_bypass_drill.py
/Users/che/Marketplace/chain/script/wall_bundle_route_spendability_drill.py
```

Important recent VEX/Claude copy pressure:

```text
/Users/che/Marketplace/runs/vex_buyer_landing_prompt_20260520.md
/Users/che/Marketplace/runs/vex_buyer_landing_read_20260520.md
```

## Current Website State

`index.html` was recently changed from protocol-first to buyer-first.

Current hero:

```text
Eyebrow: For buyers who know what they want
H1: You know the card. Tell your agent.
Pills: Your terms | Funded escrow | Claims on record | You decide | Seller accountable
```

The early page now has:

- "Why trades go wrong" section focused on risk, escrow, claims, and accountability.
- New `#buyer-flow` section: buyer describes the hunt, sets risk rules, holds funds, reviews the card, then decides.
- Simplified nav to avoid horizontal overflow.

VEX warning that drove the rewrite: avoid vague "safe / safer" copy. The
protocol does not verify condition or authenticity by magic. It can hold funds,
lock terms, record claims, gate spendability, and make bad trades legible.

`alpha-interface.html` is the current visual alpha:

- One main card image first.
- Color reference image nearby.
- Small evidence view selectors underneath.
- Seller attention fee flow: ask for an angled surface photo for `$5`, credited back if purchase happens.
- Active buttons call the local API in `alpha_active_server.py`.

## Active Alpha API

`simulations/alpha_active_server.py` serves static files and a tiny live API:

```text
GET  /api/alpha/trade
POST /api/alpha/actions/reset
POST /api/alpha/actions/ask-photo
POST /api/alpha/actions/seller-response
POST /api/alpha/actions/approve-shipping
POST /api/alpha/actions/accept-risk
POST /api/alpha/actions/pass
```

Current fixture:

```text
trade_id: alpha-espeon-001
card: Neo Discovery Espeon, raw, lightly played or better
price: $640 shipped
key human decision: whether to spend $5 seller attention for angled holo/surface evidence
```

Packet-shaped events include:

- `marketplace.evidence_request.v0.1`
- `marketplace.evidence_request_fee_terms.v0.1`
- `marketplace.cost_dimensional_trace.v0.1`
- `marketplace.human_availability_window.v0.1`
- `marketplace.seller_evidence_response.v0.1`
- `marketplace.agent_judgment.v0.1`
- `marketplace.evidence_spendability.v0.1`

## Protocol State

The protocol split:

Mechanically enforced:

- actor registry and role authority
- signed packet hashes
- escrow and seller bond
- packet replay protection
- arbiter and verifier registries
- arbiter replacement and emergency timeout handoff
- seller/verifier item fingerprints before inventory lock
- buyer-scoped verifier approvals
- inventory lock bound to item fingerprint
- active fingerprint and inventory collision checks
- fingerprint challenge blocks route until clearance
- route commitment requires consumed spendability hash
- route wall-bundle hash is stored before route lock
- delivery evidence before inspection opens
- claim/ruling/receipt state transitions

Legible but judgment-dependent:

- photos, scans, videos, card condition statements
- marketplace/shop/domain proof chains
- card reference packet from Pokemon catalog source
- verifier scope attestations and `not_claiming` fields
- proof vector strength
- route evidence and insurance claim packets
- agent decision traces

Judged by agents/humans/verifiers/arbiters:

- raw card condition
- authenticity
- seller trust weight
- whether evidence is enough for this buyer
- claim remedy
- whether a low-value trade can stay light

Core conceptual rule:

```text
Evidence as durable memory is not automatically spendable.
Spendability is a gate-scoped permission to use evidence at a specific action boundary.
```

## Pokemon Alpha Walls

Current alpha is intentionally narrowed to Pokemon single-card trades. The hard
acceptance profile for a raw card in the `$500-$2000` range expects packet
coverage like:

- `card_reference_packet`
- `item_fingerprint_hash`
- `inventory_lock_hash`
- `evidence_profile_id`
- `bond_scope_packet`
- `proof_vector_scope_packet`
- `route_insurance_risk_owner_packet`
- `arbiter_policy_hash`

Agent wall rule from `agent_instructions/README.md`:

```text
Every important claim must be labeled:

enforced: mechanically checked by contract or deterministic validator
legible: represented as signed/typed evidence but still judgment-dependent
judged: decided by buyer, seller, verifier, arbiter, or agent policy
```

## Chain Harness

Use:

```bash
source ~/.zshenv
cd /Users/che/Marketplace/chain
forge test -vv
```

Local EVM E2E:

```bash
source ~/.zshenv
cd /Users/che/Marketplace/chain
python3 script/protocol_e2e.py
```

Unified 250-trade wall stress plus 10-trade Anvil replay:

```bash
source ~/.zshenv
cd /Users/che/Marketplace
python3 simulations/unified_stress_runner.py --trades 250 --seed 20260520 --evm-sample 10
```

Replay 10 agent-sim trades:

```bash
source ~/.zshenv
cd /Users/che/Marketplace/chain
python3 script/replay_agent_sim_trades.py --source-run /Users/che/Marketplace/runs/agent_market_20260518T194505Z
```

Other useful drills:

```bash
python3 script/evidence_manifest_drill.py
python3 script/evidence_manifest_v0_3_drill.py
python3 script/evidence_spendability_drill.py
python3 script/fingerprint_collision_drill.py
python3 script/spendability_gate_bypass_drill.py
python3 script/wall_bundle_route_spendability_drill.py
```

Important recent reports:

```text
/Users/che/Marketplace/runs/unified_stress_20260520T173032Z/REPORT.md
/Users/che/Marketplace/runs/agent_market_evm_replay_20260520T173033Z/REPORT.md
/Users/che/Marketplace/runs/local_evm_protocol_20260520T030915Z/REPORT.md
/Users/che/Marketplace/runs/wall_bundle_route_spendability_drill_20260520T030358Z/REPORT.md
/Users/che/Marketplace/runs/spendability_gate_bypass_drill_20260519T181706Z/REPORT.md
/Users/che/Marketplace/runs/protocol_agent_api_active_alpha_check/REPORT.md
```

The unified stress report proves:

- 250 Pokemon-alpha trades ran across buyer/seller/verifier/arbiter behavior plus wall attacks
- route-ready trades require wall bundle, route spendability, inventory lock, route risk ownership, and no unaccepted waiver
- silent accepts, trust laundering, out-of-scope routing, stale wall-bundle routing, and adversarial escapes are all zero
- 10 route-ready trades replayed through Anvil and settled

The latest E2E report proves:

- happy path with insured card settles
- new seller material claim can resolve
- revoked arbiter can be replaced via timeout/emergency path
- EvidenceManifest v0.3 validates fixture bytes, subject hashes, and asset roots before anchoring
- route commitment consumes spendability
- unapproved verifier and replay cases revert
- inventory lock must bind to the committed item fingerprint

The wall-bundle drill proves:

- valid wall-bundle route spendability locks the route
- missing wall bundle is blocked before EVM route call
- stale/wrong wall bundle is blocked before EVM route call

## Current Risks / Boundaries

Do not claim:

- the protocol verifies authenticity
- the protocol verifies raw card condition
- bonded sellers are trustworthy
- agent judgment is protocol proof
- a final receipt alone resolves a dispute

Say instead:

- the protocol records claims
- the protocol locks terms and funds
- signed packets make promises legible
- deterministic validators block malformed or stale packets
- humans/agents/verifiers/arbiters still judge ambiguous evidence

Current unresolved hard problem:

```text
False-but-signed physical evidence remains a semantic problem.
The protocol can make the lie accountable, not impossible.
```

## Likely Next Targets

Good next work:

1. Harmonize `index.html`, `protocol.html`, and `Marketplace_Protocol_Full_Spec.md` around the buyer-first / no-overclaim language.
2. Connect `alpha-interface.html` more tightly to the Pokemon card reference layer and real evidence upload/mock data.
3. Turn the active alpha flow into a richer packet fixture: card reference, proof vector, bond scope, route risk owner, and arbiter policy should be visible in the UI.
4. Add tests/probes around the seller attention fee packet: refund, credit-back, partial-credit, deadline miss, and low-quality response.
5. Keep pressure-testing the hard wall: agent must not narrate around missing hard packets.

## What Claude Should Not Infer

- Do not infer this is production ready.
- Do not infer the buyer-first landing copy is final; it is a strong current direction after VEX pressure.
- Do not infer the protocol can settle authenticity or raw card condition without judgment.
- Do not infer all docs are synchronized with the latest landing-page language.
- Do not infer the UI is wired to the full protocol; `alpha-interface.html` is a live but intentionally tiny golden-path fixture.
