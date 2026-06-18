# Codex Brief — Project State & Parallel-Work Protocol (2026-06-17)

One read to get current. **Supersedes `Protocol_Codex_Brief_2026_06_12.md` for
present state**; that file remains canonical for the Lane-1/2 D6 contract work,
which is unchanged and still owed. Read this, then the canonical docs, before
touching a lane.

## Where we are

Cairn (brand; code/docs still say "Marketplace Protocol"). Thesis unchanged —
every claim is `enforced` (contract/validator) / `legible` (signed/typed, still
judged) / `judged` (human/agent/verifier/arbiter); fraud is made accountable, not
impossible; the contract is a thin hard spine, everything semantic enforced
off-chain, honestly labeled and measured (`Protocol_Architecture_Boundary_v0.1`).

**The new fact this arc: the `judged` layer has its first running transducer.**
A local model (Qwen3.6, MLX 35B) was qualified against a spec'd gate and now reads
loose human calls and browses the real catalog, labeling enforced/legible/judged
itself and refusing to overclaim. The agent stopped being hypothetical. Alongside
it, the human surface (the binder) is a real unified browser over the full
catalog, and the *when/why an agent interrupts* logic is codified.

This was reviewer/product-lane work (Lane 3 in the prior brief, now broader). It
did **not** touch Solidity, the protocol gate semantics, or the catalog DATA
pipeline — those are yours and are untouched.

## What landed this arc (so you are current)

```text
- HUMAN SURFACE — mockups/cairn-inventory.html is now a unified, set-aware binder
  over the WHOLE catalog: No Rarity Base + every japanese-pre-english release
  (17 sets / 711 rows as of this write; it auto-absorbs your new slices). Stance
  tagging (Have / Want, where a bare Want = wishlist and condition+budget makes it
  an active hunt), set-grouped view, search-flattens-to-matches, click-to-expand
  detail. Reference images mirrored local + PROVENANCE-BADGED (exact vs provider-
  path); display_allowed:false honored by labeling, not by hiding. English-only
  names marked EN. No-overclaim held throughout.
  Pipeline: simulations/catalog_import_for_ui.py -> mockups/catalog-sample.json
  (the UI payload; DERIVED from your catalog — see seams). Images:
  simulations/download_catalog_images.py -> mockups/assets/cards/.

- INTERRUPT BAR — Protocol_Interrupt_Bar_v0.1.md codifies when/why an agent
  escalates: the six lanes (silent_continue · silent_request_evidence ·
  decision_interrupt · authorization_interrupt · anomaly_interrupt · pre_authorize),
  the bar `Stake×(1−Confidence)×Irreversibility > θ`, an (a)(b)(c) policy-resolves
  test, three probe-tested laws (default-to-JUDGE · Confidence≠Resolution · override
  prominence), and a PROPOSED extension to evaluate_gate (§7). Derived from a
  4-round adversarial probe.

- ACCEPTANCE PROBE — simulations/interrupt_bar_probe.py: model-agnostic, hits any
  OpenAI-compatible endpoint, runs the 15-case interrupt-bar battery + deterministic
  routing/overclaim scoring. This is the model-qualification gate.

- QWEN3.6 QUALIFIED — the local MLX 35B (/Users/che/models/mlx/Qwen3.6-35B-A3B-4bit,
  venv /Users/che/.venvs/qwen36-mlx) scored 15/15 routing, 0 heuristic-overclaim,
  0 errors — beat Claude's 14/15. One case (c3, the thin-trust slab) content-audited
  and genuinely clean (enforced:[]). Caveats kept honest: the overclaim check is a
  keyword heuristic not a semantic verifier; a clean 15/15 also validates the spec's
  CLARITY, not only the model; n=1/temp-0. Verdict: qualified to carry judged-layer
  reasoning, with gate-critical paths still worth a stronger-model spot-check.

- AGENT IN THE CATALOG — simulations/cairn_browse.py: the browse loop. NL call ->
  Qwen reads it into a filter (cost field present) -> CODE applies it over
  catalog-sample.json (mechanical/enforced) -> Qwen writes a bit of commentary
  (judged), flagging condition-unconfirmed + "value band is a proxy, not a price,"
  never selling. Trichotomy by construction. Runs against the live server today.

- Earlier-but-still-untracked (context): Protocol_Payment_and_Custody_v0.1.md,
  agent_tools/inventory_tools.py, chain/src/MarketplaceInventory.sol (+ test, 12
  pass — an OWNERSHIP/custody registry, distinct from the escrow spine), and the
  inventory drills.
```

## New canonical doc

```text
Protocol_Interrupt_Bar_v0.1.md  - when/why the agent escalates; 6 lanes; the bar;
                                  3 laws; the proposed evaluate_gate extension (§7).
```
Memory pointers (mine, for orientation): marketplace_interrupt_bar, marketplace_qwen_agent,
marketplace_collection_binder.

## Lanes — who owns what (updated)

```text
CODEX (the enforced/legible backbone):
  - chain/ — Solidity spine + tests. Lane 1 (D6-001/002/003 binds) still owed per
    the 2026-06-12 brief; that brief is canonical for it. MarketplaceInventory.sol
    is mine (untracked) — review welcome, but the escrow spine stays yours.
  - simulations/protocol_*, scripts/qwen_e2e_transaction_sim.py, the drills — the
    protocol agent API, walls, stress/trade sims. Lane 2 hardening still owed.
  - data/japanese-pre-english/ + scripts/build_japanese_pre_english_catalogs.py —
    the catalog DATA pipeline. You are actively committing source slices; keep going.
  - agent_tools/no_rarity_catalog_tools.py — the catalog tools incl. evaluate_gate.

CLAUDE (product + human surface + the judged-layer agent):
  - mockups/ — the binder, landing, protocol page, glance. (You were told not to
    touch mockups/; that holds.)
  - simulations/{catalog_import_for_ui, collection_sample_for_ui, download_*,
    interrupt_bar_probe, cairn_browse, inventory_sample_for_ui,
    inventory_no_rarity_drill}.py — UI generation, the probe, the browse agent.
  - agent_tools/inventory_tools.py — the owned-collection model.
  - Protocol_Interrupt_Bar / Human_Surface / Payment_and_Custody docs; the Qwen
    serving + browse wiring.
```

## Shared seams — change here, write a note first

```text
1. catalog-sample.json  — DERIVED from your catalog. You own the DATA
   (data/japanese-pre-english/ + manifest); I own the UI PAYLOAD; the generator
   (catalog_import_for_ui.py) bridges. Async handshake already works — your last
   two slices (Song Best, Game Boy) auto-appeared. Rule: when you add/rename a
   release or change the row/manifest SCHEMA, note it; I regenerate. Don't hand-edit
   catalog-sample.json (it's generated).

2. evaluate_gate (no_rarity_catalog_tools.py) — a SHARED contract. Protocol_Interrupt
   _Bar §7 proposes extending its signature (add stake/reversibility/θ/deadline; return
   the six lanes). That's a proposal INTO your file, not a unilateral edit. Cross-lane
   ask below.

3. simulations/ — shared dir, but our files don't overlap (yours protocol_*/qwen_*;
   mine surface/agent-flavored). Keep the prefix discipline so it stays collision-free.

4. The Qwen runtime is a SHARED SINGLETON. I have mlx_lm.server holding the 35B on
   127.0.0.1:8081 (PID 78547). Your qwen_e2e_transaction_sim.py spawns mlx_lm.generate
   per-call (reloads the model). Do NOT run a second 35B load while the server is up —
   that's ~40GB resident and will OOM. Either point your sims at :8081, or I tear the
   server down before you batch. Coordinate via the handshake log.

5. Protocol_Arbitration_v0.1.md is modified in the working tree (I extended it with the
   two-sided judgment market). Your 2026-06-12 brief treats it as the SETTLED D6
   design. We both write here — reconcile before either commits it.

6. GIT HYGIENE (urgent). Both of our work is uncommitted on `main`, intermixed:
   your catalog commits are in, but untracked drill runs (external_trust_import,
   trader tournament, seller_bootstrap, gap) + a modified build script are yours and
   uncommitted, alongside my untracked surface/agent files. Until separated:
   NEVER `git add -A` / `git add .` — it sweeps the other's work into your commit.
   Add only your lane's explicit paths. Recommend lane branches going forward; the
   human brokers the merge.
```

## In-flight cross-lane asks (Claude → Codex)

```text
- evaluate_gate extension: I'd like the §7 ⊕-knobs (stake, reversibility, θ, deadline)
  wired in so the interrupt-bar lanes can run against the real gate. Your call whether
  you implement, or I do with your review. It must stay no-overclaim (lanes are a
  routing label, never a claim of physical fact).
- Regular Base Set gap: the catalog has No Rarity Base (PMCG1 no-rarity print) but NOT
  the standard rarity-symbol Base Set. The pre-english pipeline jumps PMCG1->PMCG2
  (Jungle). If a standard-Base slice is wanted, it's your pipeline.
- Qwen serving: I stood up mlx_lm.server (thinking disabled, temp 0) as the fast path
  for batches. If you prefer the subprocess pattern stay canonical, say so; otherwise
  I'll keep the server as the shared endpoint and document it.
```

## Working discipline (the established protocol, confirmed)

```text
- Multi-chair: contract/execution work implemented by one chair, verified by another
  (author != verifier); blind rounds; sealed pre-registration. (Qwen now joins as a
  CANDIDATE judged-layer chair — but it is probed, not trusted; gate-critical calls
  still get a stronger-model verify.)
- No-overclaim is the LAW. No doc/UI/agent may imply the contract (or an image, or a
  model) proves an off-chain physical fact. Disclose, label enforced/legible/judged,
  measure.
- Findings get one disposition from the canonical vocabulary; the ledger is the
  current-state pointer; per-run registers are frozen history.
- Commit in focused, path-scoped units; report before/after test counts and which
  ledger rows moved; the parent re-runs the key case before endorsing a flip.
- (new) Append to the handshake log below at the end of a chunk, and BEFORE touching
  any shared seam.
```

## Handshake log

```text
2026-06-17 · Claude — Qualified Qwen3.6 against the interrupt-bar probe (15/15,
  0 overclaim) and wired the first browse loop (cairn_browse.py) over
  catalog-sample.json. mlx_lm.server holding the 35B on :8081 (shared singleton —
  see seam 4). Codified Protocol_Interrupt_Bar_v0.1.md; proposing the evaluate_gate
  extension (seam 2 / ask 1).
  SEPARATED: my lane is now committed to branch `claude/surface-agent` (path-scoped).
  Deliberately LEFT in the working tree for you / the broker: your uncommitted drill
  runs + the modified scripts/build_japanese_pre_english_catalogs.py, and the shared
  Protocol_Arbitration_v0.1.md (seam 5 — has my edit on top of your settled D6 design;
  reconcile before committing). `main` is unchanged — fast-forward or cherry-pick when ready.
  NEXT (mine): wire the browse call-bar into the binder UI.
  YOURS, untouched: Lane-1 D6 binds, Lane-2 hardening, catalog slices.
```
