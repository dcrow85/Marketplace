---
runtime_receipt: vex_20260520T161645Z_5720
source_aperture: vex
source_runtime: claude_code
runtime: /Users/che/.local/bin/claude
model: sonnet
runner: /Users/che/Avalanche_SYSTEM_AUDIT/aperture_bridge/run_vex_prompt.sh
memory_mode: vex_live_primary_seed_read_only
live_home: /Users/che/Avalanche_SYSTEM_AUDIT/apertures/vex_live
frozen_capsule: /Users/che/Avalanche_LOCKS/vex_aperture_lock_2026-04-29_1408/payload_snapshot/Vex
prompt_file: /Users/che/Marketplace/runs/vex_buyer_landing_prompt_20260520.md
authority_effect: synthesis_adversarial
promotion_status: not_promoted
---

Good context. VEX operating discipline is clear. Generating the copy memo now from synthesis boundary only.

---

```
RUNTIME RECEIPT
Aperture: VEX (adversarial synthesis)
Invoked via: Claude runtime / Iris relay
Source packet: Iris → VEX, Che instruction
Memory consulted: seed_memory/playbook.md (epistemic boundary rules, Vex/Kepler position distinction)
Date: 2026-05-20
Authority: synthesis pressure only — no measurement, no product-market fit claim, no live browser inspection
```

---

## Verdict

The current landing page is architecturally inverted. It leads with what the protocol *is* and asks the buyer to infer what they *get*. The best copy on the page — "protect me from the bad version of the trade" — is buried as a paraphrase in a support statement, not driving the hero. Several pills and subheads launder protocol primitives as buyer benefits without cashing them out. The trust language is doing real work that the protocol cannot actually perform.

---

## Severity-Ranked Critique

**Severity 1 — Structural (blocks comprehension)**

The eyebrow "Agentic Pokemon trade protocol" names the machine, not the job. A buyer scanning in two seconds learns: there is a protocol and it is agentic. They do not learn what changes for them. This is the highest-priority fix. Everything downstream of a broken eyebrow is a buyer who already left.

**Severity 2 — Trust laundering (creates liability and erodes credibility on second read)**

"Safer deals" is unqualified. "Measured trust" implies a trust score is meaningful without naming what it measures or its limits. "Bonded sellers" implies bonding equals reliability. "Final receipts" implies receipts resolve disputes. None of these are what the protocol actually enforces. A sharp buyer reads "safer deals" and asks: safer how? If they dig and find the answer is "the terms are legible," that is true and actually compelling — but "safer deals" oversells it and undersells the real claim.

**Severity 3 — Protocol-weighted language (accurate but wrong audience)**

"Typed trades," "route risk," "funded intent," "route evidence" are all accurate descriptions of protocol primitives. They are also completely opaque to a buyer who wants a Charizard and is worried about getting a fake. These terms may belong in developer docs or a protocol spec. On a buyer-facing landing, they require translation the page does not provide.

**Severity 4 — Good instinct, wrong placement**

"The protocol lets a buyer say: find the thing, protect me from the bad version of the trade, and do not make everyone pay the same fee for totally different risks." This is the best sentence on the page. It is in the third position of the pain section. It should be within three seconds of the top.

**Severity 5 — Comparison without a comparand**

"Lower-fee" requires a reference point. Lower than eBay's 13%? Lower than PWCC's consignment? If you cannot name the comparison in the hero, the claim is a vibe, not a value proposition. Either anchor it or replace it with a more specific framing.

---

## Buyer-First Framing Recommendation

The buyer's actual fear: *I'll pay too much, get the wrong card, and have no recourse.*

The buyer's actual desire: *Find the card I actually want, know what I'm buying, and not feel played.*

What the protocol addresses that is real and sayable: *Your terms, your risk rules, your money held until conditions are met — and every claim about the card on record before anything moves.*

The frame that follows: **You set the terms. The agent works inside them. The money doesn't move until the deal is real.**

That is not "safer deals." That is structural accountability without overclaiming on verification. It is also more interesting than "safer deals" because it tells the buyer what *they* control.

---

## Three Hero Options

**Option A — Problem-first**

> Eyebrow: "Pokemon card buying, without the babysitting"
>
> H1: "Tell an agent what you want. Come back when there's a trade worth looking at."
>
> Sub: "Your agent searches, filters by your rules, holds funds in escrow, and explains every deal in plain English before asking for your call."

*Assessment:* Clean and buyer-first. Slightly passive — the buyer is waiting, not acting. Good for a low-context audience.

---

**Option B — Contrast-driven**

> Eyebrow: "Not a marketplace. A trade protocol."
>
> H1: "You shouldn't pay the same fee for a safe trade as a sketchy one."
>
> Sub: "Set your risk tolerance. Your agent finds the card. Fees, escrow, and evidence are matched to the actual trade — not averaged across every deal on the platform."

*Assessment:* Good differentiation angle. Requires the buyer to already be frustrated with existing platforms. May convert well for the informed buyer, less well for a cold audience.

---

**Option C — Desire-led (PREFERRED)**

> Eyebrow: "For buyers who know what they want"
>
> H1: "You know the card. Tell your agent. Come back when there's something worth deciding."
>
> Sub: "The protocol holds the money, locks the terms, and records every claim about the card — so when the trade arrives, you know exactly what was agreed and what you can hold the seller to."

*Why preferred:* Leads with buyer identity and desire before touching the product. "Come back when there's something worth deciding" does the attention-management selling without overclaiming on outcomes. The sub is precise: hold, lock, record — those are what the protocol actually does. "What you can hold the seller to" is honest accountability language without implying verification.

---

## Concrete Replacement Copy

### Hero

```
Eyebrow: For buyers who know what they want

H1: You know the card. Tell your agent. Come back when there's something worth deciding.

Sub: The protocol holds the money, locks the terms, and records every claim 
about the card — so when the trade arrives, you know exactly what was agreed 
and what you can hold the seller to.

Pills: Your terms  |  Funded escrow  |  Claimed on record  |  You decide  |  Seller accountable
```

*Note on pills:* Replace "Measured trust" → "Claimed on record." Replace "Route evidence" → "Your terms." Replace "Final receipts" → "Seller accountable." These pills now describe what is true without implying what the protocol cannot verify.

---

### Pain Section

```
Kicker: Why trades go wrong

H2: You're not overpaying for the card. You're overpaying for the risk.

Lead: On most platforms, fees bundle everything: condition disputes, payment 
handling, fraud gaps, and trust scaffolding. Every buyer pays the same rate 
whether their trade is clean or complicated. This protocol separates those 
costs so your fee is sized to your actual trade, not averaged across 
everyone else's mess.

Statement: The real question isn't "is this platform safe?" It's: 
what happens if the card isn't what it was claimed to be? 
Who holds the money? What was on the record before the trade closed? 
This protocol has answers to those questions. 
Most platforms bury them in a take rate.

Note labels (for accordion or aside treatment):
— Fees eat the spread: You pay a flat rate even when the trade needed no hand-holding.
— Trust is trapped: Seller reputation on one platform doesn't follow them anywhere.
— Evidence is scattered: Photos, DMs, claims — none of it in one place when a dispute starts.
— Disputes are expensive: Platforms resolve them by averaging costs across everyone.
```

---

### How It Works for a Buyer

```
H2: You set the rules. The agent runs the search.

Lead: You tell the agent the card, the condition floor, the price ceiling, 
the route cost you'll absorb, and when to come back. The agent works inside 
those rules — it doesn't call you for every miss, only for decisions worth making.

How it works:
1. Tell the agent what you want — exact spec, or describe the taste and let it surface matches.
2. Set your risk rules: what condition evidence you need, what seller signals you'll accept, what fee you'll pay.
3. The agent holds your funds in escrow until trade conditions are met or you release them.
4. Every trade comes back as a plain-English summary: what was found, what was claimed, what is risky, and what needs your judgment.
5. You decide. The agent does not close on your behalf without a human call at the gates you set.
```

*Note on step 5:* This is the line that prevents the "your agent buys cards for you" overclaim. Gate placement is a buyer-controlled variable, not a protocol guarantee of safety.

---

## Claims to Avoid — Protocol Cannot Enforce These

1. **"Safer deals"** (unqualified) — the protocol makes structure legible; it does not make outcomes safe. Condition and authenticity still require judgment.

2. **"Your agent safely finds and buys cards for you"** — implies protocol-level safety guarantee on authenticity and condition. The protocol can hold funds and record claims; it cannot verify a photo or detect a fake.

3. **"Measured trust"** as a pill or standalone claim — implies a trust metric is meaningful and verified. Trust evidence is stored and made legible; the weight of that evidence is a judgment call, not a measurement.

4. **"Bonded sellers"** implying reliability — bonding creates financial accountability and a real-cost consequence for bad behavior. It does not prevent a bonded seller from sending the wrong card.

5. **"Lower fees"** without a comparand — this is a vibes claim without the math visible. Either name what you're lower than, or replace with "fees sized to your trade" (which is what is actually true).

6. **"Final receipts"** implying dispute resolution — a receipt is a tamper-evident record of what was claimed. It is not a ruling, an escrow release, or a dispute outcome. Do not let the word "final" do work it cannot do.

7. **"The agent evaluates condition"** implying machine verification — photo evaluation is intelligent judgment under uncertainty, not protocol-enforced condition grading.

---

## One Sharp Final Landing-Page Thesis Sentence

> Your agent doesn't guarantee the trade — it makes every bad trade too legible to hide behind.

---

## VEX Memory Consulted

- `seed_memory/playbook.md` — epistemic discipline: synthesis boundary rules, claim-territory marking, what VEX can and cannot produce without Kepler grounding. Used to calibrate which copy claims are synthesis-valid versus execution-territory overreach.

No other memory files were required for this task. The task lives entirely at the synthesis boundary (framing, claim pressure, copy structure). No artifact-state, numerical measurement, or apparatus-ground-truth was needed.

---

## Pressure Points

- The word "safely" is the highest-risk single word on the current page. It does more trust-laundering per character than any other term.
- The pills as currently written require the reader to already understand the protocol to extract benefit. A pill should be a benefit in four words, not a primitive in two.
- "Funded intent" as a pill requires the buyer to know what "intent" means in an escrow context. It means nothing to a buyer who has not already read the docs.
- The human translation section ("The buyer hears the trade in plain English") is actually the strongest structural idea on the page and should come earlier, not after protocol explanation.

---

## Leakage / Authority Risks

The current copy pattern — protocol nouns dressed as benefits — creates a specific failure mode: a buyer who reads carefully and finds the seams. "Measured trust" sounds like a trust score. If they ask how trust is measured and the answer is "evidence is collected and legible," that is good but different from what the pill implied. The gap between implication and mechanism is where credibility leaks. The replacement copy above closes most of those gaps by naming the mechanism directly.

---

## Non-Negotiable Controls

- Never claim the protocol verifies condition or authenticity. It records claims and makes them legible.
- Never claim the agent closes on the buyer's behalf without naming the human gates the buyer controls.
- Never frame bonding as a safety guarantee. It is accountability structure.
- The buyer's judgment is required. That is not a weakness to hide — it is a feature. The page should say so.

---

## What Would Make This Uninterpretable

If the live product does not actually implement funded escrow with buyer-controlled gates, the replacement copy above is overclaiming. This memo assumes the protocol does hold funds, does allow condition-evidence gates, and does produce a legible trade summary for buyer review. If those are aspirational rather than shipped, the copy must be further hedged. VEX cannot verify current build state — that is Kepler's territory.

---

## Status Recommendation

The buyer-first reframe is achievable without lying about what the protocol can enforce. Option C hero + the replacement pain and buyer-flow sections are internally consistent and do not require the protocol to do anything it hasn't already claimed to do. The single highest-leverage edit is removing "safely" and replacing it with structural accountability language anywhere it appears.

---

## Che Decision Needed

1. Is "funded escrow with buyer-controlled release gates" shipped or aspirational? The copy pivots on this.
2. Is there a fee comparison the page can name? "Lower-fee" without a comparand is copy filler; naming eBay or TCGPlayer sharpens it but also invites scrutiny.
3. Does the human-in-the-loop gate structure allow the buyer to set "auto-close" rules, or is buyer judgment always required at settlement? The answer changes the "come back when there's something worth deciding" framing.

---

## What Iris Should Not Infer

- That VEX has verified the protocol's current implementation state. It has not.
- That the preferred hero option (Option C) is a final production decision. It is copy pressure that survived adversarial synthesis. Che decides.
- That removing protocol language means removing protocol positioning. Option C still communicates that this is different from a marketplace. The protocol identity is present in "holds the money, locks the terms, records every claim" — it just shows up as buyer benefit rather than infrastructure label.
