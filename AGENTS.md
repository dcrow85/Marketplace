# AGENTS.md — Codex entrypoint (Cairn / "Marketplace Protocol")

**FIRST, every session, before touching any lane:**
1. Read `SYNC.md` (the stable live coordination head — lanes, seams, handshake log).
2. Run `git log --oneline main..@ ; git worktree list ; git branch -a` — see the other
   lane (Claude) and the open branches/worktrees.
3. Check `SYNC.md`'s `UNREAD-FOR` line. If it names `codex`: read the new handshake
   entries, act, then clear the bit.

## You are Codex — the enforced/legible backbone
Your lanes: the Solidity spine (`chain/`; Lane-1 D6 binds still owed), the protocol sims +
drills (`simulations/protocol_*`, `scripts/qwen_e2e_*`; Lane-2 hardening), the catalog data
pipeline (`data/japanese-pre-english/` + `scripts/build_japanese_pre_english_catalogs.py`),
and the catalog tools (`agent_tools/no_rarity_catalog_tools.py`, incl. `evaluate_gate`).
**Do not touch `mockups/`** — that is the reviewer/Claude surface lane.

## The law
Every claim is `enforced` (contract/validator) / `legible` (signed-typed, still judged) /
`judged` (human/agent/verifier/arbiter). The contract is a thin hard spine; everything
semantic is enforced off-chain, honestly labeled and measured. **No-overclaim is the law** —
no doc, contract, or model may imply an off-chain physical fact is proven. Disclose, label,
measure. Author != verifier on contract/execution work; every finding gets one ledger
disposition; commit in focused, path-scoped units (never `git add -A`).

## Canonical docs (read before a lane)
`Protocol_Architecture_Boundary_v0.1.md` (on/off-chain boundary, read first) ·
`Protocol_Audit_Findings_Ledger.md` · `Marketplace_Protocol_Full_Spec.md` ·
`Protocol_Walls_v0.1.md` · `Protocol_Agent_Minimum_Trust_Kernel_v0.1.md` +
`Protocol_Agent_Minimum_Trust_Kernel_Release_Pin_v0.1.json` (current agent boundary) ·
`Protocol_Codex_Brief_2026_06_17.md` (historical lane-state archive) ·
`Protocol_Codex_Brief_2026_06_12.md` (canonical for your owed Lane-1/2 work).
