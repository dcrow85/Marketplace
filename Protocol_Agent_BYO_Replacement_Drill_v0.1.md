# Cairn BYO-agent replacement drill v0.1

**Status:** local candidate evidence, not independent verification or production
conformance

**Kernel under test:** `cairn-proposal-foundation-v0.1`

**Executable:** `simulations/protocol_byo_agent_replacement.mjs`

**Automated gate:** `simulations/protocol_byo_agent_replacement.test.mjs`

## The plain-English question

If a collector stops using Anko and chooses a different agent, can the new agent
continue from the collector's saved intent without receiving Anko's private key,
private memory, permissions, or unfinished authority?

This drill says **yes for the current proposal-only foundation**.

The user—not Anko—signs the intent. Anko can submit and read that user-held
record only through a grant addressed to Anko's exact runtime key. After Anko is
revoked, a separately operated Agent B receives:

1. the public nine-operation capabilities document;
2. a principal-signed packet naming the exact intent, URI, Agent B runtime, and
   Agent B grant;
3. an authenticated signing capability for Agent B's own runtime key;
4. new DataGrants addressed only to Agent B; and
5. the same reference-service endpoint.

Agent B does **not** receive Anko's prompt, chat transcript, database, private
key, grant, idempotency record, or action authority.

## What the run does

1. Two different providers create independently keyed runtime bindings.
2. The collector signs one `ActiveIntent`.
3. Agent A submits and reads that exact intent with Agent A-only grants.
4. Agent B tries to borrow Agent A's read grant. The service rejects both the
   recipient and audience.
5. Agent B tries to reuse Agent A's idempotency key. The service returns
   `idempotency_conflict`.
6. The collector signs a bounded replacement context packet and issues new
   Agent B-only grants.
7. The harness re-signs malicious runtime-swap and grant-swap packets and also
   byte-tampers a valid packet. All three are rejected.
8. Agent A's runtime key and read grant are revoked. A new Agent A request is
   denied.
9. Agent B resolves its own runtime binding and reads the byte-identical,
   principal-signed intent.
10. Agent B prepares a proposal. The result is only a `draft` with
    `action_state_transition:false`, `external_effect:false`, and explicit
    non-claims of authority and effect.
11. Agent B tries `action.execute`. The operation does not exist.

The deterministic run currently passes **18/18 direct probes** and produces
report hash:

```text
sha-256:fe8458626fde5df0147e042b1f3c8be6953253b12e57df8163a140315e9142c5
```

## What this proves

- Cairn can keep the user's active intent outside an individual agent.
- Replacement does not require transferring an old agent's raw private key.
- Access is re-granted to the exact new runtime, not inherited by provider name.
- A new runtime cannot silently take over an old runtime's idempotent work.
- The new agent can recover the same signed state and reach the same safe,
  proposal-only boundary.
- The current surface still has no authorize, execute, dispatch, pay, settle,
  release, waive, or grant-issuance operation.

## What this does not prove

The principal-signed packet uses the existing `ContinuationBundle` object shape
as an authenticated context carrier, but the nine-operation kernel deliberately
has no `continuation.get` or private delivery operation. The run therefore does
not claim continuation-delivery conformance. Grant issuance, packet delivery,
runtime onboarding, service identity, service observation time, durable
multi-process replay state, execution, payment, and external effects remain
outside this experiment.

The deterministic signing keys are test fixtures. Their private material remains
inside separate signing-capability closures and is never placed in the resolver,
handoff packet, trace, or machine report.

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
