# Protocol Fable Review — 2026-07-02

> Independent read of Cairn by Claude Fable 5, acting as fresh verifier (author ≠ verifier).
> **Disclosure of a conflict you should weigh:** the surface lane's author is a Claude model.
> I am a Claude model. I ran this review through four parallel subagents (chain code, web
> surface, spec suite, git history) plus my own reads and live-endpoint checks, but a
> same-family reviewer is structurally softer on same-family prose habits. Treat the code
> findings as strong (they were verified by execution and byte-diff) and the taste judgments
> as one more voice, not an oracle.
>
> **Method / epistemics.** VERIFIED means read at HEAD, executed, or checked on-chain/live:
> `forge test` was actually run (113/113), the deployed Sepolia bytecode was diffed against
> the local build (byte-identical modulo immutables), cairn.cards + api.cairn.cards were
> probed live (200 / `{"qwen": true}`), and the git archaeology below was reproduced by hand.
> INFERRED is labeled inline. Read-only: no repo files were modified except this one.

---

## Finding 0 (most important, and neither agent has noticed): the A1–A4 escrow hardening was silently lost in the June 29 merge

**VERIFIED.** The repo's own records — SYNC.md (multiple entries), Protocol_Rundown_v0.2,
the memory both agents work from — say `MarketplaceEscrow.sol` carries the four GPTPRO
repairs as on-chain gates at "131/131 forge tests": A1 alpha-admission exposure ledgers,
A2 delivery-trigger policy, A3 post-handoff remedy matrix, A4 typed spendability, plus the
registry-canonical cluster/custodian labels that closed the rotation attacks. Three full
author≠verifier round-trips were spent landing and accepting that work (SYNC entries
2026-06-22 → 2026-06-24).

At HEAD, none of it exists:

- `chain/src/MarketplaceEscrow.sol` is **1,680 lines with zero occurrences of "alpha"**.
- Commit `4ba5221` ("Escrow: canonicalize A1 alpha labels") has the 2,808-line version
  with 144 alpha references.
- The test file dropped from 119 to 92 tests; the 27 missing tests are exactly the
  A1/A2/A3/A4/G3/G5 gate tests. Today's true suite count is **113/113 = 9 ThinPilotEscrow
  + 92 MarketplaceEscrow + 12 Inventory** — not 131.
- The loss happened in the lane-reconciliation merge `c521eb4` (2026-06-29), whose SYNC
  entry says every Codex-lane conflict was "resolved to YOUR `main` version verbatim" —
  and `main` evidently predated the A1–A4 commits. The reconciler diligently preserved
  the wrong side, reported success, and three days of subsequent handshakes (including
  "escrow received + reviewed 113/113") never caught that 113 ≠ 131.

Why this is the top finding even though the pilot doesn't deploy that contract: **it is a
falsification of the project's central discipline claim.** Freeze-and-diff, ledger
dispositions, author≠verifier, "report before/after test counts" — the entire SYNC apparatus
exists to make exactly this class of regression impossible, and it not only happened but the
*after* count was reported and accepted without anyone diffing it against the *before*
count. The protocol's thesis is that process makes lies (here: an accidental one) legible.
The process had the number in hand and didn't look at it. There is no CI; every verification
run is a human-initiated command whose result is transcribed into prose. Prose is where this
error lived for three days.

Disposition needed: either restore the `4ba5221` chain work onto trunk (it merges cleanly or
it doesn't — find out), or consciously record its removal in `Protocol_Audit_Findings_Ledger`
with an owner and trigger. And correct every "131/131" in SYNC/Rundown/memory. Silence is
the one option the project's own law forbids.

---

## 1. State vs story

**The honest one-line map:** a 301-line escrow contract, really deployed and byte-verified
on Arbitrum Sepolia, plus a genuinely live catalog/binder/scan/trade web app, sitting under
**~85,500 words of protocol spec (52 `Protocol_*.md` files) — 284 words of spec per line of
deployed Solidity.** Counting the whole root `.md` corpus it's ~135,600 words (~540 book
pages). SYNC.md alone (17,700 words) is ~3× the pilot contract's line count.

The docs are not dishonest — Rundown v0.2 labels the judged layer "designed," Pilot v0.1
says the machinery "stays designed and dormant," and the specs that are pure design say so
in their own headers. The self-awareness is real. But self-aware over-documentation is
still over-documentation:

- **Of ~42,600 words of current-head spec, pilot trade #1 consumes roughly one `require`
  statement (G5.1), one constant (the value cap), the Pilot doc itself, and some UI copy.**
  Verifier v0.4, Insurance v0.3, Catalog_Evidence v0.2, and 9 of Judgment_Independence's 10
  gates are load-irrelevant to the trade the project says is its milestone (VERIFIED by
  tracing each head against `ThinPilotEscrow.sol` and `web/src/`).
- **~26% of the Protocol_* corpus (21,900 words) is "superseded" version bodies that are
  not actually superseded** — the heads are delta docs ("§0–8 unchanged from v0.3"), so the
  frozen files are the current spec's body text wearing an "outdated" banner. Worst of both:
  a reader who trusts the banner reads 40% of the spec; a reader who doesn't reads four
  files per module.
- The 15,190-word audit series audits the spine contract — the one the pilot deliberately
  does not deploy (and which, per Finding 0, is no longer even the audited version at HEAD).
- One internal contradiction the volume helped hide (VERIFIED): **Pilot v0.1's thesis
  promises trade #1 produces "a ground-truth `settled_trade` anchor," but Catalog_Evidence
  v0.2's own CE1 — tightened at Codex's insistence — says a settlement anchors only if it
  adjudicated row/variant/authenticity at scope and the finality tail elapsed. A high-trust
  accept-without-dispute trade adjudicates nothing.** Under the project's own current heads,
  trade #1 produces no anchor. Either CE1 needs a pilot-scope carve-out or the Pilot thesis
  needs its bonus claim deleted.

**Is this over-documented relative to what exists?** Yes — by roughly an order of magnitude
for the pilot's actual needs, with the caveat that the spec work demonstrably produced the
four repairs the deployed contract carries, so its marginal value was not zero. The problem
is the *ratio and the direction of iteration*: four Kepler-reviewed versions of a Verifier
spec for a role that has never once been exercised, while the arbiter for trade #1 — a
person — remains TBD.

## 2. Is the spine held? (no-overclaim audit)

**Held, genuinely — this is the project's best result.** A full sweep of `web/src/`,
`mockups/`, the agent prompts, and the legacy root HTML found the live surface near-clean
(VERIFIED, file-by-file):

- The scan flow never presents a catalog match as authentication; the trade panel disclaims
  twice ("It can't confirm the card is authentic or its grade — a witness, not proof",
  `web/src/trade/TradePanel.jsx:131,214`); no green "verified" identity badge exists;
  `cairn_vision.py`'s prompts open with "You do NOT verify authenticity" and post-check
  with a regex whose flags ride back in the response.

Leaks and watch items, ranked:

1. **`TradePanel.jsx:118`** — seller placeholder `"0x… (a trusted seller)"`. Mild, but
   "trusted" is on the project's own banned list, on the one screen where money moves.
   Should read "a seller *you* trust."
2. **Style ruling needed on green affirmative checks.** The binder modal renders
   "✓ Matches *Penny* · AZK01-001 / ✓ Alpha α stamp detected" in `--have` green
   (`Binder.jsx:274-278`, `binder.css:143`); scanner matches glow green (`scan.css:16`).
   The flag discipline (risk = amber→red, never green) technically holds — green marks
   positive *reads*, not safety — and the witness-not-proof caveat sits directly beneath.
   But a green check over a model's physical-fact read is exactly the glyph Human_Surface
   v0.2's color law exists to police. Decide it on purpose, in the spec, either way.
3. **`cairn_browse.py:65-70` — the `exclude_grails` finding from SYNC 2026-06-24 is NOT
   fixed** (VERIFIED: the only commit touching the file since changed 3 unrelated lines).
   The server hardcodes a "modest budget — skip the grails" cost field into every call for
   every user; "show me holo cards" on the default AZUKI catalog still returns 0 (all 33
   holos are grails). Beyond the UX failure, note the honesty shape: the judged layer is
   reasoning from a standing user preference the user never expressed — a fabricated
   input, which is overclaim's quieter sibling. Also note the process shape: a chain-lane
   finding gets a ledger row and a falsifier test; this judged-lane finding got a SYNC
   mention and then evaporated. The finding-closure discipline is one-laned.
4. Legacy `index.html` at the repo root still carries pre-VEX copy ("museum-grade proof,"
   "authenticity checks"). Not deployed (cairn.cards serves the `web/` build — VERIFIED),
   but it's a loaded gun in the repo; delete or rewrite before it ever redeploys.

## 3. Architecture soundness

**Enforced/legible/judged: load-bearing in exactly two places, decorative-but-disciplined
everywhere else** (VERIFIED by tracing):

- Load-bearing: the spine's typed spendability digest (`SPENDABILITY_DIGEST_TYPEHASH` +
  named forge tests) and `evaluate_gate`'s partition in
  `agent_tools/no_rarity_catalog_tools.py` (the `enforced` list is structurally kept empty
  for catalog claims).
- Decorative: Legibility v0.1's "schema blocks forbidden fields (score/trust/verdict)" —
  the validator exists only inside its own drill file; nothing in the live server, web app,
  or MCP layer imports it. A dev can ship a `trust_score` tomorrow and no machine objects.
  G6 ("catalog match ≠ authentication") survives in the product as hand-written JSX prose.
- In the pilot path specifically, the trichotomy survives **only as UI copy** —
  `ThinPilotEscrow.sol` contains zero occurrences of enforced/legible/judged.

That's not fatal — a convention this consistently kept is worth something — but the docs
present the trichotomy as machinery, and mostly it's culture. Culture is exactly what
Finding 0 shows failing under merge pressure.

**The drills are self-graded homework with good form.** They run, pass as advertised
(re-executed: catalog_evidence 10/10·26/26, insurance 15/15·35/35, alpha_admission 42
negatives), and use real mutation controls. But the spec author wrote the spec, the Python
restatement of its rules, the attack fixtures, and the oracle; no production code imports
any guard function. They verify the drill's model of the spec, not the system. The genuine
verification in this repo is: the forge suites (run against actual contracts), the deployed
bytecode, and the two external reviews (GPTPRO, Kepler). Keep the distinction crisp in
status reporting — "8/8 gates with teeth" reads like system verification and isn't.

**Which single assumption, if wrong, breaks the most?**

- *For trade #1:* **arbiter honesty and liveness.** `Disputed` has no timeout — the only
  exit is `resolve()` (`ThinPilotEscrow.sol:217-224`); a dark arbiter strands the USDC
  forever, and `confirmReturnCustody` accepts the arbiter alone (`:259`), so arbiter+buyer
  collusion takes both card and money. G5.1 guarantees non-party, not honest. VERIFIED.
- *For the protocol:* **"high trust collapses the hard problem"** — the pilot thesis.
  Nothing in trade #1 tests it; a high-trust trade succeeding proves the plumbing, not the
  protocol (those parties would have completed the trade over DMs). INFERRED, but the Pilot
  doc half-admits it ("we are not testing fraud-resistance").

**Where is it overbuilt for a pilot's real needs?** The full 4-contract spine + its
audit series + the four dormant judged-layer spec programs. Where is it *underbuilt*?
Precisely where trade #1 lives — see §5.

## 4. Effort allocation

The git history is unusually legible about this (596 commits, Jun 10 – Jul 2, VERIFIED):

**The cropping saga, as a ledger:** 68 hours, 14 commits, ≥5 production deploys (one of
which broke the live scanner; the revert came 44 minutes later), +1,240/−776 lines — and
the net surviving delta after the July 2 rollback is **+51 lines** of single-card UX.
The Web-Worker crop was device-tested, promoted to production, and deleted **11 minutes
later**. `web/src/scan/recognize.js` churned at 9.1× (996 lines touched per 110 surviving).

**The control group, same repo, same fortnight:** ThinPilotEscrow went spec → implemented
in 9 minutes (Codex picked up the interface seam) → deployed, verified, and wired into the
UI in ~1.6 hours, one implementation commit, zero reverts. Spec prose: <1% ever deleted.

So the pattern is not "the team polishes the wrong things" as a temperament — it's
**bimodal governance**. Where a pre-committed acceptance gate exists (an interface seam, a
forge suite, a review protocol), effort converts to durable product at ~1:1. Where the
quality bar is self-set and aesthetic ("pixel-perfect"), there is no falsifiable definition
of done, verification happens *after* production, and effort converts at ~25:1. The
scanner didn't fail because cropping is hard; it failed because nobody wrote down, before
starting, what crop quality the pilot needed (answer, in hindsight, per Crowley's rollback
call: none). The same author enforces freeze-and-drill on one side of the repo and deploys
an 11MB main-thread OpenCV compile to production on the other.

The subtler form of the same pattern: **spec iteration as displacement activity.** Verifier
v0.3→v0.4 and Insurance v0.2→v0.3 were produced *after* GPTPRO had already ruled those
lanes NO-GO/dormant, while the pilot's actually-blocking surface (evidence persistence,
arbiter view — §5) went unbuilt. Polishing designs that no trade can touch is the
documentation lane's cropping saga; it just never breaks production, so it doesn't get
rolled back.

**What I'd change:** one rule, not a reorg — *no surface or spec work starts without a
pre-committed, falsifiable acceptance test and a named consumer* ("trade #1 needs X" or
"user asked for Y"). The escrow lane already works this way. And add CI (forge + web build
+ test-count assertion on trunk), which converts the SYNC prose numbers into machine facts
— the cheapest single hardening available to this repo (see Finding 0).

## 5. Path to the first real trade

**Escrow is not the blocker. People and record-keeping are.** What must be true, against
what's true today (all VERIFIED against `web/src/` and Pilot v0.1):

| Requirement | Status |
|---|---|
| Escrow deployed, correct | ✅ done — byte-verified on Sepolia, 4 repairs present, `nextTradeId`=1 |
| Trade UI: full loop | ✅ built (create/fund/ship/receive/accept/dispute/resolve/return-custody/cancel) — with gaps: no SPLIT ruling UI though the contract supports it; counterparty must paste a trade id into a "# load" field; no trade list or notification |
| **Arbiter (a person, not Crowley)** | ❌ TBD — the pilot's own open item |
| **Seller + card** | ❌ TBD |
| **Evidence bound to the trade** | ❌ absent — card ref and terms are free text hashed client-side; **the plaintext is stored nowhere**; scan/binder photos live in per-browser IndexedDB, never linked to a tradeId; R2 not landed |
| **Arbiter can read the dispute** | ❌ absent — dispute reason is hashed and discarded; there is no evidence-packet view. The arbiter of trade #1 literally cannot see what was agreed or what is disputed through the app |
| Token-gate + PFP identity (a "locked" pilot decision) | ❌ spec'd only — gate is plain Privy login (`App.jsx:63-74`), zero ERC-721 checks in `web/src` |
| Stage 2 (Arbitrum One + real USDC) | ❌ config swap + a funding/onboarding path for a non-crypto buyer (none exists in-app) |

The sharp way to say it: **the pilot's success criterion — "the evidence record is rich
enough to arbitrate a hypothetical condition dispute" — is unmeetable by the current app.**
Cairn's one-word identity is *witness*, and the thing the implementation cannot yet do is
remember. Hashes with no retained preimages are the opposite of a witness: they prove
someone said something once, retrievable by no one.

Contract-level process rules trade #1 also needs (from the code review, all real):
a written arbiter-liveness commitment (no `Disputed` timeout); both parties sanity-check
`inspectionWindow` before shipping (it's buyer-chosen, unbounded, in **seconds** — a typo
either evaporates the buyer's dispute right or locks the seller's payment indefinitely);
seller calls `markShipped` before physically mailing (cancel/ship race, `:265-274`); buyer
calendar-blocks the deadline (deemed-accept pays the seller by default; `openInspection` is
permissionless after 14d regardless of actual delivery, so an unwatched clock converts
buyer inattention into seller payment even for a package that never arrived).

## 6. Blind spots / adversarial

1. **Verification-by-transcription (proven, not hypothetical).** Finding 0 is the exhibit:
   no CI, all numbers travel through prose, and a wrong number survived three days of the
   most process-disciplined two-agent log I've seen. The discipline measures what the
   authors point it at; nothing watches the trunk itself.
2. **No third party has ever used the product.** Every "verified live" in SYNC is the
   author verifying the author (16/16, 15/15, 113/113 — all self-run). The external
   reviews (GPTPRO, Kepler) reviewed *packets and specs*, not the running system. Trade #1
   will be the first time any claim meets a user who didn't write it — and the first user
   is the project's principal, which is still not independence.
3. **The economic comparison is unexamined.** The pilot thesis is that an honest trade is
   *better* through Cairn than "DMs + PayPal G&S." Nobody has priced the comparison from
   the user's side: PayPal G&S gives a buyer mature, litigated protection at ~3% with zero
   wallet friction; Cairn v1 offers an uninsured (G3), self-arbitrated flow that requires
   USDC on Arbitrum, a Privy wallet, seconds-denominated timers, and a 14-day vigilance
   obligation, with the "record" not yet persisted. For trade #1 with friends this doesn't
   matter; for Stage 3 ("widen the circle") it is the whole game, and there is no spec —
   85k words, none on why the marginal honest user switches. (INFERRED, but the absence is
   checkable: grep the corpus for a friction or cost comparison; I found none.)
4. **In trust terms, the wild-failure mode is social, not cryptographic.** Token-gating to
   a high-trust circle imports the community's trust into the UI, and the UI's polish
   re-exports it as perceived safety — the amber caveats are read by nobody in a circle
   that already trusts each other. The first *dispute* (not the first trade) is Cairn's
   real test, and it will be adjudicated by a hand-picked arbiter with unilateral custody
   attestation power, inside a friendship graph. A messy outcome doesn't degrade
   gracefully; it becomes a story in the community that gated entry. (INFERRED.)
5. **Same-family review saturation.** Claude reviews Claude's lane; Codex and Claude
   review each other under a shared culture and shared memory files; Kepler reviews
   packets both wrote. The reviews are genuinely adversarial in content but drawn from a
   small, correlated pool — and Finding 0 shows the pool's shared blind spot (trusting the
   transcript). A cheap widening: give an outside reviewer *repo access* rather than
   packets (GPTPRO's own caveat said exactly this).

## 7. Highest-leverage next moves (ranked)

1. **Reconcile the lost escrow work + add CI.** Decide the fate of `4ba5221`'s A1–A4
   contract (restore to trunk or ledger its removal); fix every stale "131/131" claim; add
   a CI job that runs `forge test` + the web build on trunk and fails on test-count drift.
   Half a day; converts the project's central discipline claim from prose back to fact.
2. **Build the trade record, then stop.** Persist terms/card-ref/dispute plaintext keyed
   by tradeId + bind photos (R2 or even a simple KV for the pilot) + a read-only
   arbiter/counterparty view. This is the minimum that makes the pilot's own success
   criterion meetable, and it is the product's identity ("a witness that remembers").
   Nothing else on the surface backlog matters until this exists.
3. **Name the arbiter and seller; write the one-page trade-#1 runbook** (arbiter-liveness
   commitment, agreed inspection window with sanity bounds, markShipped-before-mailing,
   calendar the deadline, SPLIT ruled via cast/CLI if needed). Run trade #1 on Sepolia
   within days — the contract is ready and the remaining blockers are decisions.
4. **Freeze the judged-layer spec heads until one settled trade exists**, and when
   spec-writing resumes, consolidate each module's delta chain into a single canonical
   file. The next spec word written before trade #1 should be in the Pilot runbook or
   nowhere. (Also: resolve the Pilot-thesis vs CE1 anchor contradiction explicitly.)
5. **Three small honesty fixes on the live surface:** remove the hardcoded modest-budget
   `COST_FIELD` from `cairn_browse.py` (the 8-day-old unfixed finding); reword the
   "trusted seller" placeholder in `TradePanel.jsx:118`; make a written style ruling on
   green checkmarks over model reads. One sitting.

---

## Verdict

The spine is real: a small, correct, byte-verified escrow; a shipped surface whose copy
demonstrably obeys the hardest discipline in the repo; an external-review loop that changed
the architecture instead of decorating it. Cairn's claim to be "a witness, not proof" is
kept almost everywhere it's cheap to keep and — this is the uncomfortable part — broken in
the two places it's expensive: the witness doesn't yet *remember* (no persisted evidence,
no readable dispute), and the witness's own ledger mis-stated what code it was carrying for
three days. The 85,000 words are not wrong, but they are answering questions trade #1
doesn't ask, while the questions it does ask — who arbitrates, what's on the record, who
noticed the merge — went begging. Run the trade. The protocol has out-designed its evidence
for a month; the only thing that can catch it up is a settled trade with a real record —
and per its own CE1, even that will be a datapoint, not an anchor. Good. Witness, not proof,
applies to Cairn too.
