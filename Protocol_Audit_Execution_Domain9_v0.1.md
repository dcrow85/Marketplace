# Protocol Audit Execution Domain 9 v0.1

Generated 2026-06-11.

Execution slice against `Protocol_Audit_v0.1.md`, Domain 9 (Cross-Subsystem
Contradiction). This domain needs no contract attack and no blind round — it is
a consistency sweep of the docs against the verified landed code. Run by the
reviewer chair directly.

## Method

Swept the canonical docs (full spec, walls, agent API, SKILL, boundaries,
CLAUDE.md, rundown, catalog map/research, catalog JSON) against the verified
on-chain state after the typed-spendability landing (commit `8c9fe31`,
independently re-verified — cross-trade/opaque-spendability bypass reverts;
EVM drills repaired in `0460312`).

## Findings

### AUD-D9-001 — spendability enforcement drift (partial doc propagation)

- Domain: 9.
- Severity: medium (cross-subsystem contradiction; underclaim direction — docs
  said off-chain where code now enforces on-chain, contradicting the ledger and
  Agent API, but not a security overclaim).
- Type: `proven_bypass` of consistency (six concrete stale passages, each citable).
- Claim under test: every doc describes the spendability layer the same way the
  code enforces it.
- Observed: the typed spendability digest landed on-chain (cross-trade and
  cross-gate replay blocked by construction), and the Domain 1-2 register, the
  ledger, the Agent API (line 720), and SKILL were updated to say so. But six
  passages still described cross-trade replay as an off-chain dependency / a
  future-on-chain hardening:
  - `Marketplace_Protocol_Full_Spec.md` lines 912, 1115, 1241, and open
    question 1998
  - `Protocol_Walls_v0.1.md` line ~930 ("Audit boundary")
  - `agent_skills/.../protocol-boundaries.md` line ~76 ("Replay boundary")
- Expected: all six state that route/delivery spendability is a contract-derived
  typed digest (escrow, chain, trade, gate, leg, bound artifact hashes, issuer);
  cross-trade and cross-gate replay are blocked on-chain by construction; the
  digest is self-minted (issuer = `msg.sender`) — binding, not an independent
  authorization; wall-bundle and assembly-history graph coherence remain the
  off-chain residual.
- Disposition: `fixed_in_docs_for_doc_drift`. All six passages corrected to the
  landed state, consistent with the ledger's residual-boundary wording. Root
  cause: the typed-digest landing propagated to the API/SKILL/register/ledger
  but not to the deep prose spec, walls, and boundaries passages.

## Axes Checked That Passed

```text
- number drift: 96-vs-102 booster/family count consistent across rundown, map,
  research, catalog JSON, audit spec; cutoff 1999-01-09 consistent; catalog
  hash 02b979cc… appears only in the manifest. No drift.
- wall count: Protocol_Walls runs ## 1..16 with no contradicting total-count
  claim elsewhere. Consistent.
- CLAUDE.md currency: legacy (2026-05-20), explicitly bannered to defer to the
  rundown; it does not actively contradict the landed contract (its "enforced"
  list predates but does not negate the typed digest). Acceptable as bannered
  history, not a finding.
```

## Coverage Honesty

This slice prioritized the spendability-propagation axis (highest drift risk
after a session of piecemeal edits), plus number/wall-count/CLAUDE currency. It
did NOT exhaustively cross-check every `enforced`/`legible`/`judged` field label
across all docs, nor full terminology drift for every key term. Those remain
open for a later Domain 9 pass. Per the hard-mode rule, this round is not a
`weak_audit_suspected` — it produced a material, six-site finding.
