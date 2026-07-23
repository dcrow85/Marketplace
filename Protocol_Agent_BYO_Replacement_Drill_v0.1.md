# Cairn BYO-agent replacement drill v0.1

**Status:** first cold audit found four material P2 evidence gaps; the local
candidate is remediated and awaits repeat independent verification

**Kernel under test:** `cairn-proposal-foundation-v0.1`

**Executable:** `simulations/protocol_byo_agent_replacement.mjs`

**Isolated Agent B worker:** `simulations/protocol_byo_agent_b_worker.mjs`

**Automated gate:** `simulations/protocol_byo_agent_replacement.test.mjs`

## The plain-English question

If a collector stops using Anko and chooses a different agent, can the new agent
recover the identity and permitted projection of the collector's saved intent in
a separate process, using its own key and grants rather than inheriting Anko's
authority?

This remediated candidate says **yes at the current proposal-only boundary**.

The user—not Anko—signs the intent. The service creates separate scoped
projections for each runtime, disclosing only `/targets` while redacting
`/constraints/total_budget`. After Anko is revoked, Agent B runs in a separately
invoked Node process whose serialized normal inputs contain only:

1. Agent B's public runtime binding;
2. a principal-signed DataGrant addressed to Agent B's exact runtime and naming
   the scoped projection reference and retrieval URI;
3. a mode label telling the worker which bounded artifact to construct.

The fixture worker carries fixed public verification roots for the collector,
service, object issuer, and Agent B provider. The host cannot redefine those
controllers through serialized input.

The normal Agent B process receives no serialized Anko prompt, chat transcript,
database, key, grant, idempotency record, service store, or action authority.
Separate red-team probes deliberately inject Agent A material and verify rejection;
that adversarial input is not described as normal replacement context.

## What the run does

1. Two different providers create independently keyed runtime bindings.
2. The collector signs one `ActiveIntent`.
3. Agent A submits the intent and reads an Agent A-scoped projection.
4. A red-team request tries Agent A's grant under Agent B. The service rejects both the
   recipient and audience.
5. A red-team request tries to reuse Agent A's idempotency key under B's runtime.
   The service returns
   `idempotency_conflict`.
6. The collector signs a new projection DataGrant for Agent B.
7. A separate Agent B process validates principal signer authority, exact runtime,
   purpose, use, projection scope, and its own public runtime binding.
8. Runtime swaps, Agent A grant swaps, byte tampering, and a validly signed grant
   from the wrong controller are rejected before a normal B request is emitted.
9. Agent A's runtime key and read grant are revoked. A new Agent A request is
   denied.
10. Agent B resolves its binding and reads its bounded projection, which names
    the exact same content-addressed intent but contains no private budget value.
11. The isolated worker signs Agent B's proposal and preparation envelope. The
    service result is only a `draft` with
    `action_state_transition:false`, `external_effect:false`, and explicit
    non-claims of authority and effect.
12. Agent B tries `action.execute`. The operation does not exist.

The deterministic run currently passes **18/18 direct probes** and produces
report hash:

```text
sha-256:8ded6d7f158023a5ba4e76a5d9b4d6515eeb0d81982be09fc5dcc550715f9ece
```

## What this proves

- Cairn can store the user's signed intent outside an individual agent.
- A separately invoked Agent B process can recover the same intent reference
  through a privacy-bounded, B-audience projection.
- Replacement does not require transferring an old agent's raw private key.
- Access is re-granted to the exact new runtime, not inherited by provider name.
- A new runtime cannot silently take over an old runtime's idempotent work.
- A principal-signed grant from the wrong controller is rejected even when its
  object signature is cryptographically valid.
- The new agent reaches only a no-authority, no-transition, no-effect draft.
- The current surface still has no authorize, execute, dispatch, pay, settle,
  release, waive, or grant-issuance operation.

## What this does not prove

The principal-signed DataGrant and public binding are supplied to Agent B by the
host harness. The drill authenticates their content and signer authority, but it
does not authenticate the transport that delivered them. It has no continuation
authorization, reservation, delivery envelope, atomic delivery consumption, or
receipt, and therefore makes no continuation-delivery claim.

Grant issuance, authenticated context transport, runtime onboarding, service
identity, service observation time, durable multi-process replay state,
execution, payment, and external effects remain outside this experiment.

The deterministic signing keys are reproducible test fixtures, not secrets or a
production provisioning design. Agent B derives its own fixture key inside its
worker process; no Agent A key material is serialized into that process, the
resolver, trace, or machine report.

## Run it

```bash
node simulations/protocol_byo_agent_replacement.mjs --human
node simulations/protocol_byo_agent_replacement.mjs
node --test simulations/protocol_byo_agent_replacement.test.mjs
```

The JSON form is the machine-readable evidence. A passing local report is still
only a candidate until a separate verifier audits a frozen commit.

## Next threshold

After independent review of this frozen drill, the next implementation step is
to replace the in-memory nonce, idempotency, object, and DataGrant counters with
authoritative transactional stores and introduce a signed service-observation
profile. That later profile must authenticate which service answered, when it
answered, what exact read scope it observed, and whether paginated reads belong
to one consistent snapshot before Cairn can make a production conformance claim.
