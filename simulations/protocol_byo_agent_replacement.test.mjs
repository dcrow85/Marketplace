import assert from "node:assert/strict";
import test from "node:test";

import {
  EXPECTED_OPERATIONS,
  runReplacementDrill
} from "./protocol_byo_agent_replacement.mjs";

const EXPECTED_REPORT_HASH =
  "sha-256:93823dcb3bb650523e89e78df9d6f9597502541beabcb41ab13da2a8638b3632";

test("an isolated replacement process recovers a bounded projection of the same principal-held intent", async () => {
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
    report.scenario.agent_b.process_boundary,
    "separate_node_process_with_serialized_json"
  );
  assert.deepEqual(report.scenario.agent_b.resume_input_names, [
    "context_grant",
    "context_grant_ref",
    "mode",
    "runtime_binding"
  ]);
  const contextProbe = report.probes.find(
    ({ id }) =>
      id === "isolated_agent_b_accepts_only_principal_signed_b_context"
  );
  assert.equal(
    contextProbe.evidence.serialized_input_contains_agent_a_marker,
    false
  );
  assert.match(
    contextProbe.evidence.renamed_extra_context_error,
    /unknown or missing fields/
  );
  assert.match(
    contextProbe.evidence.substituted_uri_error,
    /runtime-binding identity mismatch/
  );
  assert.deepEqual(report.scenario.agent_b.proposal_input_names, [
    "effect",
    "intent_ref",
    "mode",
    "projection"
  ]);
  assert.deepEqual(report.scenario.agent_b.prepare_input_names, [
    "mode",
    "prepare_grant",
    "prepare_grant_ref",
    "proposal"
  ]);
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
  const projectionProbe = report.probes.find(
    ({ id }) =>
      id ===
      "agent_b_process_recovers_same_intent_ref_through_bounded_projection"
  );
  assert.equal(projectionProbe.passed, true);
  assert.equal(
    projectionProbe.evidence.private_budget_present_in_payload,
    false
  );
  assert.deepEqual(projectionProbe.evidence.disclosed_fields, ["/targets"]);
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

  assert.equal(
    probes.get("isolated_agent_b_rejects_runtime_swap").passed,
    true
  );
  assert.match(
    probes.get("isolated_agent_b_rejects_runtime_swap").evidence
      .substituted_key_error,
    /runtime_public_key_material_mismatch|runtime-binding identity mismatch/
  );
  assert.equal(
    probes.get("isolated_agent_b_rejects_agent_a_grant_swap").passed,
    true
  );
  assert.equal(
    probes.get("isolated_agent_b_rejects_tampered_or_nonprincipal_context")
      .passed,
    true
  );
  assert.match(
    probes.get("isolated_agent_b_rejects_tampered_or_nonprincipal_context")
      .evidence.nonprincipal_error,
    /controller mismatch/
  );
  assert.match(
    probes.get("isolated_agent_b_rejects_tampered_or_nonprincipal_context")
      .evidence.expanded_grant_error,
    /principal\/runtime\/purpose\/use mismatch|one whole-object ScopedProjection grant required/
  );
  assert.equal(
    probes.get("disconnected_agent_a_cannot_make_new_requests").evidence.failures
      .includes("signing_key_revoked"),
    true
  );
  assert.deepEqual(
    probes.get("agent_b_cannot_execute_or_pay").evidence,
    { status: 400, code: "operation_unknown" }
  );
  const grantProbe = probes.get("agent_b_uses_new_principal_issued_grants");
  assert.equal(
    grantProbe.evidence.agent_b_normal_grants_contain_private_intent_scope,
    false
  );
  assert.deepEqual(grantProbe.evidence.agent_b_read_scope_refs, [
    report.scenario.projection_ref
  ]);
  for (const scopeRef of [
    ...grantProbe.evidence.agent_b_read_scope_refs,
    ...grantProbe.evidence.agent_b_prepare_scope_refs
  ]) {
    assert.notDeepEqual(scopeRef, report.scenario.intent_ref);
  }
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
    agent_b_separate_process_boundary: true,
    private_key_material_exported: false,
    agent_a_marker_present_in_serialized_b_inputs: false,
    authority_transferred: false,
    consequential_operation_available: false,
    external_effect_observed: false
  });
  assert.equal(report.not_claiming.includes("runtime_conformance"), true);
  assert.equal(
    report.not_claiming.includes("authenticated_context_transport"),
    true
  );
  assert.equal(report.not_claiming.includes("continuation_delivery"), true);
  assert.equal(report.not_claiming.includes("independent_verification"), true);
  assert.equal(/BEGIN [A-Z ]*PRIVATE KEY/.test(JSON.stringify(report)), false);
});
