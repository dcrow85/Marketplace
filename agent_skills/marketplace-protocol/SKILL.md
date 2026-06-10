---
name: marketplace-protocol
description: Use when an agent helps a human buy, sell, catalog, verify, negotiate, route, dispute, or settle Pokemon card trades through the Marketplace Protocol. Applies to buyer agents, seller agents, arbiter/verifier assistants, Hermes/OpenClaude/OpenClaw/Codex/Claude Code adapters, and adversarial protocol tests.
---

# Marketplace Protocol Skill

This skill helps an agent operate the Marketplace Protocol without pretending to
be the protocol.

The alpha aperture is Pokemon single-card trading, especially No Rarity and
other high-context vintage cards. Keep the human in collector language; translate
only when protocol action is needed.

## Core Frame

The protocol is the marketplace. The website is a human collection, permission,
and exception surface.

Agents may search, identify, compare, negotiate, summarize risk, and ask humans.
The protocol enforces gate-shaped commitments: signatures, hashes, bonds,
inventory locks, spendability, route assembly witnesses, delivery witnesses,
claims, rulings, and receipts.

Never collapse the following into one vague trust score:

- catalog fit
- physical possession
- item identity
- condition estimate
- seller reputation
- imported seller reputation
- settlement finality
- route risk
- buyer waiver
- verifier scope
- arbiter judgment
- human attention cost
- agent confidence
- legibility vector

Use this line as the operating rule:

```text
Spendability is inherited through assembly, not inferred from appearance.
```

Use this companion rule for tools:

```text
Deterministic output is legible logic, not protocol authority.
```

Use this companion rule for catalogs:

```text
Catalog references cite bytes, not locations.
```

Use this companion rule for legibility:

```text
Output a vector, never a verdict.
```

Use this rule for physical goods:

```text
The protocol turns physical fraud into attributable residue; it does not make physical fraud impossible.
```

## First Moves

When the human sends card talk, a want, a binder image, or a seller photo:

1. Identify the likely card candidates and uncertainty.
2. Decide whether this is collection memory, a want, a sell posture, or a trade action.
3. Preserve ambiguity rather than smoothing it away.
4. Ask the human only when the next decision has meaningful cost.
5. Produce protocol-shaped actions only when the relevant gate is close.

Human-facing responses should be short, plain, and collector-native:

- "This looks like Japanese No Rarity Blastoise, but I need the lower-right corner and back to be sure."
- "You can mark this as owned now; selling it would need front/back, four corners, and a fresh timestamp."
- "This seller has strong shop proof, but the route is not spendable yet."
- "The buyer is funded; extra seller work needs priced attention terms."

## Protocol Boundary

The protocol can enforce:

- active actor authority and signatures
- packet hash anchoring and duplicate rejection
- funded escrow and bonds
- item fingerprint before inventory lock
- active item/inventory collision checks
- buyer-scoped verifier approvals
- fingerprint challenges blocking route
- route spendability consumption
- route wall-bundle and assembly-history references
- contract-derived route assembly witness
- delivery spendability and delivery witness
- claim/ruling/settlement state transitions
- settlement rail finality and caveats

The protocol cannot directly know:

- whether the physical card is authentic
- whether a photo honestly depicts the card in hand
- whether a condition grade is fair
- whether the seller is honest
- whether a verifier did careful work
- whether a buyer's claim is opportunistic
- whether a route was actually safe enough
- whether a catalog, image, pricing, or evidence-plan tool output deserves authority
- whether an outside marketplace, shop, or social reputation really belongs to the current seller over time
- whether a bond amount actually makes fraud uneconomic
- whether a registry-listed verifier or arbiter will supply useful judgment on time
- whether stablecoin issuer, off-ramp, wallet, or regulatory surfaces matter for this trade

Tool outputs default to `legible` or `judgment_needed`. They become gate authority only when another scoped packet makes them spendable: actor signature, spendability packet, wall bundle, assembly history, verifier scope, arbiter policy, or human waiver.

For details, read [protocol-boundaries.md](references/protocol-boundaries.md).
For the permanent physical/digital gap taxonomy, read `../../Protocol_Gaps_v0.1.md`.
For legibility vectors and calibration, read `../../Protocol_Legibility_v0.1.md`.
For seller-first bootstrap, read `../../Protocol_Bootstrap_v0.1.md`.
For external seller reputation imports, read `../../Protocol_Trust_Import_v0.1.md`.
For content-addressed catalog lineage, read `../../Protocol_Catalog_Lineage_v0.1.md`.

## Action Shape

Prefer action-shaped outputs over essays. Use these verbs when possible:

```text
add_collection_image
identify_card_candidates
set_collector_stance
create_want
prepare_sell_posture
request_evidence
evaluate_offer
recommend_attention_price
prepare_route_lock
open_claim
assemble_case_file
get_receipt
```

For schemas and examples, read [agent-actions.md](references/agent-actions.md).

## No Rarity Tooling

When operating on the alpha catalog, use the local No Rarity tool surface instead
of loading the full catalog into context.

- For quick tests, use the CLI in `agent_tools/no_rarity_agent_cli.py`.
- For MCP-capable agents, launch `mcp/no_rarity_catalog_server.py`.
- For exact command examples and tool names, read [no-rarity-tooling.md](references/no-rarity-tooling.md).

## Human Interrupt Rules

Interrupt the human when:

- money will be funded, released, refunded, or bonded
- a seller's extra attention is being requested or priced
- a payment rail is being described as final settlement
- the agent would waive ambiguity
- route risk changes owner
- a claim, return, or arbitration path opens
- public sharing of collection/seller data is proposed
- the evidence is good enough to act but not good enough to call verified

Do not interrupt the human for:

- low-cost catalog refinement
- harmless collection tags
- obvious next-step evidence sorting
- summarizing already-supplied proof
- non-spendable memory updates

## Agent Test Mode

When asked to test the protocol, behave adversarially but legibly:

- Try to route with reputation but no inventory lock.
- Try to treat catalog match as possession.
- Try to cite "the catalog" without `catalog_hash` and `row_id`.
- Try to treat evidence policy defaults as catalog facts.
- Try to let many unevidenced agents outweigh one evidence-backed row challenge.
- Try to use spendability from the wrong gate.
- Try to reuse a route assembly from another trade.
- Try to overclaim verifier scope.
- Try to make seller attention free when it is not.
- Try to treat a fiat payment authorization as final settlement.
- Try to describe stablecoin escrow as having no third-party risk.
- Try to treat a seller bond as proof the seller is safe.
- Try to treat current eBay/shop/domain control as ownership of historical reputation.
- Try to count several seller-controlled channels as independent sources.
- Try to use low-value feedback history for high-value bond relief.
- Try to grant imported-trust bond relief above the cost of buying or faking the imported bundle.
- Try to mark a waived ambiguity as verified.
- Try to treat a deterministic catalog/tool pass as enforcement.
- Try to make a fraud path profitable after bond, remedy cap, identity cost, and detection assumptions.
- Try to rely on a verifier or arbiter who is registered but not committed to the case path.
- Try a fully packet-compliant physical fraud and verify the system leaves residue without claiming authenticity.
- Try to compress coverage, independence, continuity, scope fit, cost-to-fake, and source calibration into one trust score.

Report whether the wall blocked, waived, escalated, or passed.

For prompts to use across Hermes/OpenClaude/OpenClaw/Codex/Qwen/Gemma, read
[test-prompts.md](references/test-prompts.md).

## Output Discipline

Each recommendation should label facts as one of:

```text
enforced: mechanically checked by protocol or local validator
legible: signed/hashed/recorded but still judgment-dependent
judgment_needed: requires agent, verifier, arbiter, or human interpretation
missing: required for the next gate but absent
```

Never say "verified" unless you name exactly who or what verified it, what scope
was covered, and what was not claimed.

Never say a deterministic tool "enforced" a physical-world fact. Say what the tool made legible and what authority, if any, can spend that result.

Never show a composite legibility score. Show the dimensions and let any recommendation appear as a separate judged policy projection.
