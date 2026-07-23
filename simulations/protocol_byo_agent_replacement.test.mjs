import assert from "node:assert/strict";
import test from "node:test";

import {
  EXPECTED_OPERATIONS,
  runReplacementDrill
} from "./protocol_byo_agent_replacement.mjs";

const EXPECTED_REPORT_HASH =
  "sha-256:fe8458626fde5df0147e042b1f3c8be6953253b12e57df8163a140315e9142c5";

test("a separately keyed and granted agent recovers the same principal-held intent", async () => {
  const report = await runReplacementDrill();
  assert.equal(report.result, "local_candidate_pass");
  assert.equal(report.report_hash, EXPECTED_REPORT_HASH);
  assert.deepEqual(report.foundation.operations, EXPECTED_OPERATIONS);
  assert.equal(report.foundation.operation_count, 9);
  assert.equal(report.foundation.kernel_changed_by_drill, false);
  assert.equal(report.probes.length, 18);
  assert.equal(new Set(report.probes.map(({ id }) => id)).size, 18);
  assert.equal(report.probes.every(({ passed }) => passed), true);

  assert.notEqual(
    report.scenario.agent_a.provider_id,
    report.scenario.agent_b.provider_id
  );
  assert.notEqual(
    report.scenario.agent_a.runtime_key_id,
    report.scenario.agent_b.runtime_key_id
  );
  assert.notEqual(
    report.scenario.agent_a.public_key_fingerprint,
    report.scenario.agent_b.public_key_fingerprint
  );
  assert.equal(
    report.scenario.agent_b.explicitly_absent_inputs.includes("agent_a_private_key"),
    true
  );
  assert.equal(
    report.scenario.agent_b.explicitly_absent_inputs.includes("agent_a_database"),
    true
  );
  assert.equal(
    report.scenario.agent_b.explicitly_absent_inputs.includes("action_authority"),
    true
  );
});

test("every named replacement attack fails at the intended boundary", async () => {
  const report = await runReplacementDrill();
  const probes = new Map(report.probes.map((probe) => [probe.id, probe]));

  assert.equal(probes.get("agent_b_cannot_use_agent_a_data_grant").passed, true);
  assert.deepEqual(
    probes.get("agent_b_cannot_use_agent_a_data_grant").evidence.failures
      .filter((failure) => failure.startsWith("grant_")),
    ["grant_recipient_mismatch", "grant_audience_mismatch"]
  );

  assert.equal(
    probes.get("agent_b_cannot_inherit_agent_a_idempotent_work").evidence.status,
    409
  );
  assert.equal(
    probes.get("agent_b_cannot_inherit_agent_a_idempotent_work").evidence.failures
      .includes("idempotency_conflict"),
    true
  );

  assert.equal(probes.get("handoff_runtime_swap_is_rejected").passed, true);
  assert.equal(probes.get("handoff_grant_swap_is_rejected").passed, true);
  assert.equal(probes.get("handoff_byte_tamper_is_rejected").passed, true);
  assert.equal(
    probes.get("disconnected_agent_a_cannot_make_new_requests").evidence.failures
      .includes("signing_key_revoked"),
    true
  );
  assert.deepEqual(
    probes.get("agent_b_cannot_execute_or_pay").evidence,
    { status: 400, code: "operation_unknown" }
  );
});

test("replacement ends at a legible no-authority, no-effect draft", async () => {
  const report = await runReplacementDrill();
  const draft = report.probes.find(
    ({ id }) => id === "agent_b_resumes_only_to_a_no_effect_draft"
  );

  assert.equal(draft.passed, true);
  assert.equal(draft.evidence.action_state, "draft");
  assert.equal(draft.evidence.action_state_transition, false);
  assert.equal(draft.evidence.external_effect, false);
  assert.deepEqual(draft.evidence.not_claiming, [
    "authority_to_act",
    "external_effect"
  ]);
  assert.deepEqual(report.boundaries, {
    deterministic_fixture_keys_only: true,
    private_key_material_exported: false,
    agent_a_hidden_memory_used_by_agent_b: false,
    authority_transferred: false,
    consequential_operation_available: false,
    external_effect_observed: false
  });
  assert.equal(report.not_claiming.includes("runtime_conformance"), true);
  assert.equal(report.not_claiming.includes("continuation_delivery"), true);
  assert.equal(report.not_claiming.includes("independent_verification"), true);
  assert.equal(/BEGIN [A-Z ]*PRIVATE KEY/.test(JSON.stringify(report)), false);
});
