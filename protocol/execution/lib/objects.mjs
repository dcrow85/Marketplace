function fields(entries) {
  const names = entries.map(([name]) => name);
  if (new Set(names).size !== names.length) throw new Error("duplicate Phase 1 object field declaration");
  return Object.fromEntries(entries.map(([name, type]) => [name, type]));
}

function signed({ file, schema, id, hash, signatures, entries, invariants = [] }) {
  return Object.freeze({
    file,
    kind: "signed-object",
    schema,
    id,
    hash,
    signatures: Object.freeze(signatures),
    fields: Object.freeze(fields(entries)),
    invariants: Object.freeze(invariants)
  });
}

function contentAddressed({ file, schema, id, hash, entries, invariants = [] }) {
  return Object.freeze({
    file,
    kind: "content-addressed-object",
    schema,
    id,
    hash,
    signatures: Object.freeze([]),
    fields: Object.freeze(fields(entries)),
    invariants: Object.freeze(invariants)
  });
}

const ref = "ref";
const nref = "nref";
const hash = "hash";
const nhash = "nhash";
const uint = "uint";
const nuint = "nuint";
const str = "str";
const nstr = "nstr";
const time = "time";
const sig = "signature";
const refs = "refs";
const strs = "strs";
const money = "money";
const nmoney = "nmoney";
const bool = "bool";
const json = "json";

export const PHASE1_OBJECTS = Object.freeze([
  signed({
    file: "agent-connection-authorization.schema.json",
    schema: "cairn.agent_connection_authorization.v0.1",
    id: "connection_authorization_id",
    hash: "authorization_hash",
    signatures: ["principal_signature"],
    entries: [
      ["connection_authorization_id", "uuid"], ["principal_id", str], ["agent_runtime_binding_ref", ref],
      ["execution_resource_audiences", "uris"], ["allowed_transport_bindings", "enumset:cairn_http|mcp"],
      ["oauth_profile", "oauthProfile"], ["not_before", time], ["expires_at", time],
      ["authorization_hash", hash], ["principal_signature", sig],
      ["not_claiming", "exactset:economic_authority|data_access|agent_competence|provider_supervision"]
    ]
  }),
  signed({
    file: "agent-connection-state-head.schema.json",
    schema: "cairn.agent_connection_state_head.v0.1",
    id: "connection_state_id",
    hash: "state_hash",
    signatures: ["authority_service_signature"],
    entries: [
      ["connection_state_id", hash], ["principal_id", str], ["connection_authorization_ref", ref],
      ["connection_authorization_hash", hash], ["agent_runtime_binding_ref", ref], ["authority_namespace", str],
      ["sequence", uint], ["previous_state_hash", nhash], ["state", "enum:active|paused|revoked|expired"],
      ["pause_epoch", uint], ["revocation_nonce", uint], ["connection_scoped_control_key", hash],
      ["connection_scoped_control_leaf_hash", hash], ["outstanding_action_index_key", hash],
      ["accepted_at", time], ["updated_at", time], ["state_hash", hash], ["authority_service_signature", sig]
    ]
  }),
  signed({
    file: "data-grant-state-head.schema.json",
    schema: "cairn.data_grant_state_head.v0.1",
    id: "data_grant_state_id",
    hash: "state_hash",
    signatures: ["authority_service_signature"],
    entries: [
      ["data_grant_state_id", "uuid"], ["principal_id", str], ["data_grant_ref", ref],
      ["sequence", uint], ["previous_state_hash", nhash],
      ["state", "enum:active|paused|exhausted|revoked|expired"], ["revocation_nonce", uint],
      ["remaining_reads", uint], ["maximum_response_bytes", "positive"],
      ["maximum_response_items", "positive"], ["query_bound", "queryBound"],
      ["expires_at", time], ["updated_at", time], ["state_hash", hash],
      ["authority_service_signature", sig]
    ]
  }),
  contentAddressed({
    file: "enumerable-map-node.schema.json",
    schema: "cairn.enumerable_map_node.v0.1",
    id: "node_hash",
    hash: "node_hash",
    entries: [
      ["map_domain", "enum:connection_outstanding_action|receiver_outstanding_stream|compartment_active_reservation|compartment_economic_atom|compartment_confirmed_event|scoped_execution_control"],
      ["node_kind", "enum:empty|leaf|branch"],
      ["path_prefix_nibbles", "hexNibbles"], ["leaf_entry", "nenumerableMapLeafEntry"],
      ["branch_children", "enumerableMapBranchChildren"], ["subtree_entry_count", uint],
      ["entries_root", hash],
      ["node_hash", hash]
    ],
    invariants: ["enumerable_map_node_union"]
  }),
  signed({
    file: "enumerable-map-root.schema.json",
    schema: "cairn.enumerable_map_root.v0.1",
    id: "map_key",
    hash: "map_hash",
    signatures: ["issuing_authority_signature"],
    entries: [
      ["map_key", hash], ["map_domain", "enum:connection_outstanding_action|receiver_outstanding_stream|compartment_active_reservation|compartment_economic_atom|compartment_confirmed_event|scoped_execution_control"],
      ["revision", uint], ["root_node_ref", ref], ["root_node_hash", hash],
      ["entry_count", uint], ["entries_root", hash], ["map_hash", hash],
      ["issuing_authority_id", str], ["issuing_authority_signature", sig]
    ],
    invariants: ["enumerable_map_root_closure"]
  }),
  signed({
    file: "connection-outstanding-action-entry.schema.json",
    schema: "cairn.connection_outstanding_action_entry.v0.1",
    id: "outstanding_action_key",
    hash: "entry_hash",
    signatures: ["authority_service_signature"],
    entries: [
      ["outstanding_action_key", hash], ["connection_state_id", hash], ["action_ref", ref],
      ["effect_id", hash], ["lineage_id", hash], ["current_action_state_head_ref", ref],
      ["current_action_state_head_hash", hash], ["receiver_event_stream_key", nhash],
      ["finality_transition_profile_ref", nref], ["finality_transition_profile_hash", nhash],
      ["sequence", uint], ["previous_entry_hash", nhash],
      ["state", "enum:reserved|handed_off|receiver_state_current"], ["entry_hash", hash],
      ["authority_service_signature", sig]
    ],
    invariants: ["connection_outstanding_action_entry_union"]
  }),
  signed({
    file: "connection-outstanding-action-index-state-head.schema.json",
    schema: "cairn.connection_outstanding_action_index_state_head.v0.1",
    id: "outstanding_action_index_key",
    hash: "head_hash",
    signatures: ["authority_service_signature"],
    entries: [
      ["outstanding_action_index_key", hash], ["connection_state_id", hash], ["sequence", uint],
      ["previous_state_hash", nhash], ["outstanding_action_map_ref", ref],
      ["outstanding_action_map_hash", hash], ["outstanding_action_count", uint],
      ["outstanding_action_root", hash], ["state", "enum:active|sealed"], ["updated_at", time],
      ["head_hash", hash], ["authority_service_signature", sig]
    ]
  }),
  signed({
    file: "connection-outstanding-action-index-transition-receipt.schema.json",
    schema: "cairn.connection_outstanding_action_index_transition_receipt.v0.1",
    id: "receipt_hash",
    hash: "receipt_hash",
    signatures: ["authority_service_signature"],
    entries: [
      ["outstanding_action_index_key", hash],
      ["cause", "enum:connection_genesis|action_reserved|action_head_updated|fenced_non_submission_removed|authenticated_stream_closed_removed|authenticated_irreversible_horizon_removed|connection_restriction_snapshot|connection_terminal_seal"],
      ["before_head_ref", nref], ["before_head_hash", nhash], ["after_head_ref", ref],
      ["after_head_hash", hash], ["before_action_map_ref", nref], ["before_action_map_hash", nhash],
      ["after_action_map_ref", ref], ["after_action_map_hash", hash], ["changed_action_key", nhash],
      ["changed_entry_before_ref", nref], ["changed_entry_before_hash", nhash],
      ["changed_entry_after_ref", nref], ["changed_entry_after_hash", nhash],
      ["before_change_proof", "nenumerableMapPathProof"],
      ["after_change_proof", "nenumerableMapPathProof"],
      ["action_transition_receipt_ref", nref], ["action_transition_receipt_hash", nhash],
      ["terminal_evidence_ref", nref], ["terminal_evidence_hash", nhash],
      ["authority_transaction_id", str], ["committed_at", time], ["receipt_hash", hash],
      ["authority_service_signature", sig]
    ]
  }),
  signed({
    file: "receiver-outstanding-stream-entry.schema.json",
    schema: "cairn.receiver_outstanding_stream_entry.v0.1",
    id: "outstanding_stream_key",
    hash: "entry_hash",
    signatures: ["authority_service_signature"],
    entries: [
      ["outstanding_stream_key", hash], ["receiver_sequence_epoch_selector_key", hash],
      ["identity_scope_index_key", hash], ["action_ref", ref], ["effect_id", hash],
      ["lineage_id", hash], ["precommitted_client_reference", str],
      ["assigned_identity_epoch", uint], ["event_id_slot_assignment_ref", ref],
      ["event_id_slot_assignment_hash", hash], ["sequence_slot_assignment_ref", ref],
      ["sequence_slot_assignment_hash", hash], ["trust_epoch_assignment_manifest_ref", ref],
      ["trust_epoch_assignment_manifest_hash", hash], ["trust_epoch_assignment_count", "positive"],
      ["trust_epoch_assignments_root", hash], ["future_dependency_pool_state_head_ref", nref],
      ["future_dependency_pool_state_head_hash", nhash], ["future_dependency_assignment_ref", nref],
      ["future_dependency_assignment_hash", nhash], ["connection_outstanding_action_key", nhash],
      ["connection_outstanding_action_entry_ref", nref], ["connection_outstanding_action_entry_hash", nhash],
      ["finality_transition_profile_ref", ref], ["finality_transition_profile_hash", hash],
      ["authenticated_closure_or_horizon_rule_hash", hash], ["sequence", uint],
      ["previous_entry_hash", nhash],
      ["state", "enum:reserved|handed_off|authenticated_stream_closed|authenticated_irreversible_horizon|fenced_non_submission"],
      ["current_receiver_stream_head_ref", nref], ["current_receiver_stream_head_hash", nhash],
      ["entry_hash", hash], ["authority_service_signature", sig]
    ],
    invariants: ["receiver_outstanding_stream_entry_union"]
  }),
  signed({
    file: "receiver-outstanding-stream-transition-receipt.schema.json",
    schema: "cairn.receiver_outstanding_stream_transition_receipt.v0.1",
    id: "receipt_hash",
    hash: "receipt_hash",
    signatures: ["authority_service_signature"],
    entries: [
      ["outstanding_stream_key", hash],
      ["cause", "enum:reservation_registered|handoff_bound|authenticated_event_observed|authenticated_stream_closed|authenticated_irreversible_horizon|fenced_non_submission"],
      ["epoch_selector_before_head_ref", ref], ["epoch_selector_before_head_hash", hash],
      ["epoch_selector_after_head_ref", ref], ["epoch_selector_after_head_hash", hash],
      ["assigned_identity_scope_before_head_ref", ref], ["assigned_identity_scope_before_head_hash", hash],
      ["assigned_identity_scope_after_head_ref", ref], ["assigned_identity_scope_after_head_hash", hash],
      ["outstanding_stream_map_before_ref", ref], ["outstanding_stream_map_before_hash", hash],
      ["outstanding_stream_map_after_ref", ref], ["outstanding_stream_map_after_hash", hash],
      ["before_change_proof", "nenumerableMapPathProof"],
      ["after_change_proof", "nenumerableMapPathProof"],
      ["entry_before_ref", nref], ["entry_before_hash", nhash],
      ["entry_after_ref", ref], ["entry_after_hash", hash], ["after_current_map_membership", bool],
      ["identity_epoch_transition_receipt_ref", nref], ["identity_epoch_transition_receipt_hash", nhash],
      ["unchanged_assigned_identity_epoch_head_ref", nref], ["unchanged_assigned_identity_epoch_head_hash", nhash],
      ["terminal_release_evidence_ref", nref], ["terminal_release_evidence_hash", nhash],
      ["terminal_release_plan_core_ref", nref], ["terminal_release_plan_core_hash", nhash],
      ["receiver_stream_transition_receipt_ref", nref], ["receiver_stream_transition_receipt_hash", nhash],
      ["unchanged_receiver_stream_head_ref", nref], ["unchanged_receiver_stream_head_hash", nhash],
      ["authority_transaction_id", str], ["committed_at", time], ["receipt_hash", hash],
      ["authority_service_signature", sig]
    ],
    invariants: ["receiver_outstanding_stream_transition_union"]
  }),
  signed({
    file: "receiver-terminal-release-plan-core.schema.json",
    schema: "cairn.receiver_terminal_release_plan_core.v0.1",
    id: "terminal_release_plan_key",
    hash: "plan_hash",
    signatures: ["authority_service_signature"],
    entries: [
      ["terminal_release_plan_key", hash],
      ["release_cause", "enum:authenticated_stream_closed|authenticated_irreversible_horizon|fenced_non_submission"],
      ["terminal_release_evidence_ref", ref], ["terminal_release_evidence_hash", hash],
      ["receiver_outstanding_stream_entry_ref", ref], ["receiver_outstanding_stream_entry_hash", hash],
      ["event_id_slot_assignment_ref", ref], ["event_id_slot_assignment_hash", hash],
      ["sequence_slot_assignment_ref", ref], ["sequence_slot_assignment_hash", hash],
      ["trust_epoch_assignment_manifest_ref", ref], ["trust_epoch_assignment_manifest_hash", hash],
      ["trust_epoch_assignment_count", "positive"], ["future_dependency_pool_state_head_ref", nref],
      ["future_dependency_pool_state_head_hash", nhash], ["future_dependency_assignment_ref", nref],
      ["future_dependency_assignment_hash", nhash], ["receiver_stream_before_head_ref", nref],
      ["receiver_stream_before_head_hash", nhash], ["connection_outstanding_action_entry_ref", nref],
      ["connection_outstanding_action_entry_hash", nhash], ["expected_transition_kind_set_root", hash],
      ["authority_transaction_id", str], ["issued_at", time], ["plan_hash", hash],
      ["authority_service_signature", sig]
    ],
    invariants: ["receiver_terminal_release_plan_exact_binding"]
  }),
  signed({
    file: "receiver-terminal-release-completion-receipt.schema.json",
    schema: "cairn.receiver_terminal_release_completion_receipt.v0.1",
    id: "completion_key",
    hash: "receipt_hash",
    signatures: ["authority_service_signature"],
    entries: [
      ["completion_key", hash], ["terminal_release_plan_core_ref", ref],
      ["terminal_release_plan_core_hash", hash], ["terminal_release_evidence_ref", ref],
      ["terminal_release_evidence_hash", hash], ["identity_epoch_transition_receipts", "identityTransitionReceipts"],
      ["identity_transition_count", "constint:2"], ["identity_transition_root", hash],
      ["trust_epoch_transition_manifest_ref", ref], ["trust_epoch_transition_manifest_hash", hash],
      ["trust_epoch_transition_count", "positive"], ["trust_epoch_transition_root", hash],
      ["future_dependency_transition_receipt_ref", nref], ["future_dependency_transition_receipt_hash", nhash],
      ["receiver_stream_transition_receipt_ref", nref], ["receiver_stream_transition_receipt_hash", nhash],
      ["unchanged_receiver_stream_head_ref", nref], ["unchanged_receiver_stream_head_hash", nhash],
      ["receiver_outstanding_stream_transition_receipt_ref", ref],
      ["receiver_outstanding_stream_transition_receipt_hash", hash],
      ["connection_outstanding_action_transition_receipt_ref", nref],
      ["connection_outstanding_action_transition_receipt_hash", nhash],
      ["completed_transition_kind_set_root", hash], ["plan_to_receipt_keyset_equality_proof_hash", hash],
      ["authority_transaction_id", str], ["committed_at", time], ["receipt_hash", hash],
      ["authority_service_signature", sig]
    ],
    invariants: ["receiver_terminal_release_completion_exact_binding"]
  }),
  signed({
    file: "connection-state-event-receipt.schema.json",
    schema: "cairn.connection_state_event_receipt.v0.1",
    id: "receipt_hash",
    hash: "receipt_hash",
    signatures: ["authority_service_signature"],
    entries: [
      ["connection_state_id", hash], ["cause", "enum:authorization_genesis|principal_control|authority_time_expiry"],
      ["connection_authorization_ref", ref], ["connection_authorization_hash", hash],
      ["connection_before_head_ref", nref], ["connection_before_head_hash", nhash],
      ["connection_after_head_ref", ref], ["connection_after_head_hash", hash],
      ["aggregate_control_before_head_ref", nref], ["aggregate_control_before_head_hash", nhash],
      ["aggregate_control_after_head_ref", ref], ["aggregate_control_after_head_hash", hash],
      ["connection_leaf_before_hash", hash], ["connection_leaf_after_hash", hash],
      ["pause_epoch_before", nuint], ["pause_epoch_after", uint],
      ["revocation_nonce_before", nuint], ["revocation_nonce_after", uint],
      ["expected_connection_sequence_before", nuint], ["principal_control_authorization_ref", nref],
      ["principal_control_authorization_hash", nhash], ["outstanding_action_index_before_head_ref", nref],
      ["outstanding_action_index_before_head_hash", nhash], ["outstanding_action_index_after_head_ref", ref],
      ["outstanding_action_index_after_head_hash", hash], ["authority_transaction_id", str],
      ["committed_at", time], ["receipt_hash", hash], ["authority_service_signature", sig]
    ],
    invariants: ["connection_event_union"]
  }),
  signed({
    file: "execution-control-authorization.schema.json",
    schema: "cairn.execution_control_authorization.v0.1",
    id: "control_authorization_id",
    hash: "control_authorization_hash",
    signatures: ["principal_or_recovery_signature"],
    entries: [
      ["control_authorization_id", "uuid"], ["principal_id", str],
      ["scope", "enum:all_agents|connection|runtime|mandate|compartment|action"],
      ["target_kind", "enum:global|object_ref|compartment_resource|action_occurrence"],
      ["target_ref", nref], ["compartment_control_key", nhash], ["action_control_key", nhash],
      ["control_action", "enum:pause|resume|revoke|freeze_new_redemptions"],
      ["reason_code", "enum:user_requested|suspected_compromise|policy_violation|recovery|administrative_hold"],
      ["expected_control_head_hash", hash], ["expected_pause_epoch", uint], ["expected_revocation_nonce", uint],
      ["recovery_grant_ref", nref], ["recovery_grant_state_head_ref", nref],
      ["recovery_grant_state_head_hash", nhash], ["recovery_use_idempotency_nonce", nstr],
      ["requested_at", time], ["expires_at", time], ["control_authorization_hash", hash],
      ["principal_or_recovery_signature", sig],
      ["not_claiming", "exactset:effective|receiver_cancellation|irreversible_effect_undone"]
    ],
    invariants: ["control_target_union", "recovery_signature_union"]
  }),
  signed({
    file: "execution-control-namespace.schema.json",
    schema: "cairn.execution_control_namespace.v0.1",
    id: "namespace_hash",
    hash: "namespace_hash",
    signatures: ["authority_service_signature", "principal_high_assurance_signature"],
    entries: [
      ["principal_id", str], ["authority_namespace", str], ["generation", uint],
      ["prior_namespace_ref", nref], ["prior_revoked_head_ref", nref], ["created_at", time],
      ["namespace_hash", hash], ["authority_service_signature", sig], ["principal_high_assurance_signature", sig]
    ]
  }),
  signed({
    file: "execution-control-state-head.schema.json",
    schema: "cairn.execution_control_state_head.v0.1",
    id: "head_hash",
    hash: "head_hash",
    signatures: ["authority_service_signature"],
    entries: [
      ["principal_id", str], ["authority_namespace", str], ["control_namespace_ref", ref],
      ["control_namespace_generation", uint], ["sequence", uint], ["previous_head_hash", nhash],
      ["global_state", "enum:active|paused|frozen_new_redemptions|revoked"],
      ["global_pause_epoch", uint], ["global_revocation_nonce", uint], ["scoped_control_map_ref", ref],
      ["scoped_control_map_hash", hash], ["scoped_control_head_count", uint],
      ["scoped_control_heads_root", hash], ["updated_at", time], ["head_hash", hash],
      ["authority_service_signature", sig]
    ]
  }),
  signed({
    file: "scoped-execution-control-leaf-state-head.schema.json",
    schema: "cairn.scoped_execution_control_leaf_state_head.v0.1",
    id: "scoped_control_leaf_key",
    hash: "head_hash",
    signatures: ["authority_service_signature"],
    entries: [
      ["scoped_control_leaf_key", hash], ["principal_id", str], ["control_namespace_generation", uint],
      ["scope", "enum:connection|runtime|mandate|compartment|action"],
      ["target_kind", "enum:object_ref|compartment_resource|action_occurrence"], ["target_ref", nref],
      ["compartment_control_key", nhash], ["action_control_key", nhash], ["sequence", uint],
      ["previous_state_hash", nhash], ["state", "enum:active|paused|frozen_new_redemptions|revoked|expired"],
      ["pause_epoch", uint], ["revocation_nonce", uint], ["updated_at", time], ["head_hash", hash],
      ["authority_service_signature", sig]
    ],
    invariants: ["scoped_control_target_union"]
  }),
  signed({
    file: "execution-control-receipt.schema.json",
    schema: "cairn.execution_control_receipt.v0.1",
    id: "receipt_hash",
    hash: "receipt_hash",
    signatures: ["authority_service_signature"],
    entries: [
      ["principal_id", str], ["cause", "enum:global_control|scoped_control|connection_joint_control|namespace_genesis|namespace_rotation"],
      ["authorization_basis_kind", "enum:control_authorization|control_namespace"],
      ["control_authorization_ref", nref], ["control_authorization_hash", nhash],
      ["control_namespace_ref", nref], ["control_namespace_hash", nhash], ["prior_control_namespace_ref", nref],
      ["prior_control_namespace_hash", nhash], ["prior_revoked_control_head_ref", nref],
      ["prior_revoked_control_head_hash", nhash], ["before_control_head_ref", nref],
      ["before_control_head_hash", nhash], ["after_control_head_ref", ref], ["after_control_head_hash", hash],
      ["before_scoped_control_map_ref", nref], ["before_scoped_control_map_hash", nhash],
      ["after_scoped_control_map_ref", ref], ["after_scoped_control_map_hash", hash],
      ["before_change_proof", "nenumerableMapPathProof"], ["after_change_proof", "nenumerableMapPathProof"],
      ["scoped_leaf_before_ref", nref], ["scoped_leaf_before_hash", nhash],
      ["scoped_leaf_after_ref", nref], ["scoped_leaf_after_hash", nhash],
      ["connection_state_event_receipt_ref", nref], ["connection_state_event_receipt_hash", nhash],
      ["recovery_grant_transition_receipt_ref", nref], ["recovery_grant_transition_receipt_hash", nhash],
      ["outstanding_action_index_head_ref", nref], ["outstanding_action_index_head_hash", nhash],
      ["authority_transaction_id", str], ["committed_at", time], ["receipt_hash", hash],
      ["authority_service_signature", sig]
    ],
    invariants: ["execution_control_receipt_union"]
  }),
  signed({
    file: "agent-execution-compartment.schema.json",
    schema: "cairn.agent_execution_compartment.v0.1",
    id: "compartment_id",
    hash: "compartment_hash",
    signatures: ["authority_service_signature", "principal_acceptance_signature"],
    entries: [
      ["compartment_id", "uuid"], ["principal_id", str], ["authority_ledger_namespace", str],
      ["provider_trust_domain_id", str], ["provider_identity_registry_ref", ref],
      ["provider_account_identity_head_ref", ref], ["account_generation", uint],
      ["provider_account_identity_trust_overlay_head_ref", ref], ["provider_account_identity_trust_overlay_head_hash", hash],
      ["provider_sublimit_identity_head_ref", nref], ["provider_sublimit_identity_head_hash", nhash],
      ["provider_sublimit_identity_trust_overlay_head_ref", nref], ["provider_sublimit_identity_trust_overlay_head_hash", nhash],
      ["stable_root_account_id", str], ["root_economic_resource_key", hash], ["economic_resource_key", hash],
      ["provider_sublimit_id", nstr], ["disjoint_sublimit_proof_ref", nref], ["sublimit_generation", nuint],
      ["compartment_control_key", hash],
      ["compartment_kind", "enum:segregated_provider_account|escrow_wallet|smart_account_permission|prefunded_provider_balance|logical_authority_ledger"],
      ["protection_class", "enum:hard_asset_segregation|provider_enforced_limit|contract_enforced_limit|cairn_ledger_only"],
      ["accounting_asset", str], ["provider_id", str], ["provider_canonical_root_account_commitment", hash],
      ["protection_attestation_ref", ref], ["accounting_policy_ref", ref], ["receiver_finality_profile_ref", ref],
      ["configured_ceiling", money], ["per_action_ceiling", money], ["window_limits", "windowLimits"],
      ["lifetime_limit", money], ["outstanding_exposure_limit", money], ["allowed_rails", strs],
      ["allowed_executor_targets", strs], ["not_before", time], ["expires_at", time],
      ["compartment_hash", hash], ["authority_service_signature", sig], ["principal_acceptance_signature", sig],
      ["not_claiming", "exactset:segregation_beyond_protection_class|insolvency_protection|payment_finality"]
    ],
    invariants: ["compartment_sublimit_union", "compartment_limit_order", "compartment_asset_equality"]
  }),
  signed({
    file: "compartment-state-head.schema.json",
    schema: "cairn.compartment_state_head.v0.1",
    id: "compartment_state_id",
    hash: "state_hash",
    signatures: ["authority_service_signature"],
    entries: [
      ["compartment_state_id", "uuid"], ["compartment_ref", ref], ["economic_resource_key", hash],
      ["compartment_control_key", hash], ["authority_ledger_namespace", str], ["sequence", uint],
      ["previous_state_hash", nhash], ["fencing_token", uint],
      ["state", "enum:pending|active|frozen|exhausted|closed"],
      ["pre_freeze_state", "nenum:pending|active|exhausted|closed"], ["exhausted_limit_ledger_keys_root", hash],
      ["active_reservations_root", hash], ["active_reservation_manifest_ref", ref],
      ["active_reservation_manifest_hash", hash], ["active_reservation_count", uint], ["active_hold_atoms_root", hash],
      ["compartment_limit_ledger_heads_root", hash], ["receiver_backed_available", nmoney],
      ["cairn_reserved", money], ["confirmed_spent", money], ["confirmed_refunded", money],
      ["confirmed_spend_events_root", hash], ["confirmed_refund_events_root", hash],
      ["confirmed_reversal_loss", money], ["confirmed_reversal_events_root", hash],
      ["outstanding_reversal_exposure", money], ["active_reversal_atoms_root", hash],
      ["quarantine_exposure", money], ["quarantine_hold_atoms_root", hash],
      ["current_economic_atom_manifest_ref", ref], ["current_economic_atom_manifest_hash", hash],
      ["current_economic_atom_count", uint], ["confirmed_event_manifest_ref", ref],
      ["confirmed_event_manifest_hash", hash], ["confirmed_event_count", uint],
      ["remediation_state", "enum:none|complete_frozen|incomplete_frozen"], ["remediation_transaction_id", nstr],
      ["remediation_commitment_hash", nhash], ["unresolved_exposure_commitment_root", hash],
      ["provider_status_ref", nref], ["observed_at", time], ["state_hash", hash], ["authority_service_signature", sig]
    ]
  }),
  signed({
    file: "compartment-state-transition-receipt.schema.json",
    schema: "cairn.compartment_state_transition_receipt.v0.1",
    id: "receipt_hash",
    hash: "receipt_hash",
    signatures: ["authority_service_signature"],
    entries: [
      ["compartment_control_key", hash], ["economic_mutation_cause_core_ref", ref], ["economic_mutation_cause_core_hash", hash],
      ["cause", "enum:onboard|reservation_hold|reservation_release|role_transfer|receiver_debit|refund|reversal|unexpected_reversal|unexpected_cancellation_charge|trust_quarantine|historical_incident_overlay_add|remediation|close|expire"],
      ["before_head_ref", nref], ["before_head_hash", nhash], ["after_head_ref", ref], ["after_head_hash", hash],
      ["reservation_manifest_before_ref", nref], ["reservation_manifest_before_hash", nhash],
      ["reservation_manifest_after_ref", ref], ["reservation_manifest_after_hash", hash],
      ["economic_atom_manifest_before_ref", nref], ["economic_atom_manifest_before_hash", nhash],
      ["economic_atom_manifest_after_ref", ref], ["economic_atom_manifest_after_hash", hash],
      ["confirmed_event_manifest_before_ref", nref], ["confirmed_event_manifest_before_hash", nhash],
      ["confirmed_event_manifest_after_ref", ref], ["confirmed_event_manifest_after_hash", hash],
      ["economic_atom_delta_manifest_ref", ref], ["economic_atom_delta_manifest_hash", hash],
      ["authority_transaction_id", str], ["committed_at", time], ["receipt_hash", hash], ["authority_service_signature", sig]
    ]
  }),
  signed({
    file: "execution-resource-bounds-profile.schema.json",
    schema: "cairn.execution_resource_bounds_profile.v0.1",
    id: "profile_hash",
    hash: "profile_hash",
    signatures: ["execution_release_authority_signature"],
    entries: [
      ["profile_id", "const:cairn-supervised-execution-v0.1-bounds"],
      ["max_request_bytes", "constint:2097152"], ["max_canonical_object_bytes", "constint:1048576"],
      ["max_canonical_string_bytes", "constint:65536"], ["max_canonical_uri_or_object_ref_bytes", "constint:4096"],
      ["max_json_nesting_depth", "constint:32"], ["max_properties_per_object", "constint:512"],
      ["max_entries_per_inline_array", "constint:128"], ["max_total_inline_array_entries_per_object", "constint:4096"],
      ["max_dependency_entries_per_index", "constint:32"], ["max_compartments_per_economic_resource", "constint:64"],
      ["max_credential_aliases_per_instance", "constint:8"], ["max_credential_instances_per_broker_authority", "constint:16"],
      ["max_receiver_identity_entries_per_scope", "constint:32"], ["max_direct_receiver_identity_collision_seeds", "constint:2"],
      ["max_receiver_events_per_action", "constint:8"], ["max_transition_manifest_entries", "constint:128"],
      ["max_dependencies_per_action", "constint:32"], ["max_economic_roots_per_action", "constint:8"],
      ["max_compartments_per_action", "constint:64"], ["max_obligations_per_action", "constint:64"],
      ["max_ledgers_per_action", "constint:128"], ["max_rate_windows_per_principal", "constint:32"],
      ["max_money_windows_per_principal", "constint:32"], ["max_rate_windows_per_mandate", "constint:32"],
      ["max_money_windows_per_mandate", "constint:32"], ["max_scoped_control_heads_per_action", "constint:64"],
      ["max_scope_bindings_per_mandate", "constint:64"], ["max_binding_set_grants", "constint:32"],
      ["max_binding_set_disclosures", "constint:0"], ["max_inventory_copies_per_action", "constint:64"],
      ["max_checkout_lines", "constint:64"], ["max_mandatory_obligation_components", "constint:64"],
      ["max_incremental_cost_components_per_attempt", "constint:64"], ["max_field_paths_per_disclosure", "constint:128"],
      ["max_intent_refs_per_mandate", "constint:64"], ["max_capability_scopes_per_mandate", "constint:64"],
      ["max_intent_hashes_per_mandate", "constint:64"], ["max_remediation_roots", "constint:64"],
      ["max_integrity_resolution_receipts_per_incident", "constint:5"], ["max_future_dependency_slots_per_pool", "constint:128"],
      ["max_concurrent_outstanding_streams_per_receiver_scope", "constint:1024"], ["max_closure_partition_entries", "constint:128"],
      ["max_enumerable_map_node_fanout", "constint:16"], ["max_enumerable_map_scan_page_entries", "constint:128"],
      ["max_new_index_entries_per_transaction", "constint:128"], ["max_state_head_writes_per_atomic_transaction", "constint:32768"],
      ["profile_hash", hash], ["execution_release_authority_signature", sig]
    ]
  }),
  signed({
    file: "enumerable-transition-manifest.schema.json",
    schema: "cairn.enumerable_transition_manifest.v0.1",
    id: "manifest_hash",
    hash: "manifest_hash",
    signatures: ["issuing_authority_signature"],
    entries: [
      ["manifest_kind", "enum:lifecycle_transition_chain|source_credential_continuity_chain|checkout_compartment_transitions|checkout_limit_ledger_transitions|checkout_economic_atom_deltas|compartment_economic_atom_deltas|resource_economic_atom_deltas|authority_limit_ledger_event_deltas|receiver_trust_slot_assignments|receiver_trust_epoch_transitions|closure_snapshot_entries|closure_partition_entries"],
      ["subject_ref", ref], ["subject_hash", hash], ["authority_transaction_id", str],
      ["entry_count", "bounded128"], ["sorted_entries", "transitionManifestEntries"], ["entries_root", hash],
      ["manifest_hash", hash], ["issuing_authority_id", str], ["issuing_authority_signature", sig]
    ]
  }),
  signed({
    file: "confirmation-assurance-policy.schema.json",
    schema: "cairn.confirmation_assurance_policy.v0.1",
    id: "policy_id",
    hash: "policy_hash",
    signatures: ["policy_authority_signature"],
    entries: [
      ["policy_id", "uri"], ["applicable_capabilities", strs], ["value_thresholds", "moneyArray"],
      ["allowed_methods", "enumset:passkey|wallet_signature|account_reauth|provider_sca"],
      ["relying_party_or_audience", str], ["require_user_presence", bool], ["require_user_verification", bool],
      ["allowed_authenticator_classes", strs], ["maximum_evidence_age_seconds", "positive"],
      ["allowed_verifier_profile_refs", refs], ["issued_at", time], ["expires_at", time],
      ["policy_hash", hash], ["policy_authority_signature", sig]
    ]
  }),
  signed({
    file: "confirmation-verifier-profile.schema.json",
    schema: "cairn.confirmation_verifier_profile.v0.1",
    id: "verifier_profile_id",
    hash: "profile_hash",
    signatures: ["verifier_registry_signature"],
    entries: [
      ["verifier_profile_id", "uri"], ["verifier_id", str], ["verification_key_refs", refs],
      ["supported_methods", "enumset:passkey|wallet_signature|account_reauth|provider_sca"],
      ["relying_party_or_audience_set", strs], ["evidence_schema_refs", refs], ["issued_at", time],
      ["expires_at", time], ["profile_hash", hash], ["verifier_registry_signature", sig]
    ]
  }),
  signed({
    file: "confirmation-receipt.schema.json",
    schema: "cairn.confirmation_receipt.v0.1",
    id: "confirmation_receipt_id",
    hash: "receipt_hash",
    signatures: ["verifier_signature"],
    entries: [
      ["confirmation_receipt_id", "uuid"], ["principal_id", str], ["authority_object_ref", ref],
      ["authority_object_hash", hash], ["execution_binding_set_ref", nref], ["challenge_hash", hash],
      ["method", "enum:passkey|wallet_signature|account_reauth|provider_sca"], ["authenticator_evidence_ref", ref],
      ["relying_party_or_audience", str], ["user_presence", "tristate"], ["user_verification", "tristate"],
      ["assurance_policy_ref", ref], ["assurance_policy_hash", hash], ["assurance_policy_lifecycle_head_ref", ref],
      ["assurance_policy_lifecycle_head_hash", hash], ["verifier_profile_ref", ref], ["verifier_profile_hash", hash],
      ["verifier_profile_lifecycle_head_ref", ref], ["verifier_profile_lifecycle_head_hash", hash],
      ["verifier_id", str], ["verified_at", time], ["expires_at", time], ["receipt_hash", hash], ["verifier_signature", sig]
    ]
  }),
  signed({
    file: "agent-mandate-v0.3.schema.json",
    schema: "cairn.agent_mandate.v0.3",
    id: "mandate_id",
    hash: "mandate_hash",
    signatures: ["principal_signature"],
    entries: [
      ["mandate_id", "uuid"], ["principal_id", str], ["agent", "mandateAgent"],
      ["execution_mode", "const:preauthorized"], ["control_namespace_ref", ref],
      ["control_namespace_generation", uint], ["principal_limit_policy_state_head_refs", "refs32"],
      ["capability", "mandateCapability"], ["resource_audiences", "uris"], ["scope_bindings", "scopeBindings"],
      ["constraints", "mandateConstraints"], ["reserved_judgments", strs], ["source_authority_claim_ids", strs],
      ["profile_version_hash", hash], ["intent_hashes", "hashes"], ["domain_policy_hash", hash],
      ["revocation_nonce", uint], ["max_delegation_depth", "constint:0"], ["idempotency_namespace", str],
      ["required_confirmation_assurance_policy_ref", ref], ["confirmation_nonce", str], ["issued_at", time],
      ["mandate_hash", hash], ["principal_signature", sig],
      ["not_claiming", "exactset:action_is_wise|evidence_is_true|payment_is_final"]
    ],
    invariants: ["mandate_constraint_union", "mandate_scope_relational", "mandate_connection_not_authority"]
  }),
  signed({
    file: "lineage-commitment.schema.json",
    schema: "cairn.lineage_commitment.v0.1",
    id: "commitment_hash",
    hash: "commitment_hash",
    signatures: ["authority_service_signature"],
    entries: [
      ["principal_id", str], ["authority_kind", "enum:preauthorized_mandate|supervised_pending|cancellation_pending"],
      ["mandate_ref", nref], ["scope_binding_index", nuint], ["principal_occurrence_id", hash],
      ["canonical_business_tuple_hash", hash], ["action_proposal_hash", hash], ["effect_id", hash],
      ["attempt_sequence", uint], ["commitment_generation", uint], ["principal_authorized_lineage_id", hash],
      ["action_control_key", hash], ["prior_lineage_state", "enum:none|receiver_confirmed_cancelled|definitive_failure|fenced_non_submission"],
      ["prior_lineage_receipt_ref", nref], ["lineage_ledger_head_expected", ref], ["expected_activation_fence", uint],
      ["expires_at", time], ["commitment_hash", hash], ["authority_service_signature", sig]
    ],
    invariants: ["lineage_authority_union", "lineage_prior_state_union"]
  }),
  signed({
    file: "lineage-activation-receipt.schema.json",
    schema: "cairn.lineage_activation_receipt.v0.1",
    id: "receipt_hash",
    hash: "receipt_hash",
    signatures: ["authority_service_signature"],
    entries: [
      ["authority_reservation_ref", ref], ["authority_reservation_hash", hash], ["lineage_commitment_ref", ref],
      ["lineage_commitment_hash", hash], ["actual_authority_ref", ref], ["actual_authority_hash", hash],
      ["execution_binding_set_ref", ref], ["execution_binding_set_hash", hash],
      ["prior_lineage_state_head_ref", ref], ["prior_lineage_state_head_hash", hash],
      ["expected_activation_fence", uint], ["next_activation_fence", uint], ["activated_action_ref", ref],
      ["authority_transaction_id", str], ["next_state_commitment_hash", hash], ["activated_at", time],
      ["receipt_hash", hash], ["authority_service_signature", sig]
    ],
    invariants: ["lineage_activation_fence_increment"]
  }),
  signed({
    file: "lineage-provisional-terminal-receipt.schema.json",
    schema: "cairn.lineage_provisional_terminal_receipt.v0.1",
    id: "receipt_hash",
    hash: "receipt_hash",
    signatures: ["authority_service_signature"],
    entries: [
      ["lineage_commitment_ref", ref], ["lineage_commitment_hash", hash], ["before_lineage_state_head_ref", ref],
      ["before_lineage_state_head_hash", hash], ["cause", "enum:authority_time_expiry|binding_superseded|authority_revoked_or_noncurrent"],
      ["terminal_state", "enum:provisional_expired|provisional_superseded|provisional_cancelled"],
      ["no_activation_gate_or_outbox_proof_ref", ref], ["no_activation_gate_or_outbox_proof_hash", hash],
      ["next_state_commitment_hash", hash], ["authority_transaction_id", str], ["committed_at", time],
      ["receipt_hash", hash], ["authority_service_signature", sig]
    ]
  }),
  signed({
    file: "lineage-state-head.schema.json",
    schema: "cairn.lineage_state_head.v0.1",
    id: "principal_authorized_lineage_id",
    hash: "state_hash",
    signatures: ["authority_service_signature"],
    entries: [
      ["principal_occurrence_id", hash], ["principal_authorized_lineage_id", hash], ["action_control_key", hash],
      ["attempt_sequence", uint], ["commitment_generation", uint], ["sequence", uint], ["previous_state_hash", nhash],
      ["state", "enum:provisional|provisional_expired|provisional_superseded|provisional_cancelled|active|fenced_non_submission|definitive_failure|receiver_confirmed_cancelled|finalized"],
      ["commitment_ref", ref], ["activation_receipt_ref", nref], ["activation_transaction_id", nstr],
      ["next_state_commitment_hash", nhash], ["activated_action_ref", nref], ["outbox_state_head_ref", nref],
      ["terminal_receiver_receipt_ref", nref], ["finalization_tombstone", bool], ["fencing_token", uint],
      ["updated_at", time], ["state_hash", hash], ["authority_service_signature", sig]
    ],
    invariants: ["lineage_state_union"]
  }),
  signed({
    file: "execution-binding-set.schema.json",
    schema: "cairn.execution_binding_set.v0.1",
    id: "binding_set_id",
    hash: "binding_set_hash",
    signatures: ["binding_service_signature"],
    entries: [
      ["binding_set_id", "uuid"], ["profile_id", "const:cairn-supervised-execution-v0.1"],
      ["execution_bundle_hash", hash], ["operation_registry_hash", hash], ["execution_release_state_head_ref", ref],
      ["principal_id", str], ["execution_integrity_state_head_ref", ref], ["execution_integrity_state_head_hash", hash],
      ["actor_branch", "enum:agent_runtime|principal_direct"], ["agent_runtime_binding_ref", nref],
      ["connection_authorization_ref", nref], ["connection_state_head_ref", nref], ["data_grant_refs", "grantRefs"],
      ["data_grant_state_heads", "grantHeads"], ["disclosures", "disclosures"], ["action_proposal_ref", ref],
      ["action_proposal_hash", hash], ["capability", "capability"], ["obligation_exposure_core_ref", nref],
      ["obligation_exposure_core_hash", nhash], ["obligation_exposure_id", nhash],
      ["obligation_role", "nenum:create_or_update|fulfill"], ["principal_authorized_lineage_id", hash],
      ["lineage_commitment_ref", ref], ["lineage_commitment_hash", hash], ["expected_lineage_activation_fence", uint],
      ["canonical_business_tuple_hash", hash],
      ["intent_refs", "refs64"], ["counterparties", strs], ["seller_id", nstr], ["listing_refs", "refs64"],
      ["asset", nstr], ["review_policy_hash", hash], ["taint_policy_hash", hash],
      ["principal_occurrence_id", hash], ["action_control_key", hash], ["effect_descriptor_ref", ref], ["effect_id", hash],
      ["checkout_group_core_ref", nref], ["checkout_group_core_hash", nhash],
      ["checkout_role", "nenum:terms_acceptance|payment"], ["checkout_reservation_batch_core_ref", nref],
      ["checkout_reservation_batch_core_hash", nhash], ["fulfillment_attempt_core_ref", nref],
      ["fulfillment_attempt_core_hash", nhash], ["checkout_transition_template_ref", nref],
      ["checkout_transition_template_hash", nhash], ["cancellation_context", "ncancellationContext"],
      ["deal_ref", nref], ["expected_deal_head_hash", nhash], ["closed_terms_or_cart_hash", nhash], ["copy_ids", "copyIds"],
      ["seller_inventory_context_kind", "nenum:checkout|ordinary_deal|adopted_obligation"],
      ["seller_inventory_context_ref", nref], ["seller_inventory_context_hash", nhash],
      ["seller_inventory_stage", "nenum:ordinary_held|checkout_prepared|checkout_held|adopted_consumed"],
      ["seller_inventory_state_head_ref", nref], ["seller_inventory_state_head_hash", nhash],
      ["seller_copy_lease_heads_root", nhash], ["seller_inventory_transition_receipt_ref", nref],
      ["seller_inventory_transition_receipt_hash", nhash], ["seller_inventory_authority_state_head_ref", nref],
      ["seller_inventory_authority_state_head_hash", nhash], ["seller_inventory_authority_signing_key_generation", nuint],
      ["copy_ownership_registry_authority_state_head_ref", nref], ["copy_ownership_registry_authority_state_head_hash", nhash],
      ["copy_ownership_registry_authority_signing_key_generation", nuint], ["checkout_readiness_receipt_ref", nref],
      ["checkout_readiness_receipt_hash", nhash], ["evidence_snapshot_hash", nhash], ["quote_snapshot_ref", nref],
      ["quote_hash", nhash], ["provider_quote_import_receipt_ref", nref], ["provider_quote_import_receipt_hash", nhash],
      ["quote_source_credential_lifecycle_head_ref", nref], ["quote_source_credential_lifecycle_head_hash", nhash],
      ["quote_source_credential_generation", nuint], ["quote_importer_adapter_lifecycle_head_ref", nref],
      ["quote_importer_adapter_lifecycle_head_hash", nhash], ["context_taint_decision_ref", ref],
      ["taint_decision_hash", hash], ["execution_review_receipt_ref", ref], ["review_hash", hash],
      ["compartment_ref", nref], ["pre_reservation_compartment_state_head_ref", nref],
      ["pre_reservation_resource_exposure_state_head_ref", nref], ["pre_reservation_resource_exposure_state_head_hash", nhash],
      ["economic_resource_cap_state_head_ref", nref], ["economic_resource_cap_state_head_hash", nhash],
      ["principal_limit_policy_state_head_refs", "refs32"], ["economic_resource_key", nhash], ["compartment_control_key", nhash],
      ["protection_attestation_ref", nref], ["protection_attestation_hash", nhash],
      ["protection_attestation_lifecycle_head_ref", nref], ["protection_attestation_lifecycle_head_hash", nhash],
      ["provider_account_identity_head_ref", nref], ["account_generation", nuint],
      ["provider_account_identity_trust_overlay_head_ref", nref], ["provider_account_identity_trust_overlay_head_hash", nhash],
      ["provider_sublimit_identity_head_ref", nref], ["provider_sublimit_identity_head_hash", nhash],
      ["provider_sublimit_id", nstr], ["sublimit_generation", nuint],
      ["provider_sublimit_identity_trust_overlay_head_ref", nref], ["provider_sublimit_identity_trust_overlay_head_hash", nhash],
      ["accounting_policy_ref", nref], ["receiver_finality_profile_ref", ref],
      ["receiver_sequence_epoch_selector_state_head_ref", ref], ["receiver_sequence_epoch_selector_state_head_hash", hash],
      ["receiver_sequence_epoch_selector_key", hash], ["receiver_sequence_epoch_proof_ref", ref],
      ["receiver_sequence_epoch_proof_hash", hash], ["receiver_sequence_epoch_generation", uint],
      ["receiver_channel_policy_ref", nref], ["receiver_channel_policy_hash", nhash],
      ["receiver_channel_policy_lifecycle_head_ref", nref], ["receiver_channel_policy_lifecycle_head_hash", nhash],
      ["confirmation_assurance_policy_ref", ref], ["confirmation_assurance_policy_hash", hash],
      ["confirmation_assurance_policy_lifecycle_head_ref", ref], ["confirmation_assurance_policy_lifecycle_head_hash", hash],
      ["allowed_confirmation_verifier_profile_refs_root", hash], ["policy_lifecycle_head_refs", "refs32"],
      ["execution_control_state_head_ref", ref], ["control_namespace_ref", ref], ["control_namespace_generation", uint],
      ["ultimate_receiver", str], ["receiver_account_or_contract_scope", str], ["receiver_operation_namespace", str],
      ["explicit_scope_selection_proof_ref", ref], ["explicit_scope_selection_proof_hash", hash],
      ["payee_account_commitment", nhash], ["rail", nstr], ["exposure_vector", "moneyArray"], ["executor_target", str],
      ["credential_audience", str], ["executor_credential_binding_head_ref", ref],
      ["executor_credential_binding_head_hash", hash], ["executor_credential_instance_state_head_ref", ref],
      ["executor_credential_instance_state_head_hash", hash], ["credential_broker_authority_state_head_ref", ref],
      ["credential_broker_authority_state_head_hash", hash], ["warning_codes", strs],
      ["required_acknowledgement_codes", strs], ["created_at", time], ["expires_at", time],
      ["binding_set_hash", hash], ["binding_service_signature", sig]
    ],
    invariants: ["binding_actor_union", "binding_exact_release", "binding_checkout_union", "binding_cancellation_union"]
  }),
  ...executionChainProfiles(),
  signed({
    file: "execution-activity-summary.schema.json",
    schema: "cairn.execution_activity_summary.v0.1",
    id: "activity_id",
    hash: "summary_hash",
    signatures: ["activity_service_signature"],
    entries: [
      ["activity_id", hash], ["principal_id", str], ["action_ref", ref], ["action_state_head_ref", ref],
      ["capability", "capability"], ["execution_mode", "enum:supervised|preauthorized"],
      ["state", "actionState"], ["display_amount", nmoney], ["counterparty_label", nstr],
      ["requires_human_decision", bool], ["decision_code", nstr], ["updated_at", time],
      ["summary_hash", hash], ["activity_service_signature", sig],
      ["not_claiming", "exactset:receiver_finality_without_receipt|physical_card_truth|hidden_authority"]
    ]
  }),
  signed({
    file: "execution-activity-detail.schema.json",
    schema: "cairn.execution_activity_detail.v0.1",
    id: "activity_id",
    hash: "detail_hash",
    signatures: ["activity_service_signature"],
    entries: [
      ["activity_id", hash], ["principal_id", str], ["action_ref", ref], ["action_state_head_ref", ref],
      ["binding_set_ref", ref], ["lineage_state_head_ref", ref], ["authority_basis_ref", nref],
      ["current_receipt_refs", refs], ["state", "actionState"], ["human_decision_codes", strs],
      ["receiver_truth_status", "enum:not_handed_off|pending|unknown|confirmed|quarantined"],
      ["exposure_status", "enum:none|reserved|spent|reversal_risk|quarantined|released"],
      ["updated_at", time], ["detail_hash", hash], ["activity_service_signature", sig],
      ["not_claiming", "exactset:receiver_finality_without_receipt|physical_card_truth|automatic_release_authority"]
    ]
  }),
  signed({
    file: "execution-action-view.schema.json",
    schema: "cairn.execution_action_view.v0.1",
    id: "view_hash",
    hash: "view_hash",
    signatures: ["activity_service_signature"],
    entries: [
      ["action_record_ref", ref], ["current_action_state_head_ref", ref], ["current_lineage_state_head_ref", ref],
      ["current_activity_detail_ref", ref], ["assembled_at", time], ["view_hash", hash], ["activity_service_signature", sig]
    ]
  })
]);

function executionChainProfiles() {
  const base = (file, schema, id, hashField, signatureField, entries, invariants = []) => signed({
    file, schema, id, hash: hashField, signatures: [signatureField], entries, invariants
  });
  return [
    base("action-authorization-v0.2.schema.json", "cairn.action_authorization.v0.2", "authorization_id", "authorization_hash", "principal_signature", [
      ["authorization_id", "uuid"], ["principal_id", str], ["execution_binding_set_ref", ref], ["execution_binding_set_hash", hash],
      ["action_proposal_hash", hash], ["principal_authorized_lineage_id", hash], ["lineage_commitment_ref", ref],
      ["lineage_commitment_hash", hash], ["principal_occurrence_id", hash], ["effect_id", hash], ["capability", "actionAuthorizationCapability"],
      ["execution_mode", "const:supervised"], ["authority_context", "enum:direct_transaction|intent_bound"],
      ["obligation_exposure_core_ref", nref], ["obligation_exposure_core_hash", nhash], ["obligation_exposure_id", nhash],
      ["obligation_role", "nenum:create_or_update|fulfill"], ["checkout_group_core_ref", nref],
      ["checkout_group_core_hash", nhash], ["checkout_role", "nenum:terms_acceptance|payment"],
      ["checkout_reservation_batch_core_ref", nref], ["checkout_reservation_batch_core_hash", nhash],
      ["fulfillment_attempt_core_ref", nref], ["fulfillment_attempt_core_hash", nhash], ["deal_id", nstr],
      ["expected_deal_head_hash", nhash], ["terms_or_cart_hash", nhash], ["copy_ids", "copyIds"],
      ["evidence_snapshot_hash", nhash], ["counterparties", strs], ["target", str], ["ultimate_receiver_or_payee", str],
      ["receiver_account_or_contract_scope", nstr], ["receiver_operation_namespace", nstr],
      ["explicit_scope_selection_proof_ref", nref], ["explicit_scope_selection_proof_hash", nhash],
      ["payee_account_commitment", nhash], ["exposure_vector", "moneyArray"], ["rail", nstr],
      ["disclosure_authorization_refs", "refs32"], ["disclosure_reservation_refs", "refs32"],
      ["acknowledged_warning_codes", strs], ["acknowledged_transaction_semantics", strs],
      ["reserved_judgments_decided", strs], ["idempotency_key", str], ["expires_at", time],
      ["principal_revocation_nonce", uint], ["required_confirmation_assurance_policy_ref", ref], ["confirmation_nonce", str],
      ["authorization_hash", hash], ["principal_signature", sig],
      ["not_claiming", "exactset:execution_complete|receiver_acceptance"]
    ], ["authorization_binding_exact", "authorization_checkout_union"]),
    base("cancellation-authorization-v0.1.schema.json", "cairn.cancellation_authorization.v0.1", "cancellation_authorization_id", "authorization_hash", "principal_signature", [
      ["cancellation_authorization_id", "uuid"], ["principal_id", str],
      ["authorization_mode", "enum:ordinary|principal_safety_cancellation"],
      ["restrictive_control_head_ref", nref], ["restrictive_control_head_hash", nhash], ["restrictive_control_scope", nstr],
      ["restrictive_control_target_commitment", nhash], ["original_outbox_handoff_receipt_ref", nref],
      ["safety_preparation_intent_ref", nref], ["safety_preparation_intent_hash", nhash],
      ["cancellation_cost_attestation_ref", ref], ["cancellation_cost_attestation_hash", hash],
      ["cancellation_fee_source_state_head_ref", ref], ["cancellation_fee_source_state_head_hash", hash],
      ["cancellation_fee_source_generation", uint], ["execution_binding_set_ref", ref], ["execution_binding_set_hash", hash],
      ["lineage_commitment_ref", ref], ["principal_occurrence_id", hash], ["cancellation_effect_id", hash],
      ["original_action_ref", ref], ["original_action_hash", hash], ["original_action_state_head_ref", ref],
      ["original_action_state_head_hash", hash], ["receiver_event_stream_state_head_ref", ref],
      ["receiver_event_stream_state_head_hash", hash], ["original_effect_id", hash], ["receiver_id", str],
      ["receiver_account_commitment", hash], ["receiver_account_or_contract_scope", str],
      ["cancellation_operation_namespace", str], ["original_executor_credential_binding_core_ref", ref],
      ["original_executor_credential_binding_core_hash", hash], ["original_executor_credential_binding_head_ref", ref],
      ["original_executor_credential_binding_head_hash", hash], ["original_credential_instance_key", hash],
      ["original_credential_instance_core_ref", ref], ["original_credential_instance_core_hash", hash],
      ["original_executor_credential_binding_current_head_ref", ref], ["original_executor_credential_binding_current_head_hash", hash],
      ["cancellation_executor_credential_binding_head_ref", ref], ["cancellation_executor_credential_binding_head_hash", hash],
      ["cancellation_credential_instance_key", hash], ["cancellation_credential_instance_state_head_ref", ref],
      ["cancellation_credential_instance_state_head_hash", hash], ["cancellation_credential_continuity_receipt_ref", nref],
      ["cancellation_credential_continuity_receipt_hash", nhash], ["original_operation_locator", "originalOperationLocator"],
      ["expected_original_state", "enum:submitted|acknowledged|accepted|unknown"],
      ["authorized_cancel_state_set", "exactset:submitted|acknowledged|accepted|unknown"], ["cancellation_operation_kind", str],
      ["acknowledged_warning_codes", strs], ["reserved_judgments_decided", strs],
      ["required_confirmation_assurance_policy_ref", ref],
      ["confirmation_nonce", str], ["principal_revocation_nonce", uint], ["expires_at", time],
      ["authorization_hash", hash], ["principal_signature", sig],
      ["not_claiming", "exactset:cancellation_available|cancellation_effective|original_effect_undone"]
    ], ["cancellation_authorization_mode_union", "cancellation_credential_continuity_union"]),
    base("authority-reservation-v0.2.schema.json", "cairn.authority_reservation.v0.2", "reservation_id", "reservation_hash", "authority_service_signature", [
      ["reservation_id", "uuid"], ["principal_id", str], ["prepared_action_ref", ref], ["action_control_key", hash],
      ["execution_binding_set_ref", ref], ["execution_binding_set_hash", hash], ["authority_basis_ref", ref],
      ["authority_basis_hash", hash], ["lineage_commitment_ref", ref], ["lineage_commitment_hash", hash],
      ["expected_lineage_fence", uint], ["next_lineage_fence", uint], ["authority_limit_ledger_commit_refs", "nonEmptyRefs"],
      ["obligation_exposure_core_ref", nref], ["obligation_exposure_state_before_ref", nref],
      ["obligation_exposure_state_after_ref", nref], ["economic_resource_exposure_before_ref", nref],
      ["economic_resource_exposure_after_ref", nref], ["seller_inventory_context", "nsellerInventoryContext"],
      ["exposure_vector", "moneyArray"], ["source_read_receipt_refs", "refs32"], ["disclosure_reservation_refs", "refs32"],
      ["data_grant_state_head_refs", "refs32"], ["fencing_token", uint], ["reserved_at", time], ["expires_at", time],
      ["reservation_hash", hash], ["authority_service_signature", sig]
    ], ["reservation_lineage_fence_increment", "reservation_inventory_union"]),
    base("gate-dependency-attestation-v0.1.schema.json", "cairn.gate_dependency_attestation.v0.1", "attestation_id", "attestation_hash", "issuing_authority_signature", [
      ["attestation_id", "uuid"], ["principal_id", str],
      ["dependency_role", "enum:execution_release|execution_integrity|policy_lifecycle|execution_control|economic_resource|business_state|provider_identity|provider_identity_trust_overlay|policy|executor_policy|receiver_finality|accounting_policy|receiver_channel_policy|receiver_sequence_selector|checkout_dependency|checkout_readiness|checkout_group_state|checkout_terms"],
      ["subject_ref", ref], ["subject_hash", hash], ["state", "enum:active|paused|restricted|revoked|expired"],
      ["valid_from", time], ["valid_until", time], ["issued_at", time], ["issuing_authority_id", str],
      ["attestation_hash", hash], ["issuing_authority_signature", sig]
    ]),
    base("gate-dependency-state-head-v0.1.schema.json", "cairn.gate_dependency_state_head.v0.1", "dependency_key", "head_hash", "authority_service_signature", [
      ["dependency_key", hash], ["principal_id", str],
      ["dependency_role", "enum:execution_release|execution_integrity|policy_lifecycle|execution_control|economic_resource|business_state|provider_identity|provider_identity_trust_overlay|policy|executor_policy|receiver_finality|accounting_policy|receiver_channel_policy|receiver_sequence_selector|checkout_dependency|checkout_readiness|checkout_group_state|checkout_terms"],
      ["source_ref", ref], ["source_hash", hash], ["sequence", uint], ["previous_head_hash", nhash],
      ["state", "enum:active|paused|restricted|revoked|expired"], ["valid_from", time], ["valid_until", time],
      ["updated_at", time], ["head_hash", hash], ["authority_service_signature", sig]
    ]),
    base("gate-dependency-manifest-v0.1.schema.json", "cairn.gate_dependency_manifest.v0.1", "manifest_id", "manifest_hash", "authority_service_signature", [
      ["manifest_id", "uuid"], ["principal_id", str], ["execution_binding_set_ref", ref],
      ["execution_binding_set_hash", hash], ["authority_basis_ref", ref], ["confirmation_receipt_ref", ref],
      ["execution_release_state_head_ref", ref], ["execution_integrity_state_head_ref", ref],
      ["confirmation_assurance_policy_lifecycle_head_ref", ref],
      ["confirmation_verifier_profile_lifecycle_head_ref", ref], ["reservation_receipt_refs", "refs32"],
      ["current_control_head_refs", "refs64"], ["current_connection_head_ref", nref],
      ["current_compartment_head_ref", nref], ["current_economic_resource_head_ref", nref],
      ["current_data_grant_head_refs", "refs32"], ["current_business_state_head_refs", "refs32"],
      ["current_provider_identity_head_refs", "refs32"],
      ["current_provider_identity_trust_overlay_head_refs", "refs32"],
      ["current_seller_copy_lease_heads_root", nhash], ["policy_refs", "refs32"],
      ["executor_policy_ref", ref], ["receiver_finality_profile_ref", ref], ["accounting_policy_ref", nref],
      ["receiver_channel_policy_ref", nref], ["receiver_sequence_epoch_selector_ref", ref],
      ["checkout_dependency_refs", "refs32"], ["checkout_readiness_receipt_ref", nref],
      ["checkout_group_state_head_ref", nref], ["checkout_terms_receipt_ref", nref],
      ["created_at", time], ["expires_at", time], ["manifest_hash", hash], ["authority_service_signature", sig]
    ]),
    base("gate-request-v0.2.schema.json", "cairn.gate_request.v0.2", "gate_request_id", "request_hash", "gate_service_signature", [
      ["gate_request_id", "uuid"], ["principal_id", str], ["execution_binding_set_ref", ref], ["execution_binding_set_hash", hash],
      ["dependency_manifest_ref", ref], ["dependency_manifest_hash", hash],
      ["execution_integrity_state_head_ref", ref], ["authority_basis_ref", ref], ["confirmation_receipt_ref", ref],
      ["confirmation_assurance_policy_lifecycle_head_ref", ref], ["confirmation_assurance_policy_lifecycle_head_hash", hash],
      ["confirmation_verifier_profile_lifecycle_head_ref", ref], ["confirmation_verifier_profile_lifecycle_head_hash", hash],
      ["reservation_receipt_refs", "refs32"], ["action_control_key", hash], ["current_control_head_refs", "refs64"],
      ["current_connection_head_ref", nref], ["current_compartment_head_ref", nref], ["current_economic_resource_head_ref", nref],
      ["current_data_grant_head_refs", "refs32"], ["current_business_state_head_refs", "refs32"], ["current_provider_identity_head_refs", "refs32"],
      ["current_provider_identity_trust_overlay_head_refs", "refs32"], ["current_seller_copy_lease_heads_root", nhash],
      ["policy_refs", "refs32"], ["executor_policy_ref", ref], ["receiver_finality_profile_ref", ref],
      ["accounting_policy_ref", nref], ["receiver_channel_policy_ref", nref], ["receiver_sequence_epoch_selector_ref", ref],
      ["checkout_dependency_refs", "refs32"], ["checkout_readiness_receipt_ref", nref],
      ["checkout_group_state_head_ref", nref], ["checkout_terms_receipt_ref", nref],
      ["requested_at", time], ["request_hash", hash], ["gate_service_signature", sig]
    ], ["gate_request_exact_dependencies"]),
    base("gate-result-v0.2.schema.json", "cairn.gate_result.v0.2", "gate_result_id", "result_hash", "gate_service_signature", [
      ["gate_result_id", "uuid"], ["gate_request_ref", ref], ["gate_request_hash", hash], ["execution_binding_set_ref", ref],
      ["execution_binding_set_hash", hash], ["decision", "const:deny"], ["evaluated_head_refs", refs],
      ["evaluated_nonce_and_fence_root", hash], ["business_state_root", hash], ["checkout_dependency_root", hash],
      ["check_results", "checkResults"], ["single_use_result_id", hash], ["evaluated_at", time], ["expires_at", time],
      ["result_hash", hash], ["gate_service_signature", sig]
    ], ["gate_deny_only"]),
    base("action-record-v0.2.schema.json", "cairn.action_record.v0.2", "action_id", "action_hash", "action_service_signature", [
      ["action_id", hash], ["principal_id", str], ["execution_binding_set_ref", ref], ["execution_binding_set_hash", hash],
      ["lineage_commitment_ref", ref], ["lineage_commitment_hash", hash], ["action_proposal_ref", ref], ["action_proposal_hash", hash],
      ["effect_descriptor_ref", ref], ["effect_id", hash], ["capability", "capability"], ["source_preparation_ref", nref],
      ["state", "const:prepared"], ["authority_ref", "constnull"], ["reservation_refs", "constemptyarray"],
      ["gate_result_ref", "constnull"], ["receiver_receipt_ref", "constnull"], ["created_at", time],
      ["action_hash", hash], ["action_service_signature", sig],
      ["not_claiming", "exactset:authority_to_act|external_effect|receiver_acceptance"]
    ], ["action_record_exact_bindings"]),
    base("action-state-head.schema.json", "cairn.action_state_head.v0.1", "action_id", "state_hash", "action_service_signature", [
      ["action_id", hash], ["action_ref", ref], ["sequence", uint], ["previous_state_hash", nhash], ["state", "actionState"],
      ["authority_ref", nref], ["lineage_activation_receipt_ref", nref], ["reservation_refs", "refs32"], ["gate_result_ref", nref],
      ["redemption_receipt_ref", nref], ["outbox_state_head_ref", nref], ["receiver_receipt_ref", nref],
      ["prior_transition_receipt_ref", nref], ["updated_at", time], ["state_hash", hash], ["action_service_signature", sig]
    ], ["action_state_ref_union"]),
    base("action-receipt-v0.2.schema.json", "cairn.action_receipt.v0.2", "receipt_id", "receipt_hash", "action_service_signature", [
      ["receipt_id", "uuid"], ["action_ref", ref], ["execution_binding_set_ref", ref], ["execution_binding_set_hash", hash],
      ["lineage_state_head_ref", ref], ["effect_id", hash], ["policy_refs", "refs32"], ["disclosure_receipt_refs", "constemptyarray"],
      ["obligation_transition_refs", "constemptyarray"], ["checkout_transition_refs", "constemptyarray"], ["receiver_import_receipt_ref", "constnull"],
      ["receiver_assertion_trust_state_head_ref", "constnull"], ["exposure_before", "constnull"], ["exposure_reserved", "constnull"],
      ["exposure_spent", "constnull"], ["exposure_remaining", "constnull"], ["state_before", "actionState"],
      ["state_after", "actionState"], ["prior_action_receipt_ref", nref], ["issued_at", time], ["receipt_hash", hash],
      ["action_service_signature", sig], ["not_claiming", "exactset:physical_card_truth|receiver_finality_without_receipt"]
    ], ["action_receipt_transition"])
  ];
}
