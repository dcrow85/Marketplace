# Claude Code Fable 5 Protocol Rundown

This workspace is `/Users/che/Marketplace`. The project is an agentic marketplace
protocol, currently narrowed to Pokemon No Rarity card trades as the alpha lab.

## Current Shape

The core idea is not "the protocol proves everything." The protocol enforces
only what it can bind: actor roles, signatures, escrow state, hashes, route
lock gates, spendability, wall bundles, assembly history, bonds, claims, and
receipts. Agents and humans handle judgment: authenticity, condition, pricing,
seller trust, verifier quality, and whether ambiguous evidence is good enough.

The strongest current wall is:

> Spendability is inherited through assembly, not inferred from appearance.

Practically: a catalog row, reference image, slab label, tracking page, or API
receipt can make a claim legible, but it is not spendable unless the right
assembly history authorizes it at the right gate.

The newest hardening frame adds three adjacent walls:

- deterministic tool output is legible logic, not protocol authority;
- accountability must be priced so fraud is not positive expected value;
- verifier and arbiter judgment must be supplied by a scoped, available provider, not merely assumed from a registry entry.

The newest boundary artifact is `Protocol_Gaps_v0.1.md`. It names the permanent
physical/digital gaps: bytes are not atoms, cameras are not neutral, custody is
a process, keys are not people, meaning is not a hash, and ledger remedies do
not retrieve the card. These are not defects to hide; they are open crossings
the protocol must make attributable.

The newest measurement artifact is `Protocol_Legibility_v0.1.md`. It defines
legibility vectors: coverage, independence, continuity, scope fit, cost-to-fake,
and source calibration. The important rule is that vectors must not become
scores; any recommendation derived from them is judged policy, not enforcement.

The newest bootstrap artifact is `Protocol_Bootstrap_v0.1.md`. It reframes the
alpha wedge as seller-first: funded buyers only, priced seller attention,
claims bound to item fingerprints, digital escrow as the gap-free money object,
and bonds as reputation a seller can post before protocol history exists.

The newest trust-import artifact is `Protocol_Trust_Import_v0.1.md`. It makes
outside reputation observable but not bindable: current eBay/shop/domain control
is useful contact evidence, not ownership of account history or proof of a
card. Imported bond relief is capped by acquisition cost, value-tier scope,
source fragility, continuity seams, and decay toward native protocol receipts.

The newest catalog-lineage artifact is `Protocol_Catalog_Lineage_v0.1.md`. It
pins the No Rarity catalog as content-addressed bytes: card references cite
`(catalog_hash, row_id)`, evidence defaults live in a separate policy artifact,
and agent-authored catalog revisions harden or fail through evidence-weighted
challenge rather than agent-count voting.

## Read First

- `CLAUDE.md` - broad local project guidance and prior handoff context.
- `Marketplace_Protocol_Full_Spec.md` - full protocol spec, now the main prose source.
- `Marketplace_Access_Assembly_Note.md` - assembly/provenance framing.
- `Protocol_Agent_API_v0.1.md` - agent-facing API shape.
- `Protocol_Walls_v0.1.md` - enforced/legible/judgment-needed/missing wall model.
- `Protocol_Gaps_v0.1.md` - permanent physical/digital gap taxonomy.
- `Protocol_Legibility_v0.1.md` - vector-shaped evidence measurement and calibration loop.
- `Protocol_Bootstrap_v0.1.md` - seller-first bootstrap, settlement rails, and bond/history exchange.
- `Protocol_Trust_Import_v0.1.md` - external reputation import, acquisition-cost cap, and value-tier scope.
- `Protocol_Catalog_Lineage_v0.1.md` - content-addressed catalog citations, revision packets, and row challenges.
- `Protocol_Walls_Agent_Testbed.md` - agent pressure-test framing.

## On-Chain Implementation

- `chain/README.md` - Foundry/Anvil overview.
- `chain/src/MarketplaceEscrow.sol` - escrow state machine and route lock wall.
- `chain/src/MarketplaceActorRegistry.sol` - actor roles and registry.
- `chain/src/MarketplacePredicateVerifierStub.sol` - stub verifier contract.
- `chain/test/MarketplaceEscrow.t.sol` - Forge tests.
- `chain/foundry.toml` - Foundry config.

Important current on-chain concept: route lock requires route spendability,
wall bundle, assembly history, and a contract-derived route assembly witness.

## On-Chain / Protocol Drills

- `chain/script/protocol_e2e.py` - local EVM end-to-end runner.
- `chain/script/replay_agent_sim_trades.py` - replay selected simulated trades through EVM.
- `chain/script/wall_bundle_route_spendability_drill.py` - route lock wall bundle drill.
- `chain/script/protocol_gap_negative_drill.py` - compliant-fraud negative drill for permanent gaps.
- `chain/script/fingerprint_collision_drill.py` - item fingerprint collision drill.
- `chain/script/evidence_manifest_drill.py` - evidence manifest validator drill.
- `chain/script/evidence_manifest_v0_3_drill.py` - later manifest/spendability drill.
- `chain/script/evidence_spendability_drill.py` - spendability packet drill.
- `chain/script/spendability_gate_bypass_drill.py` - bypass attempt drill.
- `chain/script/alpha_route_commit.py` - route/delivery/inspection flow.
- `simulations/legibility_calibration_drill.py` - vector calibration drill and score-laundering blocker.
- `simulations/seller_bootstrap_drill.py` - seller-first bootstrap drill for funded escrow, attention fees, settlement caveats, and bond/history exchange.
- `simulations/external_trust_import_drill.py` - external reputation import drill for bought accounts, tier mismatch, correlated sources, source fragility, and exit-scam EV.
- `simulations/catalog_evolution_drill.py` - catalog lineage drill for content hashes, fact/policy split, sybil-noise rejection, and poisoned-row challenges.

## Agent Protocol Layer

- `agent_skills/marketplace-protocol/SKILL.md` - portable protocol skill for agents.
- `agent_skills/marketplace-protocol/references/protocol-boundaries.md` - what protocol can and cannot enforce.
- `agent_skills/marketplace-protocol/references/agent-actions.md` - agent action vocabulary.
- `agent_skills/marketplace-protocol/references/test-prompts.md` - prompts for adversarial/role tests.
- `agent_skills/marketplace-protocol/references/no-rarity-tooling.md` - how agents use the No Rarity tools.
- `agent_instructions/` - role prompts for buyer, seller, verifier, arbiter, observer, adversarial seller, wall runner.

## No Rarity Catalog / Alpha Lab

- `data/no-rarity-base-set.json` - 102-row local catalog: strict 96 booster targets plus 6 Energy caveats.
- `data/no-rarity-catalog-manifest.json` - pinned release manifest with catalog hash, policy hash, bundle hash, and row citation shape.
- `data/no-rarity-catalog-policy.json` - evidence policy defaults split out of the fact catalog.
- `No_Rarity_Set_Research.md` - historical and collector research.
- `Pokemon_Card_Reference_Layer_v0.1.md` - reference-image/catalog layer design.
- `datasets/no-rarity-lab/README.md` - training/data lab notes.
- `scripts/build_no_rarity_database.py` - database build script.
- `scripts/collect_no_rarity_data_foundry.py` - data collection/founding script.

The catalog is agent-readable substrate. It is not an authentication authority.

## No Rarity Agent Tools

- `agent_tools/no_rarity_catalog_tools.py` - deterministic catalog/search/gate/evidence logic.
- `agent_tools/no_rarity_agent_cli.py` - CLI wrapper.
- `mcp/no_rarity_catalog_server.py` - MCP server for agents.
- `agent_tests/no_rarity_catalog_probe.py` - smoke/regression probe.
- `simulations/no_rarity_trader_tournament.py` - six-trader deterministic pressure test.

Recent hardening: exact rarity search, safer stance inference, named-card
extraction from chatty text, structured missing-card responses, and unchecked
`NR-D` slab/cert claims requiring a slab packet rather than passing by label.
Newer hardening: catalog results now carry `catalog_citation`, and the CLI/MCP
tool `catalog_release` exposes the pinned release metadata.

## Simulation / Stress Runners

- `simulations/protocol_agent_api.py` - API surface simulation.
- `simulations/protocol_agent_api_probe.py` - API probe.
- `simulations/protocol_wall_packets.py` - wall packet helpers.
- `simulations/protocol_wall_pressure_sim.py` - wall pressure tests.
- `simulations/access_assembly_audit.py` - access/assembly audit.
- `simulations/unified_stress_runner.py` - unified stress runner.
- `simulations/protocol_agent_market_sim.py` - agent market simulation.
- `simulations/protocol_edge_case_sim.py` - edge-case simulation.
- `scripts/qwen_e2e_transaction_sim.py` - Qwen E2E transaction simulation.
- `scripts/qwen_adversarial_tournament.py` - Qwen adversarial tournament.
- `scripts/qwen_no_rarity_collector_sim.py` - Qwen No Rarity collector sim.

## Recent Reports Worth Reading

- `runs/no_rarity_trader_tournament_20260609T164836Z/REPORT.md` - latest six-trader catalog pressure test, passed 16/16.
- `runs/wall_bundle_route_spendability_drill_20260609T155310Z/REPORT.md` - latest route lock wall drill.
- `runs/fingerprint_collision_drill_20260609T155311Z/REPORT.md` - latest fingerprint collision drill.
- `runs/agent_market_evm_replay_20260609T155316Z/REPORT.md` - latest EVM replay of selected agent trades.
- `runs/local_evm_protocol_20260609T155326Z/REPORT.md` - latest local EVM protocol report.
- `runs/protocol_agent_api_probe_route_assembly_witness_20260609T1555/REPORT.md` - route assembly witness API probe.
- `runs/access_assembly_audit_route_assembly_witness_20260609T1555/REPORT.md` - access/assembly audit after route witness.
- `runs/protocol_gap_negative_drill_20260610T163241Z/REPORT.md` - compliant-fraud negative drill for permanent gaps, passed with both trades settled.
- `runs/legibility_calibration_drill_20260610T165813Z/REPORT.md` - calibration drill for vector-shaped evidence measurement, passed with score-laundering blocked and a deliberately miscalibrated cohort detected.
- `runs/seller_bootstrap_drill_20260610T165439Z/REPORT.md` - seller-first bootstrap drill, passed with settlement and bond overclaims blocked.
- `runs/external_trust_import_drill_20260610T172113Z/REPORT.md` - external trust import drill, passed with bought-account, tier-mismatch, correlated-source, and exit-scam EV cases bounded.
- `runs/catalog_evolution_drill_20260610T174454Z/REPORT.md` - catalog evolution drill, passed with manifest matching current bytes, policy split confirmed, poisoned rows blocked/flagged, and sybil noise unable to overrule evidence.
- `runs/qwen_e2e_transaction_20260608T154137Z/REPORT.md` - Qwen end-to-end transaction sim.
- `runs/qwen_adversarial_tournament_20260608T162011Z/REPORT.md` - Qwen adversarial tournament.

Avoid starting in old run directories unless you are tracing history. The latest
timestamped reports above are the cleanest entry points.

## UI / Human-Facing Demos

- `protocol.html` - technical protocol page.
- `index.html` - landing page.
- `alpha-interface.html` - alpha transaction interface.
- `binder.html` - No Rarity binder / collection stance UI.
- `card-search.html` - older catalog search UI.
- `qwen-agent-demo.html` - Qwen house-agent demo.

The UI is useful context, but the protocol work should start from the spec,
Solidity, agent tool layer, and reports.

## Useful Commands

From `/Users/che/Marketplace`:

```bash
forge test --match-contract MarketplaceEscrow
python3 chain/script/wall_bundle_route_spendability_drill.py
python3 chain/script/fingerprint_collision_drill.py
python3 chain/script/replay_agent_sim_trades.py
python3 chain/script/protocol_e2e.py
python3 agent_tests/no_rarity_catalog_probe.py
python3 simulations/no_rarity_trader_tournament.py
```

No Rarity CLI examples:

```bash
python3 agent_tools/no_rarity_agent_cli.py search_catalog "raichu holo"
python3 agent_tools/no_rarity_agent_cli.py interpret_human_text "I want PSA No Rarity Raichu slab with cert trail"
python3 agent_tools/no_rarity_agent_cli.py evidence_plan PMCG1-038 --evidence-profile NR-D
python3 agent_tools/no_rarity_agent_cli.py evaluate_gate PMCG1-038 --stance want --evidence-level NR-D --seller-trust portable
python3 agent_tools/no_rarity_agent_cli.py catalog_release
```

## Best Review Target

Review the boundary between:

1. what the contract enforces,
2. what the deterministic agent tools make legible,
3. what human/verifier/arbiter judgment must still decide.

The likely next hardening target is connecting the No Rarity catalog/agent tools
to a transaction intent packet without letting catalog certainty leak into
spendability.

Review this through three failure modes:

1. deterministic tool confidence becoming a shadow protocol,
2. seller fraud remaining profitable after bond, identity cost, remedy cap, and detection assumptions,
3. verifier or arbiter authority existing on paper without committed judgment supply.

Also review the gap side: the protocol should never imply it can close ingress
or egress physical truth. A negative drill that settles while the hidden oracle
says "counterfeit" is a passing honesty test, not a bug.

And review the legibility side: a vector can measure evidence shape, but an
`87/100` style score is certainty laundering. Calibration should come from
settled receipts and claims, not from an asserted trust meter.
The validator is allowlist-shaped, so synonym fields like `confidence`,
`safety_index`, or `overall` are blocked too.

Also review the bootstrap side: fiat payment is not settlement, stablecoin
escrow is not absence of third-party risk, and a seller bond is scoped capital,
not proof that the seller is safe.

Also review the trust-import side: external reputation is observable but not
bindable, account control now is not ownership of account history,
seller-controlled channels are correlation rather than independence, low-value
feedback does not grant high-value scope, and imported bond relief cannot exceed
the acquisition cost of the imported bundle.

Also review the catalog-lineage side: a catalog row should cite bytes, not a
location; evidence policy should not share the fact catalog hash; and challenges
should be evidence-weighted rather than counted by agent population.
