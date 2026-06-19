# Protocol — Principal Profile & Agent Mandate v0.1

**Own the principal model; rent the runtime.**
Author: Claude (surface / judged lane) · Review + constraints: Kepler
([[principal_profile_agent_architecture]] project card) · For: split build with Codex (chain / enforced lane)
· 2026-06-19 · status: spec for build

## 0. The bet

The right architecture is not "make the agent persistent." It is: **make the principal model
persistent, inspectable, and source-labeled; keep the model runtime replaceable.** Own the self,
rent the mind.

The hard law, stated correctly: **a belief about the user is not authority from the user.**

## 1. Relationship to the Collector Aperture — wrap, do not replace

`Protocol_Collector_Aperture_v0.1.md` already defines what a collector wants, the risk budget they
will pay, and when they want to be interrupted — `judged`, never `enforced`, already carrying
"desire is not fact" (principle 8) and `buyer_want` as a per-trade projection (line 23). The
Principal Profile **wraps** it:

- An **aperture is a scoped, judged projection of the profile** (one collection, one hunt-posture).
  The profile is the broader principal container: holdings, correction history, and the *many* named
  apertures across collections / domains / time. (Resolves the aperture's own open question: one
  aperture or many → many, projected from one principal.)
- Genuinely new content over the aperture: **holdings** (what you own) and **cross-aperture memory**.

**The split (load-bearing move).** Today the aperture says "the confirmation *is* the signed
mandate" (lines 36, 191) — this conflates judged policy with enforceable capability. v0.1 splits it:
the policy (wants, risk posture, altitude) stays judged in the profile; the carve-out
(`spend_authority`, `reserved_judgments`, the signature) extracts into a distinct `AgentMandate`
pinned to a profile version. Editing the aperture for this split is a **shared seam** — see §12.

## 2. The four objects

```text
PrincipalProfile  private, versioned, source-labeled model of the user. legible/judged, NEVER enforced.
AgentMandate      signed, scoped capability carved out of the profile. the ONLY enforceable part.
Projection        a per-action packet derived from profile + mandate; a signed, source-citing receipt.
Runtime           an ephemeral model/tool session (Qwen, GPT, local, next). disposable.
```

A runtime may read the profile and *propose* updates; it must **never silently rewrite the mandate.**

## 3. The claim atom — the unit of the profile

Every durable belief about the principal is a claim:

```text
claim_id
path               # desires.grails | taste.condition_floor | mandate_input.spend_cap | holdings.<uid>
value
source_class       # stated | imported | observed | inferred | corrected   (epistemic type)
source_origin      # principal | behavior | third_party                    (who produced it; orthogonal)
source_ref         # the utterance, the import file, the packet hash, the correction event;
                   #   corrected authority requires a `principal_correction:<event>` ref (§4)
confidence         # authority uses (spend/waive) require confidence >= 0.95 (§4)
scope              # domain, collection_id, value_band, time_window — MANDATORY, defaults to NARROWEST
allowed_uses       # a subset of the §4 lattice, capped by source
requires_confirmation
created_at / expires_at
supersedes         # claim_id this corrects/replaces
```

## 4. `allowed_uses` is a hard lattice, not metadata (constraints 1 & 2)

This is the keystone — what turns "belief ≠ authority" from a slogan into a check. The capability
ladder is strictly ordered:

```text
glance_sort  <  recommend  <  ask  <  spend  <  waive
```

- A claim's `allowed_uses` is a prefix of the ladder, **assigned at authoring**, and it must be a
  subset of the source ceiling. It may narrow below the ceiling; it may **never** exceed it.
- **Both axes gate; the effective ceiling is the MIN of the two:**

  ```text
  source_class:   inferred         -> recommend
                  observed         -> ask        (it happened; can prompt, cannot spend)
                  stated | imported -> waive
                  corrected        -> waive      (the clean upgrade path)

  source_origin:  third_party      -> recommend  (seller text can NEVER authorize)
                  behavior         -> ask        (a pass is not a purchase order)
                  principal        -> waive
  ```

  So seller text (`third_party`) caps at `recommend` whatever its class; an `inferred` belief caps at
  `recommend`; **only a `stated`/`corrected` claim of `principal` origin can reach `spend`/`waive`.**
- Authority actions — spend, waive evidence, release escrow, suppress a reserved judgment — require a
  claim whose effective `allowed_uses` includes them. There is **no other path**. (Holdings/taste
  claims are authored narrow even when their ceiling is high; the ceiling is a cap, not a default.)
- **Authority confidence floor.** A use in `{spend, waive}` *additionally* requires
  `confidence ≥ 0.95`. A hedged or low-confidence claim cannot authorize, whatever its source — this
  closes confidence-laundering (a 0.6-confidence "stated" claim must not spend).
- **Correction is the one clean upgrade — and it needs a receipt.** The principal confirming an
  `inferred_candidate` mints a `corrected`/`stated` claim that `supersedes` it and lifts the ceiling.
  A `corrected` claim bearing authority requires a `source_ref` of the form
  `principal_correction:<event>`; the *label* "corrected" alone cannot mint the upgrade. Nothing else
  lifts the ceiling.

## 5. `AgentMandate` — the enforceable carve-out (constraint 3)

```text
schema: marketplace.agent_mandate.v0.1
mandate_id
principal_actor
agent_actor
profile_version_hash        # PIN — the exact profile version the human signed
scope                       # tcg | pokemon | collection_id | value_band
spend_authority
seller_attention_fee_cap
waivable_gaps
reserved_judgments
pre_authorizations
default_if_unavailable
expires_at
revocation_nonce
signature                   # principal's signature over the above
not_claiming
```

- It may draw spend/waive authority **only** from claims that (a) reach the action under the §4
  lattice, (b) are **active** (not `superseded`), and (c) sit **in the mandate's `scope`**. A
  superseded or out-of-scope claim cannot feed the mandate — this closes superseded-replay and the
  cross-domain leak. A mandate cannot grant authority the underlying claims don't carry.
- **Version-pinned:** authorizes against `profile_version_hash`, computed over each claim's
  `claim_id, path, value, source_class, source_origin, allowed_uses, confidence, scope, source_ref,
  supersedes` — so tampering *any* of them trips the pin. Later profile updates **do not widen** an
  old mandate; widening = a new mandate re-signed against the new version. (Closes mandate creep.)
- **Revocable + expiring:** `revocation_nonce` + `expires_at`.

## 6. What the chain can and cannot enforce (the Codex carve-out)

`MarketplaceActorRegistry` + `MarketplaceEscrow` can enforce only: actor roles, signatures, hashes,
escrow/bond amounts, state transitions, and a monotonic revocation nonce.

- **Enforceable on-chain**, at the escrow/route gate: `signature` valid for `principal_actor` ·
  `revocation_nonce == registry.current_nonce(principal)` · `profile_version_hash` matches the
  authorized one · `scope` matches the action's domain · `spend ≤ spend_authority`. A stale-nonce,
  wrong-version, or out-of-scope mandate is rejected.
- **NOT enforceable, and must never be implied:** "this is really your taste," "the inference is
  fair," "the agent understood you." Those stay `judged`. **The chain checks the signature on the
  mandate, never the truth of the profile.**

## 7. `Projection` = the receipt (constraint 4)

A projection is `profile + mandate → ` a per-action packet (`buyer_want`, `human_availability`,
`BuyerRiskAcceptance`, `agent_boundaries`, the per-trade cost field — existing seeds in
`simulations/buyer_want_agent.py` and `simulations/protocol_wall_pressure_sim.py`). Every projection
is a signed receipt citing its sources:

```text
projection_id
claim_ids[]                 # the exact beliefs it drew on
profile_version_hash
aperture_id
mandate_id
derived_at
```

Every action audits back to **exact beliefs + exact authority.** No-overclaim made verifiable per
action, not just per belief.

## 8. Threat model — the failure modes and what defeats each

```text
1. inference laundering     -> source-gated lattice (§4): inferred can never reach spend.
2. mandate creep            -> version-pinning (§5): an old mandate cannot widen.
3. persona capture          -> the agent's voice is `character` (its own); it never mints principal
                               claims, and reflect-back is the principal's own words.
4. memory as theft map      -> custody (§10): private/encrypted, minimized; holdings never leave plain.
5. small-N overfit          -> behavior stays `inferred_candidate` until corrected; never authority;
                               confidence + N surfaced; do not over-fit a taste on three trades.
6. cross-domain leakage     -> `scope` mandatory + default-narrow (§3); projections are scope-filtered.
7. export theater           -> portability = a real documented schema + a reference reader another
                               runtime can actually load; not a dead JSON dump.
8. prompt-injection writes   -> `source_origin: third_party` (§4): seller text caps at recommend and
                               can never mint a stated/corrected claim.
9. revocation failure       -> on-chain nonce (§6).
10. multi-agent merge        -> v1 single-writer profile; runtimes emit `inferred_candidate` patches to
                               a queue, never write directly; correction history is the conflict log.
11. fake correction          -> `corrected` authority requires a `principal_correction:<event>`
                               source_ref (§4); the label alone cannot mint the upgrade.
12. superseded replay        -> mandates draw from ACTIVE claims only (§5); a superseded claim — and a
                               profile_version that omits it — cannot keep authorizing.
```
(11 & 12 added by the independent verifier pass; both are exercised by the §11 drill.)

## 9. Honest v1 (deliberately conservative — Kepler)

- `PrincipalProfile.v0.1` as **editable, source-tagged account data** (the claim atoms).
- `AgentMandate.v0.1` as a **separate signed capability** object.
- Imports + interviews populate `stated` / `imported`.
- Behavior creates `inferred_candidate` rows **only**.
- **No implicit learning may affect spend, waivers, reserved judgments, or public actions until the
  editable profile UI exists** to catch it.

## 10. Custody — the self is a theft map

The profile (desires + budget + holdings) is adversarially valuable. Custody is a security decision,
not a convenience: the **mandate** is signed + chain-checked (nonce/version); the **profile** stays
private under the principal's custody — account-scoped, encrypted at rest, minimized (store the
claim, not a behavioral firehose). Portable ≠ public; export is principal-initiated.

## 11. The falsification drill — model-agnostic, independently extended

`simulations/principal_profile_drill.py`: an `interrupt_bar_probe`-style battery (model-agnostic,
deterministic). **8/8 pass**, with a mutation control proving each case goes red when the lattice is
broken. Cases 1–4 are the original; **5–8 were added by an independent Kepler/Codex verifier pass**
(author ≠ verifier — the extension found four gaps the author missed):

- **1. projection (happy):** profile → a `buyer_want` sourced from stated claims that **refuses to
  spend from an inferred preference** and surfaces the open question.
- **2. inference-laundering:** promoting an `inferred` claim to spend authority → rejected by the lattice.
- **3. prompt-injection:** seller text minting a `stated` claim / raising a cap → quarantined (`third_party`).
- **4. revocation:** a stale-nonce / expired / superseded-version mandate → rejected at the gate.
- **5. superseded replay:** a mandate drawing authority from a superseded claim → rejected.
- **6. fake correction:** a `corrected` authority claim without a `principal_correction` ref → rejected.
- **7. scope leak:** a mandate spending a cap from another domain → rejected.
- **8. confidence laundering:** a low-confidence authority claim → rejected by the confidence floor.

The pass also revealed **defense in depth:** the source-class ceiling, the source-origin ceiling, and
the per-claim `allowed_uses` are independent gates — breaking one axis doesn't open the hole. Passing
the happy case is better copy; passing the eight attacks is real architecture. The companion
`Projection`-receipt validator (§7) is the next falsification target.

## 12. Lanes & seams

- **Claude (surface / judged):** `PrincipalProfile.v0.1`, the aperture split, `Projection`-as-receipt,
  the editable profile UI, the adversarial probe.
- **Codex (chain / enforced):** `AgentMandate.v0.1` on-chain check (signature + nonce + version +
  `spend ≤ authority`) at the registry/escrow gate; the revocation-nonce registry surface.
- **Shared seam:** `Protocol_Collector_Aperture_v0.1.md` gets split (policy stays; mandate carve-out
  extracts). `[BLOCKING: collector-aperture-split]` must be logged before either side edits it.

## 13. Phasing

- **P0** — claim atom + the §4 lattice + the adversarial drill (§11, 8/8, independently verified) +
  the §7 `Projection`-receipt validator. Reference impls in `simulations/`; the editable
  `PrincipalProfile.v0.1` account data is the remaining P0/P2 piece. (Claude)
- **P1** — `AgentMandate.v0.1` + the on-chain check (§6). (Codex)
- **P2** — import + interview onboarding + the editable profile UI; behavior → `inferred_candidate`. (Claude)
- **P3** — calibration (`corrected` upgrades) — only once the editable UI exists to catch it.
