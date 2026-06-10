# Marketplace Chain Harness

Local Foundry/Anvil harness for testing the Marketplace protocol core.

The rule of thumb is simple: keep rich marketplace facts off-chain, anchor the costly state transitions on-chain.

On-chain:

- actor registry with buyer, seller, verifier, and arbiter roles
- verifier, arbiter, and predicate-verifier authority records
- EIP-191 packet-signature verification for registered controller addresses
- signed packet gates for intent, terms, proofs, evidence, routes, claims, rulings, receipts, and cancellation reasons
- per-trade packet hash replay protection
- two-party arbiter replacement plus timeout-gated emergency handoff when the current arbiter is inactive
- signed delivery evidence before the inspection window opens
- buyer route-timeout claims when a seller commits a route and then stalls
- seller- or verifier-signed item fingerprints before inventory can be reserved
- buyer-scoped verifier approval before a verifier can commit a trade fingerprint
- buyer-scoped verifier scope approvals before verifier attestations can be anchored
- verifier attestation commits bound to a subject hash, scope-set hash, and method-id hash
- seller-signed inventory locks bound to the committed item fingerprint before a route can be committed
- buyer-opened fingerprint challenges that block route commitment until buyer clearance
- attestation-bound fingerprint challenge clearance for verifier-cured evidence
- route commitment requires and consumes a spendability packet hash and stores a route wall-bundle hash before the route can lock
- active item-fingerprint collision checks to block one unique item identity from backing two open trades
- active inventory-lock collision checks to block one unique item from backing two open trades
- escrowed native ETH
- seller bond
- optional buyer dispute bond
- intent, terms, proof, evidence, route, claim, ruling, and receipt hashes
- delivery, inspection, acceptance, claim, resolution, and settlement events

Off-chain:

- cost-field objects
- private predicate proofs for selective disclosure
- circuit profiles and verifying-key hashes reserved for later ZK verifiers
- photos, scans, videos, memos, tracking pages, marketplace proof chains
- verifier scope attestations that say what was checked, what was excluded, and how the claim should be displayed
- agent decision traces
- claim packets and arbitration narratives

## Commands

Run the contract tests:

```bash
source ~/.zshenv
cd /Users/che/Marketplace/chain
forge test -vv
```

Run the protocol end-to-end probe:

```bash
source ~/.zshenv
cd /Users/che/Marketplace/chain
python3 script/protocol_e2e.py
```

Replay 10 varied agent-simulation trades through the local EVM runner:

```bash
source ~/.zshenv
cd /Users/che/Marketplace/chain
python3 script/replay_agent_sim_trades.py --source-run /Users/che/Marketplace/runs/agent_market_20260518T194505Z
```

Run the semantic fingerprint collision drill:

```bash
source ~/.zshenv
cd /Users/che/Marketplace/chain
python3 script/fingerprint_collision_drill.py
```

Run the off-chain evidence-manifest falsifier drill:

```bash
source ~/.zshenv
cd /Users/che/Marketplace/chain
python3 script/evidence_manifest_drill.py
```

Run the off-chain evidence-spendability gate drill:

```bash
source ~/.zshenv
cd /Users/che/Marketplace/chain
python3 script/evidence_spendability_drill.py
```

Run the EvidenceManifest v0.3 falsifier drill used by the E2E path:

```bash
source ~/.zshenv
cd /Users/che/Marketplace/chain
python3 script/evidence_manifest_v0_3_drill.py
```

Run the route spendability gate regression drill:

```bash
source ~/.zshenv
cd /Users/che/Marketplace/chain
python3 script/spendability_gate_bypass_drill.py
```

The E2E probe starts Anvil, deploys `MarketplaceActorRegistry`,
`MarketplacePredicateVerifierStub`, and `MarketplaceEscrow`, creates off-chain
protocol packets, signs them with actor controller keys, verifies those
signatures through the registry, anchors packet hashes in the contract, settles
a clean trade, resolves a new-seller claim, and writes a report under
`/Users/che/Marketplace/runs/local_evm_protocol_*`. It also proves that replayed
evidence is rejected, that item and claim evidence can enter as validated
`marketplace.evidence_manifest.v0.3` packets, that route commitment consumes a
cited spendability hash and stores a route wall-bundle hash on-chain, and runs a
revoked-arbiter replacement scenario where a one-sided proposal can advance only
after timeout and replacement-arbiter acceptance.

The agent-simulation replay starts the same local stack, selects a deliberately
varied 10-trade subset from the 250-trade simulation, creates fresh signed
packets for each selected trade, anchors those packets in escrow, and writes a
report under `/Users/che/Marketplace/runs/agent_market_evm_replay_*`. It proves
the current money rail can settle clean closes, automated rulings, automated
escalations, delegated arbiter-agent rulings, high-value claims, local handoff
disputes, authenticity flags, underinsurance scenarios, route-timeout claims
for nonship or route-loss cases before an inspection window exists, and active
item-fingerprint and inventory-lock collision checks. Inventory locks are now
signed against the committed item fingerprint, buyer-opened fingerprint
challenges block route commitment until cleared, verifier fingerprint commits
require buyer approval for that trade, and verifier notes now anchor only through
scoped attestation commits. The remaining fraud surface is no longer the seller
freezing the route forever, reserving inventory without an object identity,
detaching the inventory lock from the fingerprint, letting any global verifier
stamp any trade, or reusing the same lock across two active trades; it is false
seller-signed delivery evidence and fake content inside signed evidence packets.

The fingerprint collision drill starts the same local stack and writes a report
under `/Users/che/Marketplace/runs/fingerprint_collision_drill_*`. It separates
hash enforcement from semantic judgment: the exact same active fingerprint hash
is rejected by escrow, while same-cert reuse, stale prior-market photos,
front/back mismatch, same-front/different-back, and same-card crop aliases are
flagged by an off-chain detector and converted into buyer-signed
`FingerprintChallenge` packets that block route commitment. The hardened path
accepts a fresh nonce cure only after a verifier commits an attestation bound to
the active challenge and the buyer signs an attestation-bound resolution. Stale
evidence is rejected, mixed front/back evidence escalates, and a fresh nonce
control still routes, so the drill does not turn every card into a high-friction
case.

The evidence-manifest drill is intentionally off-chain and writes a report under
`/Users/che/Marketplace/runs/evidence_manifest_drill_*`. It validates
`marketplace.evidence_manifest.v0.2` packets before Solidity is involved:
canonical manifest hashes, deterministic asset roots, subject hashes, issuer
role authority, evidence tier requirements, and fetched byte hashes. It accepts a
clean content-hashed front/back packet, then proves byte-switch and mutable-URL
switch attacks fail without needing to touch escrow.

The evidence-spendability drill is also off-chain and writes a report under
`/Users/che/Marketplace/runs/evidence_spendability_drill_*`. It tests the
permission layer above durable memory: a valid manifest does not buy route by
itself, the same manifest can be silent on the forward leg and spendable on the
return leg, wrong-authority gate spends fail, revoked spendability fails, and
single-use spends cannot double spend.

The EvidenceManifest v0.3 drill writes a report under
`/Users/che/Marketplace/runs/evidence_manifest_v0_3_drill_*`. It targets the
same manifest validator used by `protocol_e2e.py`, proving byte-switch,
asset-root, subject-hash, issuer-role, tier-inflation, claim-retention, and
mutable-primary failures on the current v0.3 path.

The spendability gate bypass drill writes a report under
`/Users/che/Marketplace/runs/spendability_gate_bypass_drill_*`. Its expected
outcome has flipped: the old no-spendability `commitRoute` ABI now reverts and
the trade remains in `EvidencePending`.

The privacy hook is intentionally staged:

- Today: `PrivatePredicateProof` is a signed attestation that a threshold fact is true.
- On-chain alpha: escrow accepts predicate evidence only through a registry-approved verifier contract.
- Local harness: `MarketplacePredicateVerifierStub` proves the hook without pretending to be a real circuit.
- Later: the same packet can carry production `circuit_id`, `verifying_key_hash`, `public_inputs`, and `proof_bytes`.

Fingerprint hardening is tracked in
`/Users/che/Marketplace/runs/item_fingerprint_hardening_spec_20260519T155705Z.md`.
The enforcement-gate pass is tracked in
`/Users/che/Marketplace/runs/enforcement_gates_20260519T161315Z.md`. Verifier
scope attestation semantics are tracked in
`/Users/che/Marketplace/runs/verifier_scope_semantics_20260519T162044Z.md`.
Scoped attestation packet generation and hash anchoring landed in
`/Users/che/Marketplace/runs/local_evm_protocol_20260519T170803Z/REPORT.md`
and the 10-trade replay at
`/Users/che/Marketplace/runs/agent_market_evm_replay_20260519T170812Z/REPORT.md`.
Semantic collision drills and verifier-signed challenge satisfaction landed in
`/Users/che/Marketplace/runs/fingerprint_collision_drill_20260519T170753Z/REPORT.md`.
Evidence category v0.2 is tracked in
`/Users/che/Marketplace/runs/evidence_category_change_spec_v0.2_20260519T172537Z.md`.
The spendability rework is tracked in
`/Users/che/Marketplace/runs/evidence_category_spendability_spec_v0.3_20260519T173853Z.md`.
The off-chain evidence validator drill has now been promoted into the E2E route
and claim paths as local EVM `EvidenceManifest v0.3` packets, landing in
`/Users/che/Marketplace/runs/local_evm_protocol_20260519T175831Z/REPORT.md`.
Standalone v0.3 falsifier coverage landed in
`/Users/che/Marketplace/runs/evidence_manifest_v0_3_drill_20260519T180645Z/REPORT.md`.
Fingerprint-runner promotion still remains before any `evidenceManifestHash`
Solidity helper is added.
The spendability-gate drill now proves valid evidence is durable memory, not
automatic permission: route, skipped challenge, return-leg claim support, wrong
actor, revocation, and single-use consumption. Spendability packets now point at
manifest packet hashes and manifest subject hashes in the E2E route, challenge,
claim, and arbiter bond-action flows. The route spendability and wall-bundle
anchor landed in
`/Users/che/Marketplace/runs/local_evm_protocol_20260520T030915Z/REPORT.md`;
the old bypass now fails in
`/Users/che/Marketplace/runs/spendability_gate_bypass_drill_20260519T181706Z/REPORT.md`.

Run a local Ethereum node:

```bash
source ~/.zshenv
anvil --chain-id 31337
```

Quick RPC check from another terminal:

```bash
source ~/.zshenv
cast chain-id --rpc-url http://127.0.0.1:8545
```

The first contracts are intentionally small. `MarketplaceActorRegistry` proves
actor authority and signed packet provenance. `MarketplaceEscrow` proves the
money, bond, gate, and settlement mechanics.
