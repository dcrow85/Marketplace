# Agent Execution Change Spec — Audit Register

Artifact: `Protocol_Agent_Execution_Change_Spec_v0.1.md`
Draft audited: initial 637-line 2026-07-21 candidate
Status: fixed-hash prose-design closure complete; implementation not authorized
Author: Codex/Kepler

## Review chairs

1. Informed architecture/compatibility chair
2. Informed authorization/security/recovery/privacy chair
3. Context-blind protocol chair given only the artifact and repository

All three were read-only and independently returned findings before remediation.
No chair reported a P0. Findings below consolidate overlaps; each source finding
has one disposition.

## Findings and dispositions

| ID | Sev. | Consolidated finding | Disposition | Remediation in current candidate |
|---|---:|---|---|---|
| AE-001 | P1 | Review, taint, compartment, control, and policy choices were not carried through authorization, gate, redemption, action, and receipt | accepted_and_fixed | Added immutable `ExecutionBindingSet`; required complete v0.2 chain schemas and deletion/substitution mutants |
| AE-002 | P1 | Connection embedded mandate refs while mandate embedded connection ref, creating an immutable hash cycle | accepted_and_fixed | Connection has no reverse grant/mandate refs; discovery is a private server-owned index; authority points one way |
| AE-003 | P1 | Mandate v0.3 was a partial overlay with duplicate limits and cross-product selector arrays | accepted_and_fixed | Replaced with one closed standalone v0.3; atomic repeated scope tuples; global constraints intersection-only; fresh signature required |
| AE-004 | P1 | Principal commands, immutable definitions, mutable service state, and effectiveness receipts were collapsed | accepted_and_fixed | Split connection authorization/state, compartment definition/state, control authorization/state/receipt; current heads checked online |
| AE-005 | P1 | Two compartments could alias one provider balance under separate ledgers | accepted_and_fixed | Added canonical economic-resource key, one namespace per resource, current backing attestation, and atomic multi-ledger commits |
| AE-006 | P1 | Refund accounting and receiver finality depended on unbound policy | accepted_and_fixed | Added signed AccountingPolicy and ReceiverFinalityProfile bound through review, binding set, gate, and receipts; reject stale/regressive events |
| AE-007 | P1 | Taint map omitted consequential/private fields and allowed model-signed typed output to launder values | accepted_and_fixed | Closed capability field registry, complete-set equality, signer-role authority matrix, exact value digests, unknown/omitted field denial |
| AE-008 | P1 | Cancellation lacked separate authority/effect semantics and conflicted with the baseline state machine | accepted_and_fixed | Cancellation is a new ActionRecord/effect with one-shot control, original receiver operation binding, its own idempotency and receipt; original reaches `failed:receiver_cancelled` only from receiver proof |
| AE-009 | P1 | New reads and activity surface lacked an ACL/DataGrant matrix | accepted_and_fixed | Added per-operation principal/runtime/adapter access matrix, summary/detail split, field grants, and side-channel requirements |
| AE-010 | P1 | Proposal-only and execution profiles were not isolated at resource, bundle, registry, or route boundaries | accepted_and_fixed | Fixed exact profile ID, base hash, separate resources/routes/MCP identity, envelope bundle/registry bindings, cross-profile rejection |
| AE-011 | P1 | Phase-2 provider review could disclose data or create provider state while claiming no external effect | accepted_and_fixed | Phase 2 is pure/local or uses previously authorized imports; live provider review moves to a separately authorized later effect |
| AE-012 | P1 | Agent-callable reconciliation could be misread as authority to supply receiver finality | accepted_and_fixed | Reconcile only requests adapter query; adapter-only quote/event imports bind authenticated raw source, event ordering, action/effect/lineage, and finality profile |
| AE-013 | P1 | Quote totals and warning decisions were not deterministic | accepted_and_fixed | Added authenticated QuoteSnapshot, unique typed cost roles, checked total formula, one asset; delegated warnings all deny and human warning acknowledgement is signed |
| AE-014 | P2 | Unconditional runtime/OAuth gate broke principal-direct checkout and closed bindings; connection transport binding weakened neutrality | accepted_and_fixed | Added discriminated agent/principal/closed authentication branches; mandate binds runtime/resource, not transient transport; DataGrant only for private reads |
| AE-015 | P2 | Window/clock/DST semantics were not normative | accepted_and_fixed | v0.3 permits only rolling half-open windows on authenticated authority-service UTC reservation time; civil windows are nonconforming |
| AE-016 | P2 | Refreshed quotes could create a new effect while an earlier attempt remained live/unknown | accepted_and_fixed | Added stable principal-authorized lineage ID and lineage-level live/unknown duplicate block |
| AE-017 | P2 | Human mode labels did not compile every disclosure, authority, and reservation prerequisite | accepted_and_fixed | Added closed capability prerequisite matrix and multi-object single-ceremony rule |
| AE-018 | P2 | v0.2→v0.3 adapter path was mechanically impossible for new required fields | accepted_and_fixed | v0.2 is proposal/supervised-only; delegated execution always requires fresh principal-signed v0.3 |
| AE-019 | P2 | Operation list was shorthand, incomplete, and composition-ambiguous | accepted_and_fixed | Added exact standalone registry candidate, base-operation preservation, distinct execution reads, provider imports, caller/access classes, and composition law |
| AE-020 | P2 | Cross-binding hash equivalence was impossible across different runtime signatures | accepted_and_fixed | Exact hashes required for same runtime across HTTP/MCP; cross-runtime test uses a defined semantic projection and expects authority/receipt hashes to differ |

## Closure round one residuals

One new blind chair and two informed replay chairs audited fixed spec hash
`346334b8b78ba32e76b6c6ca42d633333500be580ef0f441b1eae5e62ad07ea4`.
The blind chair found one P0, three P1, and three material P2; the informed chairs
converged on the same disclosure/resource/lineage/reservation seams. They are
dispositioned below before a new fixed-hash closure round.

| ID | Sev. | Residual | Disposition | Remediation |
|---|---:|---|---|---|
| AE-021 | P0 | `execution_mode:supervised` mandate could satisfy the “authorization OR mandate” branch without one-shot human consent | accepted_and_fixed | v0.3 now permits only `preauthorized`; supervised is a schema-discriminated v0.2 ActionAuthorization branch |
| AE-022 | P1 | Disclosure authority appeared in prose but not the binding/gate/reservation/receipt chain or registry | accepted_and_fixed | Binding set now carries exact authorization/payload/fields/audience/purpose/envelope and disclosure fence; outbox consumes it atomically; registry and mutants added |
| AE-023 | P1 | Economic resource key included the controlling Cairn ledger, so the same backing account could choose two ledgers and two keys | accepted_and_fixed | Key now excludes Cairn namespace and derives from provider-authenticated root account/asset/enforcement locus; sublimits require disjoint proof |
| AE-024 | P1 | Runtime could choose a new lineage under a reusable mandate and bypass an unknown prior effect | accepted_and_fixed | Mandate tuple now signs a server-derived lineage policy; service atomically allocates/fences sequence; runtime IDs deny; supervised allocation becomes usable only after signature |
| AE-025 | P2 | Reservation necessarily changed compartment H0 to H1 while stale-head law demanded H0 remain current | accepted_and_fixed | Binding authorizes H0; reservation proves exact H0→H1; gate/redemption require current named H1 and reject any other delta/head |
| AE-026 | P2 | Compartment still allowed undefined civil/DST windows outside the rolling-only mandate rule | accepted_and_fixed | Compartment v0.1 now permits rolling windows only; civil time is nonconforming |
| AE-027 | P2 | Registry omitted DataGrant/disclosure lifecycle and had a second mandate-revoke path | accepted_and_fixed | Added exact DataGrant/disclosure operations; mandate revoke is only unified execution-control revoke |
| AE-028 | P2 | Frozen proposal preparation had no deterministic bridge to v0.2 execution action | accepted_and_fixed | Added distinct `execution_action.prepare`, deterministic new ID, immutable optional source-preparation refs; base action ID never upgrades |
| AE-029 | P2 | A2A was allowed without an effectful transport profile | accepted_and_fixed | A2A removed from v0.1 execution connection; future profile required |

## Closure round two residuals

Two new context-blind chairs and one informed security replay audited fixed spec
hash `703c16f51f494124210ac0396dd7c22c5177118f32e8766f06b98315e6b98d3e`.
No chair found a P0. Their independent findings converged on authority proof,
lineage, aliasing, disclosure handoff, and operation-composition seams.

| ID | Sev. | Residual | Disposition | Remediation |
|---|---:|---|---|---|
| AE-030 | P1 | A finalized occurrence could receive a new lineage sequence and repeat the same signed purchase | accepted_and_fixed | Signed occurrence now has a one-completion tombstone; retries require receiver-confirmed non-completion and a repeat requires a fresh principal-signed occurrence |
| AE-031 | P1 | Confirmation assurance was a claim inside authority rather than independently verified ceremony evidence | accepted_and_fixed | Added signed `ConfirmationReceipt` with exact authority/challenge/RP/evidence/UP/UV/verifier/policy bindings and distinct one-shot versus mandate-issuance rules |
| AE-032 | P1 | The same economic root could be relabeled through different enforcement-locus values | accepted_and_fixed | Root key now excludes Cairn namespace and locus; only provider-verified disjoint child sublimits derive a child ledger |
| AE-033 | P1 | Receiver finality profile did not prove applicability to the exact operation/event/adapter/account | accepted_and_fixed | Added exact applicability tuple and equality checks through gate and importer |
| AE-034 | P2 | Requiring one globally current post-reservation head would reject valid concurrent reservations | accepted_and_fixed | Current head may advance only with a proof that this exact reservation remains active in its canonical root plus all current limit/control rechecks |
| AE-035 | P1 | A prose-only `closed_binding` authentication branch could bypass exact external-runtime controls | accepted_and_fixed | Removed branch; external runtimes require fixed OAuth proof-of-possession, while principal-direct is an explicit connection-null branch |
| AE-036 | P1 | Recovery authority and privacy were not typed, permitting resume, widening, or excess reads | accepted_and_fixed | Added finite recovery grant limited to pause/freeze/revoke and minimal status; resume and new authority require the newly authenticated principal |
| AE-037 | P1 | Supervised/principal-direct lineage and accounting could accidentally consume a mandate ledger | accepted_and_fixed | Added provisional signed-occurrence lineage allocation and a discriminated reservation ledger union; one-shot mode has authorization-consumption and no mandate ledger |
| AE-038 | P1 | Cancellation lacked a valid one-shot authority object and could not identify a timed-out provider operation | accepted_and_fixed | Added exact `CancellationAuthorization`, receiver/account/state binding, and authenticated provider-ID or precommitted-client-reference locator union |
| AE-039 | P1 | Gate and outbox both appeared to consume disclosure authority, while DataGrant revocation had no online head | accepted_and_fixed | Gate validates only; outbox rechecks DataGrant/disclosure heads and atomically consumes at handoff; ambiguous disclosure cannot retry without proof or new authority |
| AE-040 | P2 | Reusing frozen `capabilities.get` in an execution registry made composition impossible | accepted_and_fixed | Execution registry is a separately namespaced overlay with its own capabilities operation and pinned base dependency pair; no frozen operation is copied |
| AE-041 | P2 | Direct checkout lacked ordering and honest partial-failure semantics across terms and payment | accepted_and_fixed | Added signed `CheckoutGroup`; payment waits for authenticated exact terms confirmation and every partial/unknown state remains visible without rollback |
| AE-042 | P2 | Execution preparation required a binding set but was ordered before it, and caller idempotency could fork bridges | accepted_and_fixed | Binding set now precedes execution preparation; semantic tuple has one bridge ID and caller keys only replay or conflict |

## Closure round three residuals

Two fresh context-blind chairs and one informed security replay audited fixed spec
hash `a73529f70746ae0a785279bc5fc9e9cce9fb570fbc625d1b5ccb5d2e840ecdc7`.
No chair found a P0. All independently identified P1 and material P2 findings
were accepted and remediated in candidate
`27948ae2e11b4791c3a6bce1268554e8d53eff40ce71cb45339fe7f8481d6113`.

| ID | Sev. | Residual | Disposition | Remediation |
|---|---:|---|---|---|
| AE-043 | P1 | Cancellation sat outside confirmation, review, gate, executor, and finality bindings | accepted_and_fixed | Added cancellation authority branch, exact cancellation context in binding set, fresh confirmation receipt, review/taint/executor bindings, and operation-applicable cancellation finality |
| AE-044 | P1 | Checkout ordering was only prose/coordinator state and its atomic-provider exception was unsafe | accepted_and_fixed | Added pre-authority group core, role binding in both binding sets/authorizations, signed current state head and terms receipt in payment gate chain; v0.1 atomic-provider ref must be null |
| AE-045 | P1 | Supervised lineage created a BindingSet→Authorization→AllocationReceipt content cycle and mandate allocation was ordered too late | accepted_and_fixed | Replaced allocation pre-ref with one immutable provisional LineageCommitment before binding; reservation atomically activates it and downstream objects carry the activation receipt |
| AE-046 | P2 | Ambiguous disclosure retry could rewind a one-shot consumed fence | accepted_and_fixed | Ambiguous handoff remains consumed; every retry requires a fresh principal-signed disclosure authorization and reservation |
| AE-047 | P1 | Confirmation challenge commitment and final authority hash formed a cycle | accepted_and_fixed | Authority now carries only a fresh nonce/policy; the final challenge has one published domain-separated formula computed after the authority hash |
| AE-048 | P1 | Root key used a provider alias while uniqueness prose used provider trust domain | accepted_and_fixed | Key uses a registry-canonical trust-domain ID; all API/MCP/adapter aliases resolve in the same uniqueness transaction and unknown/conflicting maps deny |
| AE-049 | P1 | Finite DataGrant reads had no atomic count consumption across interfaces | accepted_and_fixed | Every private read CAS-decrements one shared state and commits a response-handoff receipt before bytes; ambiguity consumes the read |
| AE-050 | P2 | DisclosureAuthorization had no online revocation head or revocation route | accepted_and_fixed | Added signed state head/root/nonce and exact revoke/state operations; revoke atomically invalidates held reservations without retracting delivered bytes |
| AE-051 | P2 | Optional source-preparation choice and refreshes could fork or deadlock bridge identity | accepted_and_fixed | Service discovers canonical source; identity is one ActionRecord per binding-set hash; refresh gets a new record but shares one activatable lineage commitment |
| AE-052 | P2 | A current attestation declaring `cairn_ledger_only` could appear eligible for delegated value | accepted_and_fixed | Preauthorized value now universally denies that class regardless of freshness |
| AE-053 | P1 | Scoped pause/revoke heads and precedence were untyped | accepted_and_fixed | Added closed scoped-head schema/root and restriction lattice; any restrictive ancestor denies and child active/resume cannot override it |
| AE-054 | P1 | Reconnecting the same runtime could revive an old mandate | accepted_and_fixed | Mandate signs one exact connection authorization; a later connection never substitutes and requires a new principal-signed mandate |
| AE-055 | P2 | BindingSet had no constructor/read operation and predecessor objects could not carry its future hash | accepted_and_fixed | Added sole issue/get operations and one-way graph law: predecessor refs flow into the set; only later objects carry the set |
| AE-056 | P2 | Nonfinancial effects were forced to fabricate money, quote, accounting, and compartment objects | accepted_and_fixed | Added closed financial/nonfinancial prerequisite union; nonfinancial forbids fabricated money while external effects still require receiver finality |
| AE-057 | P2 | Live provider review had no separately effectful operation path | accepted_and_fixed | It is an ordinary authorized `obtain_provider_review` effect; adapter-only artifact import feeds pure review evaluation |
| AE-058 | P2 | Redemption was said to reference a DisclosureReceipt that only exists after outbox handoff | accepted_and_fixed | Redemption carries reservation/outbox claim only; the later immutable action-receipt transition carries the disclosure receipt |

## Closure round four residuals

Two fresh context-blind chairs and one informed security replay audited fixed spec
hash `27948ae2e11b4791c3a6bce1268554e8d53eff40ce71cb45339fe7f8481d6113`.
No chair found a P0. The round's P1 and material P2 findings were accepted and
remediated in candidate
`308142394ac9ff97fe514cb1a6029d369a7c9655c9dede9369d918537fc33f1c`.

| ID | Sev. | Residual | Disposition | Remediation |
|---|---:|---|---|---|
| AE-059 | P1 | Cancellation was absent from lineage and reservation discriminants; local nonfinancial authorization required a fake receiver | accepted_and_fixed | Added `cancellation_pending`, cancellation-authorization consumption branch, and branch-exact nullable local receiver |
| AE-060 | P1 | AuthorityReservation and LineageActivationReceipt referenced each other | accepted_and_fixed | Reservation now binds only commitment/fences; later activation receipt references it, and both share one atomic transaction ID without a reverse edge |
| AE-061 | P1/P2 | Lineage commitment was unreachable through registry and retry state lacked a typed head | accepted_and_fixed | Added sole commitment issue/get, signed lineage state head/get, closed internal transition sources, and exact retry/non-submission/finalization rules |
| AE-062 | P1 | Crash/handoff evidence and reservation release predicates were undefined | accepted_and_fixed | Added fenced OutboxStateHead, mutually exclusive Handoff/NonSubmission receipts, proof-gated release, and distinct pre-submission versus post-handoff cancellation operations |
| AE-063 | P1/P2 | Connection and scoped-control states could diverge on disconnect | accepted_and_fixed | `control.issue(scope:connection)` is the sole joint CAS and every read/gate/outbox checks both heads/nonces |
| AE-064 | P1 | Runtime DataGrant could use null count or disclose unbounded bytes/items in one read | accepted_and_fixed | Runtime/external grants require finite count/expiry/bytes/items/query bounds and charge every page atomically |
| AE-065 | P1 | A bindable obligation could select the nonfinancial branch and avoid exposure reservation | accepted_and_fixed | Added exhaustive v0.1 capability-class table; offer/counter/terms are financial obligations even before money moves |
| AE-066 | P1 | Canonical provider account commitment had no authoritative alias/merge state | accepted_and_fixed | Root key now uses stable account ID from signed online registry; append-only merges, conflicts, and quarantine are bound through execution |
| AE-067 | P1 | Equal-sequence provider event equivocation could be accepted as forward finality | accepted_and_fixed | Exact duplicate is idempotent; same ID/sequence with different digest quarantines and preserves exposure; only strict newer valid event advances |
| AE-068 | P2 | Prepared ActionRecord required future authority/reservation refs | accepted_and_fixed | Initial record is permanently prepared and forbids future refs; append-only state heads/receipts carry later transitions |
| AE-069 | P2 | Checkout lacked paired readiness, terms-failure states, and exposure-transfer semantics; an extra TermsAcceptance was unbound | accepted_and_fixed | Removed extra object; added readiness fence over both authority/reservation chains, one obligation exposure ID, closed terms/payment states, and no-double-debit transfer |
| AE-070 | P2 | Cross-agent continuation claim conflicted with exact runtime-bound chain | accepted_and_fixed | Different runtime may read/reconcile with its own grant but cannot continue a live chain; fresh authority starts a new chain |
| AE-071 | P2 | Execution release and policy retirement/compromise lacked historical lifecycle semantics | accepted_and_fixed | Added signed release/policy lifecycle heads; new work requires active state, retired permits historical verification, compromised/quarantined preserves exposure |

## Closure round five residuals

Two fresh context-blind chairs and one informed replay audited fixed hash
`308142394ac9ff97fe514cb1a6029d369a7c9655c9dede9369d918537fc33f1c`.
No P0 was found. All remaining P1/material P2 findings were accepted and
remediated in candidate
`fe03460d0dee0d2d04498724432be006e98e15c6206d4cbe55e2b8b71e551939`.

| ID | Sev. | Residual | Disposition | Remediation |
|---|---:|---|---|---|
| AE-072 | P1/P2 | Active provider-account merges could leave two economic ledgers/budgets | accepted_and_fixed | v0.1 performs no active merge: merge evidence quarantines every affected root/ledger; a future profile must atomically consolidate into one survivor |
| AE-073 | P1 | Cancellation fee was permitted without a financial reservation branch | accepted_and_fixed | v0.1 cancellation fee must be zero/absent at quote, review, gate, and outbox; paid cancellation requires a future financial capability |
| AE-074 | P2 | Advertised local/no-receiver branch had no registered local execution capability | accepted_and_fixed | Removed the branch; local storage/preparation remains proposal-only and every execution capability requires receiver finality |
| AE-075 | P2 | Non-temporal read allowed null query range while conformance rejected it | accepted_and_fixed | Added closed temporal/non-temporal query-bound discriminant with one required and one forbidden branch field |
| AE-076 | P2 | Provisional lineage expiry/replacement and pre-redemption release could strand an active occurrence | accepted_and_fixed | Added commitment generation, typed expiry/supersession/prepare edges, and atomic unredeemed-release receipt to fenced non-submission |
| AE-077 | P2 | Checkout unknown/failure states had no reconciliation or safe fresh-payment path | accepted_and_fixed | Added strict unknown resolution edges and fresh payment reauthorization only after proven failure/non-submission, preserving the same obligation exposure |
| AE-078 | P1 | Arbitrary “nonbinding” prose could form an unreserved obligation | accepted_and_fixed | Replaced it with closed typed notice codes on an authenticated receiver-nonbinding channel; no free text/economic/acceptance fields |
| AE-079 | P1 | Global pause/freeze had epochs but no signed global state | accepted_and_fixed | Added explicit global state and restrictive checks at reads, binding, reservation, gate, redemption, and outbox |
| AE-080 | P2 | Provider event identity omitted account/contract and sequence-stream scope | accepted_and_fixed | Added both authenticated scopes to dedupe/equivocation identity and finality-profile applicability |

## Closure round six residuals

Two fresh blind chairs and one informed replay audited fixed hash
`fe03460d0dee0d2d04498724432be006e98e15c6206d4cbe55e2b8b71e551939`.
No P0 was found. Findings were accepted and remediated in candidate
`4881c3fbbd5f149fc8dbf7d6fe5a92b2bcf421d897dc965fa0c1394aa4851a58`.

| ID | Sev. | Residual | Disposition | Remediation |
|---|---:|---|---|---|
| AE-081 | P1 | Sequence-stream scope was used by event import but absent from signed finality applicability | accepted_and_fixed | Added canonical provider trust domain and authenticated stream scope to the applicability tuple and exact equality tests |
| AE-082 | P2 | One lineage action ref could not represent multiple refreshed prepared records | accepted_and_fixed | Preparation no longer mutates lineage; activation atomically selects exactly one prepared action and competing records remain inert |
| AE-083 | P1/P2 | Checkout retry conflicted with immutable payment proposal in group core and an unknown edge lacked terms-confirmation guard | accepted_and_fixed | Group core now fixes stable payment semantics/effect; append-only attempt generations bind each proposal; unknown-to-post-terms CAS must install exact terms receipt |
| AE-084 | P2 | Mandate receiver remained nullable after local execution branch was removed | accepted_and_fixed | Receiver is required in mandate, binding set, authorization, and finality for every registered execution capability |
| AE-085 | P1 | Cancellation could cross into a non-cancellable original state between gate and handoff | accepted_and_fixed | Carried original action/import heads through chain and added atomic handoff recheck against signed state set and finality-profile cancel availability |
| AE-086 | P2 | Final finite read could not encode `1 → 0` | accepted_and_fixed | Added `exhausted` state; final read CASes to zero/exhausted and cannot reactivate |
| AE-087 | P2 | Release/policy lifecycle lacked a closed transition/reactivation rule | accepted_and_fixed | Added authority-only CAS operations and terminal `active → retired|emergency_revoked|quarantined` matrix; recovery uses a new immutable hash |

## Closure round seven residuals

Two fresh context-blind chairs and one informed security replay audited fixed
hash `4881c3fbbd5f149fc8dbf7d6fe5a92b2bcf421d897dc965fa0c1394aa4851a58`.
One blind chair granted prose closure; the second blind chair and informed replay
found no P0 and the three residuals below. All were accepted and remediated in
candidate `c68bf449f04561f530d57f7d14d3321677df748671a1a6c910a859e4d512cfd0`.

| ID | Sev. | Residual | Disposition | Remediation |
|---|---:|---|---|---|
| AE-088 | P1 | Treating `retired` as terminal left no way to record a compromise discovered after retirement, so historical classification could remain trusted | accepted_and_fixed | Lifecycle now permits only monotonic `retired → emergency_revoked|quarantined`; neither state can reactivate and both immediately stop historical classification |
| AE-089 | P2 | `exhausted` DataGrant state did not define whether the final authorized read could subsequently be disclosed | accepted_and_fixed | Exhausted denies new reads but permits only the exact final-read payload under unchanged current nonce/expiry, exact projection/fields/purpose and source-read receipt; paused/revoked/expired deny |
| AE-090 | P1 | Outbox handoff did not revalidate every capability-specific mutable eligibility head after gate/redemption | accepted_and_fixed | Added a closed common and capability-specific handoff prerequisite profile, snapshot root, receipt bindings, and gate-to-handoff race mutants for financial, checkout, cancellation, inventory, notice/evidence/review, and disclosure paths |

## Closure round eight residuals

Two new context-blind chairs and one informed security replay audited fixed hash
`c68bf449f04561f530d57f7d14d3321677df748671a1a6c910a859e4d512cfd0`.
No P0 was found. Their independently reported P1/material P2 findings were
accepted and remediated in candidate
`de9f3e855468f9fbc6d773562fbeb20c90b9c2572e8cdb9712b4f128666c7bcc`.

| ID | Sev. | Residual | Disposition | Remediation |
|---|---:|---|---|---|
| AE-091 | P1 | Exhausted-final-read disclosure named a source receipt only in prose, so the principal signature and downstream chain did not bind unique read provenance | accepted_and_fixed | Added signed `DataGrantReadReceipt`, exact prior/next heads and fence to DisclosureAuthorization, reservation, BindingSet, gate, redemption, handoff snapshot/receipt, plus omit/substitute/sibling/CAS mutants |
| AE-092 | P1 | Offer/counter/acceptance handoff could submit stale terms because deal/listing/ask/market heads were rechecked at gate/redemption but absent from the outbox closed set | accepted_and_fixed | Added the bindable-obligation handoff family with exact current deal/proposal/listing/copy/cart/terms/ask/market, receiver eligibility and review-freshness heads; snapshot object/root/receipt and all races are mandatory |
| AE-093 | P1 | `scope:action` keyed by refreshable ActionRecord ref could be bypassed by preparing another record for the same occurrence | accepted_and_fixed | Action controls now use one stable principal-occurrence key carried by commitment, every refreshed alias, reservation, gate, redemption, state and outbox; object-ref action targets and alias/key substitutions deny |
| AE-094 | P1 | Retired or later-compromised finality policy could accept backdated evidence or leave already accepted false finality green with released exposure | accepted_and_fixed | Retired policy accepts only pre-retirement Cairn-anchored evidence or active independent revalidation; added current assertion-trust and policy-dependency heads, compromise freeze, dependency CAS, conservative exposure reinstatement, and non-rewinding historical tombstones |
| AE-095 | P2/P1 risk | Non-checkout bindable obligation and later payment had no shared exposure identity/role transfer, permitting double debit or heuristic undercount | accepted_and_fixed | Added universal immutable ObligationExposureCore/state for every financial action, exact receiver-bound fulfillment, one item-exposure role transfer, direct-checkout reuse, release rules, registry operations and mutants |
| AE-096 | P2 | One-shot disclosure had no authoritative consumed state or permanent delivery fence, so a second hold could be accepted | accepted_and_fixed | DisclosureAuthorization now CASes `active → consumed` atomically with handoff, records the consumed reservation/delivered fence, makes consumed terminal, and tests competing/second holds and rewind attempts |

## Closure round nine residuals

Two fresh context-blind chairs and one informed security replay audited fixed
hash `de9f3e855468f9fbc6d773562fbeb20c90b9c2572e8cdb9712b4f128666c7bcc`.
No P0 was found. Their P1/material P2 findings were accepted and remediated in
candidate `a6c30a5765e3c9e21c955514a79691f841300924d0472fbb659cea675cb4fd66`.

| ID | Sev. | Residual | Disposition | Remediation |
|---|---:|---|---|---|
| AE-097 | P1 | Source-credential compromise lacked its own authoritative lifecycle, reverse dependency roots, race closure and current-view check | accepted_and_fixed | Added source-credential lifecycle, complete-set trust dependency heads for policy/credential/adapter/account, atomic import registration before exposure release, compromise freeze/CAS/quarantine/restoration, registry operations and mutants |
| AE-098 | P2/P1 risk | Universal obligation fulfillment contradicted checkout's pre-terms fence and lacked a closed cross-interface retry generation | accepted_and_fixed | Added universal FulfillmentAttemptCore plus obligation/fulfillment state, direct versus conditional checkout branches, one item-transfer fence, component-ID accounting, one live generation, proven failure/non-submission retry and unknown blocking |
| AE-099 | P1 | Signing/executor key or credential could revoke after gate because current lifecycle was absent from physical handoff prerequisites | accepted_and_fixed | Every handoff profile/snapshot now requires current signing-key and executor-credential lifecycle/account/key-confirmation binding and direct revocation races |
| AE-100 | P1 | Non-checkout obligation state could reverse/quarantine after redemption but before payment handoff | accepted_and_fixed | All financial/obligation handoffs recheck exact current universal obligation state, role, amount, attempt generation, component root and item-transfer fence in the atomic snapshot |
| AE-101 | P1 | Compartment control keyed a refreshable ObjectRef, allowing another compartment alias over the same economic root to escape freeze/revoke | accepted_and_fixed | Compartment control now uses a principal/economic-resource semantic key inherited by every current/future alias; definition, state, binding, gate and outbox carry it and alias-bypass mutants deny |
| AE-102 | P1 | OAuth audience did not prove that the actual executor credential selected the same provider root Cairn debited | accepted_and_fixed | Added signed current ExecutorCredentialBindingHead over opaque handle, issuer, subject/session, key confirmation, provider domain, stable root, identity generation and explicit account selection; exact equality is required through handoff |
| AE-103 | P2 | Global freeze blocked the user's cancellation workflow and global revoke lacked a safe non-reactivating recovery generation | accepted_and_fixed | Added a narrow principal-present zero-fee safety-cancellation branch for already handed-off actions and generation-specific control namespaces; high-assurance rotation creates a new namespace without reviving/migrating old authority |
| AE-104 | P2 | An already receiver-bound negotiated obligation could not enter checkout without duplicating terms acceptance | accepted_and_fixed | Added discriminated checkout origins and a signed adoption receipt that starts an exact existing obligation payment-ready with its prior authenticated terms receipt; a second acceptance is forbidden |

## Closure round ten residuals

Two fresh context-blind chairs and one informed security replay audited fixed
hash `a6c30a5765e3c9e21c955514a79691f841300924d0472fbb659cea675cb4fd66`.
One blind chair found a P0 caused by untyped evidence-request content; no effect
occurred because this is a prose-only candidate. All P0/P1/material P2 findings
were accepted and remediated in candidate
`a8b139b835567a800935b814a0995f829327575f002f0412991f6c07588e85bf`.

| ID | Sev. | Residual | Disposition | Remediation |
|---|---:|---|---|---|
| AE-105 | P0 | `request_evidence` allowed arbitrary payload text that could smuggle an acceptance/offer through a nonfinancial capability | accepted_and_fixed | Replaced payload with closed evidence codes, copy refs, upload bounds and non-economic routing only; free text/economic/acceptance fields and obligation-capable channels deny with direct smuggling mutants |
| AE-106 | P1 | Safety cancellation required zero fee but had no authenticated cost proof in its signed chain | accepted_and_fixed | Added zero-only CancellationCostAttestation bound through review, BindingSet, authorization, action, gate, handoff and receipt; unknown/variable/nonzero/stale cost denies and unexpected charges quarantine |
| AE-107 | P2 | Restrictive control blocked BindingSet issuance before the safety CancellationAuthorization that was supposed to permit it, creating a construction cycle | accepted_and_fixed | Added non-authorizing SafetyCancellationPreparationIntent after cost proof and before commitment/review/BindingSet; the principal signs separate final authority afterward and preparation cannot reserve/send |
| AE-108 | P2/P1 risk | Obligation ID omitted consequential core fields and could alias different payees/heads/cost ceilings | accepted_and_fixed | Defined injective domain-separated semantic preimage over every economic/routing/expiry field and an atomic one-ID→one-core-hash uniqueness index |
| AE-109 | P2 | Independent obligation/fulfillment fields admitted impossible cross-product states and undefined ledger deltas | accepted_and_fixed | Replaced them with one closed discriminated state union, complete required/forbidden tuple table, exact exposure formulas, serializable ledger deltas and closed transition edges |
| AE-110 | P2 | Payment authority expiry after terms dispatch lacked a deterministic checkout/obligation outcome | accepted_and_fixed | Added terms-unknown-payment-unavailable states and confirmation-time branching: valid payment locks once; unavailable payment discharges conditional holds, preserves item exposure and enters payment-blocked after authenticated terms |
| AE-111 | P1 | Nonfinancial same-audience credentials were not bound to exact receiver/channel tenant | accepted_and_fixed | Executor credential union now requires canonical nonfinancial receiver/channel, authenticated channel policy and explicit selection equality through BindingSet/handoff; financial fields are forbidden |
| AE-112 | P1 | Accounting-policy compromise was absent from assertion/exposure reverse dependencies | accepted_and_fixed | Added accounting policy to the complete trust dependency vector, registration roots, current-view checks and compromise quarantine/exposure restoration mutants |
| AE-113 | P2 | Pre-signed checkout payment BindingSet was invalidated by the intended terms/deal successor transition | accepted_and_fixed | Added exact predecessor refs, closed permitted successor profile and signed CheckoutTermsSuccessorReceipt; payment accepts only that one authenticated delta and current after-heads |
| AE-114 | P2 | Fulfillment component ID included an unstored `source`, making retry deduplication non-deterministic | accepted_and_fixed | Added closed source kind/ref/hash/line ID, exact recomputable ID formula, canonical set/semantic uniqueness and duplicate-source/ID retry mutants |
| AE-115 | P2 | Trust head and dependency roots could form a content-hash cycle because root leaf orientation was unspecified | accepted_and_fixed | Added precomputable assertion registration key, independent leaf grammar, before/after dependency CAS receipt, raw import first, and one-way trust-head→registration-receipt graph |
| AE-116 | P1 | Outbound credential could bind only a provider root, not the verified child sublimit/protection locus actually reserved | accepted_and_fixed | Financial credential union now binds root/economic keys, protection attestation, locus, sublimit/proof/generation and bypass profile with explicit root/child selection and substitution mutants |
| AE-117 | P1 | Executor credential revocation had no terminal transition law and could conceptually reactivate | accepted_and_fixed | Added broker-only expected-head CAS, terminal revoked/expired/quarantined states, new-ID/key rotation, full new authority chain requirement and reactivation/substitution mutants |

## Closure round eleven residuals

Two fresh context-blind chairs and one informed security replay audited fixed
hash `a8b139b835567a800935b814a0995f829327575f002f0412991f6c07588e85bf`.
No P0 was found. Their P1/material P2 findings were accepted and remediated in
candidate `3b9f86b0d87047f2b69729af4039581fff1d58a43e9204e976aa266b5041c466`.

| ID | Sev. | Residual | Disposition | Remediation |
|---|---:|---|---|---|
| AE-118 | P2 | Direct checkout pre-bound a future obligation predecessor even though reservation necessarily advanced it before terms acceptance; the allowed successor covered too little product state | accepted_and_fixed | Replaced future refs with an acyclic pre-authority CheckoutTransitionTemplate; readiness binds actual conditional/group heads and complete product state; successor starts there and atomically carries deal, listing, copy availability, inventory, ask, market, cart, terms, group, attempt and obligation before/after |
| AE-119 | P2 | Existing-obligation adoption incorrectly required a new group terms effect that its own branch forbade | accepted_and_fixed | Direct checkout qualifies through its terms-successor effect; adoption instead proves exact equality to the earlier authenticated terms receipt, receiver-bound universal obligation, and complete accepted product heads, with no new terms effect |
| AE-120 | P2 | One ambiguous `expires_at` could make a timely accepted deal unpayable after the offer window | accepted_and_fixed | Split authenticated offer-window start/acceptance deadline from per-attempt expiry; timely receiver acceptance remains fulfillable after the deadline, while boundary/late acceptance denies or quarantines with exposure preserved |
| AE-121 | P1 | Prefulfillment exposure held item price but omitted unavoidable tax/shipping/fees, permitting late cost surprise or ledger mismatch | accepted_and_fixed | Added injective mandatory-obligation components to the universal core/state/attempt; item plus mandatory components remain held from offer through fulfillment and transfer atomically once, with only genuinely new bounded costs treated as incremental |
| AE-122 | P1 | Account/sublimit generation was authenticated on the executor credential but absent from independent mandate/review/compartment authority | accepted_and_fixed | Carried exact generations through identity, compartment, protection, mandate, review, BindingSet, reservation/gate/handoff; generation advance invalidates old authority and requires a fresh principal-accepted compartment and mandate |
| AE-123 | P2 | Lineage activation receipt and active LineageStateHead could form a reciprocal content-hash cycle | accepted_and_fixed | Receipt now binds only prior head, chosen action, fence, transaction ID and independently precomputable next-state commitment; the active head points one way to the receipt and recomputes the commitment |
| AE-124 | P2 | Several mutable heads lacked an exact registered writer, especially provider-account identity and DataGrant pause/resume | accepted_and_fixed | Added direct lifecycle operations plus an exhaustive single-writer map requiring one caller/CAS/idempotency/receipt tuple per non-genesis edge; orphan, duplicate, timer/admin and migration writers fail conformance |

## Closure round twelve residuals

Two fresh context-blind chairs and one informed security replay audited fixed
hash `3b9f86b0d87047f2b69729af4039581fff1d58a43e9204e976aa266b5041c466`.
No P0 was found. Their P1/material P2 findings were accepted and remediated in
candidate `f42c152555449dcbddf0d04dc4da1cb6142b459e1d6211cd9242218d10419d4f`.

| ID | Sev. | Residual | Disposition | Remediation |
|---|---:|---|---|---|
| AE-125 | P1 | A locally expired submitted offer could release exposure before a delayed event proved timely pre-deadline receiver acceptance | accepted_and_fixed | Added `acceptance_window_closed_unresolved`; local close retains the complete hold and only authenticated receiver nonacceptance may release post-handoff exposure |
| AE-126 | P2 | Lineage next-state commitment preimage still included its own commitment field | accepted_and_fixed | Froze an exact typed active-state preimage excluding both commitment and receipt-ref fields, with a golden hash vector requirement |
| AE-127 | P2 | General invalidation prose still pre-bound future checkout predecessors, while readiness incorrectly required inventory reservation heads to remain unchanged | accepted_and_fixed | General law now recognizes only the template→readiness→successor exception; template commits inventory predecessor semantics and readiness proves the one exact held-reservation delta plus full before/after product vectors |
| AE-128 | P2 | Aggregate writer map assigned multiple operations to the same mutable edge and called multiple private reads “sole” writers | accepted_and_fixed | Replaced it with one authority-internal head writer per family and typed cause receipts; all public/import operations invoke that writer atomically, with edge identity defined as family/from/cause/to |
| AE-129 | P1 | Compartment reservation, spend, reversal and obligation amounts lacked exact conservation equations | accepted_and_fixed | Added unique economic atoms, canonical roots and checked equations for reserved/spent/refunded/reversal/outstanding amounts plus atomic role-transfer, fulfillment, refund and reversal deltas |
| AE-130 | P1/P2 | Child sublimit generation had no authoritative current head, writer or receipt | accepted_and_fixed | Added ProviderSublimitIdentityHead and import/transition/read/receipt operations; exact head/generation/proof/cap/locus now bind every financial authority stage and trust dependency |
| AE-131 | P2 | CheckoutReadinessReceipt and ready CheckoutGroupStateHead could form a reciprocal content-address cycle | accepted_and_fixed | Readiness now binds the prior group head plus an independent ready-state commitment; the ready head points one way to the receipt and the exact self-excluding preimage is frozen |
| AE-132 | P2 | “One connection mutation path” contradicted an independent connection-expiry writer | accepted_and_fixed | One authority-internal connection-state transition now handles principal control and timer causes and jointly CASes connection plus connection-scoped control heads |
| AE-133 | P2 | Safety cancellation was described as applicable to any restrictive head but constructed only under global restriction | accepted_and_fixed | Preparation/authorization bind the exact triggering scope/target for any applicable global-through-action restriction while the gate checks the complete lattice |
| AE-134 | P1 | Dependency compromise required exposure restoration but defined no conforming obligation/compartment writer or remediation receipt | accepted_and_fixed | Added ExposureRemediationReceipt, trust-compromise operation and exact sole-writer causes over trust, obligation and compartment heads with balanced before/after atom roots |
| AE-135 | P1 | Two-stage compromise froze only delegated value before later restoration, leaving a supervised-spend race | accepted_and_fixed | Lifecycle restriction, all-value economic-root freeze, trust quarantine, exposure restoration and remediation receipt now commit in one serializable transaction with incomplete roots staying frozen |
| AE-136 | P2 | Normative chain placed a preauthorized mandate after the mandate-dependent lineage commitment and BindingSet | accepted_and_fixed | Split §7 into a schema oneOf: confirmed mandate precedes preauthorized commitment; supervised/cancellation commitments precede their final one-shot authority |

## Closure round thirteen residuals

Two fresh context-blind chairs and one informed security replay audited fixed
hash `f42c152555449dcbddf0d04dc4da1cb6142b459e1d6211cd9242218d10419d4f`.
No P0 was found. Their P1/material P2 findings were accepted and remediated in
candidate `219b538d70ebb9eeb6d206fba19b0c94ff5b3913724f35a563f2ab64b33cb0c9`.

| ID | Sev. | Residual | Disposition | Remediation |
|---|---:|---|---|---|
| AE-137 | P2 | Reversible fulfillment was labeled fulfilled/released with zero obligation exposure even while the compartment still held chargeback risk | accepted_and_fixed | Added `fulfilled_reversal_outstanding`, obligation-keyed reversal atoms and exact obligation/compartment exposure equality until irreversible finality or reversal |
| AE-138 | P2 | Checkout treated independently owned seller inventory as part of Cairn's local serializable buyer-authority transaction | accepted_and_fixed | Added a seller-signed inventory reservation head/receipt family and a staged prepared→local-pending→seller-held→ready saga with durable unknown/failure recovery states |
| AE-139 | P1 | Zero-cost cancellation relied on a nonexistent mutable “current fee-source head,” so an immutable zero attestation could outlive a changed fee source | accepted_and_fixed | Added scoped CancellationFeeSourceStateHead lifecycle, current generation equality through the cancellation chain, sole writer operations and change-after-attestation mutants |
| AE-140 | P1 | Family lifecycle writers could still commit compromise states standalone, bypassing the all-value atomic trust-compromise coordinator | accepted_and_fixed | Compromise-caused release/policy/credential/account/sublimit transitions now require the live `execution.trust_compromise.commit` transaction, complete reverse closure and remediation fence |
| AE-141 | P1/P2 | Execution-release compromise was absent from the trust-dependency reverse graph and handoff current-view checks | accepted_and_fixed | Added `execution_release` as a complete-set dependency kind, assertion key, registration leaf and mandatory gate/handoff dependency with compromise-race tests |
| AE-142 | P1 | Exhausted DataGrants could not be revoked or expired, allowing an already reserved final disclosure to escape a later principal revocation | accepted_and_fixed | Closed the grant matrix so exhausted→revoked/expired remains possible and added final-read/disclosure versus revoke/expiry races |
| AE-143 | P1 | Count, rate, aggregate, window, lifetime, outstanding and one-shot limits lacked authoritative mutable heads and exhaustive writer closure | accepted_and_fixed | Added AuthorityLimitLedgerHead, complete kind registry, exact event atoms, closed kind-specific transition matrix, single writer and atomic complete-ledger-set CAS |
| AE-144 | P2 | Connection expiry had no matching expired connection-scoped control state, contradicting the promised joint transition invariant | accepted_and_fixed | Added connection-scoped `expired`, a single joint connection/control expiry writer, nonce preservation rules and exact-pair conformance tests |

## Closure round fourteen residuals

Two fresh context-blind chairs and one informed security replay audited fixed
hash `219b538d70ebb9eeb6d206fba19b0c94ff5b3913724f35a563f2ab64b33cb0c9`.
No P0 was found. Their P1/material P2 findings were accepted and remediated in
candidate `14ba7776695979fe9538561a0bb5030cf65345b578853a8ed3caa3d3df071075`.

| ID | Sev. | Residual | Disposition | Remediation |
|---|---:|---|---|---|
| AE-145 | P1 | Reusable mandates signed aggregate/window/outstanding money limits but had no mandate-scoped monetary ledgers, allowing broader principal/compartment caps to bypass them | accepted_and_fixed | Added exact per-mandate aggregate/window/outstanding heads, immutable source/limit/key binding, full financial reservation CAS and last-unit mutants |
| AE-146 | P2 | A retry could add bounded incremental cost while its immutable checkout core, amount and payment-semantics hash had to remain unchanged | accepted_and_fixed | Same-group retries now require identical components/amount/semantics; a changed bounded cost terminalizes that payment group after proven non-submission and requires fresh exact authority in a new accepted-obligation adoption group |
| AE-147 | P1/P2 | A seller `held` copy could expire during unknown receiver latency, then delayed timely acceptance could bind the buyer after reallocation | accepted_and_fixed | Added seller-only `terms_fenced` with no timer expiry, exact action/effect/outbox binding, and release only from receiver nonacceptance/cancellation or fenced non-submission |
| AE-148 | P2 | Inventory-unknown recovery could not construct readiness because its receipt required only an inventory-pending predecessor and the ready commitment omitted saga fields | accepted_and_fixed | Readiness accepts either exact pending or reconciled-unknown predecessor; its self-excluding commitment now covers every complete group-head field including pending and seller-saga bindings |
| AE-149 | P2 | Checkout could reach payment/complete while seller inventory remained merely held and no accepted-terms consumption point existed | accepted_and_fixed | Authenticated acceptance enters `terms_confirmed_inventory_pending`; seller alone consumes the fenced copy, and only its signed consumed head/receipt plus the successor receipt unlock payment |
| AE-150 | P2 | Frozen limit-ledger resume was allowed by the state matrix but absent from its exhaustive writer causes | accepted_and_fixed | Added exact recorded-state resume to the sole writer and direct freeze/resume closure controls |
| AE-151 | P2 | Temporary limit recovery could reactivate a ledger while the containing compartment remained irreversibly exhausted/frozen | accepted_and_fixed | Added exact exhausted-ledger roots, typed exhausted→active recovery, recorded pre-freeze state and dependency-closure plus fresh-control resume |
| AE-152 | P2 | Trust remediation could not quarantine/restore released exposure from receiver-rejected/cancelled/expired terminal obligation states | accepted_and_fixed | Added one coordinator-only remediation edge from affected receiver-dependent released terminals while preserving their immutable outcome history |
| AE-153 | P2 | Adapter identity was a required mutable trust dependency without an exact lifecycle family, authority, operations or writer mapping | accepted_and_fixed | Normatively mapped adapter identity to PolicyLifecycleHead, added authority-only import/get, canonical dependency identity and coordinator-only compromise |
| AE-154 | P2 | Outbox genesis named action preparation even though its schema requires the effect lease created only at redemption | accepted_and_fixed | Successful redemption is now the sole outbox genesis constructor |
| AE-155 | P2 | Compartment protection attestations could be compromised without lifecycle/reverse-dependency closure | accepted_and_fixed | Mapped attestations to PolicyLifecycleHead, added authority-only import/get, carried current lifecycle through financial chains, registered complete trust dependencies and added compromise mutants |

## Closure round fifteen residuals

Two fresh context-blind chairs and one informed security replay audited fixed
hash `14ba7776695979fe9538561a0bb5030cf65345b578853a8ed3caa3d3df071075`.
No P0 was found. Their material findings were accepted and remediated in
candidate `545372b9910940ed373edf79823b1a2d36d28b5667817c33d7b6a96013524a5a`.

| ID | Sev. | Residual | Disposition | Remediation |
|---|---:|---|---|---|
| AE-156 | P2 | Restoring compromised previously released exposure after capacity reuse could exceed the immutable limit, while incomplete-frozen had no representable or completable compartment state | accepted_and_fixed | Added explicit quarantine atoms/exposure, frozen-only over-limit semantics with zero new capacity, incomplete commitments, typed frozen→frozen remediation and within-limit/complete resume gate |
| AE-157 | P2 | Seller inventory could remain permanently `terms_fenced` if authority failed after seller fencing but before redemption created an outbox | accepted_and_fixed | Added a single-use pending/redeemed/abandoned TermsFenceClaim and pre-redemption abandonment receipt; abandonment races redemption and safely authorizes the exact seller release without claiming outbox non-submission |
| AE-158 | P2 | A post-completion terms reversal required group `terms_reversed` but fulfilled obligation allowed only quarantine, with no atomic pairing | accepted_and_fixed | Defined exact group/obligation/compartment pairing: unfulfilled/reversal-risk cases use `reversed`; post-fulfilled reversal uses `quarantined`, explicit quarantine atoms and frozen reconciliation |
| AE-159 | P1 | Reservation-scoped seller heads allowed two genesis reservations for the same exact copy to prepare and consume independently | accepted_and_fixed | Added one seller-owned current lease head per copy/ownership generation; every multi-copy reservation transition CASes the shared exact-copy set atomically, so overlapping prepares have at most one winner |
| AE-160 | P2/P1 risk | Paired checkout's two pre-signed actions each required an exclusive H0→H1 reservation even though both reservations were created in one transaction | accepted_and_fixed | Added a pre-authority CheckoutAuthorityReservationBatchCore and one two-lineage/two-authorization batch receipt with disjoint subreservation atoms, complete union ledger CAS, common H0→H1 and role membership proofs |
| AE-161 | P2 | One compartment ledger-root field ambiguously mixed resource, principal and per-mandate heads, making sibling mandate exhaustion globally block the compartment | accepted_and_fixed | Restricted the compartment root/exhaustion state to compartment window/lifetime ledgers; each reservation receipt carries its action-specific principal/mandate/one-shot vector separately |
| AE-162 | P2 | RecoveryGrant had no mutable lifecycle, consumption fence, revocation writer or namespace generation, so a compromised key could survive recovery rotation | accepted_and_fixed | Added exact-generation one-shot RecoveryGrantStateHead/receipt, consume/revoke/expiry operations and sole writer; restrictive control use consumes atomically and old-generation grants cannot affect a rotated namespace |

## Closure round sixteen residuals

Two fresh context-blind chairs and one informed security replay audited fixed
hash `545372b9910940ed373edf79823b1a2d36d28b5667817c33d7b6a96013524a5a`.
No P0 was found. Their P1/material P2 findings were accepted and remediated in
candidate `3e0a9ec9182f1b67f1d20799a775a8c9bd8c59a34e7c21c81edc1569c861167d`.

| ID | Sev. | Residual | Disposition | Remediation |
|---|---:|---|---|---|
| AE-163 | P1 | Exact-copy exclusivity was unique only inside seller/ownership generation, so a new generation or seller could create a disjoint live lease | accepted_and_fixed | Keyed one global current lease head by canonical copy ID alone; ownership/generation changes CAS that same head and cannot advance while any lease is live |
| AE-164 | P1/P2 | Principal-wide limits had no unique shared policy/source, allowing mandates or authorizations to shard “principal” ledgers | accepted_and_fixed | Added one stable signed PrincipalExecutionLimitPolicy identity/head per principal/domain, stable principal ledger keys independent of mandate/revision, and current-head binding through every authority stage |
| AE-165 | P1/P2 | Configured/per-action/provider-enforced compartment ceilings were declared but absent from issuance and reservation equations | accepted_and_fixed | Added exact same-asset inequality `per-action ≤ outstanding ≤ configured ≤ enforced`, candidate per-action checks, non-frozen outstanding equations, cap-reduction freeze and direct mutants |
| AE-166 | P2 | Recovery role was promised a five-field projection but the ACL matrix granted detailed mandate/authorization/compartment/control reads | accepted_and_fixed | Added dedicated RecoveryStatusProjection/operation and removed recovery authentication from every ordinary private get; recovery-only existence/timing leakage is denied |
| AE-167 | P1 | Trust restoration updated compartment quarantine but not shared principal/originating-mandate outstanding ledgers, allowing later budget reuse | accepted_and_fixed | Added exact remediation before/after vectors and quarantine atoms/amounts to principal/mandate outstanding ledgers, coordinator-only closed→frozen exception, and zero-quarantine resume requirement |
| AE-168 | P2 | Quarantine atoms were counted but absent from the exhaustive mutually exclusive economic-ledger class list | accepted_and_fixed | Added `quarantine_hold` as a named exclusive atom class with exact receipt-driven reclassification in/out and no duplication |

## Closure round seventeen residuals

Two fresh context-blind chairs and one informed full replay audited fixed hash
`3e0a9ec9182f1b67f1d20799a775a8c9bd8c59a34e7c21c81edc1569c861167d`.
No P0 was found. Their P1/material P2 findings were accepted and remediated in
candidate `54774c2a1f3b5910fa14591548580534621de2c8da10e0f4d262887404baf0a6`.

| ID | Sev. | Residual | Disposition | Remediation |
|---|---:|---|---|---|
| AE-169 | P1 | ExecutorCredentialBindingHead encoded the principal-policy enum, making broker revocation/expiry unrepresentable despite its terminal matrix | accepted_and_fixed | Restored exact `active→revoked/expired/quarantined` schema and added direct enum-swap/schema mutants |
| AE-170 | P1 | Two compartment aliases over one economic resource could each satisfy local equations while exceeding the provider/resource cap in aggregate | accepted_and_fixed | Added one insert-only EconomicResourceExposureStateHead per canonical resource/asset, exact alias atom union/equations, sole writer/receipt, cross-head CAS and cap-race mutants |
| AE-171 | P1 | Compromised refund replenishment was repairable only in outstanding ledgers, leaving aggregate/window/lifetime capacity undercounted | accepted_and_fixed | Generalized quarantine values and coordinator remediation to every capacity-changing monetary ledger, including still-live windows and prior-closed heads, with complete receipt vectors/resume gates |
| AE-172 | P2/P1 risk | Principal policy schema omitted `frozen`, admitted forbidden revoked/expired states, lacked quarantine recovery, and did not explicitly bind asset into stable identity | accepted_and_fixed | Froze exact active/frozen/quarantined matrix with reconciled higher-revision quarantine recovery and asset-or-null stable-ID preimage plus direct vectors |
| AE-173 | P2 | A policy revision could add/change a window discriminant whose new stable ledger lacked historical atoms | accepted_and_fixed | Made the initial ledger-kind/window discriminant set immutable in v0.1; revisions change only existing values/metadata and new-key creation denies without a future history-preserving migration |
| AE-174 | P1 | Global copy exclusivity covered paired checkout but not ordinary bindable offer/counter/acceptance paths | accepted_and_fixed | Added OrdinaryDealInventoryCommitment, checkout/ordinary inventory union, review→BindingSet→reservation→seller-fence→handoff global-head chain, ordinary crash-fence claims, operations and mutants |
| AE-175 | P1 | Trust registration had two reverse roots but only one ambiguous before/after pair and one leaf grammar | accepted_and_fixed | Froze distinct assertion/exposure leaf grammars and both exact before/after root pairs under one dependency fence/receipt transaction |
| AE-176 | P2 | Quarantine promised remediation but obligation state had no recovery edge, while unexpected reversal had no typed cause schema/operation | accepted_and_fixed | Added pre-quarantine state/commitment, coordinator-only quarantine update/restore/reverse edges, typed authenticated reversal cause, resource/ledger closure and direct mutants |
| AE-177 | P2 | Recovery projection could not encode connection expiry and a consumed one-shot grant could not recover a lost successful response | accepted_and_fixed | Added scope-restricted expired projection plus byte-identical consumed-use replay returning only the same transition receipt/minimal projection with no new mutation/read authority |

## Closure round eighteen residuals

Two fresh context-blind chairs and one informed full replay audited fixed hash
`54774c2a1f3b5910fa14591548580534621de2c8da10e0f4d262887404baf0a6`.
No P0 was found. Their P1/material P2 findings were accepted and remediated in
candidate `dc1bdfa55f01cdd7ede1470d0d2594b5fa9f0ce4906020daffc243483eabec8e`.

| ID | Sev. | Residual | Disposition | Remediation |
|---|---:|---|---|---|
| AE-178 | P1 | A compromised nonfinancial assertion with no released capacity could not enter quarantined trust because ExposureRemediationReceipt required an economic root | accepted_and_fixed | Added mandatory TrustQuarantineReceipt with explicit no-exposure versus economic-remediation branches; trust-only compromise changes current trust without inventing money |
| AE-179 | P2/P1 risk | Shared resource exposure named no uniquely current provider-cap selection lifecycle, allowing implementations to disagree which immutable attestation displaced another | accepted_and_fixed | Added one stable EconomicResourceProtectionCapStateHead/receipt per resource/asset, authority-only replacement with prior-lifecycle retirement, exact alias equality and atomic over-cap freeze |
| AE-180 | P2 | Review/BindingSet/reservation modeled only held inventory while paired checkout intentionally authorizes at prepared and adoption may already be consumed | accepted_and_fixed | Added closed ordinary-held, checkout-prepared, checkout-held and adopted-obligation-consumed stage union; corrected pre/post-redemption ordinary release proofs and branch mutants |
| AE-181 | P2 | One remediation economic-root entry could encode only one compartment although a shared resource may have multiple alias compartments | accepted_and_fixed | Replaced the singleton with a complete sorted compartment transition vector/root under the single resource transition |
| AE-182 | P2 | Remediation `counter_after` and separate quarantine delta admitted double restoration | accepted_and_fixed | Froze base/quarantine/effective before-and-after equations; initial quarantine leaves base unchanged and counts the conservative delta exactly once |
| AE-183 | P2 | Writer map conflated root/fence-only TrustDependencyStateHead with accepted/quarantined ReceiverAssertionTrustStateHead | accepted_and_fixed | Split head families, operations and closed causes; dependency registration advances roots/manifests/fence while compromise CAS-verifies it and transitions assertion trust only |
| AE-184 | P2/P1 risk | Receiver-channel policy was required at handoff but had no typed current/revocation lifecycle | accepted_and_fixed | Added receiver-channel PolicyLifecycle kind/import, exact lifecycle binding in credential/review/BindingSet/handoff and trust dependency closure |
| AE-185 | P2 | Generic accounting/finality/review/taint policy lifecycle had no registered genesis constructor | accepted_and_fixed | Added authority-only `execution.policy.import`, immutable PolicyImportReceipt, active lifecycle genesis and direct registry mutants |
| AE-186 | P2 | A new principal had no registered generation-zero control-namespace constructor | accepted_and_fixed | Added high-assurance insert-only `execution.control_namespace.issue` that jointly creates generation 0 and its initial active control head |
| AE-187 | P2 | Later frozen remediation was promised but had no successor receipt branch or named coordinator operation | accepted_and_fixed | Added initial/successor receipt oneOf, prior-receipt/evidence binding, internal initial commit and sole idempotent `execution.exposure_remediation.resolve` path |
| AE-188 | P2 | Mandatory transaction-bound ConfirmationReceipt had no declared producer | accepted_and_fixed | Added trusted-verifier-only `execution.confirmation.verify` and receipt read operation after the exact authority/challenge exists |
| AE-189 | P1 | Closed compartment/resource heads could block a later proven compromise or unexpected reversal even while obligation/ledgers reopened conservatively | accepted_and_fixed | Added coordinator-only closed→frozen historical-remediation edges with recorded closed state and closed-only return; no capacity-granting reactivation |
| AE-190 | P1 | Expired source-credential or provider-sublimit state could block later forensic compromise of assertions made before expiry | accepted_and_fixed | Added coordinator-only expired/revoked→quarantined historical-compromise edges while preserving permanent non-reactivation |
| AE-191 | P2 | Trust Merkle roots were commitments but not a crash-recoverable enumeration mechanism for compromise closure | accepted_and_fixed | Added signed enumerable index manifests and typed ReleasedExposureCommitment objects with exact roots/counts/refs, authority-internal reads and fail-frozen mismatch behavior |
| AE-192 | P2 | Cancellation required a mutable receiver-import head with no schema, stable key, genesis, writer, receipt or race closure | accepted_and_fixed | Added ReceiverEventStreamStateHead/receipt, redemption genesis, fenced-outbox and provider-import causes, sequence equivocation quarantine and current-head cancellation binding |
| AE-193 | P2 | Recovery could authorize connection-scoped freeze while the sole connection/control writer had no matching joint edge | accepted_and_fixed | Added active/active→active/frozen-new-redemptions joint pair and fresh-authority resume, with connection sequence/head binding and direct mutants |
| AE-194 | P2 | Remediation commitment hashes lacked a canonical exclusion list and could be interpreted as a content-address fixed point | accepted_and_fixed | Added one frozen ExposureRemediationStateCommitmentPreimage shared across all head families, computed before successor/receipt and excluding every forward/self/hash/signature field |

## Closure round nineteen residuals

Two fresh context-blind chairs and one informed full replay audited fixed hash
`dc1bdfa55f01cdd7ede1470d0d2594b5fa9f0ce4906020daffc243483eabec8e`.
No P0 was found. Their P1/material P2 findings, plus two author-replay findings,
were accepted and remediated in candidate
`7ae9b23c650a830a75ed59dee58645d6e023b6fafaf809ed4743dbbad2bfac90`.

| ID | Sev. | Residual | Disposition | Remediation |
|---|---:|---|---|---|
| AE-195 | P1 | A financially live assertion could change reserved atoms into equal active-reversal atoms without releasing capacity, then be misclassified as trust-only on compromise | accepted_and_fixed | Froze the legacy `released_exposure_present` wire flag to mean any economic-remediation dependency, including zero-capacity-delta atom reclassification, and added the direct active-reversal compromise mutant |
| AE-196 | P1 | Missing/corrupt signed reverse-index content made complete compromise closure unknowable while standalone restrictive lifecycle publication was forbidden | accepted_and_fixed | Defined a deterministic execution-profile-wide `execution_integrity_unavailable` fail-stop with no current-trust/capacity claim or partial mutation until exact content-addressed bytes are restored and complete remediation commits |
| AE-197 | P2 | A dependency manifest pointed to the later trust head, whose receipt pointed back to the dependency head, creating a content-address cycle | accepted_and_fixed | Removed every trust-head/registration-receipt ref from manifests; stable assertion key is now the sole lookup and construction order is acyclic |
| AE-198 | P2 | Execution-release, source-credential and trust-dependency heads lacked named insert-only genesis constructors | accepted_and_fixed | Added LifecycleGenesisReceipt, dedicated release/source-credential imports, TrustDependencyStateImportReceipt, canonical empty manifests, dependency-state import, receipt reads and null-predecessor/first-event-genesis mutants |
| AE-199 | P2 | Resource-cap onboarding required an attestation import receipt that no schema could represent | accepted_and_fixed | Extended PolicyImportReceipt to adapter/protection discriminants and required protection-attestation import to emit the exact receipt consumed by cap selection |
| AE-200 | P2 | Fully resolved remediation after-heads could only be labeled complete/incomplete frozen | accepted_and_fixed | Added `resolved_recorded_state` and froze its exact empty-unresolved/zero-quarantine/recorded-after-state cross-product, with invalid label/vector mutants |
| AE-201 | P1 | A frozen cap could leave resource exposure active, while terminal cap state made late closed-head remediation unrepresentable | accepted_and_fixed | Added one joint cap/exposure matrix, required both active at every value gate, forced every cap restriction to make exposure non-active, and defined `(closed,closed)→(quarantined,frozen)→(quarantined,closed)` historical remediation |
| AE-202 | P2/P1 risk | Bindable offers/counters/acceptance fit neither the provider-account credential branch nor the nonfinancial receiver-channel branch | accepted_and_fixed | Replaced the union with financial-value provider-account versus receiver-channel credentials, added binding-obligation/nonbinding semantics, required channel lifecycle through review/handoff and added cross-branch mutants |
| AE-203 | P1 | Confirmation assurance policy and verifier trust were mutable only through an out-of-band allowlist, so compromise could not invalidate a receipt | accepted_and_fixed | Added immutable assurance/verifier profiles, independent current PolicyLifecycleHeads, exact ConfirmationReceipt bindings, gate/handoff rechecks, trust-dependency closure and compromise mutants |
| AE-204 | P2 | Fenced outbox handoff could label a receiver-event stream `submitted` even though handoff proves only local dispatch ambiguity | accepted_and_fixed | Handoff now produces only `unknown`; only authenticated provider-event import may advance to submitted/acknowledged/final receiver state |
| AE-205 | P2 | Review/BindingSet inventory stage union still typed its evidence slot as only a held-commit receipt, excluding prepared and adopted-consumed branches | accepted_and_fixed | Made the inventory transition receipt stage-matching prepare/commit/consume and non-null for every applicable branch |

## Closure round twenty residuals

Two fresh context-blind chairs and one informed full replay audited fixed hash
`7ae9b23c650a830a75ed59dee58645d6e023b6fafaf809ed4743dbbad2bfac90`.
No P0 was found. Their P1/material P2 findings were accepted and remediated in
candidate `b1411e2b163f3564a5aef9f64d26116cd16b820b0d53e3d7a4f69f797cf64e32`.

| ID | Sev. | Residual | Disposition | Remediation |
|---|---:|---|---|---|
| AE-206 | P1 | Profile-wide fail-stop depended on an unrepresented service-local notion of authoritative global state and dependency inventory | accepted_and_fixed | Added signed ExecutionIntegrityStateHead, enumerable dependency inventory, sole transition receipt/writer, healthy-head CAS on every execution path, and exact-byte complete-audit recovery |
| AE-207 | P1 | Receiver-channel `binding_obligation` versus `nonbinding` semantics were labels without a closed applicability/payload policy | accepted_and_fixed | Added a signed closed ReceiverChannelPolicy schema with exact channel/resource/audience/protocol/operation/capability/payload applicability, authenticated guarantee/rule, allowed codes, forbidden field classes and deny-on-unknown semantics |
| AE-208 | P1 | A principal-direct path could select a valid channel or payment credential not bound to that principal | accepted_and_fixed | Added mandatory `principal_id` to ExecutorCredentialBindingHead and equality through review, BindingSet, authority, gate and handoff for delegated and principal-direct paths |
| AE-209 | P2 | Provider account/sublimit trust dependencies were keyed by mutable generation heads, allowing rotation to strand historical dependents | accepted_and_fixed | Added immutable provider identity keys/cores, one stable dependency head/index across generations, exact per-entry generation binding and historical-generation compromise filtering |
| AE-210 | P2 | A provider-cap reduction admitted ambiguous cap/exposure successor pairs | accepted_and_fixed | Froze the only two outcomes: at/above current exposure stays active/active; below exposure becomes frozen/frozen; every mixed or unnecessary-frozen pair denies |
| AE-211 | P2 | Receiver-stream handoff state could advance from writer/log assertions without binding the actual fenced outbox receipt | accepted_and_fixed | ReceiverEventStreamTransitionReceipt now requires the exact OutboxHandoffReceipt ref/hash for the fenced-handoff cause, with cross-effect and raw-log mutants |
| AE-212 | P2 | Per-root remediation results conflicted when economic roots shared principal or mandate ledgers | accepted_and_fixed | Made remediation result receipt-wide, requires one complete resource vector and one deduplicated shared-ledger vector, and forbids partial/per-root resume |
| AE-213 | P2 | A refreshed `checkout_held` review could bind held seller heads without proving the CheckoutReadinessReceipt that created the valid buyer-side readiness state | accepted_and_fixed | Review and BindingSet require the exact CheckoutReadinessReceipt ref/hash iff inventory stage is `checkout_held`; seller evidence alone is insufficient |
| AE-214 | P1 | Evidence reconciliation could reactivate remediation-frozen capacity without a representable new principal decision | accepted_and_fixed | Split evidence-only `complete_frozen` from `principal_resume`; added fresh high-assurance RemediationResumeAuthorization per affected principal and a sole receipt-wide resume operation |
| AE-215 | P2 | One `resolved_recorded_state` label contradicted obligations that were conclusively reversed and could not represent mixed resolution outcomes | accepted_and_fixed | Added per-obligation revalidated-versus-reversal dispositions and receipt-wide `resolved_nonfrozen`, allowing a complete mixed vector without mislabeling reversed obligations |
| AE-216 | P2 | Sequential overlapping dependency compromises had no disposition for entries already quarantined/frozen by the first incident | accepted_and_fixed | Added complete `already_quarantined`/`already_frozen` dispositions binding prior receipts and prohibiting duplicate trust successors or economic atoms |
| AE-217 | P2 | Checkout terms confirmation was described both as directly locking fulfillment and as waiting for seller inventory consumption | accepted_and_fixed | Added `receiver_bound_inventory_pending`; acceptance always enters the pending group/obligation pair and only the seller consume plus CheckoutTermsSuccessorReceipt unlocks or blocks payment |
| AE-218 | P2 | AgentConnectionStateHead embedded a refreshable aggregate control head, so unrelated scoped control changes could stale the connection | accepted_and_fixed | Connection stores a stable scoped key and leaf commitment; reads/gates/handoff verify membership in the current aggregate root, while unrelated leaf changes do not rewrite the connection |
| AE-219 | P2 | Cancellation prose allowed a profile-approved post-acceptance cancel but its authorization/binding schemas omitted `accepted` | accepted_and_fixed | Added `accepted` to every expected-state discriminant and requires the exact finality profile to mark that current state cancellation-available |
| AE-220 | P2 | Trust reverse indexes began only after a provider assertion, leaving reserved/handed-off pre-assertion actions invisible to compromise closure | accepted_and_fixed | Added a third enumerable in-flight manifest and signed commitment registered atomically with financial reservation, retained through handoff, atomically promoted on assertion or removed only with fenced/authenticated terminal proof |

## Closure round twenty-one residuals

Two fresh context-blind chairs and one informed full replay audited fixed hash
`b1411e2b163f3564a5aef9f64d26116cd16b820b0d53e3d7a4f69f797cf64e32`.
No P0 was found. Their P1/material P2 findings, plus one author-replay finding,
were accepted and remediated in candidate
`febe377663615a219e089fa1e142cd0eb79f6d8704fc3ea1e5f4a3f1fdb5d008`.

| ID | Sev. | Residual | Disposition | Remediation |
|---|---:|---|---|---|
| AE-221 | P1 | An authenticated terminal event could delete the only in-flight dependency trail before releasing financial capacity | accepted_and_fixed | Removed terminal deletion: every authenticated outcome promotes to a trust assertion and adds released-exposure history before any capacity change; only fenced pre-handoff non-submission removes without promotion |
| AE-222 | P1 | Provider event-ID and sequence equivocation lacked independent authoritative uniqueness state | accepted_and_fixed | Added stable receiver-event identity scopes, separate event-ID and sequence keys, signed two-manifest scope index, atomic two-key binding, complete equivocation quarantine, integrity inventory, and crash/collision mutants |
| AE-223 | P2 | Nonfinancial notices, evidence requests, provider reviews and cancellation had no in-flight constructor even though assertion registration required promotion | accepted_and_fixed | Every external-effect reservation now registers an in-flight commitment; nonfinancial/zero-cost cancellation use empty economic roots but the same complete trust set and promote on every receiver event |
| AE-224 | P2 | Source-credential rotation or expiry could strand a handed-off leaf under the old credential's empty-ended dependency identity | accepted_and_fixed | Added immutable source-authority core/key, one dependency index across credential generations, authenticated continuity receipts, exact-generation bindings and a sole source-credential continuity substitution during assertion promotion |
| AE-225 | P1 | Historical executor-credential compromise had no reverse closure, allowing a forged or wrong-account binding to leave final activity green | accepted_and_fixed | Added immutable executor-binding core/stable dependency, in-flight/assertion registration, coordinator-only historical quarantine, complete exposure closure and prospective-only revoke/expiry semantics |
| AE-226 | P1 | Agent connection state genesis used an unconstrained UUID and had no one-head-per-authorization uniqueness rule | accepted_and_fixed | State ID is derived from the exact authorization; authorization issue atomically creates one insert-only state/control genesis and joint receipt; exact replay is byte-identical and forks conflict |
| AE-227 | P2 | `reversal_confirmed` required a nonfrozen `reversed` successor while the reversed tuple retained quarantine exposure | accepted_and_fixed | Added a historical `confirmed_reversal` atom/event class; confirmed reversal reclassifies quarantine/active-reversal atoms, leaves zero unresolved exposure, and preserves realized-loss accounting |
| AE-228 | P2 | DisclosureAuthorization carried an active-reservation root but its sole writer omitted hold/release/expiry root updates | accepted_and_fixed | Added authorization-head active→active root add/remove CASes, complete revoke/expiry invalidation/root clear, matching writer causes and race mutants |
| AE-229 | P2 | Receiver-stream handoff receipt excluded an outbox-handoff transaction class and did not require atomicity with outbox state | accepted_and_fixed | Added the explicit outbox-handoff transaction class and one transaction for outbox handoff plus stream no-event→unknown successors/receipts before bytes or credentials |
| AE-230 | P2 | Checkout §10 still said terms confirmation directly locked fulfillment, contradicting the inventory-pending state/table | accepted_and_fixed | Replaced it with the two-step terms→inventory-pending then seller-consume/CheckoutTermsSuccessorReceipt→payment-ready-or-blocked sequence |
| AE-231 | P2 | A cap reduced below an immutable compartment configured ceiling but above current exposure could leave an invalid active compartment | accepted_and_fixed | Active/active now requires the cap to cover exposure and every nonclosed configured ceiling; otherwise cap/exposure and all incompatible compartments freeze atomically and cannot resume until replaced/closed |

## Closure round twenty-two residuals

One fresh context-blind chair and one informed full replay audited fixed hash
`febe377663615a219e089fa1e142cd0eb79f6d8704fc3ea1e5f4a3f1fdb5d008`.
No P0 was found. Their P1/material P2 findings, plus one author-replay finding,
were accepted and remediated in candidate
`a215f1305e70c290ee9007421d7ba4e7e3debd6baef9830a70a01b1d7b37c6a8`.

| ID | Sev. | Residual | Disposition | Remediation |
|---|---:|---|---|---|
| AE-232 | P1 | Receiver-identity equivocation could be lost when incomplete closure forced global fail-stop because integrity state retained only compromise-oriented pending data | accepted_and_fixed | Added a signed enumerable typed incident union/manifest for trust compromise, receiver equivocation, and storage failure; healthy requires an empty manifest and recovery commits every branch-exact resolution receipt before resume |
| AE-233 | P2 | The promised late-event path under a retired credential or policy had no encodable registration transition | accepted_and_fixed | Added closed pre-retirement-anchor and independent-current-profile revalidation evidence, exact lifecycle chains, typed registration variants and rejecting mutants |
| AE-234 | P2 | Checkout recovery prose allowed authenticated terms from unknown state to create a ready obligation before seller inventory consumption | accepted_and_fixed | Both terms-unknown states now enter receiver-bound inventory-pending; only seller consume plus CheckoutTermsSuccessorReceipt may produce ready/locked payment outcomes |
| AE-235 | P1 | Cancellation had no credential/account-scope binding branch and could act as a same-audience cross-account confused deputy | accepted_and_fixed | Added an original-handoff-derived receiver-cancellation credential branch, exact account/contract/namespace tuple, signed same-scope replacement continuity and equality through authorization, BindingSet, gate and handoff |
| AE-236 | P2/P1 risk | The first receiver event removed the only in-flight leaf, making later submitted→accepted→fulfilled event registration impossible | accepted_and_fixed | Registration is now a closed first-event in-flight-promotion versus later-event prior-assertion-chain union; later events bind the current prior event/trust head and leave in-flight manifests unchanged |
| AE-237 | P2/P1 risk | A conflicting event ID and sequence drawn from different combined scope indexes could quarantine only one implicated index | accepted_and_fixed | Equivocation receipt now carries the complete canonical fixed-point vector of all implicated index/manifests and atomically quarantines every reached scope/key/stream/trust/exposure dependency |
| AE-238 | P2 | Disclosure revocation could not recoverably enumerate the held reservation from an authorization head that stored only a Merkle root | accepted_and_fixed | Because delivery is single-use and concurrent holds are forbidden, the authorization head now stores the nullable exact reservation ref/hash/fence and atomically installs/clears/invalidates it |
| AE-239 | P2 | Cap reduction could not prove inspection of zero-atom compartments because the exposure head indexed only atom contributors | accepted_and_fixed | Added a signed complete nonclosed-compartment membership manifest, resource-inventory entry, joint issue/close/update transitions, cap receipt bindings and zero-atom cap-reduction mutants |
| AE-240 | P2 | SourceCredentialLifecycleHead required credential generation to equal lifecycle sequence even though retirement/expiry changes lifecycle without installing a credential | accepted_and_fixed | Separated lifecycle sequence from credential generation, made both transition-receipt fields explicit, and added same-generation retirement plus historical-event vectors |

## Closure round twenty-three residuals

Two fresh context-blind chairs and one informed full replay audited fixed hash
`a215f1305e70c290ee9007421d7ba4e7e3debd6baef9830a70a01b1d7b37c6a8`.
No P0 was found. Their P1/material P2 findings, plus three author-replay findings,
were accepted and remediated in candidate
`a802437a469e85ff370f3d92f82381318a7fb9ee62b1a960bddf20b17a72d8d7`.

| ID | Sev. | Residual | Disposition | Remediation |
|---|---:|---|---|---|
| AE-241 | P1 | Receiver-channel authority did not carry an authenticated tenant/account/contract scope and operation namespace through every policy, authority, request and handoff object | accepted_and_fixed | Added the exact receiver scope, namespace and explicit provider selection proof from ReceiverChannelPolicy and credential through mandate/authorization, review, BindingSet, finality, request, outbox and handoff, with cross-tenant mutants |
| AE-242 | P1 | A compromised underlying credential could be re-imported under a second binding ID and escape an alias-local reverse index | accepted_and_fixed | Added a broker-derived canonical CredentialInstanceCore, signed complete alias manifest, one instance state and one instance-keyed trust index; compromise quarantines the instance, all aliases and complete fixed-point dependencies |
| AE-243 | P2 | Receiver event ordering named a sequence but no canonical type, comparator, reset semantics or multi-stream topology | accepted_and_fixed | Restricted v0.1 to one authenticated total-order stream and immutable epoch, canonical uint64 decimal encoding, numeric comparison, no resets/substreams and equal-sequence replay-or-equivocation rules |
| AE-244 | P1 | Receiver-equivocation fail-stop required a complete closure vector precisely when a missing manifest made completeness unknowable | accepted_and_fixed | Incident detection now persists authenticated incoming evidence plus all known scope/key/core seeds and unresolved storage loci; fixed-point completeness is required only after exact-byte repair during recovery |
| AE-245 | P1 | Cancellation tracked only the credential used to cancel, so compromise of the original handoff credential could leave cancellation trust green | accepted_and_fixed | Every cancellation registers original and cancellation canonical credential-instance dependencies, rechecks the original current alias, and requires both-instance continuity evidence for a replacement; original quarantine always denies |
| AE-246 | P2 | Historical acceptance conflated policy revalidation with source authentication and could not represent retired-generation evidence after a successor became current | accepted_and_fixed | Split independent policy revalidation from source-credential reauthentication, bound historical terminal and current family heads, required a distinct active source dependency for reauthentication and closed all three evidence unions |
| AE-247 | P2 | SourceCredentialLifecycleHead transition reasons disagreed with its own permitted transition causes | accepted_and_fixed | Aligned the reason enum with issuance, ordinary rotation, scheduled retirement, expiry, successor installation, compromise and administrative hold |
| AE-248 | P1 | Handoff-created receiver `unknown` was schema-invalid because all unknown states appeared to require an authenticated event | accepted_and_fixed | Added a closed receiver-evidence union: genesis and handoff ambiguity use `none`; an authenticated event classified as unknown uses `authenticated_event` and requires exact event evidence |
| AE-249 | P1 | Later receiver events had to preserve an in-flight manifest byte-for-byte while its sequence was tied to the advancing dependency head | accepted_and_fixed | Gave each signed dependency-index manifest an independent revision that advances only when entries change; later assertions can advance other indexes and the head while retaining the exact in-flight manifest |
| AE-250 | P1 | Checkout terms-successor state referred to an undefined conditional activation/discharge object and omitted the complete economic transition vector | accepted_and_fixed | Added a typed conditional-attempt transition receipt/getter binding subreservation, authority, reservation, lineage, compartment, resource, ledger and atom transitions in the one serializable terms-successor transaction |
| AE-251 | P2 | Execution-release and generic policy lifecycle transitions lacked signed receipts/getters needed to verify historical acceptance chains | accepted_and_fixed | Added the closed ReleaseOrPolicyLifecycleTransitionReceipt, authority/cause matrix and private receipt getters; every non-genesis successor and historical chain must carry it |
| AE-252 | P2 | Compartments had no ordinary close or definition-expiry path, leaving zero-atom membership and cap constraints permanently live | accepted_and_fixed | Added principal close and authority-time expiry operations that require zero atoms/no live or unknown obligation and atomically close ledgers, remove membership and advance resource exposure |
| AE-253 | P2 | Resource-cap genesis required a membership manifest before the later exposure-genesis operation was defined to create it | accepted_and_fixed | Cap genesis now carries null exposure/membership fields; exposure import alone creates the empty signed manifest and integrity entry |
| AE-254 | P2 | Integrity state could record only the first fail-stop incident, so later discoveries while stopped were unrepresentable | accepted_and_fixed | Added a monotonic fail_stopped→fail_stopped incident-manifest add edge; removal remains forbidden until one all-incidents recovery transaction |
| AE-255 | P2 | Trust-registration fields called every predecessor an in-flight head even on later prior-assertion chains | accepted_and_fixed | Renamed them to predecessor-bound heads and closed the discriminator: first event binds the in-flight head, later events bind the exact prior assertion's registered head |

## Closure round twenty-four residuals

Two fresh context-blind chairs and one informed full replay audited fixed hash
`a802437a469e85ff370f3d92f82381318a7fb9ee62b1a960bddf20b17a72d8d7`.
No P0 was found. Their P1/material P2 findings, plus four author-replay findings,
were accepted and remediated in candidate
`38b1fcc75572a28ad2f5741c739af14facfba6f52c49fa240ff543f63659583d`.

| ID | Sev. | Residual | Disposition | Remediation |
|---|---:|---|---|---|
| AE-256 | P1 | Paired checkout activated the payment lineage in the batch and again after terms, while referencing an undefined AuthorityReservationStateHead | accepted_and_fixed | Added CheckoutPaymentSubreservationStateHead: the batch activates only terms and creates conditional-held payment with provisional lineage; the terms successor alone activates or discharges it, and payment redemption alone consumes it |
| AE-257 | P1 | A receiver-equivocation incident with missing storage could encode only one required resolution receipt | accepted_and_fixed | Replaced the discriminator with a closed nonempty resolution-receipt set; every incident with unresolved storage also requires the repair audit, while semantic trust/equivocation evidence remains independently mandatory |
| AE-258 | P2 | Historical and checkout “complete” roots were hashes without enumerable manifests/getters after restart | accepted_and_fixed | Added signed bounded EnumerableTransitionManifest plus getter and typed atom-delta entries; lifecycle/continuity and checkout compartment/ledger/atom vectors now bind manifest ref/hash/count |
| AE-259 | P2 | Receiver scope was carried end-to-end but the exact provider selection proof appeared only at outbox | accepted_and_fixed | Carried exact proof ref/hash through credential, mandate/authorization, review, BindingSet, request/outbox and handoff equality, retaining the policy's authenticated selection rule separately |
| AE-260 | P2 | Later prose allowed authenticated receiver time to break order despite the single uint64 comparator forbidding tie repair | accepted_and_fixed | Receiver time is now audit metadata only and can never determine, repair or break v0.1 event order |
| AE-261 | P1 | Late historical exposure restoration required closed→frozen but the closed compartment had already been removed from the resource membership manifest | accepted_and_fixed | Added coordinator-only historical-restoration membership add that atomically re-adds the exact frozen successor before restoring atoms and removes it again only on resolved frozen→closed |
| AE-262 | P2 | Unbounded reverse indexes and all-incidents recovery could exceed finite transaction limits and permanently fail-stop the service | accepted_and_fixed | Added release-bound hard resource maxima and a required worst-case 32,768-head serializable-transaction proof; admission denies before overflow and no runtime widening/history deletion is allowed |
| AE-263 | P1 | Credential-broker authority compromise had no signed lifecycle, broker→instance index or reverse-closure path | accepted_and_fixed | Added stable broker authority core/lifecycle, independently mutable bounded instance manifest, broker trust dependency, signed transition receipts and coordinator quarantine of every instance/alias/dependent exposure |
| AE-264 | P1 | An authenticated unexpected cancellation charge had no typed economic path, so a real debit could disappear from exposure | accepted_and_fixed | Added fee-source trust dependency, event-derived unexpected-charge exposure core and receipt, and one atomic quarantine/compartment/resource/principal-ledger charge atom transaction |
| AE-265 | P2 | Integrity inventory admitted economic-resource membership but the transition-receipt cause enum named only dependency/identity additions | accepted_and_fixed | Expanded the closed cause to dependency, identity or resource scope addition |
| AE-266 | P2/P1 risk | Receiver-equivocation prose required the incoming core but the incident schema carried only known-conflict arrays | accepted_and_fixed | Added explicit incoming receiver-event identity binding-core ref/hash to the incident and combined repair/equivocation mutants |
| AE-267 | P2 | Credential-instance and alias-manifest mutations had no signed before/after transition receipt despite writer-closure requirements | accepted_and_fixed | Added ExecutorCredentialInstanceTransitionReceipt/getter covering instance, alias, broker-manifest and compromise closure transitions; broker lifecycle/manifest changes have their own receipt |
| AE-268 | P2 | A hard assertion-index bound could strand an already handed-off multi-event action when later events filled the index | accepted_and_fixed | Reservation now pre-reserves up to eight receiver-assertion slots in every dependency head, enforces actual-plus-reserved ≤32, consumes per event and releases unused terminal slots before handoff eligibility |

## Closure round twenty-five residuals

Two fresh context-blind chairs and one informed full replay audited fixed hash
`38b1fcc75572a28ad2f5741c739af14facfba6f52c49fa240ff543f63659583d`.
No P0 was found. Their P1/material P2 findings were accepted and remediated in
candidate `92522af26e3722d79679d566c19e7956f0266b76f6692918403e5336489fc4f2`.

| ID | Sev. | Residual | Disposition | Remediation |
|---|---:|---|---|---|
| AE-269 | P1 | Stable dependency and receiver-identity manifests were lifetime-capped, so ordinary history could permanently exhaust a valid identity | accepted_and_fixed | Converted the caps to per-epoch limits with one accepting epoch, reservation-pinned draining epochs, signed sealed history, exact rollover receipts and getters; broker-instance and credential-alias manifests use the same pattern |
| AE-270 | P1 | Business-final events released assertion capacity before a late reversal or cancellation charge could arrive; receiver-identity keys had no matching slot reservation | accepted_and_fixed | Finality profiles now reserve reversal-tail event, assertion, event-ID and sequence slots before handoff and release them only on authenticated stream closure/irreversible horizon; late events consume their assigned draining epoch |
| AE-271 | P1 | Historical source reauthentication introduced a distinct dependency that could not have been pre-reserved | accepted_and_fixed | Added a signed future-dependency capacity pool; eligible actions reserve a slot before handoff and event import atomically transfers it to the authenticated reauthentication dependency |
| AE-272 | P1/P2 | Arbitrarily large compromise/equivocation closure still assumed one transaction, while a fixed lifetime cap merely moved the failure to admission | accepted_and_fixed | Added global fail-stopped closure barriers and signed bounded partition chains; no trust/capacity/effect presentation is available until complete-plan verification and final quarantine |
| AE-273 | P2 | Hard bounds omitted nested action, policy, control, checkout, inventory, obligation, ledger and remediation fan-outs | accepted_and_fixed | Added explicit maxima for every multiplicative vector, per-admission composed write-cost calculation, live-epoch cap and partition fallback for historical closure |
| AE-274 | P2 | Compartment, resource and limit-ledger roots were not recoverably enumerable, and checkout manifests had no legal typed entry objects | accepted_and_fixed | Added signed current reservation/atom/event manifests, resource union derivation, typed CompartmentStateTransitionReceipt and AuthorityLimitLedgerTransitionReceipt, exact delta manifests, integrity recovery checks and getters |
| AE-275 | P2 | Checkout conditional-attempt receipt and successor heads referenced each other, creating a content-address cycle | accepted_and_fixed | Replaced successor refs with precomputed next-state commitments and a dedicated payment lineage transition receipt; successor heads point one-way to the receipt and recompute the commitment |
| AE-276 | P2 | Revoked/noncurrent conditional payment authority had no legal provisional-lineage terminal edge | accepted_and_fixed | Added typed `provisional_cancelled` with no-activation/gate/outbox proof and a closed expiry/supersession/cancellation terminal receipt |
| AE-277 | P2 | A valid zero-incremental-cost payment-unavailable checkout was required to invent positive economic/ledger deltas | accepted_and_fixed | Permitted canonical signed empty checkout transition manifests and null resource transition only when the conditional atom set is empty, while retaining atomic group/obligation/subreservation/lineage transition |
| AE-278 | P1 | Credential identity included an aliasable broker handle, allowing two handles for one token/session to create distinct instance keys | accepted_and_fixed | Canonical instance identity now uses issuer/broker-authenticated native instance or registry equivalence-class commitment; handles are aliases only |
| AE-279 | P1 | Broker instance manifest could not remain current after alias transitions and mixed broker/registry/coordinator signing authority | accepted_and_fixed | Added exact `instance_head_updated` entry replacement, per-cause signer union, independently stable broker lifecycle, manifest epochs and compromise sealing |
| AE-280 | P1 | Unexpected cancellation charges lacked a prebound principal/resource/asset/compartment sink and complete quarantine/accounting transition | accepted_and_fixed | Cancellation admission now requires a signed incident-sink binding and zero-capacity incident compartment; the closed coordinator receipt carries fee-source/action before-after heads, trust quarantine, membership restoration, typed economic/ledger manifests and one canonical atom |
| AE-281 | P1/P2 | Scope-selection evidence was opaque, had no revocable issuer lifecycle, and was nullable for external financial effects | accepted_and_fixed | Added typed ReceiverScopeSelectionProof and issuer policy lifecycle/trust dependency; every external financial/channel/cancellation chain carries the exact nonnull proof and tuple, with null allowed only for receiverless local effects |
| AE-282 | P1 | Review and taint policy compromise was absent from reverse dependency closure | accepted_and_fixed | Added both policy kinds plus scope-selection issuer to TrustDependencyStateHead and required lifecycle/reverse closure through reservation, handoff and assertions |
| AE-283 | P2 | Connection transition receipt promised expected sequence, control authorization and outstanding actions but encoded none | accepted_and_fixed | Added cause-closed expected-sequence and principal-control proof fields plus exact before/after heads of the independently mutable signed outstanding-action index on every branch |

## Closure round twenty-six residuals

Two fresh context-blind chairs and one informed full replay audited fixed hash
`92522af26e3722d79679d566c19e7956f0266b76f6692918403e5336489fc4f2`.
All three verified the hash before and after and made no edits. No P0 was found.
Their P1/material P2 findings, plus direct-author replay findings exposed while
making the fixes mechanically complete, were accepted and remediated in
candidate `57f262e57d44cea695acae140fdebc47b1c948a49746a4a76a45ff82ea190c0e`.

| ID | Sev. | Residual | Disposition | Remediation |
|---|---:|---|---|---|
| AE-284 | P1 | Receiver assertion heads could not represent review, taint, or receiver-scope-selection issuer dependencies promised by complete-set registration | accepted_and_fixed | Added all three dependency and quarantine kinds and exact equality across in-flight, registration, and trust-head sets |
| AE-285 | P1 | An authenticated event without a reserved slot had no legal fail-stop incident or recovery path | accepted_and_fixed | Added typed unreserved-event incident/failure/epoch causes, retained raw import, emergency stopped-only epoch recovery, exact classification receipt, and mutants |
| AE-286 | P1 | Coordinator-only fee-source and nested broker credential quarantine successors required signatures from the authority being quarantined | accepted_and_fixed | Added cause-closed registry/broker versus trust-coordinator signer unions and typed transition receipts recursively through binding, alias, instance, manifest, and fee-source heads |
| AE-287 | P1 | Finite private-read atomicity was asserted but the read receipt encoded neither shared transaction nor response-handoff marker | accepted_and_fixed | Added DataGrantStateTransitionReceipt, ResponseHandoffMarker, shared transaction/commitments, getters, one-way DAG, and crash/race controls |
| AE-288 | P1 | A conformance vector released reversal-tail slots at ordinary business finality contrary to normative finality rules | accepted_and_fixed | Tail release now requires the profile's authenticated stream closure or finite receiver-authenticated irreversible horizon; business-final release is a failing mutant |
| AE-289 | P1 | The authoritative raw receiver-event import object and idempotency boundary were undefined | accepted_and_fixed | Added closed ReceiverEventImportCore, ProviderEventImportReceipt, canonical semantic key/digest, exact-replay/equivocation/unreserved branches, and private getters |
| AE-290 | P1 | Connection outstanding-action completeness had no independently mutable signed index or restart-safe lifecycle | accepted_and_fixed | Added a separate enumerable current-action index head/receipt and atomic reservation, handoff/event update, terminal removal, restriction snapshot, and seal causes |
| AE-291 | P1 | Compartment reservations, economic atoms, confirmed events, ledger events, and resource unions lacked usable lifetime-enumerable representations | accepted_and_fixed | Added canonical content-addressed enumerable maps for long-lived sets; bounded transition manifests now carry only transaction deltas and typed receipts |
| AE-292 | P2 | ExecutionControlStateHead embedded an unbounded vector of scoped control heads | accepted_and_fixed | Replaced it with an enumerable map of typed scoped leaf heads, exact mutation receipt, membership proofs, terminal tombstones, and namespace rotation law |
| AE-293 | P2 | Source-credential continuity and historical-acceptance chains failed after the 128-entry transition-manifest limit | accepted_and_fixed | Added per-lifecycle enumerable transition-history heads/maps, self-excluding successor commitments, exact sequence-range proofs, and over-128 restart vectors |
| AE-294 | P1 | Live and sealed bounded-index epochs stored roots without resolvable epoch heads, manifest sets, or reservation assignments | accepted_and_fixed | Added enumerable live directory, typed epoch heads, slot assignments, sealed chain nodes, exact before/after directory/epoch fields, vector receipts, and getters |
| AE-295 | P1 | Future source-reauthentication capacity had no core, constructor, assignment ownership, receipt, or explicit maximum | accepted_and_fixed | Added bounded pool core/state/import, typed per-action assignment, atomic reserve/transfer/release receipt, exact in-flight binding, and registry operations |
| AE-296 | P1 | Partitioned trust closure could verify a coordinator-authored incomplete plan and restore health | accepted_and_fixed | Added frozen source snapshot, deterministic fixed-point plan/work frontier, typed partition receipts, source membership proofs, empty-frontier requirement, result/receipt maps, and typed completion receipt |
| AE-297 | P1 | Integrity inventory/incidents and several economic/current histories still had lifetime caps or opaque roots | accepted_and_fixed | Moved inventory, incidents, current economic histories, and integrity verification evidence to canonical enumerable maps with paged end-cursor proofs and no lifetime cap |
| AE-298 | P1 | Restoring a closed historical compartment could create a 65th member in a 64-member active manifest | accepted_and_fixed | Separated bounded ordinary membership from an enumerable zero-capacity historical-incident overlay; late exposure uses only the overlay and never grants capacity |
| AE-299 | P1 | A checkout payment subreservation activated after terms could strand holds if authority expired or was revoked before redemption | accepted_and_fixed | Added four terminal activated-release states plus CheckoutActivatedPaymentReleaseReceipt binding no-handoff proof and balanced group/obligation/lineage/economic successors |
| AE-300 | P2 | Generic transition-manifest discriminators did not cover the actual closure and economic delta consumers | accepted_and_fixed | Closed manifest kinds and entry unions now cover lifecycle, checkout/general economic/ledger deltas, and closure partitions; current sets use maps instead |
| AE-301 | P2 | A fixed live-epoch cap could permanently stall a scope when tail reservations never became releasable | accepted_and_fixed | Removed the lifetime live-epoch cap, required an authenticated closure or finite irreversible horizon, and added a bounded current outstanding-stream admission map |
| AE-302 | P1 | Closure completion had no typed receipt joining empty frontier, fixed-point results, partition history, incident state, and health outcome | accepted_and_fixed | Added TrustClosureCompletionReceipt and getter; health restoration is valid only with canonical empty remaining-incident map |
| AE-303 | P1 | Receiver outstanding-stream admission/release was counted but lacked a direct typed mutation receipt | accepted_and_fixed | Added signed stream-entry successors and ReceiverOutstandingStreamTransitionReceipt joining index/map, epoch assignment, receiver-stream, and terminal removal |
| AE-304 | P2 | Lifecycle transition receipts named only the prior history head and did not commit the exact history-map successor | accepted_and_fixed | Added self-excluding next-history commitment; genesis receipts bind the empty history head and each successor recomputes its map-add commitment without a content cycle |
| AE-305 | P1 | Integrity repair still summarized arbitrarily large verification work in opaque roots | accepted_and_fixed | Added enumerable verification-result and resolved-incident maps, inventory/keyset equality and end-cursor proofs, with exact-byte restoration evidence while globally stopped |
| AE-306 | P1 | Receiver-event binding and bounded-epoch transition receipts could not prove paired event-ID/sequence assignment consumption | accepted_and_fixed | Added exact directory/assigned-epoch/paired assignment before-after fields and a canonical bounded assignment-transition vector |

## Closure round twenty-seven residuals

Two context-blind chairs and one informed regression chair audited fixed hash
`57f262e57d44cea695acae140fdebc47b1c948a49746a4a76a45ff82ea190c0e`.
All three verified the hash before and after and made no edits. No P0 was found.
Their P1/material P2 findings were accepted and remediated in candidate
`d3ff3c2736cc2f3172211fc7dbc380da683767e5941e98e49e1ece89b8c68b93`.

| ID | Sev. | Residual | Disposition | Remediation |
|---|---:|---|---|---|
| AE-307 | P2 | Horizon-only finality could strand connection outstanding-action entries, especially after sealing | accepted_and_fixed | Added authenticated irreversible-horizon removal, exact terminal evidence, and a closed active/sealed drain matrix; business finality and timers cannot remove membership |
| AE-308 | P2 | A combined checkout ceremony did not make clear that terms may bind even when payment later blocks | accepted_and_fixed | Added the closed `TERMS_MAY_BIND_BEFORE_PAYMENT` semantic acknowledgement through review, both BindingSets, both one-shot authorities or principal-present mandate issuance, UI copy, gate rules, and comprehension mutants |
| AE-309 | P2 | Signed-object bounds did not cap every object, string, ref, nesting level, property set, or inline array | accepted_and_fixed | Added request/object/string/ref/depth/property/per-array/total-descendant-array maxima, strict preallocation parsing, inheritance rules, and content-addressing for larger evidence |
| AE-310 | P1 | Partitioned closure did not prove exact trigger-derived seeds, typed per-work-item results, or typed complete partition history | accepted_and_fixed | Added snapshot/result schemas, closure map kinds, trigger↔seed/work↔result/sequence↔partition keyset equality, completed scans, and fixed-point completion checks |
| AE-311 | P1 | Long-lived economic, reservation, ledger, and connection-action maps were not type-closed | accepted_and_fixed | Added exact entry schemas, a closed map-kind/key/schema/domain/authority registry, before/after connection-entry refs, and typed getters |
| AE-312 | P1 | Activated checkout payment release relied on an undefined negative proof of no redemption/handoff | accepted_and_fixed | Added a transaction-bound non-submission proof over current group/attempt/authority/lineage/action/reservation/map/fence state plus effect-lease/outbox nonmembership, required in the same release CAS |
| AE-313 | P1 | Receiver identity mixed aggregate and per-epoch counters/manifests, making draining-epoch updates ambiguous | accepted_and_fixed | Made the scope head an aggregate directory/accepting-epoch cursor with checked totals; manifests and reservations live only in typed epoch heads |
| AE-314 | P1 | Future-dependency capacity had no normative conservation or assignment-membership invariant | accepted_and_fixed | Added `available + reserved/transferred = limit`, a closed assignment matrix, before/after count and availability proof, getter, terminal-release rule, and last-slot CAS mutant |
| AE-315 | P2 | Connection genesis required an outstanding-index predecessor that could not exist | accepted_and_fixed | Permitted null only at genesis and required the canonical empty signed successor |
| AE-316 | P2 | Receiver outstanding-stream mutation lacked a registered getter, direct transition operation, and writer row | accepted_and_fixed | Registered the getter and sole authority-internal transition writer with closed causes and receipt requirements |
| AE-317 | P2 | Broker-authority compromise produced a coordinator result while the state head admitted only registry signatures | accepted_and_fixed | Added a cause-closed registry/coordinator signer union with coordinator authority limited to quarantine |
| AE-318 | P1 | Recovery-grant and control receipts could form a reciprocal content-address cycle | accepted_and_fixed | Made RecoveryGrantTransitionReceipt upstream with a self-excluding control-successor commitment; only the later control receipt references it |
| AE-319 | P1 | Global seller-copy ownership transfer had the wrong signer and no independently typed transition receipt | accepted_and_fixed | Added the seller/ownership-registry signer union, typed SellerCopyLeaseTransitionReceipt/getter, generation rules, and parent inventory receipt-root membership |
| AE-320 | P2 | Checkout prose implied seller inventory consumption and Cairn successors shared one cross-owner atomic transaction | accepted_and_fixed | Made the seller receipt a pre-existing independent saga input and the Cairn successor a stable-keyed restart-safe idempotent CAS; added the crash-between-authorities vector |
| AE-321 | P2 | Release and policy lifecycle writer rows omitted the enumerable lifecycle-history head they normatively advance | accepted_and_fixed | Both rows now create empty history at genesis and atomically append each typed transition receipt under a self-excluding successor commitment |
| AE-322 | P2 | Mandatory-obligation and incremental-fulfillment component fan-outs lacked their own maxima | accepted_and_fixed | Added distinct component maxima plus inherited object/vector bounds and pre-admission composed-write accounting |

## Closure round twenty-eight residuals

Two context-blind chairs and one informed regression chair audited fixed hash
`d3ff3c2736cc2f3172211fc7dbc380da683767e5941e98e49e1ece89b8c68b93`.
All verified the hash before and after and made no edits. No P0 was found. Their
P1/material P2 findings were accepted and remediated in candidate
`a027277527853fe1d784d27bb5d8e831a8bec293756d5337fcf04d5ae90573f5`.

| ID | Sev. | Residual | Disposition | Remediation |
|---|---:|---|---|---|
| AE-323 | P2 | Economic atoms/deltas/ledger events could point to a receipt that pointed through their containing after-map, creating a content-address cycle | accepted_and_fixed | Added an immutable pre-mutation EconomicMutationCauseCore with only predecessors, authenticated source evidence, semantic deltas, transaction/idempotency identity, and no successor/receipt refs; entries and final receipts point one-way to it with cycle mutants |
| AE-324 | P2 | Integrity recovery summarized the supposedly complete incident-resolution set in an opaque non-enumerable root | accepted_and_fixed | Added typed IntegrityIncidentResolutionEntry, enumerable map/ref/hash/count, before-incident keyset equality, completed scans, getter, and stopped-recovery ACL |
| AE-325 | P2 | The first closure transaction was required to materialize an unbounded snapshot and plan before fail-stop | accepted_and_fixed | Added `fail_stopped_snapshotting` genesis with empty progress maps, bounded stopped snapshot partitions, exact snapshot-completion receipt, and self-excluding applying-state commitment; semantic closure starts only after the frozen scan completes |
| AE-326 | P1 | Irreversible-horizon release existed in prose but not as a typed end-to-end slot/pool/stream/connection drain | accepted_and_fixed | Added AuthenticatedIrreversibleHorizonReceipt/import/getter and carried the same evidence through bounded assignments, epoch receipt, future pool, outstanding stream, and connection removal |
| AE-327 | P1/P2 | Partitioned closure still required unbounded monolithic quarantine, equivocation, and exposure-remediation receipts | accepted_and_fixed | Made all three receipts direct-bounded versus closure-partition unions; partition receipts bind plan/snapshot/sequence/work subset upstream, and completion proves the exact typed union without an unbounded final receipt |
| AE-328 | P1 | Release, policy, source-credential, and lifecycle-history compromise successors still required signatures from the authority being quarantined | accepted_and_fixed | Added cause-closed signer unions: lifecycle authority only for ordinary edges, trust coordinator only for compromise quarantine, consistently across head/transition/history successors |
| AE-329 | P1 | Normal handoff required an epoch-transition receipt even though no identity slot changed | accepted_and_fixed | Made the epoch receipt null exactly for handoff while requiring the unchanged assigned-epoch head; terminal branches still require typed release transitions/evidence |
| AE-330 | P2 | A future-dependency pool could fail-stop but had no repair edge | accepted_and_fixed | Added repair-audit-only `fail_stopped → active` with core/map/count/availability byte-identical; quarantined remains terminal |
| AE-331 | P1 | Equivocation incident genesis required every then-known recursive scope/core in inline arrays before partitioning | accepted_and_fixed | Limited durable incident genesis to the incoming core and at most the two directly collided keys/bound cores; all counterpart and recursive discovery occurs only under stopped fixed-point closure |
| AE-332 | P1 | Admission had no authoritative current provider sequence-epoch selector, allowing stale-epoch reservation and per-epoch outstanding-limit multiplication | accepted_and_fixed | Added a stable epoch-excluding selector, authenticated monotonic epoch proof, selector-wide scope/outstanding maps, binding/recheck semantics, draining old scopes, trust dependency, operations, writer row, and rotation/race mutants |

## Closure round twenty-nine residuals

One fresh nested context-blind reviewer and one informed full replay audited
fixed hash
`a027277527853fe1d784d27bb5d8e831a8bec293756d5337fcf04d5ae90573f5`.
Both verified the hash before and after and made no edits. No P0 was found. Their
P1/material P2 findings were accepted and remediated in candidate
`3442b1df7399e0b319f23fe2de95dfc67b4135667c42cb710d7b4811e1d3b96d`.

| ID | Sev. | Residual | Disposition | Remediation |
|---|---:|---|---|---|
| AE-333 | P1 | Irreversible-horizon drain named cross-layer releases but had only an opaque trust root, no future assignment binding, and no enumerable complete receipt set | accepted_and_fixed | Added an enumerable trust-assignment manifest, explicit future-pool and connection assignments, a pre-mutation ReceiverTerminalReleasePlanCore, and a deterministic completion receipt proving exact identity/trust/future/stream/connection transition equality without a content cycle |
| AE-334 | P1 | Receiver epoch-selector recovery could claim `integrity_repair_verified` without binding the repair audit | accepted_and_fixed | Made selector fail-stop/repair a closed receipt union: fail-stop requires the exact incident, repair requires the exact signed audit, and all other causes require both pairs null; added omission/substitution vectors |
| AE-335 | P2 | Trust-closure completion allowed `health_restored:false` but the integrity writer had no legal partial-resolution successor | accepted_and_fixed | Closed the union: false retains the byte-identical fail-stopped integrity head and incident map with no integrity mutation; true alone uses the all-incidents healthy successor and empty map |
| AE-336 | P1 | Seller-inventory and copy-ownership signers lacked lifecycle-bound authority, revocation, and compromise closure | accepted_and_fixed | Added stable CommerceSignerAuthorityCore/lifecycle/transition receipts for both families; bound exact active heads/generations through inventory, review, BindingSet, gate/handoff and trust indexes; added coordinator-only reverse closure and signer races |
| AE-337 | P2 | Authenticated terms reversal while inventory was `terms_fenced` contradicted the checkout/obligation edge tables and seller saga | accepted_and_fixed | Added paired pre-consume reversal/inventory-release-pending states, a local reversal receipt that preserves item exposure, and a later completion receipt that consumes the independent seller-signed release before reaching reversed/released |
| AE-338 | P2 | Activated-payment cleanup required a nonexistent mutable authority state and inadmissible lineage terminal states | accepted_and_fixed | Replaced the phantom head with a cause-closed proof over immutable authority expiry, restrictive control, typed supersession, or fenced non-submission; every activated release now uses the legal active→fenced_non_submission lineage edge and complete current ledgers/fences |
| AE-339 | P2 | Paired checkout claimed preauthorized support while its batch shape required two one-shot authorities | accepted_and_fixed | Added per-role CheckoutRoleAuthorityBasisReceipt unions for supervised one-shot versus principal-confirmed mandate scope/ledger branches and propagated both receipts through batch, subreservation, readiness, gate, handoff and conformance |
| AE-340 | P2 | Quote-source identity, signing-key lifecycle, and importer adapter were not durable trust dependencies | accepted_and_fixed | Reused source-credential and adapter lifecycle families, added exact fields plus ProviderQuoteImportReceipt/raw-artifact mapping, propagated both dependencies through review/BindingSet/gate/handoff, and added retirement/rotation/compromise vectors |

## Closure round thirty residuals

One fresh context-blind reviewer and one informed full replay audited fixed hash
`3442b1df7399e0b319f23fe2de95dfc67b4135667c42cb710d7b4811e1d3b96d`.
Both verified the hash before and after and made no edits. No P0 was found. Their
P1/material P2 findings were accepted and remediated in candidate
`8b3137f20e4def97c53dee3cbda14bb2f1a189c1abe14d6696eab5b8ff7b4b97`.

| ID | Sev. | Residual | Disposition | Remediation |
|---|---:|---|---|---|
| AE-341 | P1 | Terminal trust assignment/transition manifests referenced entry kinds forbidden by the closed manifest schema | accepted_and_fixed | Added dedicated receiver trust assignment/transition manifest kinds and exact BoundedIndexSlotAssignment/BoundedIndexEpochTransitionReceipt entry kinds with cross-product rules and wrong-kind mutants |
| AE-342 | P2 | Horizon-only release demanded a receiver-stream transition even though that head has no horizon edge | accepted_and_fixed | Made stream evidence cause-discriminated: closure carries a stream transition, horizon proves the exact unchanged stream head, and pre-handoff non-submission carries neither; expected kind sets derive from cause |
| AE-343 | P1 | Commerce-signer compromise was absent from the closed assertion-quarantine reason union | accepted_and_fixed | Added exclusive seller-inventory/copy-registry compromise reasons tied to their exact dependency/transition and omission/substitution vectors |
| AE-344 | P2 | The first non-genesis lifecycle transition could omit the authoritative empty history predecessor | accepted_and_fixed | Made the before-history ref/hash nonnull on every non-genesis release/policy/source transition; extended the same history law to commerce signers and added first-transition mutants |
| AE-345 | P2 | Namespace genesis/rotation receipts required an ExecutionControlAuthorization that could not authorize either operation | accepted_and_fixed | Added a closed control-receipt authorization-basis union: ordinary controls require ExecutionControlAuthorization; namespace branches require the exact high-assurance-signed namespace, with prior namespace/revoked head mandatory on rotation |

## Closure round thirty-one residuals

One context-blind fixed-hash reviewer and one informed full replay audited fixed
hash `8b3137f20e4def97c53dee3cbda14bb2f1a189c1abe14d6696eab5b8ff7b4b97`.
Both verified the hash before and after and made no edits. The informed replay
found no P0/P1/material P2; the blind reviewer found two P1 ownership-boundary
errors. Both were accepted and remediated in candidate
`65e377f165403ac293e49eb895e8c746a405ced1fa9f7c4257f87092a07d24a4`.

| ID | Sev. | Residual | Disposition | Remediation |
|---|---:|---|---|---|
| AE-346 | P1 | Provider account/sublimit compromise required the coordinator to sign registry-owned identity heads and histories | accepted_and_fixed | Preserved registry heads as external truth and added a Cairn-owned ProviderIdentityTrustOverlay with cause-closed authority-service/coordinator signatures, registry transition receipts, lifecycle history, full review/BindingSet/gate/handoff propagation, and offline-registry compromise vectors |
| AE-347 | P1 | Commerce-signer compromise required an impossible atomic mutation of seller-owned inventory heads | accepted_and_fixed | Made the coordinator-signed commerce-authority restriction immediately render last-observed seller heads locally ineligible and close only Cairn-owned actions/assertions/exposure; seller heads remain unchanged external truth and any later seller quarantine/release is an explicit two-owner saga |

## Closure round thirty-two residuals

One fresh nested context-blind reviewer and one informed full replay audited fixed
hash `65e377f165403ac293e49eb895e8c746a405ced1fa9f7c4257f87092a07d24a4`.
Both verified the hash before and after and made no edits. No P0 was found. Their
P1/material P2 findings, plus one same-pattern lifecycle defect found by the
author's complete equality-constraint sweep during remediation, were accepted
and remediated in candidate
`21aa073811ce49977670fc077d98a3f475cd1f6861c8af80a9502d659e9e5590`.

| ID | Sev. | Residual | Disposition | Remediation |
|---|---:|---|---|---|
| AE-348 | P1 | ProviderIdentityTrustOverlayStateHead pointed to its lifecycle-history head while that head and transition receipt pointed back, making genesis and successors content-address cyclic | accepted_and_fixed | Removed the overlay→history refs, made history discoverable only by stable history key, retained one-way history/receipt bindings and self-excluding successor commitments, and added genesis/first-transition cycle mutants |
| AE-349 | P1 | Provider account and sublimit heads required identity generation to equal lifecycle sequence while terminal restrictions advanced sequence but retained generation | accepted_and_fixed | Split lifecycle sequence from identity generation; every successor advances sequence, only generation-advanced transitions increment identity generation, receipts retain generation on restrictions, and terminal-edge mutants cover both families |
| AE-350 | P2 | The spec promised later seller quarantine/release after commerce-signer compromise but every external inventory edge correctly required that authority to remain active | accepted_and_fixed | Chose the fail-closed v0.1 boundary: Cairn closes local trust/exposure but never mutates external seller heads; those heads remain permanently locally ineligible, stale signatures cannot clean them up, and re-admission requires a future separately versioned owner-authorized recovery protocol |
| AE-351 | P1 | The same lifecycle-sequence/source-generation conflation would make cancellation fee-source revocation, expiry, or quarantine ambiguous or unconstructible | accepted_and_fixed | Split fee-source lifecycle sequence from authenticated source generation, added exact before/after generation fields to its receipt, retained generation on every restrictive edge, and added transition mutants |

## Closure round thirty-three residuals

One fresh context-blind commerce reviewer audited fixed hash
`21aa073811ce49977670fc077d98a3f475cd1f6861c8af80a9502d659e9e5590`,
verified the hash before and after, and made no edits. No P0 was found. Its two P1
findings were accepted and remediated in candidate
`d6118bb26182298ab63e7a587d7fa36b8124f88ce486aa03d2a28867d8cd2f18`.

| ID | Sev. | Residual | Disposition | Remediation |
|---|---:|---|---|---|
| AE-352 | P1 | Provider-account receipt/matrix admitted registry revocation and expiry but ProviderAccountIdentityHead and its writer row admitted only active/quarantined | accepted_and_fixed | Added revoked/expired account states and exact writer edges, retained identity generation while advancing lifecycle sequence, required status active at every value gate, and added root-account restriction vectors |
| AE-353 | P1 | Blanket post-compromise inventory ineligibility could strand a terms-fenced global copy, accepted checkout/ordinary obligation, and held exposure forever; routine rotation/retirement could create the same condition | accepted_and_fixed | Required complete jointly signed zero-nonterminal drain proofs before routine rotation/retirement; added immutable owner consent and a role-complete registry-signed restrictive recovery authorization that can only consume already-accepted terms, release a proved failed obligation while quarantining copies, or quarantine unresolved state; added exact writer/operation/checkout bindings and abuse/race mutants |

## Closure round thirty-four residuals

The context-blind commerce reviewer audited fixed hash
`d6118bb26182298ab63e7a587d7fa36b8124f88ce486aa03d2a28867d8cd2f18`,
verified it before and after, and made no edits. No P0 was found. Its one P1 and
two material P2 findings were accepted and remediated in candidate
`8d3d1adabd41956ed95d5545b9aa83fc66b156b9d16ff3019cf9c562fed72f2f`.

| ID | Sev. | Residual | Disposition | Remediation |
|---|---:|---|---|---|
| AE-354 | P1 | Restrictive recovery required terminal authority bases, but SellerCopyLeaseTransitionReceipt still required both authority refs to be active | accepted_and_fixed | Made both receipt authority fields branch-discriminated exact active versus recovery-basis refs/generations, matching authorization and successor heads with exact role-signature equality |
| AE-355 | P2 | An immutable empty drain snapshot could race a new prepare because no authoritative draining fence blocked admission | accepted_and_fixed | Replaced direct rotation/retirement with active→draining→completed two-phase lifecycles; prepare serializably guards both active heads, draining forbids new admission, and completion/abandonment requires an exact post-drain empty enumerable proof under the unchanged draining head |
| AE-356 | P2 | Recovery child copy receipts were required to bind the parent transition commitment in prose while the schema allowed that field only for ordinary edges | accepted_and_fixed | Required the same self-excluding parent commitment in ordinary and restrictive-recovery children, froze its acyclic preimage, retained the complete child-receipt root only in the later parent, and added null/substitution/partial/cycle mutants |

## Closure round thirty-five residuals

The context-blind commerce reviewer audited fixed hash
`8d3d1adabd41956ed95d5545b9aa83fc66b156b9d16ff3019cf9c562fed72f2f`,
verified it before and after, and made no edits. Its single P1 finding was accepted
and remediated in candidate
`20fd389743d475d84a510868974449c656d7332294cb3d005dbf8a3cf8bb3ce2`.

| ID | Sev. | Residual | Disposition | Remediation |
|---|---:|---|---|---|
| AE-357 | P1 | The two-phase authority lifecycle allowed old leases to clear while draining, but reservation/copy heads and receipts admitted only active ordinary or terminal restrictive-recovery authority bases | accepted_and_fixed | Added a distinct current-draining-cleanup basis tied to exact drain-begin receipts, unchanged generations, pre-drain copy/reservation and terms-handoff sets, branch evidence and required role signatures; registered the direct cleanup operation/writer edges, forced payment-blocked after non-active consume, preserved safe rotation continuity for available copies, and added all branch/race/abuse mutants |

## Closure round thirty-six residuals

The context-blind commerce reviewer audited fixed hash
`20fd389743d475d84a510868974449c656d7332294cb3d005dbf8a3cf8bb3ce2`,
verified it before and after, and made no edits. No P0 was found. Its two P1 and
one material P2 cross-reference findings were accepted and remediated in
candidate `969a145b93f4bf7ebb6843a3041a8510d5ebcc8be89b939f8afe6cde0cece9bc`.

| ID | Sev. | Residual | Disposition | Remediation |
|---|---:|---|---|---|
| AE-358 | P1 | Mixed restrictive/draining recovery was admitted by its schema but the closed writer row and operation prose allowed only active nonrestrictive co-signers | accepted_and_fixed | Extended the writer and operation rules to exact current active or current-draining-cleanup remaining roles, with unchanged generation, drain-begin receipt and matching role signature |
| AE-359 | P1 | Checkout pre-consume reversal admitted `draining_cleanup` as an authority kind but its copy-root and release-receipt fields named only ordinary/restrictive results | accepted_and_fixed | Closed the union explicitly: ordinary/draining release produces all-available copies and accepts `release | drain_cleanup_release`; restrictive recovery produces all-quarantined copies and accepts only `restrictive_recovery_release` |
| AE-360 | P2 | An older compartment paragraph still equated account/sublimit generation with lifecycle sequence despite the repaired state and transition matrices | accepted_and_fixed | Rebound both comparisons to the explicit `account_generation` and `sublimit_generation` fields and stated that lifecycle sequence is not the authority generation |

## Closure round thirty-seven residual

The context-blind commerce reviewer audited fixed hash
`969a145b93f4bf7ebb6843a3041a8510d5ebcc8be89b939f8afe6cde0cece9bc`,
verified it before and after, and made no edits. Its single P1 finding was accepted
and remediated in candidate
`a30de7da1af5a9f2497ec26f3dd4f552a6640fdb1e13c4b03f2c76479cccd386`.

| ID | Sev. | Residual | Disposition | Remediation |
|---|---:|---|---|---|
| AE-361 | P1 | CheckoutTermsSuccessorReceipt required both draining roles, required the commit-time draining basis to remain current, and accepted only an ordinary consume receipt, so mixed drain cleanup or clean rotation before local import stranded the Cairn obligation | accepted_and_fixed | Made seller/copy authority bases independently discriminated at external commit, enumerated all three consume receipt causes, added current authority heads plus complete consecutive history at local settlement, allowed asynchronous terminal-truth recording after lifecycle advance, and forced payment blocked whenever the commit basis is non-active or no longer exact-current; applied the same historical-basis rule to release completion and ordinary-deal terminal imports |

## Closure round thirty-eight — fixed-hash closure

One fresh context-blind commerce reviewer and one informed full-regression
reviewer independently audited exact artifact SHA-256
`a30de7da1af5a9f2497ec26f3dd4f552a6640fdb1e13c4b03f2c76479cccd386`.
Both verified that hash before and after their read-only reviews and made no
edits. Neither found a P0, P1, or material P2. The informed reviewer replayed
AE-001 through AE-361, with particular attention to the final authority,
trust, inventory, checkout, lifecycle, race, and writer-operation repairs.

Mechanical closure reproduced 197 unique schema declarations and 345 unique
operation declarations, with no duplicate schema IDs, duplicate operation IDs,
missing backticked operation references, or duplicate headings. `git diff
--check` passed. The unchanged proposal-only baseline passed 83/83 authored
controls and killed 75/75 security mutants across 22 strict JSON sources, 12
object schemas, and the frozen ten-operation surface; its internal deterministic
bundle hash remained
`sha-256:d84dd5c2a925575c4889ab51f784cca58bd7c7ec14fcf0ae66dd7d8a6eeff29c`.

## Rejected false positives

- Missing live provider adapters is deliberate phasing, not a current claim.
- Human-reserved release, waiver, dispute, and arbitration are deliberate
  separation, not incomplete execution.
- A logical compartment is not inherently an escrow claim; without verifiable
  external enforcement it is labeled `cairn_ledger_only` and delegated value is
  now prohibited.
- The frozen registry's `schema_only` status must not be edited in place.
- Repeating an ObjectRef and expected semantic hash is allowed when validators
  require exact equality; redundancy itself is not authority.

## Closure gate

The register closes only after:

1. one new context-blind read-only audit of the remediated artifact;
2. one informed replay against the baseline and every AE row;
3. zero open P0/P1 and no material unowned P2;
4. `git diff --check`, heading/duplicate checks, source-link check, proposal-only
   test/mutation replay, and base bundle hash verification; and
5. an explicit statement that prose closure does not authorize an execution
   service or conformance claim.

These gates are satisfied for the exact spec hash above as of 2026-07-21. This
closes the prose-design audit only. It does not create a machine-readable v0.2
bundle, authorize construction or deployment of an execution service, establish
provider or payment authority, or support a Cairn conformance claim.
