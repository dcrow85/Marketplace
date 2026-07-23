import assert from "node:assert/strict";
import { realpathSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import {
  canonicalHash,
  canonicalText,
  objectRefKey
} from "../../protocol/lib/core.mjs";
import { MemoryReferenceStores } from "../../protocol/reference-service/state.mjs";

const MAP_NAMES = [
  "objectsByRef",
  "refsByIdentity",
  "urisByRef",
  "accessByRef",
  "runtimeBindingsByKey",
  "dataGrantsByRef",
  "grantStatesByRef",
  "effectDescriptorsByRef",
  "idempotencyRecords"
];

function cloneMap(source) {
  return new Map(
    [...source].map(([key, value]) => [key, structuredClone(value)])
  );
}

function replaceMap(target, source) {
  target.clear();
  for (const [key, value] of source) {
    target.set(key, structuredClone(value));
  }
}

function sortedMapEntries(map) {
  return [...map.entries()].sort(([left], [right]) =>
    Buffer.compare(
      Buffer.from(String(left), "utf8"),
      Buffer.from(String(right), "utf8")
    )
  );
}

function kernelSnapshot(store) {
  return {
    used_nonces: [...store.usedNonces].sort(),
    maps: Object.fromEntries(MAP_NAMES.map((name) => [
      name,
      {
        size: store[name].size,
        hash: canonicalHash(sortedMapEntries(store[name]))
      }
    ]))
  };
}

function sidecarSnapshot(sidecar) {
  return {
    value: structuredClone(sidecar),
    hash: canonicalHash(sidecar)
  };
}

function emptySidecar() {
  return {
    global_sequence: 0,
    owner_sequences: {},
    rich_idempotency_rows: [],
    operational_snapshots: [],
    service_commits: [{
      global_sequence: 0,
      previous_global_sequence: null,
      transaction_kind: "genesis",
      observation_id: null
    }],
    scope_commits: [],
    observations: [],
    counters: {
      callback_calls: 0,
      observation_calls: 0,
      persistence_calls: 0,
      commit_calls: 0
    }
  };
}

function stageSidecar(sidecar, context, outcome, kernelDraft) {
  const staged = structuredClone(sidecar);
  const ownerId =
    context.authentication.principalId ?? context.authentication.actorId;
  const scopeBefore = staged.owner_sequences[ownerId] ?? 0;
  const scopeAfter = scopeBefore + 1;
  const globalBefore = staged.global_sequence;
  const globalAfter = globalBefore + 1;
  const observationId =
    `urn:uuid:10000000-0000-4000-8000-${String(globalAfter).padStart(12, "0")}`;
  const operationalSnapshot = {
    global_sequence: globalAfter,
    kernel_state_hash: canonicalHash(kernelSnapshot(kernelDraft))
  };
  const observation = {
    observation_id: observationId,
    operation: context.envelope.message_type,
    envelope_hash: context.envelope.envelope_hash,
    message_id: context.envelope.message_id,
    body_hash: context.envelope.body_hash,
    operation_fingerprint: context.envelope.operation_fingerprint,
    idempotency_key: context.envelope.idempotency_key,
    authority_namespace: context.authentication.authorityNamespace,
    principal_id: context.authentication.principalId,
    actor_id: context.authentication.actorId,
    runtime_key_id: context.envelope.sender.runtime_key_id,
    kernel_result_hash: canonicalHash(outcome.value),
    global_sequence: globalAfter,
    scope_sequence_before: scopeBefore,
    scope_sequence_after: scopeAfter,
    operational_snapshot_hash: operationalSnapshot.kernel_state_hash
  };

  staged.global_sequence = globalAfter;
  staged.owner_sequences[ownerId] = scopeAfter;
  staged.operational_snapshots.push(operationalSnapshot);
  staged.service_commits.push({
    global_sequence: globalAfter,
    previous_global_sequence: globalBefore,
    transaction_kind:
      context.phase === "origin" ? "service_operation" : "replay",
    observation_id: observationId
  });
  staged.scope_commits.push({
    owner_id: ownerId,
    scope_sequence: scopeAfter,
    previous_scope_sequence: scopeBefore,
    global_sequence: globalAfter,
    observation_id: observationId
  });
  staged.observations.push(observation);
  staged.counters.observation_calls += 1;
  staged.counters.persistence_calls += 1;
  staged.counters.commit_calls += 1;

  if (context.phase === "origin") {
    const frozenRow = [...kernelDraft.idempotencyRecords.values()].find(
      ({ fingerprint }) =>
        fingerprint === context.envelope.operation_fingerprint
    );
    assert.ok(frozenRow, "origin callback omitted its idempotency row");
    staged.rich_idempotency_rows.push({
      authority_namespace: context.authentication.authorityNamespace,
      idempotency_key: context.envelope.idempotency_key,
      operation_name: context.envelope.message_type,
      operation_fingerprint: context.envelope.operation_fingerprint,
      principal_id: context.authentication.principalId,
      actor_id: context.authentication.actorId,
      runtime_key_id: context.envelope.sender.runtime_key_id,
      result_ref: structuredClone(frozenRow.result_ref),
      kernel_result_hash: canonicalHash(outcome.value),
      origin_global_commit_sequence: globalAfter,
      origin_scope_sequence: scopeAfter,
      created_global_commit_sequence: globalAfter,
      created_scope_sequence: scopeAfter
    });
  }

  return staged;
}

class CompositeReferenceStores extends MemoryReferenceStores {
  constructor() {
    super();
    this.sidecar = emptySidecar();
    this.context = null;
    this.traces = [];
    this.compositeActive = false;
    this.responseValidator = null;
  }

  setContext(context) {
    this.context = structuredClone(context);
  }

  setResponseValidator(validate) {
    assert.equal(typeof validate, "function");
    this.responseValidator = validate;
  }

  injectReplayFault(kind) {
    const frozenRow = [...this.idempotencyRecords.values()][0];
    assert.ok(frozenRow?.result_ref, "fault injection requires an origin row");
    const resultKey = objectRefKey(frozenRow.result_ref);
    if (kind === "missing_result_object") {
      this.objectsByRef.delete(resultKey);
    } else if (kind === "corrupt_result_binding") {
      const corrupt = structuredClone(this.objectsByRef.get(resultKey));
      corrupt.revision += 1;
      this.objectsByRef.set(resultKey, corrupt);
    } else if (kind === "missing_result_acl") {
      this.accessByRef.delete(resultKey);
    } else if (kind === "public_result_acl") {
      this.accessByRef.set(resultKey, {
        visibility: "public",
        principal_id: null
      });
    } else if (kind === "foreign_result_acl") {
      this.accessByRef.set(resultKey, {
        visibility: "private",
        principal_id: "did:example:foreign-collector"
      });
    } else {
      throw new Error(`unknown replay fault ${kind}`);
    }
  }

  transaction(work) {
    if (!this.context) {
      return super.transaction(work);
    }
    if (this.compositeActive) {
      throw new Error("composite transaction is already active");
    }
    this.compositeActive = true;
    const context = structuredClone(this.context);
    const kernelBefore = kernelSnapshot(this);
    const sidecarBefore = sidecarSnapshot(this.sidecar);
    const kernelDraft = Object.fromEntries(
      MAP_NAMES.map((name) => [name, cloneMap(this[name])])
    );
    kernelDraft.usedNonces = new Set(this.usedNonces);

    if (context.fault === "grant_consumption_failed") {
      const grantStates = kernelDraft.grantStatesByRef;
      const originalGet = grantStates.get.bind(grantStates);
      grantStates.get = (key) => {
        const value = originalGet(key);
        if (
          value &&
          kernelDraft.idempotencyRecords.size >
            this.idempotencyRecords.size
        ) {
          return {
            ...structuredClone(value),
            remaining_disclosures: 0
          };
        }
        return value;
      };
    }

    let callbackOutcome = null;
    let frozenCallbackOutcome = null;
    let stagedSidecar = structuredClone(this.sidecar);
    try {
      const callbackBefore = kernelSnapshot(kernelDraft);
      frozenCallbackOutcome = work(kernelDraft);
      if (
        frozenCallbackOutcome &&
        typeof frozenCallbackOutcome.then === "function"
      ) {
        throw new TypeError("reference transactions must be synchronous");
      }
      callbackOutcome = frozenCallbackOutcome;
      let responseValidation = null;
      if (context.response_schema_mutation === "delete_ref") {
        assert.equal(typeof this.responseValidator, "function");
        callbackOutcome = structuredClone(frozenCallbackOutcome);
        delete callbackOutcome.value.body.ref;
        const accepted = this.responseValidator(callbackOutcome.value.body);
        responseValidation = {
          schema: context.response_schema,
          mutation: context.response_schema_mutation,
          accepted,
          errors: structuredClone(this.responseValidator.errors ?? [])
        };
        assert.equal(accepted, false);
      }
      const callbackAfter = kernelSnapshot(kernelDraft);
      stagedSidecar.counters.callback_calls += 1;
      if (callbackOutcome?.commit !== false) {
        stagedSidecar = stageSidecar(
          stagedSidecar,
          context,
          callbackOutcome,
          kernelDraft
        );
      }

      const wrapperFailure = responseValidation?.accepted === false
        ? {
            status: 503,
            code: "response_schema_failed",
            failures: ["response_schema_failed"],
            stage: "observation"
          }
        : context.wrapper_failure ?? (context.integrity_fault
          ? {
              status: 503,
              code: "authoritative_integrity_invalid",
              failures: ["authoritative_integrity_invalid"],
              stage: "observation"
            }
          : null);
      const finalCommit =
        callbackOutcome?.commit !== false && wrapperFailure === null;
      if (finalCommit) {
        for (const name of MAP_NAMES) {
          replaceMap(this[name], kernelDraft[name]);
        }
        this.usedNonces.clear();
        for (const nonce of kernelDraft.usedNonces) {
          this.usedNonces.add(nonce);
        }
        this.sidecar = structuredClone(stagedSidecar);
      }

      const localResult = wrapperFailure
        ? {
            disposition: "rolled_back_failure",
            kernel: structuredClone(callbackOutcome?.value ?? null),
            wrapper_failure: structuredClone(wrapperFailure),
            service_observation: null
          }
        : callbackOutcome?.commit === false
          ? {
              disposition: "rolled_back_failure",
              kernel: structuredClone(callbackOutcome.value),
              wrapper_failure: null,
              service_observation: null
            }
          : {
              disposition: callbackOutcome.value.ok
                ? "committed_success"
                : "committed_accepted_failure",
              kernel: structuredClone(callbackOutcome.value),
              wrapper_failure: null,
              service_observation: stagedSidecar.observations.at(-1)
            };
      const trace = {
        case_id: context.case_id,
        operation: context.envelope.message_type,
        envelope_hash: context.envelope.envelope_hash,
        authentication: structuredClone(context.authentication),
        callback_before: callbackBefore,
        callback_after: callbackAfter,
        callback_commit: callbackOutcome?.commit ?? null,
        frozen_callback_value:
          structuredClone(frozenCallbackOutcome?.value ?? null),
        callback_value: structuredClone(callbackOutcome?.value ?? null),
        response_validation: responseValidation,
        staged_sidecar: sidecarSnapshot(stagedSidecar),
        final_commit: finalCommit,
        wrapper_failure: structuredClone(wrapperFailure),
        local_result: localResult,
        kernel_before: kernelBefore,
        kernel_after: kernelSnapshot(this),
        sidecar_before: sidecarBefore,
        sidecar_after: sidecarSnapshot(this.sidecar)
      };
      this.traces.push(trace);
      return callbackOutcome?.value;
    } finally {
      this.compositeActive = false;
      this.context = null;
    }
  }
}

let helperModulePromise = null;

async function loadFrozenFixtureHelpers() {
  if (helperModulePromise) return helperModulePromise;
  helperModulePromise = (async () => {
    const testUrl = new URL(
      "../../protocol/tests/reference-service.test.mjs",
      import.meta.url
    );
    const protocolRoot = fileURLToPath(
      new URL("../../protocol/", import.meta.url)
    );
    let source = await readFile(testUrl, "utf8");
    source = source.replace(
      'import test from "node:test";',
      "const test = () => {}; test.skip = () => {};"
    );
    source = source.replace(
      'import { generateKeyPairSync, sign as signBytes } from "node:crypto";',
      'import { createHash, createPrivateKey, createPublicKey, sign as signBytes } from "node:crypto";'
    );
    source = source.replace(
      `function testKey(key_id, controller) {
  const { publicKey, privateKey } = generateKeyPairSync("ed25519");
  return {
    key_id,`,
      `function testKey(key_id, controller) {
  const seed = createHash("sha256")
    .update("cairn-authoritative-composite-probe-v0.1:" + key_id)
    .digest();
  const privateKey = createPrivateKey({
    key: Buffer.concat([
      Buffer.from("302e020100300506032b657004220420", "hex"),
      seed
    ]),
    format: "der",
    type: "pkcs8"
  });
  const publicKey = createPublicKey(privateKey);
  return {
    key_id,`
    );
    for (const relative of [
      "../lib/core.mjs",
      "../lib/validation.mjs",
      "../reference-service/http.mjs",
      "../reference-service/service.mjs",
      "../reference-service/signer.mjs",
      "../reference-service/state.mjs"
    ]) {
      source = source.replaceAll(
        `"${relative}"`,
        `"${new URL(relative, testUrl).href}"`
      );
    }
    source = source.replace(
      'const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");',
      `const root = ${JSON.stringify(protocolRoot)};`
    );
    source = source.replace(
      "const stores = new MemoryReferenceStores();",
      "const stores = globalThis.__CAIRN_STORE_FACTORY__?.() ?? new MemoryReferenceStores();"
    );
    source += `
export {
  makeHarness,
  makeActiveIntent,
  makeIntentGrant,
  makeEnvelope,
  newIdempotentAttempt,
  freshTransport,
  schemaFor,
  bindAndSign,
  operationFingerprint,
  signature,
  AGENT_KEY,
  foundation
};
`;
    const encoded = Buffer.from(source, "utf8").toString("base64");
    return import(`data:text/javascript;base64,${encoded}`);
  })();
  return helperModulePromise;
}

async function buildIntentScenario(caseId = "origin") {
  const helpers = await loadFrozenFixtureHelpers();
  const stores = new CompositeReferenceStores();
  globalThis.__CAIRN_STORE_FACTORY__ = () => stores;
  let harness;
  try {
    harness = helpers.makeHarness();
  } finally {
    delete globalThis.__CAIRN_STORE_FACTORY__;
  }
  const intent = helpers.makeActiveIntent();
  const intentRef =
    (await import("../../protocol/lib/core.mjs")).objectRefFor(
      intent,
      helpers.schemaFor(intent)
    );
  const grant = helpers.makeIntentGrant(harness.service, intent);
  const grantRef = harness.seeder.seedObject(grant, {
    grantState: {
      status: "active",
      revocation_nonce: 62,
      remaining_disclosures: 2
    }
  });
  const envelope = helpers.makeEnvelope({
    operationName: "intent.put",
    body: intent,
    subjectRefs: [intentRef],
    authorizationRefs: [grantRef],
    messageNumber: 54,
    nonce: "reference-nonce-00000054",
    idempotencyKey: "reference-intent-idempotency-0001"
  });
  const authentication = {
    ...harness.authentication,
    authorityNamespace: `${harness.authentication.principalId}|intent.put`
  };
  const operation = helpers.foundation.registry.operations.find(
    ({ name }) => name === envelope.message_type
  );
  assert.ok(operation);
  stores.setResponseValidator(
    helpers.foundation.ajv.getSchema(operation.response_schema)
  );
  stores.setContext({
    case_id: `${caseId}:origin`,
    phase: "origin",
    envelope,
    authentication
  });
  const first = harness.service.handleEnvelope(envelope, authentication);
  assert.equal(first.ok, true, JSON.stringify(first));
  assert.equal(first.status, 201);
  const originTrace = stores.traces.at(-1);
  assert.equal(originTrace.callback_commit, true);
  assert.equal(originTrace.final_commit, true);
  const resultKey = objectRefKey(first.body.ref);
  const identity = [...stores.refsByIdentity.entries()].find(([, refKey]) =>
    refKey === resultKey
  );
  assert.ok(identity, "origin object identity index missing");
  return {
    helpers,
    harness,
    stores,
    envelope,
    authentication,
    first,
    originTrace,
    originObject: {
      ref: structuredClone(first.body.ref),
      value: structuredClone(stores.objectsByRef.get(resultKey)),
      identity_key: identity[0],
      retrieval_uri: stores.urisByRef.get(resultKey),
      access: structuredClone(stores.accessByRef.get(resultKey))
    }
  };
}

export async function runCompositeProbe() {
  const origin = await buildIntentScenario("canonical");
  const originReport = {
    envelope: structuredClone(origin.envelope),
    authentication: structuredClone(origin.authentication),
    callback: structuredClone(origin.originTrace),
    object: structuredClone(origin.originObject),
    sidecar: structuredClone(origin.stores.sidecar)
  };

  const conflictScenario = await buildIntentScenario("fingerprint_conflict");
  const conflictKernelBaseline = kernelSnapshot(conflictScenario.stores);
  const conflictSidecarBaseline =
    sidecarSnapshot(conflictScenario.stores.sidecar);
  const conflictDraft = structuredClone(conflictScenario.envelope);
  conflictDraft.message_id =
    "urn:uuid:00000000-0000-4000-8000-000000000058";
  conflictDraft.nonce = "reference-nonce-00000058";
  conflictDraft.audience = [
    ...conflictDraft.audience,
    "cairn:another-audience"
  ];
  conflictDraft.operation_fingerprint =
    conflictScenario.helpers.operationFingerprint(conflictDraft);
  conflictDraft.envelope_hash =
    "sha-256:0000000000000000000000000000000000000000000000000000000000000000";
  conflictDraft.signature =
    conflictScenario.helpers.signature(conflictScenario.helpers.AGENT_KEY);
  const conflictEnvelope = conflictScenario.helpers.bindAndSign(
    conflictDraft,
    conflictScenario.helpers.AGENT_KEY
  );
  conflictScenario.stores.setContext({
    case_id: "fingerprint_conflict",
    phase: "replay",
    envelope: conflictEnvelope,
    authentication: conflictScenario.authentication
  });
  const conflictRaw = conflictScenario.harness.service.handleEnvelope(
    conflictEnvelope,
    conflictScenario.authentication
  );
  const conflictTrace = conflictScenario.stores.traces.at(-1);
  assert.equal(conflictRaw.code, "operation_rejected");
  assert.equal(
    conflictRaw.failures.includes("idempotency_conflict"),
    true
  );
  assert.equal(conflictTrace.callback_commit, false);
  assert.equal(conflictTrace.final_commit, false);
  assert.deepEqual(conflictTrace.kernel_after, conflictKernelBaseline);
  assert.deepEqual(conflictTrace.sidecar_after, conflictSidecarBaseline);

  const replayScenario = await buildIntentScenario("successful_replay");
  const successfulReplayEnvelope = replayScenario.helpers.freshTransport(
    replayScenario.envelope,
    59
  );
  replayScenario.stores.setContext({
    case_id: "successful_replay",
    phase: "replay",
    envelope: successfulReplayEnvelope,
    authentication: replayScenario.authentication
  });
  const successfulReplayRaw =
    replayScenario.harness.service.handleEnvelope(
      successfulReplayEnvelope,
      replayScenario.authentication
    );
  const successfulReplayTrace = replayScenario.stores.traces.at(-1);
  assert.equal(successfulReplayRaw.ok, true);
  assert.equal(successfulReplayRaw.replayed, true);
  assert.equal(successfulReplayTrace.callback_commit, true);
  assert.equal(successfulReplayTrace.final_commit, true);
  assert.equal(replayScenario.stores.sidecar.global_sequence, 2);
  assert.deepEqual(
    replayScenario.stores.sidecar.scope_commits.map((commit) => [
      commit.scope_sequence,
      commit.previous_scope_sequence,
      commit.global_sequence
    ]),
    [[1, 0, 1], [2, 1, 2]]
  );

  const replayFaults = {};
  for (const kind of [
    "missing_result_object",
    "corrupt_result_binding",
    "missing_result_acl",
    "public_result_acl",
    "foreign_result_acl"
  ]) {
    const scenario = await buildIntentScenario(kind);
    scenario.stores.injectReplayFault(kind);
    const baselineKernel = kernelSnapshot(scenario.stores);
    const baselineSidecar = sidecarSnapshot(scenario.stores.sidecar);
    const replayEnvelope = scenario.helpers.freshTransport(
      scenario.envelope,
      55
    );
    scenario.stores.setContext({
      case_id: kind,
      phase: "replay",
      envelope: replayEnvelope,
      authentication: scenario.authentication,
      integrity_fault: kind
    });
    const raw = scenario.harness.service.handleEnvelope(
      replayEnvelope,
      scenario.authentication
    );
    const trace = scenario.stores.traces.at(-1);
    assert.equal(raw.code, "idempotency_result_unavailable", kind);
    assert.equal(trace.callback_commit, true, kind);
    assert.equal(trace.final_commit, false, kind);
    assert.deepEqual(trace.kernel_after, baselineKernel, kind);
    assert.deepEqual(trace.sidecar_after, baselineSidecar, kind);
    replayFaults[kind] = { raw: structuredClone(raw), trace };
  }

  const wrapperFaults = {};
  for (const stage of [
    "response_schema",
    "observation",
    "persistence",
    "commit"
  ]) {
    const scenario = await buildIntentScenario(stage);
    const baselineKernel = kernelSnapshot(scenario.stores);
    const baselineSidecar = sidecarSnapshot(scenario.stores.sidecar);
    const replayEnvelope = scenario.helpers.freshTransport(
      scenario.envelope,
      56
    );
    const context = {
      case_id: `${stage}_failure`,
      phase: "replay",
      envelope: replayEnvelope,
      authentication: scenario.authentication
    };
    if (stage === "response_schema") {
      context.response_schema = scenario.helpers.foundation.registry.operations
        .find(({ name }) => name === replayEnvelope.message_type)
        .response_schema;
      context.response_schema_mutation = "delete_ref";
    } else {
      context.wrapper_failure = {
        status: 503,
        code: `${stage}_failed`,
        failures: [`${stage}_failed`],
        stage
      };
    }
    scenario.stores.setContext(context);
    const raw = scenario.harness.service.handleEnvelope(
      replayEnvelope,
      scenario.authentication
    );
    const trace = scenario.stores.traces.at(-1);
    assert.equal(trace.callback_commit, true, stage);
    assert.equal(trace.final_commit, false, stage);
    assert.deepEqual(trace.kernel_after, baselineKernel, stage);
    assert.deepEqual(trace.sidecar_after, baselineSidecar, stage);
    if (stage === "response_schema") {
      assert.equal(trace.response_validation.accepted, false);
      assert.equal(Object.hasOwn(raw.body, "ref"), false);
      assert.equal(Object.hasOwn(trace.frozen_callback_value.body, "ref"), true);
    }
    wrapperFaults[stage] = { raw: structuredClone(raw), trace };
  }

  const grantScenario = await buildIntentScenario("grant_consumption");
  const grantBaselineKernel = kernelSnapshot(grantScenario.stores);
  const grantBaselineSidecar = sidecarSnapshot(grantScenario.stores.sidecar);
  const grantAttempt = grantScenario.helpers.newIdempotentAttempt(
    grantScenario.envelope,
    57,
    "reference-intent-idempotency-0002"
  );
  grantScenario.stores.setContext({
    case_id: "grant_consumption_failed",
    phase: "new_operation",
    envelope: grantAttempt,
    authentication: grantScenario.authentication,
    fault: "grant_consumption_failed"
  });
  const grantRaw = grantScenario.harness.service.handleEnvelope(
    grantAttempt,
    grantScenario.authentication
  );
  const grantTrace = grantScenario.stores.traces.at(-1);
  assert.equal(grantRaw.code, "grant_consumption_failed");
  assert.equal(grantTrace.callback_commit, false);
  assert.equal(grantTrace.final_commit, false);
  assert.deepEqual(grantTrace.kernel_after, grantBaselineKernel);
  assert.deepEqual(grantTrace.sidecar_after, grantBaselineSidecar);

  return {
    origin: originReport,
    fingerprint_conflict: {
      raw: structuredClone(conflictRaw),
      trace: conflictTrace
    },
    successful_replay: {
      envelope: structuredClone(successfulReplayEnvelope),
      raw: structuredClone(successfulReplayRaw),
      trace: successfulReplayTrace,
      sidecar: structuredClone(replayScenario.stores.sidecar)
    },
    replay_faults: replayFaults,
    wrapper_faults: wrapperFaults,
    grant_consumption_failure: {
      raw: structuredClone(grantRaw),
      trace: grantTrace
    }
  };
}

if (
  process.argv[1] &&
  realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))
) {
  const report = await runCompositeProbe();
  process.stdout.write(
    `composite_probe_hash=${canonicalHash(report)}\n`
  );
  process.stdout.write(
    `composite_probe_cases=${
      Object.keys(report.replay_faults).length +
      Object.keys(report.wrapper_faults).length +
      3
    }\n`
  );
  process.stdout.write(
    `composite_probe_operation=${report.origin.envelope.message_type}\n`
  );
  process.stdout.write(
    `composite_probe_origin=${canonicalText({
      status: report.origin.callback.callback_value.status,
      commit: report.origin.callback.callback_commit,
      final_commit: report.origin.callback.final_commit
    })}\n`
  );
}
