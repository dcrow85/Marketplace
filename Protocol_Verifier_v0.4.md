# Protocol — Verifier v0.4  (alpha — route authority + bilateral reputation legibility)

> **Status:** alpha. Extends v0.3. **Corrects v0.3's implicit "blind routing is the only good
> route."** It is not: neutral cross-verification is the *default* market primitive, but
> **buyer-designated verification ("route it through *my* shop") is a first-class route** —
> it just carries relationship labels and only gains settlement power by **mutual
> pre-commitment.** Adds **§10 (route authority levels)**, **§11 (the bilateral verifier
> reputation vector — the seller's read)**, **Attack 11 (buyer-designated verifier capture)**,
> and folds the new mechanical binds into §2. Still **design only — nothing built.** On-chain
> binds = **Codex's lane.** Changelog at §16.
> **Spine:** enforced / legible / judged. **No-overclaim is law.**
> **Reviewed artifact:** `Protocol_Verifier_v0.3.md` @ `0d34dd7` (frozen; diff against it).
> **Drills:** `simulations/shop_verifier_conflict_drill.py` (§9, 8/8 with teeth) +
> `simulations/buyer_designated_route_drill.py` (§10/§11, falsifies the route-authority and
> bilateral-legibility binds).

## The revised law (the one-line correction)

> **Cross-verification is the default neutral-market primitive. Buyer-designated verification
> is allowed, but it carries relationship labels and only gains settlement power by mutual
> pre-commitment.**
> Blind routing for *neutrality*; "my verifier" for *trust*. Different authority labels, both real.

## 0–8 (unchanged from v0.3)

§0 verifier = scoped signed claim, never a verdict. §1 calibration **regime-gated** (powered
vs underpowered by cell-atomic effective-N; high value = curated/underwritten, not an open
market). §3 funnel (Tier-0 zero-weight-until-anchored → Tier-1 poisonable anchors → proper
scoring, **two-sided**). §4 portfolio bonds (underwriters carry verifier-grade conflict
treatment). §5 audit-deterrence inequality `p_detect×slash + rep/legal > fraud profit` (E
unmet until numbers exist). §6 outcome-poisoning (9th attack). §7 `LegibilityAgentAttestor`
vs `PhysicalVerifier`; no scalar trust display. §8 residual-risk pricing (method floors,
liability caps, escalation for high-value RAW).

## 2. Trichotomy placement — refined for routes (the v0.4 change)

**ENFORCED** keeps v0.3's mechanical list (active role · verifier signature · verifier ≠
buyer/seller address · scope-hash match · subject-hash anchored · method-hash + physical-
contact flag · bond + tail + exposure cap · liability ruling · replay · payout · **no active
same-`subjectHash` custody/consignment/inventory/ownership claim by the verifier** · flat
outcome-independent **buyer/escrow-paid** fee · N-of-M for high-value RAW · pair caps) and
**refines the routing bind**, because v0.3's "assigned, not seller-picked" was too narrow —
it forbade the legitimate buyer-designated route. v0.4 binds instead:

- the verifier **route class is recorded**: `neutral-routed | buyer-designated` (and for
  buyer-designated, the **authority level**: `private-advisor | settlement-verifier |
  dispute-witness`);
- **neutral-routed** still requires the §9 binds (committed eligible-set root, blind
  selection, signed receipt);
- a **buyer-designated settlement-verifier** can gate settlement **only** with a recorded
  **seller acceptance for `{scope, fee, evidence-floor, appeal-path}`** (the mutual
  pre-commitment, §10.2);
- a **private-advisor** route can **never** slash seller bond or create seller liability —
  authority ceiling enforced (§10.1);
- a **dispute-witness** packet is **not settlement-final** unless the arbitration ladder
  granted it authority (§10.3);
- a **buyer dispute bond** is locked for any buyer-designated settlement route (seller
  protection, §10.4);
- the still-forbidden move: a **seller** unilaterally picking the verifier (v0.3 §9.5) — the
  buyer may designate *with seller acceptance*; the seller may not designate the buyer's
  assurance verifier.

**LEGIBLE** keeps v0.3's list and **adds the bilateral reputation vector** (§11): flag rate
*by scope / value band / seller type / card type*, upheld-vs-overturned-on-appeal,
false-reject estimate, evidence-completeness-when-flagging, harshness/generosity **relative
to peers**, **buyer-verifier pairing concentration**, withdrawal/correction rate, and
underpowered-cell labels. Plus the route's **relationship labels** (`buyer-designated`,
`known relationship`, `not neutral-routed`, `seller accepted this verifier for this scope`,
`not claiming market-wide independence`).

**JUDGED:** whether the verifier is *fair*; whether *this* evidence suffices for *this* buyer;
true physical accuracy; whether to **accept / price / counter-route / require a second
verifier**; whether a "wrong" ruling maps to reality.

**The contract CANNOT enforce** "verifier X is fair" — only "**seller accepted verifier X for
scope Y with appeal path Z**." The reputation vector is *legible*; the seller's agent *judges*.

## 9. Neutral cross-verification (from v0.3 — now explicitly the DEFAULT route, not the only one)

The §9 shop-network model stands: the forbidden primitive (a shop with same-`subjectHash`
economic exposure verifying that subject) and the clean primitive (cross-verification),
blind routing, flat buyer/escrow-paid fee, **Attack 10 (router/assignment capture)** with its
committed-root + receipt + blind-selection + buyer-waiver-override counter-shape. v0.4 reframes
its status: this is the **neutral-routed** class — it *claims market-wide independence*. It is
the default, **not** the sole valid route.

---

## 10. Route authority — buyer-designated verification is first-class  (NEW)

Collectors will say "I trust *my* shop — send it there," and that is legitimate. The design
admits it as a first-class route. The distinction that does all the work: **that verifier is
now buyer-designated, not neutral.** Three authority levels, by how much power the buyer's
shop holds over the *seller*:

### 10.1 Private buyer advisor (buyer-side only)
The buyer's shop reviews listing photos / evidence *before* the buyer commits. It can shape
the **buyer's agent decision** — and nothing else. It **cannot slash seller bond or create
seller liability.** Authority ceiling **enforced** (§2). No seller acceptance needed precisely
*because* it has no seller-side power.

### 10.2 Mutually accepted settlement verifier (power by pre-commitment)
At trade formation the buyer says "route the card to Shop X before settlement." The seller
**accepts or counters.** On acceptance, Shop X becomes a **settlement gate — but only inside
the pre-agreed `{scope, fee, evidence-floor, appeal-path}`.** The settlement power exists
*because of, and only within,* the mutual pre-commitment. Recorded seller acceptance is the
**enforced** precondition (§2); whether Shop X is *fair* stays judged.

### 10.3 Dispute witness (post-hoc, not final by default)
If something goes wrong, the buyer's shop can sign an **evidence packet**. Useful input to
arbitration — but **not final unless the arbitration ladder granted it that authority.**
Enforced ceiling: a dispute-witness packet does not settle anything on its own.

### 10.4 Seller protection (why this is symmetric, not buyer-favoring)
Without guards, a buyer could route *every* card through a friendly shop that **always finds
problems**, and use the flags to extract concessions. So a buyer-designated settlement route
**requires**: pre-agreed **scope**, **flat fee**, **buyer dispute bond**, **verifier bond**,
signed **evidence packet**, and **appeal to an arbiter / neutral panel.** And calibration
measures **both false passes and false rejects** (§3, §11) — so an over-harsh buyer shop does
**not** look "safe" merely because it catches some fakes.

### 10.5 Attack 11 — buyer-designated verifier capture (the mirror of Attack 10)
Attack 10 was the *seller / platform / cartel* capturing the *neutral* router. Attack 11 is the
**buyer** capturing the route on purpose: routing through a captive, reliably-over-rejecting
shop to manufacture concessions or kill a seller's price. Counter-shape (all above, restated as
an attack defense): **seller-acceptance gate** (no settlement power without it), **buyer dispute
bond** (over-rejection costs the buyer), **two-sided calibration + the §11 reputation vector**
(an over-harsh shop's overturn rate is visible), **pairing-concentration limits** (one buyer +
one shop, over and over, is a flag), and **appeal to a neutral panel** (the buyer's shop is not
the last word). Independence ≠ competence cuts both ways: a buyer-designated shop can be honest
*and* wrong, or hostile *and* plausible — the vector, not the relationship, carries the weight.

### 10.6 Product shape
- Buyer profile: **preferred verifier shops.**
- Seller listing policy: **accepts buyer-designated** · **accepts only registry-neutral** ·
  **accepts either.**
- High-value trades can require **`buyer verifier + neutral verifier`** (N-of-M with **≥1
  neutral**), especially **raw grails.**
- Every surface honestly labels a buyer-designated verifier (`buyer-designated`, `known
  relationship`, `not neutral-routed`, `seller accepted this verifier for this scope`,
  `not claiming market-wide independence`) — surfacing a buyer-designated route as "neutral"
  or "independent" is the §9.8 leak, one level up, and is **rejected** (§2).

---

## 11. Bilateral legibility — the verifier reputation vector  (NEW)

Reputation here is **bilateral legibility, not buyer comfort.** Buyer: "route it through my
verifier." Seller's agent: "fine — *what does that verifier's pattern look like?*" The seller
must see more than `flag_rate`, because a high flag rate is **ambiguous**: it could be an
*abusive buyer-side shop* **or** an *excellent specialist who gets sent the risky raw cards.*
The record disambiguates only with **denominators**:

- flag rate **by scope, value band, seller type, card type**
- **upheld vs overturned** flags after neutral appeal
- **false-reject** estimate — not only false-pass
- **evidence completeness** when flagging
- harshness / generosity bias **relative to peer verifiers**
- **buyer-verifier pairing concentration**
- **withdrawal / correction** rate
- **underpowered cells labeled underpowered** (regime gate, §1)

Then the seller's policy becomes natural and *judged from data*:

- **Accept** — buyer's verifier is strict but historically **upheld**.
- **Accept with neutral co-verifier** — buyer-designated **and underpowered**.
- **Reject / counter-route** — flags broadly and gets **overturned**, or is strongly
  **correlated with one buyer cluster**.
- **Accept as private advisor only** — the buyer may consult them, but their claim **cannot
  gate settlement.**

The equilibrium:

> **Buyer can bring their trusted verifier. Seller can see whether that verifier is
> trusted-by-data or just trusted-by-buyer.**

Trichotomy stays clean: the contract enforces *"seller accepted verifier X for scope Y with
appeal path Z"*; it **cannot** enforce *"X is fair."* The reputation vector is **legible**; the
seller's agent **judges** whether to accept, price, counter, or require a second verifier.

---

## 13. Lifecycle (routes added)

intent → agent derives **scope + floor** from the cost field → **route chosen**: neutral
(router assigns from the committed set, §9) **or** buyer-designated (buyer names a preferred
shop; for settlement power the **seller accepts `{scope, fee, floor, appeal}`**, §10.2);
high-value RAW may require **both** (§10.6) → physical inspection → scoped attestation +
evidence signed, **bond + buyer dispute bond + exposure** locked → validator admits (form /
scope / currency / **route class + authority ceiling + seller-acceptance + fee shape**, §2) →
buyer/seller agents **gate** on the **legible reputation vector** (§11) → settle → bond tail
holds → organic + audited outcomes score the verifier **two-sided** (false pass *and* false
reject), feeding the §11 vector.

## 14. Maturity / open (still-unmet — be honest)

Carries v0.3's open list (effective-N threshold + CI math; audit-economics numbers, E unmet;
outcome-provenance/censoring model; underwriting mechanics; **the §2/§9/§10 binds are
specified, not implemented** — chain has `subjectHash`/`scopeSetHash`/buyer-approval/signature,
not routing, fee shape, bond locking/exposure, custody-conflict, route-class, or
seller-acceptance gates; the router is unbuilt). **New v0.4 gaps:**
- the **reputation-vector estimators** (§11) — false-reject estimation, peer-relative harshness
  baseline, and pairing-concentration thresholds are **unspecced**; the denominators are named,
  the math is not.
- the **seller-acceptance + appeal-path** schema (§10.2) and the **dispute-witness authority
  grant** in the arbitration ladder (§10.3) — interfaces to `Protocol_Arbitration` (shared seam).
- **Attack 11 numbers** (§10.5): the buyer-dispute-bond sizing and the over-rejection-detection
  power are qualitative, not quantified.

## 15. Structural caveat (unchanged from v0.3)

Capital-heavy cold-start + portfolio bonds + reputation-collateral **will centralize** the
high-value end. Buyer-designated routes widen *trust paths*, not capital access — a
well-resourced shop chain can still dominate; caps and N-of-M bound, not erase, it. Named, not
hidden.

## 16. Changelog

- **v0.4:** **corrected v0.3's "blind routing is the only good route."** Added **§10 route
  authority** — buyer-designated verification is first-class with three authority levels
  (private advisor / mutually-accepted settlement verifier / dispute witness), honest
  relationship labels, and explicit **seller protection** (pre-agreed scope, flat fee, buyer
  dispute bond, verifier bond, evidence packet, neutral appeal). Added **§11 the bilateral
  reputation vector** (denominators incl. false-reject, upheld-vs-overturned, peer-relative
  harshness, pairing concentration) so the *seller* can read "trusted-by-data vs
  trusted-by-buyer." Named **Attack 11 — buyer-designated verifier capture** (the mirror of
  Attack 10). Refined **§2** to record route class + authority ceilings + seller-acceptance
  gate + buyer dispute bond (v0.3's "assigned, not seller-picked" was too narrow). Falsified by
  `simulations/buyer_designated_route_drill.py`. **Framing held:** neutral for independence,
  "my verifier" for trust — different authority labels, both real.
- **v0.3** (`0d34dd7`, frozen): shop-network conflict & routing model (§9) + Attack 10. Diff target.
- **v0.2** (`a5bf230`, frozen): regime-gated calibration; the legible→enforced fix; 9th attack.
- **v0.1** (`6c2adad`, frozen): the role + trust signal + attack surface A–H.
