# Protocol Collector Aperture v0.1

Generated 2026-06-12.

The Collector Aperture is the human's attention contract, written in their own
language and compiled by an agent into a signed, budget-constrained policy. It is
the single artifact that joins three things a collector states in one breath:
what they want, how much risk they will pay to remove, and when they want to be
interrupted. It is the configuration layer for human-legibility — it programs
both what the agent pursues and what reaches the human.

Relationship to the rest of the protocol:

```text
protocol  -> legibility (for agents)
agent     -> understanding (for this human)
aperture  -> the policy that tells the agent which understanding this human wants,
             at what altitude, and what they will spend to get it
```

The aperture is `judged`, never `enforced`: it configures agent behavior; it does
not move funds or prove anything. The per-trade `buyer_want` packet is a
projection of the aperture onto one hunt.

## Core principles

```text
1. Collector-native, not form-native. The aperture is captured from natural
   language ("PSA 8 for my collection"), never a settings panel. The agent
   compiles; it does not interrogate.
2. One sentence, two policies. The same utterance sets the search policy AND the
   interruption policy. They are separable in the schema, joined in the human.
3. Risk is purchasable. "Pay for less risk" compiles to a budget-constrained
   optimization over the legibility vector, spent through real instruments.
4. Parse, reflect back, sign. The agent reflects the parsed aperture back as a
   sentence in the collector's language; the human's confirmation is the mandate.
5. Surface contradictions, never silently relax. An infeasible or self-
   contradictory aperture is a decision for the human, not a constraint for the
   agent to quietly break.
6. Known axes, open values. Never enumerate persona types. The dimensions are
   fixed; the values and emphases are freeform.
7. Living and portable. The aperture is calibrated from the collector's own
   outcomes and owned by the collector, carryable across agents.
8. Desire is not fact. The aperture may interpret human desire; it may never
   promote desire into protocol fact (catalog match, possession, authenticity,
   price truth, spendability).
```

## Dimension schema

```text
schema: marketplace.collector_aperture.v0.1
aperture_id
collector_ref
created_at / updated_at
source_utterance            # the raw collector sentence(s), preserved verbatim

want:
  catalog_ref               # a specific card, or an open hunt descriptor
  form: raw | graded | either
  set / variant / language constraints
  open_hunt: bool           # "any vintage Charizard" vs "this exact row"

condition:
  grade_floor               # PSA 8 / BGS 8.5 / raw LP+ / etc.
  attribute_emphasis        # corners / centering / surface / edges, weighted
  deal_breakers             # creases, trimming, restoration, fading

purpose: keep | flip | either
  # keep -> the specific copy's character; pay up for the right one
  # flip -> grade, liquidity, resale comps; the copy is fungible at grade

risk:
  posture: minimize | balance | tolerate
  certainty_budget          # $ or % of price the buyer will spend to reduce risk
  instruments_allowed       # verifier review / insurance / higher bond / attention
                            #   fees / higher-calibration sellers / deeper escrow

price:
  ceiling
  premium_tolerance         # extra for speed, certainty, or the right copy
  pricing_policy_ref

time:
  urgency: now | patient | indefinite
  deadline                  # optional

attention_contract:
  default_altitude: glance | decide | audit
  surface_events            # named moments to ping: ship, arrival, over_budget,
                            #   claim_opened, verifier_flag, contradiction
  reserved_judgments        # judged moments the human keeps (arrival inspection,
                            #   authenticity sign-off, final accept)
  delegated_judgments       # judged moments delegated to agent policy
  spend_authority           # max the agent may spend without asking

seller_trust:
  calibration_floor         # source_calibration the buyer requires
  bond_floor_preference
  imported_trust_acceptance # how much imported (vs native) reputation counts

boundaries / not_claiming

provenance:
  reflected_back_confirmed: bool
  signed_by_collector
  calibration_history_ref
  portable: true
```

## How an agent should interpret (the pipeline)

The interpretation is an eight-step pipeline. Steps 1-6 happen before any
protocol action; 7-8 are ongoing.

### 1. Parse into touched vs untouched

Read the utterance and mark each dimension as `touched` (explicitly stated),
`inferable` (strongly implied), or `open`. Preserve `source_utterance` verbatim
so the parse is auditable against what was actually said.

```text
"PSA 8 for my collection" ->
  touched:    want, condition.grade_floor=PSA 8, form=graded, purpose=keep
  inferable:  time=patient (collection + specific grade), risk.posture=balance
  open:       price.ceiling, attention_contract, seller_trust
```

### 2. Default the cheap, ask the costly

For each `open` dimension, decide default-vs-ask by the SKILL rule: ask only when
the next decision has meaningful cost. Price ceiling and spend authority have
meaningful cost -> ask. Attribute emphasis on a graded slab has low cost (the
grade summarizes it) -> default. Never batch into a form; ask at most one or two
questions, in collector language.

### 3. Detect contradiction and infeasibility — surface, do not relax

Before acting, check the aperture against reality:

```text
- internal contradiction: "PSA 8 but under $400" when 8s clear $600
- infeasible scarcity: "this exact 1996 No Rarity Charizard PSA 10" (population
  may be ~zero at the ceiling)
- risk/price tension: "minimize risk" + "cheapest" + "now" cannot co-maximize
```

When found, surface it as a decision in the collector's words, naming the
options — never silently drop the weakest constraint:

```text
"PSA 8 No Rarity Charizards are running ~$600. Lift the ceiling, drop to a 7,
or wait for a deal?"
```

Silently satisfying an impossible aperture is laundering — the upstream cousin
of a verdict-shaped legibility score.

### 4. Compile risk into a budget over the legibility vector

Map `risk.posture` + `certainty_budget` to target bands on the legibility-vector
dimensions and to the instruments that buy them (see the table below). "Pay for
less risk" = raise `coverage`, `independence`, `cost_to_fake`, `source_calibration`
and spend the budget to do it. This is the buyer-side mirror of the deterrence
model: the buyer is raising the evidence floor on their own behalf.

Re-target by form: a raw-card aperture spends on corners/holo/nonce; a graded
aperture spends on cert lookup and slab-authenticity (the risk moves from
condition judgment to "is this slab real"), which selects a different evidence
profile (e.g. the NR-D slab profile) — not more corner photos.

### 5. Compile attention into a compression altitude

Map `attention_contract` to the three altitudes from the human-legibility layer:

```text
default_altitude   -> the resting surface (glance for low-touch collectors)
surface_events     -> the only unsolicited interruptions
reserved_judgments -> the moments that MUST surface as a decide-altitude prompt
delegated_judgments-> handled silently under policy, expandable on "show me why"
```

"Ping me when it ships, I'll confirm on arrival" compiles to: glance default,
surface_events=[ship], reserved_judgments=[arrival_inspection]. Everything else —
evidence negotiation, verifier choice, route, attention fees within
spend_authority — runs silent.

### 6. Reflect back, then sign

Render the compiled aperture as one or two sentences in the collector's own
register and get confirmation. The confirmation IS the signed mandate; an
unconfirmed aperture cannot authorize spending or delegate a judged moment.

```text
"So: I'll hunt a PSA 8 No Rarity Charizard for the collection, up to $1,400,
lean toward less risk even if it costs a little, and only surface to confirm
shipping and on arrival. Yes?"
```

The reflect-back is the right-to-audit applied to the aperture: the human
verifies the agent understood before delegating attention to it. It stays
revisable in the same language at any time.

### 7. Bind and gate

The signed aperture gates agent behavior: it bounds `spend_authority`, names the
`reserved_judgments` the agent may not auto-accept, and sets the altitude. The
agent must not exceed spend authority or auto-resolve a reserved judgment without
returning to the human — these are hard mandate boundaries, not preferences.

### 8. Calibrate from outcomes

After settled trades, update the aperture from what the collector actually did:
accepted/passed, complaints ("corners worse than the photos" -> raise corner
emphasis and coverage), over/under-spend on certainty. The aperture converges on
the collector; the calibration history is part of their portable profile.

## Risk-as-budget mapping

```text
posture   target legibility bands              instruments spent
--------  ---------------------------------    ----------------------------------
minimize  coverage high, independence high,    verifier attestation required,
          cost_to_fake high, calibration       route insurance required, higher
          strong; widen evidence floor         seller bond floor, attention fees
                                               freely within budget, prefer native
                                               + high-calibration sellers
balance   coverage mid-high, independence      attention fees for the load-bearing
          mid; evidence floor at profile       gaps (symbol crop, nonce); verifier
          default                              only if value tier or thin trust
tolerate  coverage at floor; accept legible    minimal spend; rely on bond +
          gaps with named residual risk        accept-with-waiver; speed over depth
```

Hard rule: the agent spends against `certainty_budget` toward these bands; it
never reports the result as a trust score. The output to the human is a decision
with named residual risk, never a number.

## Honesty constraints

```text
- The aperture is a policy, not a promise. It does not guarantee the card will
  be found, be authentic, or be in the stated condition.
- The agent may interpret desire; it may not promote desire into protocol fact.
- Reserved judgments may never be auto-accepted; spend authority may never be
  exceeded.
- An infeasible aperture is surfaced, not silently satisfied.
- The compression the aperture authorizes must stay expandable: every silent
  decision is one "show me why" from its legible source.
```

## Living and portable

The aperture is owned by the collector and signed by them. It carries a
calibration history (what they accepted, passed, complained about) that sharpens
it over time and travels with them across agents — the same portability the
protocol gives reputation. Your taste is yours.

## Worked examples

### A. "Get me this card, I'll pay for less risk, ping me when it ships, I'll confirm on arrival."

```text
parse:    want=this card; risk.posture=minimize, certainty_budget=implied-yes;
          attention: default=glance, surface_events=[ship],
          reserved_judgments=[arrival_inspection]; open: price.ceiling,
          condition, purpose
ask:      one question — ceiling and any condition floor
compile:  require verifier + insurance, prefer high-bond/high-calibration seller,
          spend attention fees within budget; glance until ship; arrival is the
          one decide prompt: "here it is — is it the right thing?"
reflect:  "I'll find it, lean hard toward less risk within your $___ ceiling,
          ping you when it ships, and only need you on arrival. Yes?"
```

### B. "I want this in PSA 8 for my collection."

```text
parse:    want; condition.grade_floor=PSA 8, form=graded; purpose=keep;
          inferable: time=patient; open: price.ceiling, risk, attention
re-target: graded -> the risk is slab authenticity, not raw condition. Spend on
          cert lookup + slab packet (NR-D profile), not corner photos.
ask:      ceiling; default glance + arrival unless told otherwise
reflect:  "A PSA 8 No Rarity Charizard for the collection, up to $___, with a
          cert check before funds move. I'll surface on arrival. Yes?"
```

## Relationship to existing packets

```text
- buyer_want.v0.1 is the per-trade projection of an aperture (condition_floor,
  max_total_price, evidence_expectation, human_contact_policy, agent_boundaries
  are aperture fields narrowed to one hunt).
- legibility_vector.v0.1 is what the risk budget optimizes over.
- The enforced/legible/judged trichotomy defines which moments are reservable.
- external_trust_import feeds seller_trust.calibration_floor.
```

## Open questions

```text
- Reflect-back fidelity: how much of the compiled policy to surface vs keep
  implicit? (Confirm the spendy/reserved parts; keep the rest expandable.)
- One aperture per collector, or per-collection (a keeper's grail aperture vs a
  flip aperture can coexist)? Likely many, named.
- Calibration honesty: the aperture learns from outcomes, but small-N applies —
  do not over-fit a taste profile on three trades.
- Where the aperture is signed and stored so it is portable but not a tracking
  surface (personal data minimization).
```
