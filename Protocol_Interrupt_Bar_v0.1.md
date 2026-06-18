# Protocol — Interrupt Bar v0.1

> **Status:** design spec, derived from a 4-round adversarial probe (2026-06-17).
> **Answers:** *when* and *why* an agent escalates to a human, and how it *routes*
> the escalation.
> **Spine:** the `enforced / legible / judged` trichotomy. No-overclaim is law.
> **Related:** `Protocol_Human_Surface_v0.2.md` (the glance, the risk flag),
> `Protocol_Arbitration_v0.1.md` (verifier/arbiter escalation),
> `agent_tools/no_rarity_catalog_tools.py` (`row_citation`, `evaluate_gate`).

---

## 0. The question this answers

An agent is called **at a gap between a commitment and reality** — the instant a
judgment is required that (a) the contract cannot settle mechanically and (b) the
human has pre-authorized a policy to answer. Not on a page load. Not on a timer.
On a collision: *intent meets world.*

- A want with no candidate → called to **hunt**.
- A candidate against a want → called to **gate** (does this card, this evidence,
  this seller clear my terms — and what is missing?).
- Funds in escrow against a card that has arrived → called to **check the promise**.

Its first act on every call is **triage**: resolve silently by the principal's
policy, or escalate. The measure of a good call is that it *did not need to wake
the human*. "Interrupt only on a real decision" is not UX polish — it is the
agent's success condition.

## 1. Three layers — who acts

| Layer | Decided by | The agent's role |
|---|---|---|
| **Enforced** | contract / deterministic validator | none — nobody is "called"; the hash matches or it does not |
| **(delegated judgment)** | **the agent**, applying the principal's policy | **this spec** |
| **Judged** | human / verifier / arbiter | the agent escalates here, with a clean fork |

The agent owns the middle. It is called **whenever something is judged but the
human handed it a policy to judge by** — it is the carrier of *delegated*
judgment, converting one person's standing judgment into always-on judgment so the
human spends attention only on the irreducible forks.

## 2. The bar

The bar is not a number; it is a balance evaluated at every gap:

```
interrupt  when   Stake × (1 − Confidence) × Irreversibility   >   θ
                  └──────────────┬──────────────┘                └┬┘
                  expected regret of deciding silently         standing tolerance
```

- **Stake** — money / consequence on this call.
- **Confidence** = `evidence_completeness × threshold_distance × familiarity`.
  Deciding *at* a budget/grade threshold is low-confidence even if the number fits.
- **Irreversibility** — saved-want / shortlist = reversible; released escrow,
  public post, no-return sale = not.
- **θ** — the principal's delegation tolerance (hands-off raises it), **raised
  further by earned trust**. θ is a control loop: confirmed-right silent calls earn
  the agent a higher θ over time. *The bar learns.*

**Two-sided error.** Under-asking a real fork = regret. Over-asking (cry-wolf)
decays the channel so the next real fork gets rubber-stamped. Silence on an easy
case is *success*, not laziness. θ sits between these two failure modes.

**Urgency does not move the bar — it moves it in time.** When a real fork's window
closes before a human could answer, a synchronous ask is impossible; the fork had
to have been **pre-authorized** during the interview (§6). See Law 3.

## 3. The router — six lanes

"Interrupt" is not one thing. The balance routes each gap into one lane, and each
already has machinery:

| Lane | Fires when | Live mechanism (`evaluate_gate`) |
|---|---|---|
| `silent_continue` | policy resolves; reversible/low-stake | `continue` |
| `silent_request_evidence` | only deficiency is below-floor evidence the **seller** can supply, no fork | `request_evidence` |
| `decision_interrupt` | policy does **not** resolve; the human must **JUDGE** | `human_or_verifier_review` |
| `authorization_interrupt` | policy resolves, but the action is irreversible/public/over a reserved threshold — the human owes a **YES, not a judgment** | `hold_private` + `public` flag + escrow release |
| `anomaly_interrupt` | off-distribution signal: price far from comp, a seller claim that **contradicts the catalog**, a provenance red flag | risk flag (amber→red, named) + `reject_premium_no_rarity` |
| `pre_authorize` | a real fork **under a hard real-time deadline** that makes a synchronous human answer impossible | *(new — the interview pre-authorization; conservative default + interview-time flag)* |

## 4. Routing procedure (normative)

Apply **in order; first match wins.**

1. **Anomaly.** Off-distribution signal (price ≫/≪ comparable, seller claim ⊥
   catalog, provenance red flag) → `anomaly_interrupt`.

2. **Policy-resolves test.** Policy **affirmatively resolves** this gap *only if
   ALL THREE hold*:
   - **(a)** the evidence floor for this slot is **met**, and the agent's **own**
     assessment affirmatively agrees it is met (not "probably", not "obscured but
     likely");
   - **(b)** comp / band / budget is cleared — a **binary within-band check**:
     `price ≤ max AND price within ±10% of the comparable`. A price *at the ceiling
     but inside the band* **clears (b)**; closeness is a *Confidence* signal, never
     a resolution failure (Law 2);
   - **(c)** a **resolved rule exists for this exact slot**. Reserved / grail /
     chase-card slots carry no commons-floor rule and do **not** auto-resolve; a
     thin/new/unknown-trust source on a high-value item does **not** auto-resolve.

3. **If any of (a)(b)(c) fails, is unmet, or is unknown — default to JUDGE:**
   - **3a. Urgency override (elevated — Law 3):** if a hard real-time deadline makes
     a synchronous human answer impossible → `pre_authorize` (hold the conservative
     default; flag the fork for interview-time pre-authorization).
   - **3b.** else if the *only* deficiency is below-floor evidence the seller can
     supply, with no real fork (low stake, a rule exists, trust not thin-on-high-
     value) → `silent_request_evidence`.
   - **3c.** else → `decision_interrupt`.

4. **If (a)(b)(c) all affirmatively resolve:**
   - irreversible / public / spends past a reserved threshold →
     `authorization_interrupt` (a YES, not a judgment);
   - else → `silent_continue`.

**Hard guards.** `authorization_interrupt` is permitted *only* when (a) ∧ (b) ∧ (c)
are affirmatively satisfied. If the agent's own summary admits the floor is
unmet/uncertain, or no rule exists for the slot, or trust is thin on a high-value
item, `authorization_interrupt` is **disqualified → `decision_interrupt`**.
`decision_interrupt` is the **default** for any unresolved policy; authorization is
the narrow, fully-cleared exception. A "YES, not a judgment" frame must never be
handed to the human when a judgment is actually owed.

## 5. The three laws

1. **Default to JUDGE.** Unresolved policy routes to `decision_interrupt` by
   construction. Authorization is the narrow exception requiring (a) ∧ (b) ∧ (c) to
   *affirmatively* clear. *(Burden of proof sits on resolution, not on escalation.)*
2. **Confidence ≠ Resolution.** A rule can be fully *resolved* and *low-confidence*
   at once (you are sure the rule applies even though the number is close).
   Threshold-proximity raises scrutiny and the regret weighting; it **never**
   unresolves the rule. Only an actual failure of (a), (b), or (c) unresolves.
3. **Override prominence.** A strong default can *suppress a legitimate override*.
   The urgency → `pre_authorize` override (and any override) must be **elevated to
   its own check**, not left as a tail clause on the default it is meant to
   interrupt. In an agent-applied spec, *emphasis is a parameter*.

## 6. Where the parameters come from — the cost field

The gate's parameters are not arbitrary; they are a **personalized cost field**
elicited from the principal in an opening **interview** (the same act that turns a
vague desire into a named goal). Each pole sets a knob:

| Pole | Sets |
|---|---|
| Motive (love ↔ investment) | the evidence floor + liquidity/condition weighting |
| Budget (tight ↔ open) | `max_price` |
| Condition (raw-OK ↔ slab-only) | `evidence_level` floor (NR-A…NR-D) |
| Trust source (seller ↔ cert) | `seller_trust` weighting |
| Involvement (hands-off ↔ hands-on) | **θ** (the bar itself) |
| Privacy (private ↔ public) | the `public` flag |
| Patience / urgency | want TTL + which forks are **pre-authorized** |

The interview and the bar are **duals**: every high-urgency fork resolved *in
advance* is one the agent never has to interrupt for live (Law 3 / lane
`pre_authorize`). The interview's hidden job is to **retire future interrupts.**

## 7. The gate interface

**Live today** (`agent_tools/no_rarity_catalog_tools.py`):

```python
evaluate_gate(card_ref, *, stance="want", evidence_level="none",
              seller_trust="unknown", public=False) -> dict
# returns: enforced[], legible[], judgment_needed[], decision, missing[], human_summary
# decisions: continue | request_evidence | hold_private |
#            reject_premium_no_rarity | human_or_verifier_review
```

**Proposed** (the `⊕` knobs this spec specs into existence):

```python
evaluate_gate(
    card_ref, *,
    stance,                 # want | sell | ...
    evidence_level,         # NR-A..NR-D   (condition pole)
    seller_trust,           # thin | known | strong   (trust pole)
    # ⊕ new:
    stake,                  # card value / consequence
    reversibility,          # reversible | irreversible
    max_price, want_cond,   # budget + condition floor (interview)
    theta,                  # involvement pole × earned trust  → the bar
    deadline=None,          # real-time window, if any  → urgency override
    public=False,
) -> {
    "lane": <one of the six>,
    "enforced": [...], "legible": [...], "judged": [...],
    "missing_evidence": [...],
    "human_summary": "...",          # the clean fork, never a conclusion
    "confidence": 0.0..1.0,
    "regret": float, "theta": float, # the inequality, exposed for audit
}
```

The lane (the **ask type** delivered to the human) is a first-class correctness
target — not the interrupt/silence binary. A `decision_interrupt` mis-delivered as
an `authorization_interrupt` still "interrupts" but hands the human a rubber-stamp
where a judgment was owed; the probe (§9) caught exactly this.

## 8. No-overclaim invariant

The agent is called to *judge*, never to *disguise judgment as enforcement*.

- `enforced` holds only hash/contract/cert-lookup facts. Authenticity, condition,
  possession, price-fairness, and spendability are **never** asserted as enforced
  fact — they live in `legible` (signed/typed, still judged) or `judged`.
- The catalog reference image is an **external reference witness**, not seller
  evidence, training data, or authentication proof.
- On escalation the agent hands the human **the evidence and the gap** — a clean
  fork — not a conclusion wearing the costume of a fact. It carries the principal's
  *policy*, not their *authority*.

This invariant held at **0 violations across every completed probe case** (§9),
including every misroute — the trichotomy labeling never cracked even when the
routing did.

## 9. Evidence trail — the probe

A blind buyer-agent routed each spec'd case (catalog-grounded: Charizard
`PMCG1-021`, Jungle commons, a reserved chase-card, thin-trust slabs, off-comp
anomalies, a catalog-contradicting claim, a live-auction urgency bind); an
adversarial reviewer scored it against an oracle and hunted overclaim.

| Round | Result | What it found |
|---|---|---|
| **v1** | 8/10 · 0 overclaim | `authorization↔decision` collapses JUDGE→YES on high-value, cleared-looking cards (c3, c8) → **Law 1** |
| **v2** | 14/15 · boundary 7/7 · 0 overclaim | default-flip fixed it, but introduced one over-escalation at *at-ceiling-but-within-band* (c10) → **Law 2** |
| **v3** | 14/15 · boundary 7/7 · 0 over-correction · 0 overclaim | c10 cleared (Law 2 confirmed); lone orthogonal miss c9 — the urgency override, buried under the "default to decision" emphasis → **Law 3** |

(One v3 attempt was discarded: a transient server-side rate-limit broke the verify
stage — an infra failure, not a result.)

The failures got smaller and sharper each round — coarse under-escalation →
precise over-escalation → a single orthogonal lane nuance. Convergence, not
thrashing. Harness: `interrupt-bar-probe` workflow (cases + oracle inline).

## 10. Open / not-yet-built

- Wire the `⊕` knobs into the real `evaluate_gate`; today's signature covers ~half.
- Encode Law 3 in code (urgency override as an elevated check, not a tail clause).
  `c9` is the one lane the probe never cleanly confirmed.
- Build the **cost-field interview** that authors θ and the pre-authorizations —
  specced (§6) but not implemented.
- θ's trust-update loop (confirmed-right silent calls raise θ) is described, not built.
