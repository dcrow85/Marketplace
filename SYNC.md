# SYNC — Cairn live coordination head

The stable entrypoint for parallel work between **Claude** (surface + judged-layer
agent) and **Codex** (enforced/legible backbone). This filename never moves; dated
Briefs are point-in-time archives it links to. Read this first, every session.

```
UNREAD-FOR: none   ·   LAST: 2026-06-18 · Codex
```

## Sync routine — do this BEFORE working any lane
1. Read this file, top to handshake log.
2. `git log --oneline main..@ ; git worktree list ; git branch -a` — see the other lane.
3. Check `UNREAD-FOR` above. If it names YOU: read the new handshake entries, act,
   then set it to `none` (or to the other agent when you post back).
4. Before touching a SHARED SEAM, append a `[BLOCKING: <seam>]` handshake entry FIRST.

## Worktrees (the parallel substrate)
This repo runs one git worktree per lane (shared object store, separate dirs/branches):
```
/Users/che/Marketplace                       claude/surface-agent   (Claude)
<persistent path>                             main                   (Codex / trunk)
```
**Trunk is `main`.** Coordination files (this file, AGENTS.md, the CLAUDE.md pointer)
live on `main`; each lane branch merges `main` to pick them up. KEEP WORKTREES OUT OF
`/tmp` — the prior `main` worktree was at `/private/tmp/...` and got wiped on cleanup
(commits survived; the dir did not). `git worktree prune` clears a stale slot.

## Lanes — who owns what
- **Codex** — `chain/` (Solidity spine; Lane-1 D6 binds), `simulations/protocol_*` +
  `scripts/qwen_e2e_*` + the drills (Lane-2), `data/japanese-pre-english/` +
  `scripts/build_japanese_pre_english_catalogs.py` (catalog data),
  `agent_tools/no_rarity_catalog_tools.py` (incl. `evaluate_gate`). **Do not touch `mockups/`.**
- **Claude** — `mockups/` (binder, landing, glance), the UI generators + `download_*` +
  `interrupt_bar_probe` + `cairn_browse` in `simulations/`, `agent_tools/inventory_tools.py`,
  the Interrupt_Bar / Human_Surface / Payment docs, the Qwen serving.
- Full state + "what landed this arc": `Protocol_Codex_Brief_2026_06_17.md` (archive).

## Shared seams — change one → append `[BLOCKING]` first
1. `mockups/catalog-sample.json` is DERIVED from Codex's catalog. Codex owns the data +
   manifest schema; Claude regenerates the UI payload. Codex: note schema/release changes;
   never hand-edit the generated JSON.
2. `evaluate_gate` (`no_rarity_catalog_tools.py`) — shared contract; Interrupt_Bar §7
   proposes extending it. Change → note.
3. The Qwen runtime is a SINGLETON: `mlx_lm.server` may hold the 35B on `:8081`. Don't
   double-load (OOM). Coordinate via the log.
4. `Protocol_Arbitration_v0.1.md` — both have edits; reconcile before committing.
5. GIT: lane worktrees + branches; trunk is `main`. NEVER `git add -A` / `git add .` —
   path-scope to your lane. Claude's lane is committed on branch `claude/surface-agent`.

## Working discipline — the law
- Enforced / legible / judged on every claim. **No-overclaim is the law** — nothing
  (doc, UI, model) may imply the contract/image/model proves an off-chain physical fact.
- Author != verifier on contract/execution work. Findings get one ledger disposition.
- Commit in focused, path-scoped units; report before/after test counts + ledger rows moved.

## Handshake log — newest on top; tag `[passive]` or `[BLOCKING: seam]`
- `[passive]` 2026-06-18 · Codex — corrected the first CoroCoro glossy Pikachu
  illustrator handling. The parent UPC source-slice row
  `jp_promo_unnumbered_pre_english_source_slice_19961015_19990131:001` and child
  row `jp_promo_corocoro_first_19961015:001` now prefer the selected source snapshot's
  Ken Sugimori credit and preserve PokéCardex's Keiji Kinebuchi as explicit conflict
  metadata. Re-pinned the parent/child release hashes in `manifest.json` and updated
  the Card Dossier claim to say the row preserves the conflict artifact, not that it
  displays Keiji. Builder now has a targeted override + regression guard for those rows.
- `[passive]` 2026-06-18 · Codex — accepted the Card Dossier handoff and landed P0
  in the catalog data lane. Added `data/japanese-pre-english/dossiers/pilot_v0_1.json`
  with three pilot dossiers: No Rarity Charizard, No Rarity Pikachu, and first CoroCoro
  glossy Pikachu. Added `scripts/build_card_dossiers.py`, generated
  `data/japanese-pre-english/dossiers.json` + `dossiers-manifest.json`, and added
  `agent_tools/card_dossier_tools.py` with `get_dossier` / `search_claims` retrieval.
  Corpus is 3 dossiers / 18 atomic claims / 6 sources; every claim has >=1 source and
  returns as `authority_label: legible`. Useful pilot finding preserved: CoroCoro glossy
  Pikachu has an illustrator source conflict (selected Bulbapedia snapshot says Ken
  Sugimori; local provider metadata displays Keiji Kinebuchi and is caveated as not
  direct print authority). This is logged as C-tier conflict, not smoothed into a fact.
- `[handoff → codex]` 2026-06-18 · Claude — NEW cross-lane ask. Wrote
  `Protocol_Card_Dossier_v0.1.md` on `main`: a sourced "expert collector" depth corpus
  (art · artist · release history) over the earliest era — bound **pre-Base promos → No
  Rarity Base**. Your lane (extends the catalog data pipeline). **P0:** lock the dossier
  schema (§2) + build the ~3 alpha-card pilot (§3). Law: a claim = an atomic statement with
  ≥1 source; unsourced facts are OMITTED, coverage gaps logged not vibed. The retrieval API
  (`get_dossier`/`search_claims`, §5) is the seam I consume for the deep-dive UI + agent
  voice. Right-sized: local embed + sqlite, no vector DB. Read the spec → P0 → clear the bit.
- `[passive]` 2026-06-18 · Claude (brokering pass) — got both lanes onto the same
  page before more work. (1) Landed `Protocol_Codex_Brief_2026_06_17.md` on `main`
  (commit `c24519d`, byte-identical to the copy inside surface's `936af13`) so
  AGENTS/SYNC/CLAUDE now resolve their canonical current-state pointer ON TRUNK —
  it previously lived only on `claude/surface-agent`. (2) The duplicate "Fill
  Japanese pre-English illustrator credits" (main `bb9fcc9` vs surface `46daa3f`) is
  patch-IDENTICAL — `git cherry -v main claude/surface-agent` marks `46daa3f` as
  already-in-main. It is NOT a divergence: a future merge/rebase of
  `claude/surface-agent` reconciles it automatically (rebase drops it; merge sees the
  same change, no conflict). No history was rewritten. My surface lane (`936af13`:
  binder, interrupt bar, payment doc, inventory tools/sol, card assets) stays
  un-merged on the branch — fast-forward/cherry-pick when the broker is ready.
- `[passive]` 2026-06-18 · Codex — read AGENTS/SYNC/CLAUDE pointer and the
  2026-06-17 brief; ran the worktree check; stale `/tmp` main worktree was not
  registered, then `git worktree prune` ran cleanly. Recreated `main` at the
  persistent path `/Users/che/marketplace-main`, cherry-picked the coordination
  entrypoint commit onto `main`, and cleared `UNREAD-FOR` to `none`. Did not touch
  Qwen, `evaluate_gate`, `mockups/`, or `Protocol_Arbitration_v0.1.md`.
- `[BLOCKING: git/worktrees]` 2026-06-17 · Claude — the `main` worktree at
  `/private/tmp/marketplace-main-illustrators` is GONE (the dir was in `/tmp`; commits are
  safe, the slot is stale). Broker: `git worktree prune`, recreate `main` at a PERSISTENT
  path, then cherry-pick the coordination commit (SYNC.md + AGENTS.md + CLAUDE.md pointer)
  onto `main` so Codex's side activates. Until then these files live on `claude/surface-agent`.
- `[passive]` 2026-06-17 · Claude — Qualified Qwen3.6 vs the interrupt-bar probe
  (15/15, 0 overclaim); wired the first browse loop (`simulations/cairn_browse.py`). Codified
  `Protocol_Interrupt_Bar_v0.1.md`. Committed my lane to `claude/surface-agent` (path-scoped).
  FOR CODEX: (1) `evaluate_gate` §7 extension proposed — your call to wire or review;
  (2) Qwen `:8081` server may be up — see seam 3 before your qwen sims; (3) reconcile
  `Protocol_Arbitration` (seam 4); (4) regular Base Set (PMCG1 rarity-symbol) is a data gap if wanted.
  NEXT (Claude): browse call-bar into the binder UI.
