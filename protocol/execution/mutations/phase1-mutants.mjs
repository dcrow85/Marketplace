export const PHASE1_MUTANTS = [
  {
    id: "audited-spec-pin",
    finding: "fixed-prose-dependency",
    file: "lib/profile.mjs",
    search: 'export const SPEC_SHA256 = "3c0452ab6d8a9ed7e1b029a26cd07d454da755f22168392d2e9b13ff2c858aec";',
    replace: 'export const SPEC_SHA256 = "4d5f0b93b553ad05cc9405ec26f53cdd58a807219a7da2b0c7cafb3d482a8764";',
    expectedStage: "build",
    expectedOutput: "audited prose spec hash differs"
  },
  {
    id: "base-bundle-pin",
    finding: "frozen-proposal-dependency",
    file: "lib/profile.mjs",
    search: 'export const BASE_BUNDLE_HASH = "sha-256:d84dd5c2a925575c4889ab51f784cca58bd7c7ec14fcf0ae66dd7d8a6eeff29c";',
    replace: 'export const BASE_BUNDLE_HASH = "sha-256:e84dd5c2a925575c4889ab51f784cca58bd7c7ec14fcf0ae66dd7d8a6eeff29c";',
    expectedStage: "build",
    expectedOutput: "base proposal bundle hash changed"
  },
  {
    id: "base-registry-pin",
    finding: "frozen-proposal-registry-dependency",
    file: "lib/profile.mjs",
    search: 'export const BASE_REGISTRY_HASH = "sha-256:218e990a8cf2e768e9cda8886001488fb0c37496b3cfa64c21d2d922e4e9075b";',
    replace: 'export const BASE_REGISTRY_HASH = "sha-256:318e990a8cf2e768e9cda8886001488fb0c37496b3cfa64c21d2d922e4e9075b";',
    expectedStage: "build",
    expectedOutput: "base proposal registry hash changed"
  },
  {
    id: "read-only-registry-mutating",
    finding: "phase1-no-mutation-surface",
    file: "lib/profile.mjs",
    search: "    mutating: false,\n    external_effect: false,",
    replace: "    mutating: true,\n    external_effect: false,",
    expectedStage: "build",
    expectedOutput: "execution registry"
  },
  {
    id: "read-only-registry-effect",
    finding: "phase1-no-external-effects",
    file: "lib/profile.mjs",
    search: "    mutating: false,\n    external_effect: false,",
    replace: "    mutating: false,\n    external_effect: true,",
    expectedStage: "build",
    expectedOutput: "execution registry"
  },
  {
    id: "closed-object-schema",
    finding: "strict-top-level-objects",
    file: "lib/schema-factory.mjs",
    search: '    additionalProperties: false,\n    required: ["schema", ...Object.keys(profile.fields)],',
    replace: '    additionalProperties: true,\n    required: ["schema", ...Object.keys(profile.fields)],',
    expectedStage: "build",
    expectedOutput: "is not a closed exact object schema"
  },
  {
    id: "signature-exclusion-cycle",
    finding: "hash-signature-cycle",
    file: "lib/schema-factory.mjs",
    search: '    "x-cairn-hash-exclusion-pointers": signaturePointers.flatMap((pointer) => [`${pointer}/signed_hash`, `${pointer}/value`]),',
    replace: '    "x-cairn-hash-exclusion-pointers": signaturePointers.flatMap((pointer) => [`${pointer}/value`]),',
    expectedStage: "build",
    expectedOutput: "excludes anything beyond signature proof cycle fields"
  },
  {
    id: "impossible-calendar-timestamp",
    finding: "strict-execution-timestamps",
    file: "lib/schema-factory.mjs",
    search: '      timestamp: { type: "string", format: "cairn-timestamp", pattern:',
    replace: '      timestamp: { type: "string", pattern:',
    test: "Phase 1 timestamps reject impossible calendar instants"
  },
  {
    id: "signed-object-cryptographic-proof",
    finding: "signature-proof-verification",
    file: "lib/validation.mjs",
    search: '      if (!verifyEd25519({ schemaId: object.schema, objectHash: proof.signed_hash, publicKey: key.public_key, signature: proof.value })) {',
    replace: '      if (false) {',
    test: "Phase 1 signed objects derive controllers and separate historical validity from current eligibility"
  },
  {
    id: "signed-object-controller",
    finding: "signature-controller-binding",
    file: "lib/validation.mjs",
    search: '      else if (key.controller !== expectedController) failures.push("signature_controller_mismatch");',
    replace: '      else if (false) failures.push("signature_controller_mismatch");',
    test: "Phase 1 signed objects derive controllers and separate historical validity from current eligibility"
  },
  {
    id: "signed-object-controller-derived",
    finding: "signature-controller-derived-not-caller-selected",
    file: "lib/validation.mjs",
    search: '    return object.principal_id;\n  }',
    replace: '    return context.expectedControllersByPointer?.[pointer] ?? null;\n  }',
    test: "Phase 1 signed objects derive controllers and separate historical validity from current eligibility"
  },
  {
    id: "capabilities-external-effects",
    finding: "capabilities-no-effect-claim",
    file: "lib/schema-factory.mjs",
    search: '        external_effects_available: { const: false }',
    replace: '        external_effects_available: { type: "boolean" }',
    test: "capabilities response pins the exact Phase 1 surface and frozen artifact"
  },
  {
    id: "capabilities-bundle-binding",
    finding: "capabilities-exact-bundle",
    file: "lib/validation.mjs",
    search: '    if (response.bundle_hash !== context.bundleHash) return ["capabilities_bundle_hash_mismatch"];',
    replace: '    if (!context.bundleHash) return ["capabilities_bundle_hash_mismatch"];',
    test: "capabilities response pins the exact Phase 1 surface and frozen artifact"
  },
  {
    id: "control-target-union",
    finding: "control-target-aliasing",
    file: "lib/validation.mjs",
    search: '  if (expected[scope] !== kind) failures.push("control_target_kind_mismatch");',
    replace: '  if (false) failures.push("control_target_kind_mismatch");',
    test: "scoped control leaves cannot alias a different target class"
  },
  {
    id: "control-compartment-key",
    finding: "control-target-aliasing",
    file: "lib/validation.mjs",
    search: '    if (target !== null || compartment === null || action !== null) failures.push("control_compartment_target_union_mismatch");',
    replace: '    if (false) failures.push("control_compartment_target_union_mismatch");',
    test: "control authorization enforces the exact target and recovery unions"
  },
  {
    id: "control-recovery-no-resume",
    finding: "recovery-authority-widening",
    file: "lib/schema-factory.mjs",
    search: '        control_action: { enum: ["pause", "freeze_new_redemptions", "revoke"] },',
    replace: '        control_action: { enum: ["pause", "resume", "freeze_new_redemptions", "revoke"] },',
    test: "Phase 1 signed objects derive controllers and separate historical validity from current eligibility"
  },
  {
    id: "connection-sequence",
    finding: "stale-connection-transition",
    file: "lib/validation.mjs",
    search: '        if (after.sequence !== before.sequence + 1 || receipt.expected_connection_sequence_before !== before.sequence) failures.push("connection_sequence_mismatch");',
    replace: '        if (false) failures.push("connection_sequence_mismatch");',
    test: "connection transition binds exact heads, sequence, epochs, nonce, and control basis"
  },
  {
    id: "connection-control-basis",
    finding: "connection-control-authority",
    file: "lib/validation.mjs",
    search: '      if ((receipt.cause === "principal_control") !== controlPresent) failures.push("connection_control_basis_mismatch");',
    replace: '      if (false) failures.push("connection_control_basis_mismatch");',
    test: "connection transition binds exact heads, sequence, epochs, nonce, and control basis"
  },
  {
    id: "compartment-limit-order",
    finding: "bounded-compartment",
    file: "lib/validation.mjs",
    search: '    if (amount(value.per_action_ceiling) > amount(value.outstanding_exposure_limit) ||\n        amount(value.outstanding_exposure_limit) > amount(value.configured_ceiling)) failures.push("compartment_limit_order_invalid");',
    replace: '    if (false) failures.push("compartment_limit_order_invalid");',
    test: "compartment limits are single-asset and ordered"
  },
  {
    id: "compartment-asset-equality",
    finding: "cross-asset-limit-confusion",
    file: "lib/validation.mjs",
    search: '    if (monies.some((item) => asset(item) !== value.accounting_asset)) failures.push("compartment_asset_mismatch");',
    replace: '    if (false) failures.push("compartment_asset_mismatch");',
    test: "compartment limits are single-asset and ordered"
  },
  {
    id: "mandate-financial-union",
    finding: "mixed-mandate-authority",
    file: "lib/validation.mjs",
    search: '      if (constraints.financial === null || constraints.nonfinancial !== null) failures.push("mandate_financial_union_mismatch");',
    replace: '      if (constraints.financial === null) failures.push("mandate_financial_union_mismatch");',
    test: "mandate v0.3 keeps financial and nonfinancial authority branches disjoint"
  },
  {
    id: "mandate-financial-asset",
    finding: "cross-asset-mandate",
    file: "lib/validation.mjs",
    search: '        if (monies.some((item) => item.asset !== constraints.financial.accounting_asset)) failures.push("mandate_financial_asset_mismatch");',
    replace: '        if (false) failures.push("mandate_financial_asset_mismatch");',
    test: "mandate v0.3 keeps financial and nonfinancial authority branches disjoint"
  },
  {
    id: "lineage-authority-union",
    finding: "cross-branch-lineage",
    file: "lib/validation.mjs",
    search: '    if (!mandateBranch && (value.mandate_ref !== null || value.scope_binding_index !== null)) failures.push("lineage_nonmandate_authority_mismatch");',
    replace: '    if (false) failures.push("lineage_nonmandate_authority_mismatch");',
    test: "lineage commitments do not accept runtime-chosen or cross-branch mandate state"
  },
  {
    id: "binding-release",
    finding: "cross-release-binding",
    file: "lib/validation.mjs",
    search: '    if (value.profile_id !== PROFILE_ID || value.execution_bundle_hash !== context.bundleHash || value.operation_registry_hash !== context.registryHash) {',
    replace: '    if (value.profile_id !== PROFILE_ID) {',
    test: "binding sets separate direct principals from connected runtimes and bind the exact release"
  },
  {
    id: "binding-actor-union",
    finding: "connection-authority-collapse",
    file: "lib/validation.mjs",
    search: '    } else if (runtimeFields.some((item) => item !== null)) failures.push("binding_principal_branch_leaks_runtime");',
    replace: '    } else if (false) failures.push("binding_principal_branch_leaks_runtime");',
    test: "binding sets separate direct principals from connected runtimes and bind the exact release"
  },
  {
    id: "action-state-backward-edge",
    finding: "append-only-action-chain",
    file: "lib/validation.mjs",
    search: '      if (!ACTION_EDGES.get(before.state)?.has(after.state)) failures.push("action_state_edge_invalid");',
    replace: '      if (false) failures.push("action_state_edge_invalid");',
    test: "action state is append-only and receiver states require receiver evidence"
  },
  {
    id: "activity-state-binding",
    finding: "activity-narration-drift",
    file: "lib/validation.mjs",
    search: '    if (summary.principal_id !== action.principal_id || summary.capability !== action.capability || summary.state !== state.state) failures.push("activity_semantics_mismatch");',
    replace: '    if (summary.principal_id !== action.principal_id || summary.capability !== action.capability) failures.push("activity_semantics_mismatch");',
    test: "activity summaries are privacy-minimized projections of exact action state"
  },
  {
    id: "base-bundle-body-rehash",
    finding: "base-bundle-embedded-hash-trust",
    file: "../dist/cairn-protocol-bundle-v0.1.json",
    dataMutation: "base-bundle-body",
    expectedStage: "build",
    expectedOutput: "base proposal bundle hash changed"
  },
  {
    id: "resource-bounds-exact-field",
    finding: "resource-bounds-source-parity",
    file: "lib/objects.mjs",
    search: '      ["max_request_bytes", "constint:2097152"], ["max_canonical_object_bytes", "constint:1048576"],',
    replace: '      ["max_request_bytes", "constint:1"], ["max_canonical_object_bytes", "constint:1048576"],',
    test: "explicit prose schemas retain exact fields and every array is release-bounded"
  },
  {
    id: "action-authorization-required-field",
    finding: "action-authorization-source-parity",
    file: "lib/objects.mjs",
    search: '      ["reserved_judgments_decided", strs], ["idempotency_key", str], ["expires_at", time],',
    replace: '      ["reserved_judgments_decided", strs], ["expires_at", time],',
    test: "explicit prose schemas retain exact fields and every array is release-bounded"
  },
  {
    id: "cancellation-authorization-required-field",
    finding: "cancellation-authorization-source-parity",
    file: "lib/objects.mjs",
    search: '      ["authorization_mode", "enum:ordinary|principal_safety_cancellation"],',
    replace: '      ["authorization_branch", "enum:ordinary|principal_safety_cancellation"],',
    test: "explicit prose schemas retain exact fields and every array is release-bounded"
  },
  {
    id: "array-release-bound",
    finding: "resource-bound-container-closure",
    file: "lib/schema-factory.mjs",
    search: 'const array = (items, extras = {}) => ({ type: "array", items, maxItems: 128, ...extras });',
    replace: 'const array = (items, extras = {}) => ({ type: "array", items, ...extras });',
    expectedStage: "build",
    expectedOutput: "array lacks the release-bound maxItems"
  },
  {
    id: "transition-manifest-private-acl",
    finding: "transition-manifest-disclosure",
    file: "lib/profile.mjs",
    search: '  read("execution.transition_manifest.get", "enumerable-transition-manifest.schema.json", "inherited_parent_private_or_audit_acl", "transitionManifestRequest"),',
    replace: '  read("execution.transition_manifest.get", "enumerable-transition-manifest.schema.json", "public", "objectRefRequest"),',
    test: "transition manifests are typed, complete, sorted, and readable only through an authorized naming parent"
  },
  {
    id: "gate-allow-all-checks",
    finding: "inert-gate-invariant",
    file: "lib/schema-factory.mjs",
    search: '      if: { properties: { decision: { const: "allow" } } },',
    replace: '      if: { properties: { decision: { const: "never" } } },',
    test: "gate, authorization, reservation, cancellation, and receipt branches are executable constraints"
  },
  {
    id: "action-prepared-ref-union",
    finding: "inert-action-state-invariant",
    file: "lib/schema-factory.mjs",
    search: '      actionStateBranch("prepared", { nulls: later, reservations: "empty", prior: "null" }),',
    replace: '      actionStateBranch("prepared", { nulls: [], reservations: "empty", prior: "null" }),',
    test: "action state is append-only and receiver states require receiver evidence"
  },
  {
    id: "connection-terminal-state",
    finding: "connection-terminal-reactivation",
    file: "lib/validation.mjs",
    search: '      if (["revoked", "expired"].includes(before?.state)) failures.push("connection_terminal_reactivation");',
    replace: '      if (false) failures.push("connection_terminal_reactivation");',
    test: "connection transition binds exact heads, sequence, epochs, nonce, and control basis"
  },
  {
    id: "connection-immutable-identity",
    finding: "connection-identity-drift",
    file: "lib/validation.mjs",
    search: '        if (immutable.some((field) => after[field] !== before[field]) ||\n            !sameObjectRef(after.connection_authorization_ref, before.connection_authorization_ref) ||\n            !sameObjectRef(after.agent_runtime_binding_ref, before.agent_runtime_binding_ref)) failures.push("connection_immutable_identity_mismatch");',
    replace: '        if (false) failures.push("connection_immutable_identity_mismatch");',
    test: "connection transition binds exact heads, sequence, epochs, nonce, and control basis"
  },
  {
    id: "signature-historical-validity",
    finding: "revocation-does-not-rewrite-history",
    file: "lib/validation.mjs",
    search: '      if (context.requireCurrentKeyEligibility === true &&\n          (key.status !== "active" || now === null || now < keyNotBefore || now >= keyExpiresAt ||\n           (keyRevokedAt !== null && now >= keyRevokedAt))) failures.push("signature_key_not_currently_eligible");',
    replace: '      if (key.status !== "active") failures.push("signature_key_not_currently_eligible");',
    test: "Phase 1 signed objects derive controllers and separate historical validity from current eligibility"
  },
  {
    id: "paired-checkout-acknowledgement",
    finding: "transaction-semantics-acknowledgement",
    file: "lib/schema-factory.mjs",
    search: '        if: { properties: { checkout_reservation_batch_core_ref: { not: { type: "null" } } } },',
    replace: '        if: { properties: { checkout_reservation_batch_core_ref: { type: "null" } } },',
    test: "gate, authorization, reservation, cancellation, and receipt branches are executable constraints"
  },
  {
    id: "cancellation-mode-union",
    finding: "cancellation-authority-branch",
    file: "lib/schema-factory.mjs",
    search: '        then: { properties: nullProperties(safety) },\n        else: { properties: nonNullProperties(safety) }',
    replace: '        then: {},\n        else: { properties: nonNullProperties(safety) }',
    test: "gate, authorization, reservation, cancellation, and receipt branches are executable constraints"
  },
  {
    id: "transition-manifest-kind-matrix",
    finding: "transition-manifest-type-confusion",
    file: "lib/validation.mjs",
    search: '      if (!permitted?.has(entry.entry_kind)) failures.push("transition_manifest_kind_matrix_invalid");',
    replace: '      if (false) failures.push("transition_manifest_kind_matrix_invalid");',
    test: "transition manifests are typed, complete, sorted, and readable only through an authorized naming parent"
  },
  {
    id: "transition-manifest-parent-acl",
    finding: "transition-manifest-parent-authority",
    file: "lib/validation.mjs",
    search: '    if (context.parentAccessAuthorized !== true) failures.push("transition_manifest_parent_acl_denied");',
    replace: '    if (false) failures.push("transition_manifest_parent_acl_denied");',
    test: "transition manifests are typed, complete, sorted, and readable only through an authorized naming parent"
  },
  {
    id: "reservation-lineage-fence",
    finding: "reservation-lineage-skip",
    file: "lib/validation.mjs",
    search: '    if (value.next_lineage_fence !== value.expected_lineage_fence + 1) failures.push("reservation_lineage_fence_invalid");',
    replace: '    if (false) failures.push("reservation_lineage_fence_invalid");',
    test: "gate, authorization, reservation, cancellation, and receipt branches are executable constraints"
  },
  {
    id: "invariant-validator-registry",
    finding: "inert-invariant-annotation",
    file: "lib/validation.mjs",
    search: '  "action_record_exact_bindings", "action_state_ref_union", "action_receipt_transition"',
    replace: '  "action_record_exact_bindings", "action_state_ref_union"',
    expectedStage: "build",
    expectedOutput: "invariant action_receipt_transition has no bundled validator"
  },
  {
    id: "gate-request-binding",
    finding: "gate-request-cross-binding",
    file: "lib/validation.mjs",
    search: '        value.principal_id !== binding.principal_id || value.action_control_key !== binding.action_control_key) failures.push("gate_request_binding_mismatch");',
    replace: '        false) failures.push("gate_request_binding_mismatch");',
    test: "gate, authorization, reservation, cancellation, and receipt branches are executable constraints"
  },
  {
    id: "redemption-allow-only",
    finding: "redemption-denied-gate",
    file: "lib/validation.mjs",
    search: '    if (!gateResult || gateResult.decision !== "allow" ||\n        validateGateResult(gateResult, { ...context, gateRequest, binding }).length ||\n        !exactRef(value.gate_result_ref, gateResult, context) || value.gate_result_hash !== gateResult.result_hash) {',
    replace: '    if (false) {',
    test: "gate, authorization, reservation, cancellation, and receipt branches are executable constraints"
  },
  {
    id: "signature-evaluation-time-required",
    finding: "signature-validation-needs-protocol-time",
    file: "lib/validation.mjs",
    search: '      if (now === null) failures.push("signature_evaluation_time_required");',
    replace: '      if (false) failures.push("signature_evaluation_time_required");',
    test: "Phase 1 signed objects derive controllers and separate historical validity from current eligibility"
  },
  {
    id: "signature-future-time",
    finding: "future-signature-acceptance",
    file: "lib/validation.mjs",
    search: '      else if (signedAt !== null && signedAt > now) failures.push("signature_from_future");',
    replace: '      else if (false) failures.push("signature_from_future");',
    test: "Phase 1 signed objects derive controllers and separate historical validity from current eligibility"
  },
  {
    id: "signature-key-id-exact",
    finding: "resolver-key-identity-confusion",
    file: "lib/validation.mjs",
    search: '      if (key.key_id !== proof.key_id) failures.push("signature_key_id_mismatch");',
    replace: '      if (false) failures.push("signature_key_id_mismatch");',
    test: "Phase 1 signed objects derive controllers and separate historical validity from current eligibility"
  },
  {
    id: "signature-key-type-closed",
    finding: "unsupported-signature-key-type",
    file: "lib/validation.mjs",
    search: '      if (key.key_type !== "Ed25519") failures.push("signature_key_type_mismatch");',
    replace: '      if (false) failures.push("signature_key_type_mismatch");',
    test: "Phase 1 signed objects derive controllers and separate historical validity from current eligibility"
  },
  {
    id: "signature-key-status-closed",
    finding: "unknown-signature-key-status",
    file: "lib/validation.mjs",
    search: '      if (!KEY_STATUSES.has(key.status)) failures.push("signature_key_status_invalid");',
    replace: '      if (false) failures.push("signature_key_status_invalid");',
    test: "Phase 1 signed objects derive controllers and separate historical validity from current eligibility"
  },
  {
    id: "mandate-scope-binding-ceiling",
    finding: "mandate-scope-binding-resource-bound",
    file: "lib/schema-factory.mjs",
    search: '  if (type === "scopeBindings") return array({ $ref: `${COMMON}#/$defs/scopeBinding` }, { minItems: 1, maxItems: 64 });',
    replace: '  if (type === "scopeBindings") return array({ $ref: `${COMMON}#/$defs/scopeBinding` }, { minItems: 1, maxItems: 128 });',
    test: "mandate v0.3 keeps financial and nonfinancial authority branches disjoint"
  },
  {
    id: "action-authorization-financial-closure",
    finding: "action-authorization-empty-financial-authority",
    file: "lib/schema-factory.mjs",
    search: '        then: { properties: {\n          ...nonNullProperties(obligation),\n          exposure_vector: { type: "array", minItems: 1, maxItems: 128 }\n        } },\n        else: { properties: {\n          ...nullProperties(obligation),\n          exposure_vector: { type: "array", maxItems: 0 }\n        } }',
    replace: '        then: {},\n        else: { properties: {\n          ...nullProperties(obligation),\n          exposure_vector: { type: "array", maxItems: 0 }\n        } }',
    test: "gate, authorization, reservation, cancellation, and receipt branches are executable constraints"
  },
  {
    id: "binding-set-financial-closure",
    finding: "binding-set-empty-financial-authority",
    file: "lib/schema-factory.mjs",
    search: '          ...nonNullProperties([...obligation, ...financialContext]),',
    replace: '          ...nonNullProperties(obligation),',
    test: "gate, authorization, reservation, cancellation, and receipt branches are executable constraints"
  },
  {
    id: "mandate-financial-capability-kind",
    finding: "financial-capability-with-nonfinancial-mandate",
    file: "lib/schema-factory.mjs",
    search: '      then: { properties: { constraints: { type: "object", properties: { kind: { const: "financial" } } } } }',
    replace: '      then: {}',
    test: "mandate v0.3 keeps financial and nonfinancial authority branches disjoint"
  },
  {
    id: "action-reservation-lineage-activation",
    finding: "reserved-state-without-activation-receipt",
    file: "lib/schema-factory.mjs",
    search: '      actionStateBranch("reserved", { nonnull: ["authority_ref", "lineage_activation_receipt_ref"], nulls: ["gate_result_ref", "redemption_receipt_ref", "outbox_state_head_ref", "receiver_receipt_ref"], reservations: "nonempty" }),',
    replace: '      actionStateBranch("reserved", { nonnull: ["authority_ref"], nulls: ["gate_result_ref", "redemption_receipt_ref", "outbox_state_head_ref", "receiver_receipt_ref"], reservations: "nonempty" }),',
    test: "action state is append-only and receiver states require receiver evidence"
  },
  {
    id: "reservation-authority-ledger-required",
    finding: "unledgered-authority-reservation",
    file: "lib/objects.mjs",
    search: '["authority_limit_ledger_commit_refs", "nonEmptyRefs"]',
    replace: '["authority_limit_ledger_commit_refs", "refs"]',
    test: "gate, authorization, reservation, cancellation, and receipt branches are executable constraints"
  },
  {
    id: "reservation-financial-context-required",
    finding: "financial-reservation-without-exposure-state",
    file: "lib/validation.mjs",
    search: '    if (FINANCIAL_CAPABILITIES.has(preparedAction?.capability)) {',
    replace: '    if (false) {',
    test: "gate, authorization, reservation, cancellation, and receipt branches are executable constraints"
  },
  {
    id: "signature-current-temporal-eligibility",
    finding: "current-key-eligibility-ignores-time",
    file: "lib/validation.mjs",
    search: '      if (context.requireCurrentKeyEligibility === true &&\n          (key.status !== "active" || now === null || now < keyNotBefore || now >= keyExpiresAt ||\n           (keyRevokedAt !== null && now >= keyRevokedAt))) failures.push("signature_key_not_currently_eligible");',
    replace: '      if (context.requireCurrentKeyEligibility === true && key.status !== "active") failures.push("signature_key_not_currently_eligible");',
    test: "Phase 1 signed objects derive controllers and separate historical validity from current eligibility"
  },
  {
    id: "mandate-nonfinancial-capability-kind",
    finding: "nonfinancial-capability-with-financial-mandate",
    file: "lib/schema-factory.mjs",
    search: '      else: { properties: { constraints: { type: "object", properties: { kind: { const: "nonfinancial" } } } } }',
    replace: '      else: {}',
    test: "mandate v0.3 keeps financial and nonfinancial authority branches disjoint"
  },
  {
    id: "binding-set-grant-cap",
    finding: "binding-set-grant-count-above-profile",
    file: "lib/schema-factory.mjs",
    search: '  if (type === "grantRefs") return refArray(0, 32);',
    replace: '  if (type === "grantRefs") return refArray(0, 128);',
    test: "binding sets separate direct principals from connected runtimes and bind the exact release"
  },
  {
    id: "binding-set-grant-head-correspondence",
    finding: "binding-set-grant-without-current-head",
    file: "lib/validation.mjs",
    search: '    if (canonicalHash(grantRefSet) !== canonicalHash(grantHeadSet)) failures.push("binding_data_grant_head_set_mismatch");',
    replace: '    if (false) failures.push("binding_data_grant_head_set_mismatch");',
    test: "binding sets separate direct principals from connected runtimes and bind the exact release"
  },
  {
    id: "action-authorization-exposure-binding",
    finding: "authorization-binding-exposure-drift",
    file: "lib/validation.mjs",
    search: '        "exposure_vector", "rail"];',
    replace: '        "rail"];',
    test: "gate, authorization, reservation, cancellation, and receipt branches are executable constraints"
  },
  {
    id: "action-authorized-no-premature-activation",
    finding: "activation-before-reservation",
    file: "lib/schema-factory.mjs",
    search: '      actionStateBranch("authorized", { nonnull: ["authority_ref"], nulls: ["lineage_activation_receipt_ref", "gate_result_ref", "redemption_receipt_ref", "outbox_state_head_ref", "receiver_receipt_ref"], reservations: "empty" }),',
    replace: '      actionStateBranch("authorized", { nonnull: ["authority_ref"], nulls: ["gate_result_ref", "redemption_receipt_ref", "outbox_state_head_ref", "receiver_receipt_ref"], reservations: "empty" }),',
    test: "action state is append-only and receiver states require receiver evidence"
  },
  {
    id: "action-state-dependency-preservation",
    finding: "action-state-bound-dependency-drift",
    file: "lib/validation.mjs",
    search: '        if (before[field] !== null && !sameObjectRef(before[field], after[field])) failures.push("action_state_dependency_drift");',
    replace: '        if (false) failures.push("action_state_dependency_drift");',
    test: "action state is append-only and receiver states require receiver evidence"
  },
  {
    id: "binding-set-copy-count-bound",
    finding: "copy-count-above-profile",
    file: "lib/schema-factory.mjs",
    search: '  if (type === "copyIds") return stringArray(undefined, 0, 64);',
    replace: '  if (type === "copyIds") return stringArray(undefined, 0, 128);',
    test: "binding sets separate direct principals from connected runtimes and bind the exact release"
  },
  {
    id: "transition-manifest-parent-subject-domain",
    finding: "manifest-parent-subject-domain-drift",
    file: "lib/validation.mjs",
    search: '      manifest.manifest_kind === manifestKind && sameObjectRef(manifest.subject_ref, parent[subjectRefField]) &&',
    replace: '      manifest.manifest_kind === manifestKind && true &&',
    test: "transition manifests are typed, complete, sorted, and readable only through an authorized naming parent"
  },
  {
    id: "binding-set-grant-current-head-hash",
    finding: "binding-set-stale-grant-head-ref",
    file: "lib/validation.mjs",
    search: '          (!isHistoricalEvidence(context) &&\n            !sameObjectRef(resolveCurrentHead(context, head.current_state_head_ref), head.current_state_head_ref)) ||',
    replace: '          false ||',
    test: "binding sets separate direct principals from connected runtimes and bind the exact release"
  },
  {
    id: "transition-manifest-economic-cause-schema",
    finding: "manifest-parent-untyped-economic-cause",
    file: "lib/validation.mjs",
    search: '        parent.economic_mutation_cause_core_ref.schema !== "cairn.economic_mutation_cause_core.v0.1") {',
    replace: '        false) {',
    test: "transition manifests are typed, complete, sorted, and readable only through an authorized naming parent"
  },
  {
    id: "transition-manifest-lifecycle-schema-vocabulary",
    finding: "invented-lifecycle-transition-receipt-schema",
    file: "lib/validation.mjs",
    search: '          !LIFECYCLE_TRANSITION_RECEIPT_SCHEMAS.has(entry.entry_object_ref.schema)) {',
    replace: '          !entry.entry_object_ref.schema.endsWith("_transition_receipt.v0.1")) {',
    test: "transition manifests are typed, complete, sorted, and readable only through an authorized naming parent"
  },
  {
    id: "compartment-enforced-cap",
    finding: "configured-compartment-ceiling-above-provider-cap",
    file: "lib/validation.mjs",
    search: '    } else if (!attestation.enforced_cap || attestation.enforced_cap.asset !== value.accounting_asset ||\n               amount(value.configured_ceiling) > amount(attestation.enforced_cap)) {',
    replace: '    } else if (false) {',
    test: "compartment limits are single-asset and ordered"
  },
  {
    id: "mandate-external-receiver-scope",
    finding: "mandate-null-external-receiver-boundary",
    file: "lib/validation.mjs",
    search: '      if (externalScopeFields.some((field) => binding[field] === null)) failures.push("mandate_external_receiver_scope_incomplete");',
    replace: '      if (false) failures.push("mandate_external_receiver_scope_incomplete");',
    test: "mandate v0.3 keeps financial and nonfinancial authority branches disjoint"
  },
  {
    id: "mandate-nonfinancial-scope-closure",
    finding: "nonfinancial-mandate-with-financial-authority-slots",
    file: "lib/validation.mjs",
    search: '        if ([...financialScopeFields, ...sublimitFields, "payee_account_commitment", "rail"].some((field) => binding[field] !== null)) {',
    replace: '        if (false) {',
    test: "mandate v0.3 keeps financial and nonfinancial authority branches disjoint"
  },
  {
    id: "generic-ref-hash-binding",
    finding: "sibling-ref-hash-drift",
    file: "lib/validation.mjs",
    search: '    if ((reference === null) !== (digest === null) ||\n        (reference !== null && (!isObject(reference) || reference.object_hash !== digest))) {',
    replace: '    if (false) {',
    test: "binding sets separate direct principals from connected runtimes and bind the exact release"
  },
  {
    id: "binding-financial-quote-provenance",
    finding: "financial-binding-without-quote-provenance",
    file: "lib/schema-factory.mjs",
    search: '      "provider_account_identity_trust_overlay_head_hash", "quote_snapshot_ref", "quote_hash",\n      "provider_quote_import_receipt_ref", "provider_quote_import_receipt_hash",\n      "quote_source_credential_lifecycle_head_ref", "quote_source_credential_lifecycle_head_hash",\n      "quote_source_credential_generation", "quote_importer_adapter_lifecycle_head_ref",\n      "quote_importer_adapter_lifecycle_head_hash", "accounting_policy_ref"',
    replace: '      "provider_account_identity_trust_overlay_head_hash", "accounting_policy_ref"',
    test: "gate, authorization, reservation, cancellation, and receipt branches are executable constraints"
  },
  {
    id: "binding-financial-account-overlay",
    finding: "financial-binding-without-current-account-trust-overlay",
    file: "lib/schema-factory.mjs",
    search: '      "provider_account_identity_head_ref", "account_generation", "provider_account_identity_trust_overlay_head_ref",\n      "provider_account_identity_trust_overlay_head_hash", "quote_snapshot_ref", "quote_hash",',
    replace: '      "provider_account_identity_head_ref", "account_generation", "quote_snapshot_ref", "quote_hash",',
    test: "gate, authorization, reservation, cancellation, and receipt branches are executable constraints"
  },
  {
    id: "binding-sublimit-tuple",
    finding: "partially-bound-provider-sublimit",
    file: "lib/schema-factory.mjs",
    search: '      { oneOf: [{ properties: nullProperties(sublimit) }, { properties: nonNullProperties(sublimit) }] }',
    replace: '      {}',
    test: "gate, authorization, reservation, cancellation, and receipt branches are executable constraints"
  },
  {
    id: "binding-nonfinancial-context-closure",
    finding: "nonfinancial-binding-with-financial-context",
    file: "lib/schema-factory.mjs",
    search: '          ...nullProperties([...obligation, ...financialContext, ...sublimit]),',
    replace: '          ...nullProperties(obligation),',
    test: "gate, authorization, reservation, cancellation, and receipt branches are executable constraints"
  },
  {
    id: "authorization-confirmation-policy-binding",
    finding: "authorization-confirmation-policy-drift",
    file: "lib/validation.mjs",
    search: '        ["ultimate_receiver_or_payee", "ultimate_receiver"],\n        ["required_confirmation_assurance_policy_ref", "confirmation_assurance_policy_ref"]',
    replace: '        ["ultimate_receiver_or_payee", "ultimate_receiver"]',
    test: "gate, authorization, reservation, cancellation, and receipt branches are executable constraints"
  },
  {
    id: "authorization-required-acknowledgements",
    finding: "authorization-omits-binding-transaction-semantics",
    file: "lib/validation.mjs",
    search: '      if (canonicalHash(value.acknowledged_transaction_semantics) !== canonicalHash(binding.required_acknowledgement_codes)) {',
    replace: '      if (false) {',
    test: "gate, authorization, reservation, cancellation, and receipt branches are executable constraints"
  },
  {
    id: "action-terminal-prefix-schema",
    finding: "early-terminal-state-schema-contradiction",
    file: "lib/schema-factory.mjs",
    search: '      ...["cancelled", "definitive_failure", "quarantined"].flatMap(terminalBranches),',
    replace: '      ...["cancelled", "definitive_failure", "quarantined"].map((state) =>\n        actionStateBranch(state, { nonnull: later, reservations: "nonempty" })),',
    test: "action state is append-only and receiver states require receiver evidence"
  },
  {
    id: "action-terminal-prefix-preservation",
    finding: "terminal-transition-fabricates-later-dependencies",
    file: "lib/validation.mjs",
    search: '      if (["cancelled", "definitive_failure", "quarantined"].includes(after.state)) {',
    replace: '      if (false) {',
    test: "action state is append-only and receiver states require receiver evidence"
  },
  {
    id: "transition-manifest-derived-entry-key",
    finding: "invented-transition-manifest-entry-key",
    file: "lib/validation.mjs",
    search: '      if (entry.entry_key !== transitionManifestEntryKey(entry)) failures.push("transition_manifest_entry_key_mismatch");',
    replace: '      if (false) failures.push("transition_manifest_entry_key_mismatch");',
    test: "transition manifests are typed, complete, sorted, and readable only through an authorized naming parent"
  },
  {
    id: "transition-manifest-parent-authority-key",
    finding: "manifest-signed-by-different-authority-key-than-parent",
    file: "lib/validation.mjs",
    search: '    if (parentAuthorityKeyId === null || manifestAuthorityKeyId !== parentAuthorityKeyId) {',
    replace: '    if (false) {',
    test: "transition manifests are typed, complete, sorted, and readable only through an authorized naming parent"
  },
  {
    id: "transition-manifest-issuer-controller",
    finding: "manifest-issuer-id-not-key-controller",
    file: "lib/validation.mjs",
    search: '    if (!manifestAuthorityKey || manifestAuthorityKey.controller !== manifest.issuing_authority_id) {',
    replace: '    if (false) {',
    test: "transition manifests are typed, complete, sorted, and readable only through an authorized naming parent"
  },
  {
    id: "refs32-exact-bound",
    finding: "32-entry-protocol-bound-widened",
    file: "lib/schema-factory.mjs",
    search: '  if (type === "refs32") return refArray(0, 32);',
    replace: '  if (type === "refs32") return refArray(0, 128);',
    test: "gate, authorization, reservation, cancellation, and receipt branches are executable constraints"
  },
  {
    id: "refs64-exact-bound",
    finding: "64-entry-protocol-bound-widened",
    file: "lib/schema-factory.mjs",
    search: '  if (type === "refs64") return refArray(0, 64);',
    replace: '  if (type === "refs64") return refArray(0, 128);',
    test: "gate, authorization, reservation, cancellation, and receipt branches are executable constraints"
  },
  {
    id: "mandate-cancellation-authority-forbidden",
    finding: "cancellation-reuses-preauthorized-mandate",
    file: "lib/objects.mjs",
    search: '["capability", "mandateCapability"]',
    replace: '["capability", "capability"]',
    test: "mandate v0.3 keeps financial and nonfinancial authority branches disjoint"
  },
  {
    id: "mandate-money-window-bound",
    finding: "mandate-money-windows-above-32",
    file: "lib/schema-factory.mjs",
    search: '    window_limits: array(closed({ amount: money(), window_kind: { const: "rolling" }, window_seconds: { $ref: "#/$defs/positive" } }), { minItems: 1, maxItems: 32 }),',
    replace: '    window_limits: array(closed({ amount: money(), window_kind: { const: "rolling" }, window_seconds: { $ref: "#/$defs/positive" } }), { minItems: 1, maxItems: 128 }),',
    test: "mandate v0.3 keeps financial and nonfinancial authority branches disjoint"
  },
  {
    id: "binding-checkout-capability-matrix",
    finding: "nonfinancial-capability-with-checkout-role",
    file: "lib/schema-factory.mjs",
    search: '        then: { properties: nullProperties([...checkout, ...batch, ...template]) }',
    replace: '        then: {}',
    test: "binding sets separate direct principals from connected runtimes and bind the exact release"
  },
  {
    id: "binding-obligation-role-capability-matrix",
    finding: "financial-obligation-role-confusion",
    file: "lib/schema-factory.mjs",
    search: '          obligation_role: { const: "create_or_update" },\n          ...nullProperties([...checkout, ...batch, ...template])',
    replace: '          obligation_role: { enum: ["create_or_update", "fulfill"] },\n          ...nullProperties([...checkout, ...batch, ...template])',
    test: "gate, authorization, reservation, cancellation, and receipt branches are executable constraints"
  },
  {
    id: "binding-disclosure-ref-hash-recursion",
    finding: "nested-disclosure-ref-hash-drift",
    file: "lib/validation.mjs",
    search: '    for (const disclosure of value.disclosures) {\n      failures.push(...refHashPairFailures(disclosure, DISCLOSURE_REF_HASH_PAIRS, "binding_disclosure_ref_hash_mismatch"));\n    }',
    replace: '    for (const disclosure of []) {\n      failures.push(...refHashPairFailures(disclosure, DISCLOSURE_REF_HASH_PAIRS, "binding_disclosure_ref_hash_mismatch"));\n    }',
    test: "binding sets separate direct principals from connected runtimes and bind the exact release"
  },
  {
    id: "binding-cancellation-context-ref-hash-recursion",
    finding: "nested-cancellation-context-ref-hash-drift",
    file: "lib/validation.mjs",
    search: '    if (value.cancellation_context !== null) {\n      failures.push(...refHashPairFailures(value.cancellation_context, CANCELLATION_CONTEXT_REF_HASH_PAIRS,\n        "binding_cancellation_ref_hash_mismatch"));\n    }',
    replace: '    if (false) {\n      failures.push(...refHashPairFailures(value.cancellation_context, CANCELLATION_CONTEXT_REF_HASH_PAIRS,\n        "binding_cancellation_ref_hash_mismatch"));\n    }',
    test: "binding sets separate direct principals from connected runtimes and bind the exact release"
  },
  {
    id: "terminal-post-handoff-receiver-evidence",
    finding: "post-handoff-terminal-without-receiver-evidence",
    file: "lib/validation.mjs",
    search: '        if (["submitted", "acknowledged", "unknown", "finalized"].includes(before.state) && after.receiver_receipt_ref === null) {',
    replace: '        if (false) {',
    test: "action state is append-only and receiver states require receiver evidence"
  },
  {
    id: "action-receiver-evidence-monotonic",
    finding: "receiver-evidence-erased-on-later-state",
    file: "lib/validation.mjs",
    search: '      if (before.receiver_receipt_ref !== null && after.receiver_receipt_ref === null) failures.push("action_state_receiver_evidence_erased");',
    replace: '      if (false) failures.push("action_state_receiver_evidence_erased");',
    test: "action state is append-only and receiver states require receiver evidence"
  },
  {
    id: "base-object-response-closed-union",
    finding: "generic-read-open-untyped-object",
    file: "lib/schema-factory.mjs",
    search: '      baseObjectResponse: responseEnvelope(baseObjectSchemaUris),',
    replace: '      baseObjectResponse: responseEnvelope([...baseObjectSchemaUris, ...executionSchemaUris(RECEIPT_RESPONSE_SCHEMA_IDS)]),',
    test: "generic read responses are typed and bind the exact returned object"
  },
  {
    id: "base-object-response-dependency-union",
    finding: "generic-read-omits-pinned-base-object-schemas",
    file: "lib/schema-factory.mjs",
    search: '      baseObjectResponse: responseEnvelope(baseObjectSchemaUris),',
    replace: '      baseObjectResponse: responseEnvelope(executionSchemaUris(POLICY_RESPONSE_SCHEMA_IDS)),',
    test: "generic read responses are typed and bind the exact returned object"
  },
  {
    id: "base-object-response-ref-binding",
    finding: "generic-read-ref-object-mismatch",
    file: "lib/validation.mjs",
    search: '    if (!sameObjectRef(response.ref, resolvedRef)) return [`${code}_ref_mismatch`];',
    replace: '    if (false) return [`${code}_ref_mismatch`];',
    test: "generic read responses are typed and bind the exact returned object"
  },
  {
    id: "generic-response-inner-ref-hash-binding",
    finding: "generic-read-skips-returned-object-sibling-ref-hash-bindings",
    file: "lib/validation.mjs",
    search: '      objectSchema["x-cairn-ref-hash-pairs"] ?? [],\n      "ref_hash_mismatch"',
    replace: '      [],\n      "ref_hash_mismatch"',
    test: "generic read responses are typed and bind the exact returned object"
  },
  {
    id: "policy-response-family-closure",
    finding: "policy-get-accepts-receipt-family",
    file: "lib/schema-factory.mjs",
    search: '      policyObjectResponse: responseEnvelope(executionSchemaUris(POLICY_RESPONSE_SCHEMA_IDS)),',
    replace: '      policyObjectResponse: responseEnvelope([...executionSchemaUris(POLICY_RESPONSE_SCHEMA_IDS), ...executionSchemaUris(RECEIPT_RESPONSE_SCHEMA_IDS)]),',
    test: "generic read responses are typed and bind the exact returned object"
  },
  {
    id: "receipt-response-family-closure",
    finding: "receipt-get-accepts-policy-family",
    file: "lib/schema-factory.mjs",
    search: '      receiptObjectResponse: responseEnvelope(executionSchemaUris(RECEIPT_RESPONSE_SCHEMA_IDS)),',
    replace: '      receiptObjectResponse: responseEnvelope([...executionSchemaUris(RECEIPT_RESPONSE_SCHEMA_IDS), ...executionSchemaUris(POLICY_RESPONSE_SCHEMA_IDS)]),',
    test: "generic read responses are typed and bind the exact returned object"
  },
  {
    id: "namespace-control-recovery-evidence-forbidden",
    finding: "namespace-control-receipt-accepts-recovery-transition-evidence",
    file: "lib/schema-factory.mjs",
    search: '          ...nullProperties([...authorization, ...priorNamespace, ...before, ...leafBefore, ...leafAfter, ...connection, ...outstanding, ...recovery])',
    replace: '          ...nullProperties([...authorization, ...priorNamespace, ...before, ...leafBefore, ...leafAfter, ...connection, ...outstanding])',
    test: "control receipts and lineage heads enforce closed state unions"
  },
  {
    id: "namespace-rotation-recovery-evidence-forbidden",
    finding: "namespace-rotation-receipt-accepts-recovery-transition-evidence",
    file: "lib/schema-factory.mjs",
    search: '          ...nullProperties([...authorization, ...leafBefore, ...leafAfter, ...connection, ...outstanding, ...recovery])',
    replace: '          ...nullProperties([...authorization, ...leafBefore, ...leafAfter, ...connection, ...outstanding])',
    test: "control receipts and lineage heads enforce closed state unions"
  },
  {
    id: "lineage-fencing-token-monotonic",
    finding: "lineage-state-fencing-token-rollback",
    file: "lib/validation.mjs",
    search: '    if (after.fencing_token < before.fencing_token) failures.push("lineage_state_fencing_token_rollback");',
    replace: '    if (false) failures.push("lineage_state_fencing_token_rollback");',
    test: "control receipts and lineage heads enforce closed state unions"
  },
  {
    id: "lineage-activation-fence-exact-successor",
    finding: "lineage-activation-head-accepts-unchanged-or-jumped-fence",
    file: "lib/validation.mjs",
    search: '      if (after.fencing_token !== before.fencing_token + 1) failures.push("lineage_state_activation_fence_invalid");',
    replace: '      if (false) failures.push("lineage_state_activation_fence_invalid");',
    test: "control receipts and lineage heads enforce closed state unions"
  },
  {
    id: "lineage-activation-receipt-fence-increment",
    finding: "lineage-activation-receipt-accepts-non-successor-fence",
    file: "lib/validation.mjs",
    search: '    if (value.next_activation_fence !== value.expected_activation_fence + 1) {\n      failures.push("lineage_activation_receipt_fence_invalid");\n    }',
    replace: '    if (false) {\n      failures.push("lineage_activation_receipt_fence_invalid");\n    }',
    test: "control receipts and lineage heads enforce closed state unions"
  },
  {
    id: "binding-inventory-capability-applicability",
    finding: "nonfinancial-copy-reference-forced-into-inventory-reservation",
    file: "lib/validation.mjs",
    search: '    const inventoryApplicable = FINANCIAL_CAPABILITIES.has(value.capability) && value.copy_ids.length > 0;',
    replace: '    const inventoryApplicable = value.copy_ids.length > 0;',
    test: "gate, authorization, reservation, cancellation, and receipt branches are executable constraints"
  },
  {
    id: "phase1-total-inline-array-entry-bound",
    finding: "nested-inline-array-aggregate-exceeds-frozen-profile",
    file: "lib/validation.mjs",
    search: '    if (totalInlineArrayEntries(object) > MAX_TOTAL_INLINE_ARRAY_ENTRIES_PER_OBJECT) {\n      failures.push("phase1_total_inline_array_entries_exceeded");\n    }',
    replace: '    if (false) {\n      failures.push("phase1_total_inline_array_entries_exceeded");\n    }',
    test: "mandate v0.3 keeps financial and nonfinancial authority branches disjoint"
  },
  {
    id: "reservation-inventory-context-exact-binding",
    finding: "authority-reservation-omits-exact-seller-inventory-context",
    file: "lib/validation.mjs",
    search: '      if ((inventoryApplicable && bindingInventory === null) ||\n          canonicalHash(value.seller_inventory_context) !== canonicalHash(bindingInventory)) {\n        failures.push("reservation_inventory_context_mismatch");\n      }',
    replace: '      if (false) {\n        failures.push("reservation_inventory_context_mismatch");\n      }',
    test: "gate, authorization, reservation, cancellation, and receipt branches are executable constraints"
  },
  {
    id: "execution-source-commitment-core-dependency",
    finding: "candidate-digest-omits-shared-core-validator-bytes",
    file: "lib/bundle.mjs",
    search: '  "../lib/core.mjs", "lib/core.mjs",\n',
    replace: '  "lib/core.mjs",\n',
    expectedStage: "build",
    expectedOutput: "execution source commitment graph omits ../lib/core.mjs"
  },
  {
    id: "execution-source-commitment-lockfile",
    finding: "candidate-digest-omits-runtime-dependency-lock",
    file: "lib/bundle.mjs",
    search: '"mutations/phase1-mutants.mjs", "package-lock.json", "package.json",',
    replace: '"mutations/phase1-mutants.mjs", "package.json",',
    expectedStage: "build",
    expectedOutput: "execution source commitment graph omits package-lock.json"
  },
  {
    id: "execution-runtime-dependency-exact-version",
    finding: "runtime-dependency-declaration-drifts-from-lock",
    file: "package.json",
    search: '    "ajv": "8.20.0",',
    replace: '    "ajv": "8.19.0",',
    expectedStage: "build",
    expectedOutput: "execution runtime dependency declarations differ from the fixed closure"
  },
  {
    id: "control-receipt-cause-basis-union",
    finding: "control-receipt-cross-branch-authorization-basis",
    file: "lib/schema-factory.mjs",
    search: '          cause: { const: "namespace_genesis" }, authorization_basis_kind: { const: "control_namespace" },',
    replace: '          cause: { const: "namespace_genesis" }, authorization_basis_kind: { const: "control_authorization" },',
    test: "control receipts and lineage heads enforce closed state unions"
  },
  {
    id: "lineage-finalization-tombstone",
    finding: "finalized-lineage-without-permanent-tombstone",
    file: "lib/schema-factory.mjs",
    search: '        finalization_tombstone: { const: true }',
    replace: '        finalization_tombstone: { type: "boolean" }',
    test: "control receipts and lineage heads enforce closed state unions"
  },
  {
    id: "lineage-state-edge-union",
    finding: "lineage-state-illegal-successor",
    file: "lib/validation.mjs",
    search: '    if (!LINEAGE_EDGES.get(before.state)?.has(after.state)) failures.push("lineage_state_edge_invalid");',
    replace: '    if (false) failures.push("lineage_state_edge_invalid");',
    test: "control receipts and lineage heads enforce closed state unions"
  },
  {
    id: "capabilities-base-bundle-schema-pin",
    finding: "capabilities-advertises-unpinned-base-bundle",
    file: "lib/schema-factory.mjs",
    search: '        operation_registry_hash: hash(), base_bundle_hash: { const: BASE_BUNDLE_HASH },',
    replace: '        operation_registry_hash: hash(), base_bundle_hash: hash(),',
    test: "capabilities response pins the exact Phase 1 surface and frozen artifact"
  },
  {
    id: "capabilities-base-bundle-runtime-pin",
    finding: "capabilities-context-base-bundle-drift",
    file: "lib/validation.mjs",
    search: '        (context.baseBundleHash !== undefined && response.base_bundle_hash !== context.baseBundleHash)) {',
    replace: '        false) {',
    test: "capabilities response pins the exact Phase 1 surface and frozen artifact"
  },
  {
    id: "execution-source-commitment-json-preflight",
    finding: "candidate-digest-omits-json-source-preflight",
    file: "lib/bundle.mjs",
    search: '  "../scripts/check-json-sources.py",\n',
    replace: '',
    expectedStage: "build",
    expectedOutput: "execution source commitment graph omits ../scripts/check-json-sources.py"
  },
  {
    id: "capabilities-base-registry-schema-pin",
    finding: "capabilities-advertises-unpinned-base-registry",
    file: "lib/schema-factory.mjs",
    search: '        base_operation_registry_hash: { const: BASE_REGISTRY_HASH },',
    replace: '        base_operation_registry_hash: hash(),',
    test: "capabilities response pins the exact Phase 1 surface and frozen artifact"
  },
  {
    id: "capabilities-base-registry-runtime-pin",
    finding: "capabilities-context-base-registry-drift",
    file: "lib/validation.mjs",
    search: '        (context.baseRegistryHash !== undefined && response.base_operation_registry_hash !== context.baseRegistryHash)) {',
    replace: '        false) {',
    test: "capabilities response pins the exact Phase 1 surface and frozen artifact"
  },
  {
    id: "lineage-active-state-commitment-recompute",
    finding: "lineage-activation-accepts-arbitrary-matching-hash",
    file: "lib/validation.mjs",
    search: '      } else if (after.next_state_commitment_hash !== lineageActiveStateCommitmentHash(after)) {',
    replace: '      } else if (false) {',
    test: "control receipts and lineage heads enforce closed state unions"
  },
  {
    id: "lineage-genesis-commitment-identity",
    finding: "lineage-genesis-rebinds-authorized-identity",
    file: "lib/validation.mjs",
    search: '          if (after[field] !== commitment[field]) failures.push("lineage_state_genesis_commitment_mismatch");',
    replace: '          if (false) failures.push("lineage_state_genesis_commitment_mismatch");',
    test: "control receipts and lineage heads enforce closed state unions"
  },
  {
    id: "lineage-genesis-commitment-resolution",
    finding: "lineage-genesis-accepts-unresolved-commitment",
    file: "lib/validation.mjs",
    search: '        failures.push("lineage_state_genesis_commitment_unresolved");',
    replace: '        return unique(failures);',
    test: "control receipts and lineage heads enforce closed state unions"
  },
  {
    id: "lineage-activation-exact-reservation",
    finding: "lineage-activation-cross-wires-reservation",
    file: "lib/validation.mjs",
    search: '    if (!exactRef(value.authority_reservation_ref, reservation, context) ||',
    replace: '    if (false ||',
    test: "gate, authorization, reservation, cancellation, and receipt branches are executable constraints"
  },
  {
    id: "reservation-binding-action-control",
    finding: "authority-reservation-rebinds-action-control",
    file: "lib/validation.mjs",
    search: '        ["principal_id", "principal_id"], ["action_control_key", "action_control_key"],',
    replace: '        ["principal_id", "principal_id"],',
    test: "gate, authorization, reservation, cancellation, and receipt branches are executable constraints"
  },
  {
    id: "inventory-offer-adoption-forbidden",
    finding: "offer-consumes-existing-obligation-inventory",
    file: "lib/schema-factory.mjs",
    search: '          capability: { enum: ["authorize_payment", "fund_escrow"] }, obligation_role: { const: "fulfill" },',
    replace: '          capability: { enum: ["submit_bindable_offer", "authorize_payment", "fund_escrow"] }, obligation_role: { enum: ["create_or_update", "fulfill"] },',
    test: "gate, authorization, reservation, cancellation, and receipt branches are executable constraints"
  },
  {
    id: "action-transition-receipt-schema",
    finding: "action-state-names-untyped-transition-receipt",
    file: "lib/schema-factory.mjs",
    search: '          { type: "object", properties: { schema: { const: "cairn.action_receipt.v0.2" } } }\n        ]',
    replace: '          { type: "object", properties: { schema: { type: "string" } } }\n        ]',
    test: "gate, authorization, reservation, cancellation, and receipt branches are executable constraints"
  },
  {
    id: "action-receipt-prior-chain-binding",
    finding: "action-receipt-skips-prior-transition",
    file: "lib/validation.mjs",
    search: '    if ((expectedPrior === null) !== (value.prior_action_receipt_ref === null) ||\n        (expectedPrior !== null && !sameObjectRef(expectedPrior, value.prior_action_receipt_ref))) {',
    replace: '    if (false) {',
    test: "gate, authorization, reservation, cancellation, and receipt branches are executable constraints"
  },
  {
    id: "lineage-active-preimage-domain",
    finding: "lineage-active-commitment-domain-separator-drifts",
    file: "lib/validation.mjs",
    search: 'export const LINEAGE_ACTIVE_PREIMAGE_TYPE = "cairn.lineage_active_state_commitment_preimage.v0.1";',
    replace: 'export const LINEAGE_ACTIVE_PREIMAGE_TYPE = "cairn.lineage_active_state_commitment_preimage.v0.2";',
    test: "control receipts and lineage heads enforce closed state unions"
  },
  {
    id: "lineage-active-preimage-field-order",
    finding: "lineage-active-commitment-field-order-drifts",
    file: "lib/validation.mjs",
    search: '    after.attempt_sequence,\n    after.commitment_generation,',
    replace: '    after.commitment_generation,\n    after.attempt_sequence,',
    test: "control receipts and lineage heads enforce closed state unions"
  },
  {
    id: "lineage-active-preimage-receipt-ref-exclusion",
    finding: "lineage-active-commitment-becomes-self-referential",
    file: "lib/validation.mjs",
    search: '    after.activation_transaction_id,\n    after.activated_action_ref,',
    replace: '    after.activation_transaction_id,\n    after.activation_receipt_ref,\n    after.activated_action_ref,',
    test: "control receipts and lineage heads enforce closed state unions"
  },
  {
    id: "lineage-activation-transition-composition",
    finding: "lineage-activation-receipt-skips-head-transition-validation",
    file: "lib/validation.mjs",
    search: '    failures.push(...validateLineageStateTransition(before, after, { ...context, lineageCommitment: commitment })\n      .map((code) => `lineage_activation_transition_${code}`));',
    replace: '    failures.push(...[]);',
    test: "control receipts and lineage heads enforce closed state unions"
  },
  {
    id: "lineage-activation-dependency-time-window",
    finding: "lineage-activation-occurs-after-authority-and-reservation-expiry",
    file: "lib/validation.mjs",
    search: '    if (!Number.isFinite(activatedAt) || dependencyStarts.some((instant) => !Number.isFinite(instant) || activatedAt < instant) ||\n        dependencyExpiries.some((instant) => !Number.isFinite(instant) || activatedAt >= instant)) {\n      failures.push("lineage_activation_dependency_time_invalid");\n    }',
    replace: '    if (false) {\n      failures.push("lineage_activation_dependency_time_invalid");\n    }',
    test: "gate, authorization, reservation, cancellation, and receipt branches are executable constraints"
  },
  {
    id: "lineage-activation-exact-authority",
    finding: "lineage-activation-cross-wires-authority",
    file: "lib/validation.mjs",
    search: '    if (!exactRef(value.actual_authority_ref, authority, context)) {\n      failures.push("lineage_activation_exact_authority_mismatch");\n    }',
    replace: '    if (false) {\n      failures.push("lineage_activation_exact_authority_mismatch");\n    }',
    test: "gate, authorization, reservation, cancellation, and receipt branches are executable constraints"
  },
  {
    id: "lineage-activation-exact-binding",
    finding: "lineage-activation-cross-wires-binding",
    file: "lib/validation.mjs",
    search: '    if (!exactRef(value.execution_binding_set_ref, binding, context)) {\n      failures.push("lineage_activation_exact_binding_mismatch");\n    }',
    replace: '    if (false) {\n      failures.push("lineage_activation_exact_binding_mismatch");\n    }',
    test: "gate, authorization, reservation, cancellation, and receipt branches are executable constraints"
  },
  {
    id: "lineage-activation-exact-action",
    finding: "lineage-activation-cross-wires-prepared-action",
    file: "lib/validation.mjs",
    search: '    if (!exactRef(value.activated_action_ref, preparedAction, context)) {\n      failures.push("lineage_activation_exact_action_mismatch");\n    }',
    replace: '    if (false) {\n      failures.push("lineage_activation_exact_action_mismatch");\n    }',
    test: "gate, authorization, reservation, cancellation, and receipt branches are executable constraints"
  },
  {
    id: "lineage-activation-supervised-branch-discriminator",
    finding: "supervised-activation-accepts-wrong-authority-family",
    file: "lib/validation.mjs",
    search: '      if (authority.schema !== "cairn.action_authorization.v0.2") failures.push("lineage_activation_authority_branch_mismatch");',
    replace: '      if (authority.schema !== "cairn.agent_mandate.v0.3") failures.push("lineage_activation_authority_branch_mismatch");',
    test: "gate, authorization, reservation, cancellation, and receipt branches are executable constraints"
  },
  {
    id: "cancellation-authorization-principal-occurrence-binding",
    finding: "cancellation-authority-signs-alien-principal-occurrence",
    file: "lib/validation.mjs",
    search: '      if (value.principal_id !== binding.principal_id || value.principal_occurrence_id !== binding.principal_occurrence_id ||',
    replace: '      if (value.principal_id !== binding.principal_id || false ||',
    test: "cancellation authority is an exact projection of one binding and one gate chain"
  },
  {
    id: "reservation-economic-predecessor-binding",
    finding: "authority-reservation-rebinds-economic-predecessor",
    file: "lib/validation.mjs",
    search: '        ["economic_resource_exposure_before_ref", "pre_reservation_resource_exposure_state_head_ref"],\n',
    replace: '',
    test: "gate, authorization, reservation, cancellation, and receipt branches are executable constraints"
  },
  {
    id: "action-get-lineage-commitment-binding",
    finding: "action-read-cross-wires-lineage-commitment",
    file: "lib/validation.mjs",
    search: '    if (!exactRef(response.current_lineage_state_head.commitment_ref, response.lineage_commitment, context) ||',
    replace: '    if (false ||',
    test: "gate, authorization, reservation, cancellation, and receipt branches are executable constraints"
  },
  {
    id: "action-get-activity-action-binding",
    finding: "action-read-cross-wires-private-activity-detail",
    file: "lib/validation.mjs",
    search: '    if (!exactRef(response.current_activity_detail.action_ref, response.action_record, context) ||',
    replace: '    if (false ||',
    test: "gate, authorization, reservation, cancellation, and receipt branches are executable constraints"
  },
  {
    id: "action-get-reservation-semantic-chain",
    finding: "action-read-cross-wires-authority-reservation",
    file: "lib/validation.mjs",
    search: '      if (!exactRef(reservation.prepared_action_ref, response.action_record, context) ||',
    replace: '      if (false ||',
    test: "gate, authorization, reservation, cancellation, and receipt branches are executable constraints"
  },
  {
    id: "action-get-action-id-binding",
    finding: "action-read-state-names-foreign-action-id",
    file: "lib/validation.mjs",
    search: '    if (response.current_action_state_head.action_id !== response.action_record.action_id) {\n      failures.push("action_get_action_id_mismatch");\n    }',
    replace: '    if (false) {\n      failures.push("action_get_action_id_mismatch");\n    }',
    test: "gate, authorization, reservation, cancellation, and receipt branches are executable constraints"
  },
  {
    id: "action-get-lineage-occurrence-binding",
    finding: "action-read-lineage-names-foreign-occurrence",
    file: "lib/validation.mjs",
    search: '      if (response.current_lineage_state_head[field] !== response.lineage_commitment[field] ||\n          response.execution_binding_set[field] !== response.lineage_commitment[field]) {',
    replace: '      if (response.execution_binding_set[field] !== response.lineage_commitment[field]) {',
    test: "gate, authorization, reservation, cancellation, and receipt branches are executable constraints"
  },
  {
    id: "action-get-activity-receipt-projection",
    finding: "activity-detail-names-unrelated-current-receipt",
    file: "lib/validation.mjs",
    search: '    if (canonicalHash(response.current_activity_detail.current_receipt_refs) !== canonicalHash(currentReceiptProjection)) {\n      failures.push("action_get_activity_receipt_projection_mismatch");\n    }',
    replace: '    if (false) {\n      failures.push("action_get_activity_receipt_projection_mismatch");\n    }',
    test: "gate, authorization, reservation, cancellation, and receipt branches are executable constraints"
  },
  {
    id: "action-get-reservation-full-validation",
    finding: "action-read-reservation-skips-fence-semantics",
    file: "lib/validation.mjs",
    search: '      failures.push(...validateAuthorityReservation(\n        reservation, response.action_record, response.execution_binding_set,\n        { ...evidenceContext, lineageCommitment: response.lineage_commitment,\n          authority: response.authority_basis }\n      ).map((code) => `action_get_reservation_${code}`));',
    replace: '      failures.push(...[]);',
    test: "gate, authorization, reservation, cancellation, and receipt branches are executable constraints"
  },
  {
    id: "action-get-lineage-stage-binding",
    finding: "reserved-action-read-carries-provisional-lineage",
    file: "lib/validation.mjs",
    search: '    if (activated === unactivatedLineageStates.has(response.current_lineage_state_head.state) ||\n        activated !== (response.current_lineage_state_head.activated_action_ref !== null)) {',
    replace: '    if (false) {',
    test: "gate, authorization, reservation, cancellation, and receipt branches are executable constraints"
  },
  {
    id: "action-get-authority-branch-binding",
    finding: "supervised-action-read-carries-wrong-authority-family",
    file: "lib/validation.mjs",
    search: '          (response.lineage_commitment.authority_kind === "supervised_pending" &&\n            response.authority_basis.schema !== "cairn.action_authorization.v0.2") ||',
    replace: '          (response.lineage_commitment.authority_kind === "supervised_pending" &&\n            response.authority_basis.schema !== "cairn.agent_mandate.v0.3") ||',
    test: "gate, authorization, reservation, cancellation, and receipt branches are executable constraints"
  },
  {
    id: "action-get-preauthority-readable",
    finding: "prepared-action-read-prematurely-requires-one-shot-authority",
    file: "lib/validation.mjs",
    search: '    if (response.authority_basis !== null) {',
    replace: '    if (true) {',
    test: "gate, authorization, reservation, cancellation, and receipt branches are executable constraints"
  },
  {
    id: "action-get-preauthorized-mandate-required",
    finding: "prepared-preauthorized-action-omits-confirmed-mandate",
    file: "lib/validation.mjs",
    search: '    if (preauthorizedPrepared) {\n      if (authorityExpected !== null || response.authority_basis?.schema !== "cairn.agent_mandate.v0.3" ||',
    replace: '    if (false) {\n      if (authorityExpected !== null || response.authority_basis?.schema !== "cairn.agent_mandate.v0.3" ||',
    test: "gate, authorization, reservation, cancellation, and receipt branches are executable constraints"
  },
  {
    id: "action-get-preauthorized-confirmation-required",
    finding: "preauthorized-action-omits-mandate-issuance-confirmation-after-preparation",
    file: "lib/validation.mjs",
    search: '        (preauthorizedAction && !issuanceConfirmationPresent)) {',
    replace: '        false) {',
    test: "gate, authorization, reservation, cancellation, and receipt branches are executable constraints"
  },
  {
    id: "action-get-lineage-activation-receipt-correspondence",
    finding: "action-and-lineage-heads-name-different-activation-receipts",
    file: "lib/validation.mjs",
    search: '    if (canonicalHash(response.current_action_state_head.lineage_activation_receipt_ref) !==\n          canonicalHash(response.current_lineage_state_head.activation_receipt_ref)) {\n      failures.push("action_get_lineage_activation_receipt_mismatch");\n    }',
    replace: '    if (false) {\n      failures.push("action_get_lineage_activation_receipt_mismatch");\n    }',
    test: "gate, authorization, reservation, cancellation, and receipt branches are executable constraints"
  },
  {
    id: "action-get-provisional-lineage-fence-binding",
    finding: "action-read-carries-provisional-head-with-wrong-commitment-fence",
    file: "lib/validation.mjs",
    search: '    if (response.current_lineage_state_head.state === "provisional" &&\n        response.current_lineage_state_head.fencing_token !== response.lineage_commitment.expected_activation_fence) {\n      failures.push("action_get_provisional_lineage_fence_mismatch");\n    }',
    replace: '    if (false) {\n      failures.push("action_get_provisional_lineage_fence_mismatch");\n    }',
    test: "gate, authorization, reservation, cancellation, and receipt branches are executable constraints"
  },
  {
    id: "mandate-canonical-business-tuple-binding",
    finding: "selected-mandate-scope-drifts-from-committed-business-tuple",
    file: "lib/validation.mjs",
    search: '  if (commitment.canonical_business_tuple_hash !== expectedBusinessTupleHash ||\n      binding.canonical_business_tuple_hash !== expectedBusinessTupleHash ||\n      binding.canonical_business_tuple_hash !== commitment.canonical_business_tuple_hash) {',
    replace: '  if (false ||\n      binding.canonical_business_tuple_hash !== expectedBusinessTupleHash ||\n      false) {',
    test: "gate, authorization, reservation, cancellation, and receipt branches are executable constraints"
  },
  {
    id: "gate-request-mandate-semantic-binding",
    finding: "standalone-gate-skips-selected-mandate-scope-closure",
    file: "lib/validation.mjs",
    search: '        failures.push(...mandateBindingFailures(authority, commitment, binding, liveContext)\n          .map((code) => `gate_request_${code}`));',
    replace: '        failures.push(...[]);',
    test: "gate, authorization, reservation, cancellation, and receipt branches are executable constraints"
  },
  {
    id: "confirmation-mandate-null-binding-branch",
    finding: "mandate-issuance-confirmation-is-rebound-to-later-action",
    file: "lib/validation.mjs",
    search: '    if ((mandateIssuance && confirmation.execution_binding_set_ref !== null) ||\n        (!mandateIssuance && !exactRef(confirmation.execution_binding_set_ref, binding, context))) {',
    replace: '    if ((mandateIssuance && !exactRef(confirmation.execution_binding_set_ref, binding, context)) ||\n        (!mandateIssuance && !exactRef(confirmation.execution_binding_set_ref, binding, context))) {',
    test: "gate, authorization, reservation, cancellation, and receipt branches are executable constraints"
  },
  {
    id: "confirmation-principal-binding",
    finding: "confirmation-receipt-names-a-foreign-principal",
    file: "lib/validation.mjs",
    search: '    if (!authority || !binding || confirmation.principal_id !== binding.principal_id ||\n        confirmation.principal_id !== authority.principal_id ||\n        !exactRef(confirmation.authority_object_ref, authority, context)) {',
    replace: '    if (!authority || !binding || false ||\n        false ||\n        !exactRef(confirmation.authority_object_ref, authority, context)) {',
    test: "gate, authorization, reservation, cancellation, and receipt branches are executable constraints"
  },
  {
    id: "confirmation-assurance-policy-binding",
    finding: "confirmation-receipt-substitutes-an-alien-assurance-policy",
    file: "lib/validation.mjs",
    search: '    if (!policy || policy.schema !== "cairn.confirmation_assurance_policy.v0.1" ||\n        validatePhase1Object(policy, context).length || !exactRef(confirmation.assurance_policy_ref, policy, context) ||\n        !sameObjectRef(confirmation.assurance_policy_ref, binding.confirmation_assurance_policy_ref) ||\n        confirmation.assurance_policy_hash !== binding.confirmation_assurance_policy_hash ||\n        !sameObjectRef(confirmation.assurance_policy_ref, authority?.required_confirmation_assurance_policy_ref)) {\n      failures.push("confirmation_assurance_policy_mismatch");\n    }',
    replace: '    if (false) {\n      failures.push("confirmation_assurance_policy_mismatch");\n    }',
    test: "gate, authorization, reservation, cancellation, and receipt branches are executable constraints"
  },
  {
    id: "confirmation-freshness-window",
    finding: "expired-confirmation-receipt-authorizes-a-current-gate",
    file: "lib/validation.mjs",
    search: '    if (!Number.isFinite(evaluationTime) || !Number.isFinite(authorityIssuedAt) || verifiedAt < authorityIssuedAt ||\n        verifiedAt > evaluationTime || evaluationTime >= expiresAt ||',
    replace: '    if (false || false || false ||\n        false || false ||',
    test: "gate, authorization, reservation, cancellation, and receipt branches are executable constraints"
  },
  {
    id: "confirmation-authority-issuance-chronology",
    finding: "confirmation-predates-the-authority-it-claims-to-confirm",
    file: "lib/validation.mjs",
    search: '    if (!Number.isFinite(evaluationTime) || !Number.isFinite(authorityIssuedAt) || verifiedAt < authorityIssuedAt ||',
    replace: '    if (!Number.isFinite(evaluationTime) || !Number.isFinite(authorityIssuedAt) || false ||',
    test: "gate, authorization, reservation, cancellation, and receipt branches are executable constraints"
  },
  {
    id: "confirmation-current-active-lifecycle",
    finding: "confirmation-uses-unresolved-or-noncurrent-policy-lifecycle-heads",
    file: "lib/validation.mjs",
    search: '    failures.push(...currentPolicyLifecycleFailures(\n      confirmation.assurance_policy_lifecycle_head_ref, confirmation.assurance_policy_ref,\n      "confirmation_assurance", evaluationTimestamp, context\n    ));\n    failures.push(...currentPolicyLifecycleFailures(\n      confirmation.verifier_profile_lifecycle_head_ref, confirmation.verifier_profile_ref,\n      "confirmation_verifier", evaluationTimestamp, context\n    ));',
    replace: '    failures.push(...[]);',
    test: "gate, authorization, reservation, cancellation, and receipt branches are executable constraints"
  },
  {
    id: "confirmation-challenge-binding",
    finding: "confirmation-receipt-replays-a-foreign-challenge",
    file: "lib/validation.mjs",
    search: '    if (confirmation.challenge_hash !== confirmationChallengeHash(authority, binding, confirmation)) {',
    replace: '    if (false) {',
    test: "gate, authorization, reservation, cancellation, and receipt branches are executable constraints"
  },
  {
    id: "action-get-mandate-semantic-binding",
    finding: "preauthorized-action-read-carries-alien-mandate-semantics",
    file: "lib/validation.mjs",
    search: '        failures.push(...mandateBindingFailures(\n          response.authority_basis, response.lineage_commitment, response.execution_binding_set, evidenceContext\n        ).map((code) => `action_get_${code}`));',
    replace: '        failures.push(...[]);',
    test: "gate, authorization, reservation, cancellation, and receipt branches are executable constraints"
  },
  {
    id: "action-get-action-lineage-state-matrix",
    finding: "live-action-read-carries-terminal-lineage",
    file: "lib/validation.mjs",
    search: '    failures.push(...actionLineageStateFailures(\n      response.current_action_state_head, response.current_lineage_state_head\n    ).map((code) => `action_get_${code}`));',
    replace: '    failures.push(...[]);',
    test: "gate, authorization, reservation, cancellation, and receipt branches are executable constraints"
  },
  {
    id: "action-get-gate-decision-state-binding",
    finding: "gate-allowed-action-read-carries-deny-result",
    file: "lib/validation.mjs",
    search: '      } else if (!exactRef(expectedGate, response.gate_result, context) || response.gate_result.decision !== "allow") {',
    replace: '      } else if (false) {',
    test: "gate, authorization, reservation, cancellation, and receipt branches are executable constraints"
  },
  {
    id: "binding-cancellation-original-action-effect",
    finding: "cancellation-binding-relabels-original-action-effect",
    file: "lib/validation.mjs",
    search: '      originalAction.effect_id !== cancellation.original_effect_id ||',
    replace: '      false ||',
    test: "cancellation authority is an exact projection of one binding and one gate chain"
  },
  {
    id: "authorization-cancellation-original-action-resolution",
    finding: "cancellation-authorization-skips-original-action-resolution",
    file: "lib/validation.mjs",
    search: '      failures.push(...cancellationOriginalActionFailures(cancellation, binding, context));',
    replace: '      failures.push(...[]);',
    test: "cancellation authority is an exact projection of one binding and one gate chain"
  },
  {
    id: "action-receipt-action-binding-chain",
    finding: "action-receipt-cross-wires-action-and-binding",
    file: "lib/validation.mjs",
    search: '    if (!action || !binding || !exactRef(action.execution_binding_set_ref, binding, context) ||\n        action.execution_binding_set_hash !== binding.binding_set_hash ||\n        value.effect_id !== action.effect_id || value.effect_id !== binding.effect_id) {',
    replace: '    if (false) {',
    test: "gate, authorization, reservation, cancellation, and receipt branches are executable constraints"
  },
  {
    id: "action-receipt-resolved-dependency-integrity",
    finding: "action-receipt-accepts-content-drift-under-a-claimed-dependency-hash",
    file: "lib/validation.mjs",
    search: '    failures.push(...validatePhase1Object(lineageStateHead, context)\n      .map((code) => `action_receipt_lineage_state_${code}`));',
    replace: '    failures.push(...[]);',
    test: "gate, authorization, reservation, cancellation, and receipt branches are executable constraints"
  },
  {
    id: "action-receipt-binding-lineage-commitment-chain",
    finding: "action-receipt-cross-wires-binding-and-action-to-different-lineage-commitments",
    file: "lib/validation.mjs",
    search: '        !exactRef(binding?.lineage_commitment_ref, lineageCommitment, context) ||\n        binding?.lineage_commitment_hash !== lineageCommitment.commitment_hash ||\n        binding?.action_proposal_hash !== lineageCommitment.action_proposal_hash ||\n        binding?.effect_id !== lineageCommitment.effect_id ||',
    replace: '        false ||\n        false ||\n        false ||\n        false ||',
    test: "gate, authorization, reservation, cancellation, and receipt branches are executable constraints"
  },
  {
    id: "action-receipt-exact-lineage-head",
    finding: "action-receipt-cross-wires-lineage-head",
    file: "lib/validation.mjs",
    search: '        !exactRef(value.lineage_state_head_ref, lineageStateHead, context) ||',
    replace: '        false ||',
    test: "gate, authorization, reservation, cancellation, and receipt branches are executable constraints"
  },
  {
    id: "action-receipt-action-id-binding",
    finding: "action-receipt-state-heads-name-foreign-action-id",
    file: "lib/validation.mjs",
    search: '    if (!action || before?.action_id !== action.action_id || after?.action_id !== action.action_id) {\n      failures.push("action_receipt_action_id_mismatch");\n    }',
    replace: '    if (false) {\n      failures.push("action_receipt_action_id_mismatch");\n    }',
    test: "gate, authorization, reservation, cancellation, and receipt branches are executable constraints"
  },
  {
    id: "action-receipt-lineage-identity-binding",
    finding: "action-receipt-lineage-head-relabels-committed-occurrence",
    file: "lib/validation.mjs",
    search: '        if (lineageStateHead[field] !== lineageCommitment[field] || binding?.[field] !== lineageCommitment[field]) {',
    replace: '        if (binding?.[field] !== lineageCommitment[field]) {',
    test: "gate, authorization, reservation, cancellation, and receipt branches are executable constraints"
  },
  {
    id: "object-get-request-ref-binding",
    finding: "specific-getter-returns-different-valid-object",
    file: "lib/validation.mjs",
    search: '    if (!schema || !sameObjectRef(request.ref, returnedRef) || !sameObjectRef(returnedRef, objectRefFor(returnedObject, schema))) {',
    replace: '    if (!schema || false || !sameObjectRef(returnedRef, objectRefFor(returnedObject, schema))) {',
    test: "read surfaces close every execution family and bind object requests to returned identity"
  },
  {
    id: "object-get-intrinsic-semantic-validation",
    finding: "exact-object-read-stops-at-shape-validation",
    file: "lib/validation.mjs",
    search: '    failures.push(...intrinsicObjectFailures(returnedObject, historicalEvidenceContext(context))\n      .map((code) => `object_read_${code}`));',
    replace: '    failures.push(...[]);',
    test: "read surfaces close every execution family and bind object requests to returned identity"
  },
  {
    id: "authorization-get-control-family",
    finding: "authorization-read-omits-control-authority-family",
    file: "lib/schema-factory.mjs",
    search: '        "cairn.cancellation_authorization.v0.1",\n        "cairn.execution_control_authorization.v0.1"',
    replace: '        "cairn.cancellation_authorization.v0.1"',
    test: "read surfaces close every execution family and bind object requests to returned identity"
  },
  {
    id: "control-get-scoped-leaf-family",
    finding: "control-read-omits-scoped-leaf-family",
    file: "lib/schema-factory.mjs",
    search: '        "cairn.execution_control_state_head.v0.1",\n        "cairn.scoped_execution_control_leaf_state_head.v0.1"',
    replace: '        "cairn.execution_control_state_head.v0.1"',
    test: "read surfaces close every execution family and bind object requests to returned identity"
  },
  {
    id: "action-get-record-closure",
    finding: "action-read-omits-record-family",
    file: "lib/schema-factory.mjs",
    search: '        action_record: executionObject("cairn.action_record.v0.2"),',
    replace: '        action_record: executionObject("cairn.execution_action_view.v0.1"),',
    test: "read surfaces close every execution family and bind object requests to returned identity"
  },
  {
    id: "action-get-embedded-ref-binding",
    finding: "action-read-cross-wires-embedded-record",
    file: "lib/validation.mjs",
    search: '        !exactRef(response.view.action_record_ref, response.action_record, context) ||',
    replace: '        false ||',
    test: "gate, authorization, reservation, cancellation, and receipt branches are executable constraints"
  },
  {
    id: "action-get-request-ref-binding",
    finding: "action-read-returns-different-view-than-requested",
    file: "lib/validation.mjs",
    search: '    if (!sameObjectRef(request.ref, response.ref) || !exactRef(response.ref, response.view, context) ||',
    replace: '    if (false || !exactRef(response.ref, response.view, context) ||',
    test: "gate, authorization, reservation, cancellation, and receipt branches are executable constraints"
  },
  {
    id: "resource-bound-request-bytes",
    finding: "request-body-exceeds-frozen-byte-limit",
    file: "lib/validation.mjs",
    search: '    return bytes <= MAX_REQUEST_BYTES ? [] : ["phase1_request_bytes_exceeded"];',
    replace: '    return [];',
    test: "resource limits are byte-based, aggregate, depth-bounded, and applied before parsing"
  },
  {
    id: "resource-bound-string-utf8",
    finding: "canonical-string-exceeds-utf8-byte-limit",
    file: "lib/validation.mjs",
    search: '      if (bytes > MAX_CANONICAL_STRING_BYTES) failures.push("canonical_string_bytes_exceeded");',
    replace: '      if (false) failures.push("canonical_string_bytes_exceeded");',
    test: "resource limits are byte-based, aggregate, depth-bounded, and applied before parsing"
  },
  {
    id: "resource-bound-uri-utf8",
    finding: "uri-exceeds-frozen-byte-limit",
    file: "lib/validation.mjs",
    search: '      if (/^[A-Za-z][A-Za-z0-9+.-]*:/.test(current.value) && bytes > MAX_URI_OR_OBJECT_REF_BYTES) {',
    replace: '      if (false) {',
    test: "resource limits are byte-based, aggregate, depth-bounded, and applied before parsing"
  },
  {
    id: "resource-bound-object-canonical-bytes",
    finding: "canonical-object-exceeds-frozen-byte-limit",
    file: "lib/validation.mjs",
    search: '  if (objectRoot && Buffer.byteLength(canonicalText(value), "utf8") > MAX_CANONICAL_OBJECT_BYTES) {',
    replace: '  if (false) {',
    test: "resource limits are byte-based, aggregate, depth-bounded, and applied before parsing"
  },
  {
    id: "resource-bound-json-depth",
    finding: "json-depth-exceeds-frozen-limit",
    file: "lib/validation.mjs",
    search: '    if (current.depth > MAX_JSON_NESTING_DEPTH) failures.push("json_nesting_depth_exceeded");',
    replace: '    if (false) failures.push("json_nesting_depth_exceeded");',
    test: "resource limits are byte-based, aggregate, depth-bounded, and applied before parsing"
  },
  {
    id: "cancellation-binding-receiver-equality",
    finding: "cancellation-authority-cross-wires-receiver",
    file: "lib/validation.mjs",
    search: '          value.receiver_id !== binding.ultimate_receiver || !sameObjectRef(value.lineage_commitment_ref, binding.lineage_commitment_ref) ||',
    replace: '          false || !sameObjectRef(value.lineage_commitment_ref, binding.lineage_commitment_ref) ||',
    test: "cancellation authority is an exact projection of one binding and one gate chain"
  },
  {
    id: "cancellation-gate-finality-binding",
    finding: "cancellation-gate-cross-wires-finality-profile",
    file: "lib/validation.mjs",
    search: '          !sameObjectRef(value.receiver_finality_profile_ref, binding.receiver_finality_profile_ref) ||\n          !sameObjectRef(value.receiver_finality_profile_ref, binding.cancellation_context?.cancellation_finality_profile_ref)) {',
    replace: '          false || false) {',
    test: "cancellation authority is an exact projection of one binding and one gate chain"
  },
  {
    id: "execution-local-core-import",
    finding: "execution-runtime-falls-back-to-parent-core-dependency-root",
    file: "lib/validation.mjs",
    search: 'import { canonicalHash, canonicalText, objectRefFor, sameObjectRef, valueAtPointer, verifyEd25519, verifyObjectBindings } from "./core.mjs";',
    replace: 'import { canonicalHash, canonicalText, objectRefFor, sameObjectRef, valueAtPointer, verifyEd25519, verifyObjectBindings } from "../../lib/core.mjs";',
    expectedStage: "build",
    expectedOutput: "Cannot find package 'canonicalize'"
  },
  {
    id: "execution-local-core-source-commitment",
    finding: "candidate-digest-omits-package-local-core",
    file: "lib/bundle.mjs",
    search: '  "../lib/core.mjs", "lib/core.mjs",\n',
    replace: '  "../lib/core.mjs",\n',
    expectedStage: "build",
    expectedOutput: "execution source commitment graph omits lib/core.mjs"
  },
  {
    id: "execution-shared-core-fixed-hash",
    finding: "package-local-core-parity-tracks-an-unfrozen-shared-core",
    file: "lib/bundle.mjs",
    search: 'export const SHARED_CORE_SHA256 = "sha-256:ec796289dfd19ad61bb7d1567bf5d517f91aa23d11ed377b24879fd1da9fc6d3";',
    replace: 'export const SHARED_CORE_SHA256 = "sha-256:fc796289dfd19ad61bb7d1567bf5d517f91aa23d11ed377b24879fd1da9fc6d3";',
    expectedStage: "build",
    expectedOutput: "execution local core differs from the fixed shared core"
  },
  {
    id: "execution-local-core-equivalence",
    finding: "package-local-core-drifts-from-frozen-shared-core",
    file: "lib/bundle.mjs",
    search: '  if (sha256(sharedCore) !== SHARED_CORE_SHA256 || !sharedCore.equals(localCore)) {',
    replace: '  if (sha256(sharedCore) !== SHARED_CORE_SHA256) {',
    auxiliaryMutation: "local-core-byte",
    test: "Phase 1 pins the fixed prose and byte-stable proposal dependencies"
  },
  {
    id: "execution-transitive-lock-closure",
    finding: "execution-lock-transitive-version-drift",
    file: "lib/bundle.mjs",
    search: '  for (const [location, locked] of Object.entries(lock.packages ?? {})) {',
    replace: '  for (const [location, locked] of []) {',
    auxiliaryMutation: "transitive-lock-version",
    test: "Phase 1 pins the fixed prose and byte-stable proposal dependencies"
  },
  {
    id: "mutation-runner-package-local-dependencies",
    finding: "mutation-isolation-borrows-parent-protocol-dependencies",
    file: "scripts/run-mutants.mjs",
    search: '    if (!lstatSync(path.join(executionRoot, "node_modules")).isDirectory()) {\n      throw new Error("protocol/execution/node_modules is required");\n    }\n    symlinkSync(path.join(executionRoot, "node_modules"), path.join(candidateExecution, "node_modules"), "dir");',
    replace: '    if (!lstatSync(path.join(protocolRoot, "node_modules")).isDirectory()) {\n      throw new Error("protocol/node_modules is required");\n    }\n    symlinkSync(path.join(protocolRoot, "node_modules"), path.join(candidateProtocol, "node_modules"), "dir");',
    test: "Phase 1 pins the fixed prose and byte-stable proposal dependencies"
  },
  {
    id: "request-envelope-protocol-pin",
    finding: "request-envelope-allows-another-protocol-version",
    file: "lib/schema-factory.mjs",
    search: '      protocol_version: { const: "0.1" },\n      profile_id: { const: PROFILE_ID },',
    replace: '      protocol_version: { type: "string" },\n      profile_id: { const: PROFILE_ID },',
    expectedStage: "build",
    expectedOutput: "request envelope is not the exact nonrecursive compatibility binding"
  },
  {
    id: "request-envelope-profile-pin",
    finding: "request-envelope-allows-another-execution-profile",
    file: "lib/schema-factory.mjs",
    search: '      profile_id: { const: PROFILE_ID },\n      base_bundle_hash: { const: BASE_BUNDLE_HASH },',
    replace: '      profile_id: { type: "string" },\n      base_bundle_hash: { const: BASE_BUNDLE_HASH },',
    expectedStage: "build",
    expectedOutput: "request envelope is not the exact nonrecursive compatibility binding"
  },
  {
    id: "request-envelope-base-bundle-pin",
    finding: "request-envelope-allows-another-proposal-foundation",
    file: "lib/schema-factory.mjs",
    search: '      base_bundle_hash: { const: BASE_BUNDLE_HASH },\n      execution_bundle_hash: hash(),',
    replace: '      base_bundle_hash: hash(),\n      execution_bundle_hash: hash(),',
    expectedStage: "build",
    expectedOutput: "request envelope is not the exact nonrecursive compatibility binding"
  },
  {
    id: "request-envelope-execution-bundle-binding",
    finding: "request-envelope-accepts-stale-execution-bundle",
    file: "lib/validation.mjs",
    search: '    if (typeof context.bundleHash !== "string" || envelope.execution_bundle_hash !== context.bundleHash) {',
    replace: '    if (typeof context.bundleHash !== "string") {',
    test: "operation envelopes and registry metadata close compatibility before dispatch"
  },
  {
    id: "request-envelope-registry-binding",
    finding: "request-envelope-accepts-stale-operation-registry",
    file: "lib/validation.mjs",
    search: '    if (typeof context.registryHash !== "string" || envelope.operation_registry_hash !== context.registryHash) {',
    replace: '    if (typeof context.registryHash !== "string") {',
    test: "operation envelopes and registry metadata close compatibility before dispatch"
  },
  {
    id: "request-envelope-operation-dispatch",
    finding: "request-envelope-allows-operation-body-cross-dispatch",
    file: "lib/schema-factory.mjs",
    search: '      operation: { const: operation.name },\n      body: { $ref: operation.request_body_schema }',
    replace: '      operation: { enum: PHASE1_OPERATIONS.map(({ name }) => name) },\n      body: { $ref: operation.request_body_schema }',
    expectedStage: "build",
    expectedOutput: "request envelope is not the exact nonrecursive compatibility binding"
  },
  {
    id: "request-envelope-body-selection",
    finding: "request-envelope-cross-wires-another-operation-body",
    file: "lib/schema-factory.mjs",
    search: '      body: { $ref: operation.request_body_schema }\n    })',
    replace: '      body: { $ref: PHASE1_OPERATIONS[0].request_body_schema }\n    })',
    expectedStage: "build",
    expectedOutput: "request envelope is not the exact nonrecursive compatibility binding"
  },
  {
    id: "request-envelope-closed",
    finding: "request-envelope-allows-undeclared-compatibility-fields",
    file: "lib/schema-factory.mjs",
    search: '      body: { $ref: operation.request_body_schema }\n    })',
    replace: '      body: { $ref: operation.request_body_schema }\n    }, undefined, { additionalProperties: true })',
    expectedStage: "build",
    expectedOutput: "request envelope is not the exact nonrecursive compatibility binding"
  },
  {
    id: "request-envelope-no-generated-hash-const",
    finding: "request-envelope-creates-a-generated-hash-fixed-point",
    file: "lib/schema-factory.mjs",
    search: '      execution_bundle_hash: hash(),\n      operation_registry_hash: hash(),',
    replace: '      execution_bundle_hash: { const: BASE_BUNDLE_HASH },\n      operation_registry_hash: hash(),',
    expectedStage: "build",
    expectedOutput: "request envelope is not the exact nonrecursive compatibility binding"
  },
  {
    id: "registry-request-schema-hash",
    finding: "registry-accepts-request-schema-location-hash-drift",
    file: "lib/bundle.mjs",
    search: '    if (operation.request_schema_hash !== schemaLocationCommitment(operation.request_schema, schemas) ||\n        operation.request_body_schema_hash !== schemaLocationCommitment(operation.request_body_schema, schemas) ||',
    replace: '    if (false ||\n        operation.request_body_schema_hash !== schemaLocationCommitment(operation.request_body_schema, schemas) ||',
    test: "operation envelopes and registry metadata close compatibility before dispatch"
  },
  {
    id: "registry-response-schema-hash",
    finding: "registry-accepts-response-schema-location-hash-drift",
    file: "lib/bundle.mjs",
    search: '        operation.response_schema_hash !== schemaLocationCommitment(operation.response_schema, schemas)) {',
    replace: '        false) {',
    test: "operation envelopes and registry metadata close compatibility before dispatch"
  },
  {
    id: "registry-schema-location-preimage",
    finding: "registry-schema-commitment-omits-location",
    file: "lib/bundle.mjs",
    search: '  return canonicalHash({ schema_uri: location, schema_node: schemaNodeAtLocation(location, schemas) });',
    replace: '  return canonicalHash(schemaNodeAtLocation(location, schemas));',
    test: "operation envelopes and registry metadata close compatibility before dispatch"
  },
  {
    id: "registry-authentication-branch",
    finding: "private-read-registry-metadata-claims-public-authentication",
    file: "lib/profile.mjs",
    search: '    authentication_branch: "principal_owner_or_exact_runtime_resource",\n    data_grant_prerequisite: "owner_bypass_or_exact_runtime_object_read_grant",',
    replace: '    authentication_branch: "public",\n    data_grant_prerequisite: "owner_bypass_or_exact_runtime_object_read_grant",',
    test: "operation envelopes and registry metadata close compatibility before dispatch"
  },
  {
    id: "registry-data-grant-prerequisite",
    finding: "private-read-registry-metadata-drops-data-grant-prerequisite",
    file: "lib/profile.mjs",
    search: '    data_grant_prerequisite: "owner_bypass_or_exact_runtime_object_read_grant",\n    caller_class: "principal_owner_or_exact_runtime"',
    replace: '    data_grant_prerequisite: "none",\n    caller_class: "principal_owner_or_exact_runtime"',
    test: "operation envelopes and registry metadata close compatibility before dispatch"
  },
  {
    id: "registry-caller-class",
    finding: "private-read-registry-metadata-widens-caller-class",
    file: "lib/profile.mjs",
    search: '    data_grant_prerequisite: "owner_bypass_or_exact_runtime_object_read_grant",\n    caller_class: "principal_owner_or_exact_runtime"',
    replace: '    data_grant_prerequisite: "owner_bypass_or_exact_runtime_object_read_grant",\n    caller_class: "public"',
    test: "operation envelopes and registry metadata close compatibility before dispatch"
  },
  {
    id: "registry-authority-prerequisite",
    finding: "schema-only-read-registry-allows-authority-prerequisite-claims",
    file: "lib/schema-factory.mjs",
    search: '    disclosure_prerequisite: { const: "none" }, authority_prerequisite: { const: "none" },',
    replace: '    disclosure_prerequisite: { const: "none" }, authority_prerequisite: { enum: ["none", "mandate"] },',
    test: "operation envelopes and registry metadata close compatibility before dispatch"
  },
  {
    id: "registry-idempotency-rule",
    finding: "schema-only-read-registry-allows-executable-idempotency-claims",
    file: "lib/schema-factory.mjs",
    search: '    idempotency_rule: { const: "not_applicable_schema_only" }, receipt_family: { const: "none" },',
    replace: '    idempotency_rule: { type: "string" }, receipt_family: { const: "none" },',
    test: "operation envelopes and registry metadata close compatibility before dispatch"
  },
  {
    id: "registry-receipt-family",
    finding: "schema-only-read-registry-allows-receipt-issuance-claims",
    file: "lib/schema-factory.mjs",
    search: '    idempotency_rule: { const: "not_applicable_schema_only" }, receipt_family: { const: "none" },',
    replace: '    idempotency_rule: { const: "not_applicable_schema_only" }, receipt_family: { type: "string" },',
    test: "operation envelopes and registry metadata close compatibility before dispatch"
  },
  {
    id: "mandate-binding-business-tuple-commitment",
    finding: "binding-relabels-mandate-business-tuple",
    file: "lib/validation.mjs",
    search: '  if (commitment.canonical_business_tuple_hash !== expectedBusinessTupleHash ||\n      binding.canonical_business_tuple_hash !== expectedBusinessTupleHash ||\n      binding.canonical_business_tuple_hash !== commitment.canonical_business_tuple_hash) {',
    replace: '  if (commitment.canonical_business_tuple_hash !== expectedBusinessTupleHash ||\n      false ||\n      false) {',
    test: "gate, authorization, reservation, cancellation, and receipt branches are executable constraints"
  },
  {
    id: "mandate-binding-intent-refs",
    finding: "mandate-intent-scope-not-carried-into-binding",
    file: "lib/validation.mjs",
    search: '  ["intent_refs", "intent_refs"],\n',
    replace: '',
    test: "gate, authorization, reservation, cancellation, and receipt branches are executable constraints"
  },
  {
    id: "mandate-binding-counterparties",
    finding: "mandate-counterparty-scope-not-carried-into-binding",
    file: "lib/validation.mjs",
    search: '  ["counterparties", "counterparties"],\n',
    replace: '',
    test: "gate, authorization, reservation, cancellation, and receipt branches are executable constraints"
  },
  {
    id: "mandate-binding-seller",
    finding: "mandate-seller-scope-not-carried-into-binding",
    file: "lib/validation.mjs",
    search: '  ["seller_id", "seller_id"],\n',
    replace: '',
    test: "gate, authorization, reservation, cancellation, and receipt branches are executable constraints"
  },
  {
    id: "mandate-binding-listings",
    finding: "mandate-listing-scope-not-carried-into-binding",
    file: "lib/validation.mjs",
    search: '  ["listing_refs", "listing_refs"],\n',
    replace: '',
    test: "gate, authorization, reservation, cancellation, and receipt branches are executable constraints"
  },
  {
    id: "mandate-binding-asset",
    finding: "mandate-asset-scope-not-carried-into-binding",
    file: "lib/validation.mjs",
    search: '  ["asset", "asset"],\n',
    replace: '',
    test: "gate, authorization, reservation, cancellation, and receipt branches are executable constraints"
  },
  {
    id: "mandate-binding-review-policy",
    finding: "mandate-review-policy-not-carried-into-binding",
    file: "lib/validation.mjs",
    search: '  ["review_policy_hash", "review_policy_hash"],\n',
    replace: '',
    test: "gate, authorization, reservation, cancellation, and receipt branches are executable constraints"
  },
  {
    id: "mandate-binding-taint-policy",
    finding: "mandate-taint-policy-not-carried-into-binding",
    file: "lib/validation.mjs",
    search: '  ["taint_policy_hash", "taint_policy_hash"]\n',
    replace: '',
    test: "gate, authorization, reservation, cancellation, and receipt branches are executable constraints"
  },
  {
    id: "lineage-activation-commitment-availability",
    finding: "activation-predates-lineage-commitment-signature",
    file: "lib/validation.mjs",
    search: '      authoritySignedAt, commitmentSignedAt, bindingCreatedAt, bindingSignedAt,\n',
    replace: '      authoritySignedAt, bindingCreatedAt, bindingSignedAt,\n',
    test: "gate, authorization, reservation, cancellation, and receipt branches are executable constraints"
  },
  {
    id: "lineage-activation-predecessor-availability",
    finding: "activation-predates-predecessor-head-update",
    file: "lib/validation.mjs",
    search: '      predecessorUpdatedAt, predecessorSignedAt\n',
    replace: '      predecessorSignedAt\n',
    test: "gate, authorization, reservation, cancellation, and receipt branches are executable constraints"
  },
  {
    id: "lineage-activation-receipt-chronology",
    finding: "activation-receipt-is-signed-before-activation",
    file: "lib/validation.mjs",
    search: '    if (!Number.isFinite(activationReceiptSignedAt) || !Number.isFinite(afterSignedAt) ||\n        activationReceiptSignedAt < activatedAt || afterSignedAt < activatedAt) {',
    replace: '    if (false) {',
    test: "gate, authorization, reservation, cancellation, and receipt branches are executable constraints"
  },
  {
    id: "gate-result-exact-request",
    finding: "gate-result-cross-wires-gate-request",
    file: "lib/validation.mjs",
    search: '    if (!gateRequest || gateRequest.schema !== "cairn.gate_request.v0.2" ||\n        validatePhase1Object(gateRequest, context).length || !exactRef(value.gate_request_ref, gateRequest, context) ||\n        value.gate_request_hash !== gateRequest.request_hash) {',
    replace: '    if (false) {',
    test: "gate, authorization, reservation, cancellation, and receipt branches are executable constraints"
  },
  {
    id: "gate-result-interval",
    finding: "gate-result-evaluates-at-or-after-expiry",
    file: "lib/validation.mjs",
    search: '    if (![requestedAt, evaluatedAt, expiresAt, requestSignedAt, resultSignedAt,\n      bindingCreatedAt, bindingSignedAt, bindingExpiresAt, authorityDeadline].every(Number.isFinite) ||\n        requestedAt > requestSignedAt || requestSignedAt > evaluatedAt ||\n        bindingCreatedAt > evaluatedAt || bindingSignedAt > evaluatedAt ||\n        evaluatedAt >= expiresAt || resultSignedAt < evaluatedAt || resultSignedAt >= expiresAt ||\n        expiresAt > authorityDeadline) {',
    replace: '    if (false) {',
    test: "gate, authorization, reservation, cancellation, and receipt branches are executable constraints"
  },
  {
    id: "redemption-validates-gate-semantics",
    finding: "redemption-accepts-semantically-invalid-gate",
    file: "lib/validation.mjs",
    search: '        validateGateResult(gateResult, { ...context, gateRequest, binding }).length ||\n',
    replace: '',
    test: "gate, authorization, reservation, cancellation, and receipt branches are executable constraints"
  },
  {
    id: "redemption-exact-action",
    finding: "redemption-cross-wires-action",
    file: "lib/validation.mjs",
    search: '    if (!action || action.schema !== "cairn.action_record.v0.2" || validateActionRecord(action, context).length ||\n        !exactRef(value.action_ref, action, context)) {',
    replace: '    if (false) {',
    test: "gate, authorization, reservation, cancellation, and receipt branches are executable constraints"
  },
  {
    id: "redemption-gate-lifetime",
    finding: "redemption-occurs-at-or-after-gate-expiry",
    file: "lib/validation.mjs",
    search: '    if (![evaluatedAt, gateExpiresAt, gateSignedAt, redeemedAt, receiptSignedAt,\n      bindingCreatedAt, bindingSignedAt, bindingExpiresAt, actionCreatedAt, actionSignedAt].every(Number.isFinite) ||\n        redeemedAt < evaluatedAt || redeemedAt >= gateExpiresAt || gateSignedAt > redeemedAt ||\n        bindingCreatedAt > redeemedAt || bindingSignedAt > redeemedAt || redeemedAt >= bindingExpiresAt ||\n        actionCreatedAt > redeemedAt || actionSignedAt > redeemedAt || receiptSignedAt < redeemedAt) {',
    replace: '    if (false) {',
    test: "gate, authorization, reservation, cancellation, and receipt branches are executable constraints"
  },
  {
    id: "redemption-evaluated-head-projection",
    finding: "redemption-rebinds-gate-evaluated-heads",
    file: "lib/validation.mjs",
    search: '    if (gateResult && canonicalHash(value.evaluated_current_head_refs) !== canonicalHash(gateResult.evaluated_head_refs)) {',
    replace: '    if (false) {',
    test: "gate, authorization, reservation, cancellation, and receipt branches are executable constraints"
  },
  {
    id: "redemption-checkout-dependency-projection",
    finding: "redemption-rebinds-checkout-dependencies",
    file: "lib/validation.mjs",
    search: '    if (!gateRequest || canonicalHash(value.checkout_dependency_refs) !== canonicalHash(gateRequest.checkout_dependency_refs)) {',
    replace: '    if (false) {',
    test: "gate, authorization, reservation, cancellation, and receipt branches are executable constraints"
  },
  {
    id: "exact-read-redemption-semantics",
    finding: "receipt-read-skips-redemption-semantic-validation",
    file: "lib/validation.mjs",
    search: '    case "cairn.execution_redemption_receipt.v0.2": return validateExecutionRedemptionReceipt(\n      object,\n      context.gateResult ?? resolveObject(context.objectResolver, object.gate_result_ref),\n      context.binding ?? context.executionBindingSet ?? resolveObject(context.objectResolver, object.execution_binding_set_ref),\n      context\n    );',
    replace: '    case "cairn.execution_redemption_receipt.v0.2": return [];',
    test: "gate, authorization, reservation, cancellation, and receipt branches are executable constraints"
  },
  {
    id: "lineage-activation-causal-order",
    finding: "activation-dependencies-are-not-causally-ordered",
    file: "lib/validation.mjs",
    search: '    if (commonCausalOrderInvalid || authorityBranchOrderInvalid) {',
    replace: '    if (false) {',
    test: "gate, authorization, reservation, cancellation, and receipt branches are executable constraints"
  },
  {
    id: "gate-result-gate-request-semantics",
    finding: "gate-result-skips-authority-and-confirmation-semantics",
    file: "lib/validation.mjs",
    search: '    if (gateRequest && binding) {\n      failures.push(...validateGateRequest(gateRequest, binding, authority, confirmation, {\n        ...evaluationContext, lineageCommitment\n      }).map((code) => `gate_result_${code}`));\n    }',
    replace: '',
    test: "gate, authorization, reservation, cancellation, and receipt branches are executable constraints"
  },
  {
    id: "gate-request-action-authorization-semantics",
    finding: "gate-request-accepts-invalid-action-authorization",
    file: "lib/validation.mjs",
    search: '      if (validateActionAuthorization(authority, binding, liveContext).length ||\n          !sameObjectRef(authority.execution_binding_set_ref, value.execution_binding_set_ref)) {',
    replace: '      if (false ||\n          !sameObjectRef(authority.execution_binding_set_ref, value.execution_binding_set_ref)) {',
    test: "gate, authorization, reservation, cancellation, and receipt branches are executable constraints"
  },
  {
    id: "registry-sensitive-head-access",
    finding: "sensitive-authority-head-read-uses-ordinary-object-grant",
    file: "lib/profile.mjs",
    search: '  read("execution.connection_authorization.get", "agent-connection-authorization.schema.json", "owner_or_exact_runtime_audit_control_grant"),',
    replace: '  read("execution.connection_authorization.get", "agent-connection-authorization.schema.json"),',
    test: "operation envelopes and registry metadata close compatibility before dispatch"
  },
  {
    id: "registry-detailed-receipt-access",
    finding: "detailed-receipt-read-uses-ordinary-object-grant",
    file: "lib/profile.mjs",
    search: '  read("execution.connection_state_event_receipt.get", "connection-state-event-receipt.schema.json", "owner_plus_audit_detail_or_exact_runtime_audit_grant"),',
    replace: '  read("execution.connection_state_event_receipt.get", "connection-state-event-receipt.schema.json"),',
    test: "operation envelopes and registry metadata close compatibility before dispatch"
  },
  {
    id: "registry-confirmation-inherited-access",
    finding: "confirmation-receipt-does-not-inherit-authority-acl",
    file: "lib/profile.mjs",
    search: '  read("execution.confirmation_receipt.get", "confirmation-receipt.schema.json", "inherited_parent_private_or_audit_acl"),',
    replace: '  read("execution.confirmation_receipt.get", "confirmation-receipt.schema.json"),',
    test: "operation envelopes and registry metadata close compatibility before dispatch"
  },
  {
    id: "connection-event-aggregate-head-resolution",
    finding: "connection-event-accepts-unresolved-aggregate-control-heads",
    file: "lib/validation.mjs",
    search: '    if (!aggregateBeforeValid || !aggregateAfterValid) failures.push("connection_aggregate_control_head_mismatch");',
    replace: '',
    test: "connection transition binds exact heads, sequence, epochs, nonce, and control basis"
  },
  {
    id: "connection-event-outstanding-head-resolution",
    finding: "connection-event-accepts-unresolved-outstanding-index-heads",
    file: "lib/validation.mjs",
    search: '    if (!indexBeforeValid || !indexAfterValid) failures.push("connection_outstanding_index_head_mismatch");',
    replace: '',
    test: "connection transition binds exact heads, sequence, epochs, nonce, and control basis"
  },
  {
    id: "connection-event-control-authorization-resolution",
    finding: "connection-event-accepts-unresolved-control-authorization",
    file: "lib/validation.mjs",
    search: '          failures.push("connection_control_authorization_mismatch");',
    replace: '',
    test: "connection transition binds exact heads, sequence, epochs, nonce, and control basis"
  },
  {
    id: "connection-event-joint-control-receipt",
    finding: "connection-event-does-not-bind-shared-control-transaction",
    file: "lib/validation.mjs",
    search: '          failures.push("connection_joint_control_receipt_mismatch");',
    replace: '',
    test: "connection transition binds exact heads, sequence, epochs, nonce, and control basis"
  },
  {
    id: "connection-event-control-leaf",
    finding: "connection-event-does-not-bind-scoped-control-leaf",
    file: "lib/validation.mjs",
    search: '            failures.push("connection_scoped_control_leaf_mismatch");',
    replace: '',
    test: "connection transition binds exact heads, sequence, epochs, nonce, and control basis"
  },
  {
    id: "connection-event-index-transition-receipt",
    finding: "connection-event-does-not-bind-index-transition-transaction",
    file: "lib/validation.mjs",
    search: '        failures.push("connection_outstanding_index_transition_receipt_mismatch");',
    replace: '',
    test: "connection transition binds exact heads, sequence, epochs, nonce, and control basis"
  },
  {
    id: "connection-event-chronology",
    finding: "connection-event-accepts-impossible-commit-chronology",
    file: "lib/validation.mjs",
    search: '      failures.push("connection_event_chronology_invalid");',
    replace: '',
    test: "connection transition binds exact heads, sequence, epochs, nonce, and control basis"
  },
  {
    id: "exact-read-connection-event-semantics",
    finding: "connection-receipt-read-skips-semantic-validation",
    file: "lib/validation.mjs",
    search: '    case "cairn.connection_state_event_receipt.v0.1": return validateConnectionEvent(\n      object,\n      context.connectionBefore ?? resolveObject(context.objectResolver, object.connection_before_head_ref),\n      context.connectionAfter ?? resolveObject(context.objectResolver, object.connection_after_head_ref),\n      context\n    );',
    replace: '    case "cairn.connection_state_event_receipt.v0.1": return [];',
    test: "connection transition binds exact heads, sequence, epochs, nonce, and control basis"
  },
  {
    id: "enumerable-map-content-addressed-kind",
    finding: "map-node-is-misrepresented-as-a-signed-object",
    file: "lib/objects.mjs",
    search: '    kind: "content-addressed-object",\n',
    replace: '    kind: "signed-object",\n',
    expectedStage: "build",
    expectedOutput: "invalid object/signature annotations"
  },
  {
    id: "registry-enumerable-map-getter",
    finding: "outstanding-map-dependency-is-not-retrievable",
    file: "lib/profile.mjs",
    search: '  read("execution.enumerable_map.get", "enumerableMapObjectResponse", "inherited_parent_private_or_audit_acl", "enumerableMapReadRequest"),\n',
    replace: '',
    test: "Phase 1 exposes only the exact read-only non-effectful registry"
  },
  {
    id: "registry-outstanding-index-getter",
    finding: "outstanding-index-head-is-not-retrievable",
    file: "lib/profile.mjs",
    search: '  read("execution.connection_outstanding_action_index.get", "connection-outstanding-action-index-state-head.schema.json", "owner_or_exact_runtime_audit_control_grant"),\n',
    replace: '',
    test: "Phase 1 exposes only the exact read-only non-effectful registry"
  },
  {
    id: "registry-outstanding-entry-getter",
    finding: "outstanding-entry-is-not-retrievable",
    file: "lib/profile.mjs",
    search: '  read("execution.connection_outstanding_action_entry.get", "connection-outstanding-action-entry.schema.json", "owner_plus_audit_detail_or_exact_runtime_audit_grant"),\n',
    replace: '',
    test: "Phase 1 exposes only the exact read-only non-effectful registry"
  },
  {
    id: "registry-outstanding-transition-getter",
    finding: "outstanding-index-transition-is-not-retrievable",
    file: "lib/profile.mjs",
    search: '  read("execution.connection_outstanding_action_index_transition_receipt.get", "connection-outstanding-action-index-transition-receipt.schema.json", "owner_plus_audit_detail_or_exact_runtime_audit_grant"),\n',
    replace: '',
    test: "Phase 1 exposes only the exact read-only non-effectful registry"
  },
  {
    id: "registry-enumerable-map-parent-acl",
    finding: "map-node-read-is-not-attributable-to-an-owning-parent",
    file: "lib/profile.mjs",
    search: '  read("execution.enumerable_map.get", "enumerableMapObjectResponse", "inherited_parent_private_or_audit_acl", "enumerableMapReadRequest"),',
    replace: '  read("execution.enumerable_map.get", "enumerableMapObjectResponse", "owner_or_exact_runtime_audit_control_grant"),',
    test: "operation envelopes and registry metadata close compatibility before dispatch"
  },
  {
    id: "outstanding-map-key-domain",
    finding: "outstanding-map-key-is-caller-selected",
    file: "lib/validation.mjs",
    search: 'export function connectionOutstandingMapKey(outstandingActionIndexKey) {\n  return canonicalHash({\n    schema: "cairn.enumerable_map_key_preimage.v0.1",',
    replace: 'export function connectionOutstandingMapKey(outstandingActionIndexKey) {\n  return canonicalHash({\n    schema: "cairn.enumerable_map_key_preimage.v0.2",',
    test: "connection outstanding maps bind exact roots, entries, transitions, and parent-authorized reads"
  },
  {
    id: "outstanding-action-key-domain",
    finding: "outstanding-action-key-is-caller-selected",
    file: "lib/validation.mjs",
    search: '    schema: "cairn.connection_outstanding_action_key_preimage.v0.1",\n',
    replace: '    schema: "cairn.connection_outstanding_action_key_preimage.v0.2",\n',
    test: "connection outstanding maps bind exact roots, entries, transitions, and parent-authorized reads"
  },
  {
    id: "outstanding-map-root-resolution",
    finding: "outstanding-index-accepts-an-unresolved-map-root",
    file: "lib/validation.mjs",
    search: '    if (!mapRoot || mapRoot.schema !== "cairn.enumerable_map_root.v0.1" ||\n        !exactRef(value.outstanding_action_map_ref, mapRoot, context)) {',
    replace: '    if (false) {',
    test: "connection outstanding maps bind exact roots, entries, transitions, and parent-authorized reads"
  },
  {
    id: "outstanding-index-map-count",
    finding: "outstanding-index-count-does-not-match-signed-map-root",
    file: "lib/validation.mjs",
    search: '          value.outstanding_action_count !== mapRoot.entry_count ||\n',
    replace: '',
    test: "connection outstanding maps bind exact roots, entries, transitions, and parent-authorized reads"
  },
  {
    id: "outstanding-index-entries-root",
    finding: "outstanding-index-root-does-not-match-signed-map-root",
    file: "lib/validation.mjs",
    search: '          value.outstanding_action_root !== mapRoot.entries_root) {',
    replace: '          false) {',
    test: "connection outstanding maps bind exact roots, entries, transitions, and parent-authorized reads"
  },
  {
    id: "enumerable-map-root-node-count",
    finding: "signed-map-root-count-does-not-match-root-node",
    file: "lib/validation.mjs",
    search: '    if (value.entry_count !== rootNode.subtree_entry_count || value.entries_root !== rootNode.entries_root ||',
    replace: '    if (false || value.entries_root !== rootNode.entries_root ||',
    test: "connection outstanding maps bind exact roots, entries, transitions, and parent-authorized reads"
  },
  {
    id: "outstanding-entry-derived-key",
    finding: "outstanding-entry-key-is-not-derived-from-its-identity",
    file: "lib/validation.mjs",
    search: '    if (value.outstanding_action_key !== connectionOutstandingActionKey(value)) {',
    replace: '    if (false) {',
    test: "connection outstanding maps bind exact roots, entries, transitions, and parent-authorized reads"
  },
  {
    id: "connection-event-outstanding-map-semantics",
    finding: "connection-event-skips-index-to-map-commitment-validation",
    file: "lib/validation.mjs",
    search: '      failures.push(...validateConnectionOutstandingIndexHead(indexAfter, {\n        ...context,\n        outstandingActionMap: indexAfterMap,\n        expectedConnectionStateId: after.connection_state_id\n      }).map((code) => `connection_after_${code}`));',
    replace: '',
    test: "connection transition binds exact heads, sequence, epochs, nonce, and control basis"
  },
  {
    id: "exact-read-outstanding-index-semantics",
    finding: "outstanding-index-getter-skips-map-validation",
    file: "lib/validation.mjs",
    search: '    case "cairn.connection_outstanding_action_index_state_head.v0.1":\n      return validateConnectionOutstandingIndexHead(object, context);',
    replace: '    case "cairn.connection_outstanding_action_index_state_head.v0.1": return [];',
    test: "connection outstanding maps bind exact roots, entries, transitions, and parent-authorized reads"
  },
  {
    id: "exact-read-outstanding-entry-semantics",
    finding: "outstanding-entry-getter-skips-derived-key-validation",
    file: "lib/validation.mjs",
    search: '    case "cairn.connection_outstanding_action_entry.v0.1":\n      return validateConnectionOutstandingActionEntry(object, context);',
    replace: '    case "cairn.connection_outstanding_action_entry.v0.1": return [];',
    test: "connection outstanding maps bind exact roots, entries, transitions, and parent-authorized reads"
  },
  {
    id: "exact-read-outstanding-transition-semantics",
    finding: "outstanding-transition-getter-skips-cause-validation",
    file: "lib/validation.mjs",
    search: '    case "cairn.connection_outstanding_action_index_transition_receipt.v0.1":\n      return validateConnectionOutstandingIndexTransitionReceipt(object, context);',
    replace: '    case "cairn.connection_outstanding_action_index_transition_receipt.v0.1": return [];',
    test: "connection outstanding maps bind exact roots, entries, transitions, and parent-authorized reads"
  },
  {
    id: "enumerable-map-read-parent-acl",
    finding: "map-read-does-not-enforce-owning-parent-acl",
    file: "lib/validation.mjs",
    search: '    if (context.parentAccessAuthorized !== true) return ["enumerable_map_read_parent_acl_denied"];',
    replace: '',
    test: "connection outstanding maps bind exact roots, entries, transitions, and parent-authorized reads"
  },
  {
    id: "outstanding-transition-reservation-union",
    finding: "reservation-transition-does-not-bind-count-entry-and-revision",
    file: "lib/validation.mjs",
    search: '        failures.push("outstanding_index_transition_reservation_union_mismatch");',
    replace: '',
    test: "connection outstanding maps bind exact roots, entries, transitions, and parent-authorized reads"
  },
  {
    id: "outstanding-transition-update-union",
    finding: "head-update-transition-does-not-bind-entry-successor",
    file: "lib/validation.mjs",
    search: '        failures.push("outstanding_index_transition_update_union_mismatch");',
    replace: '',
    test: "connection outstanding maps bind exact roots, entries, transitions, and parent-authorized reads"
  },
  {
    id: "outstanding-transition-removal-union",
    finding: "removal-transition-does-not-require-terminal-evidence",
    file: "lib/validation.mjs",
    search: '        failures.push("outstanding_index_transition_removal_union_mismatch");',
    replace: '',
    test: "connection outstanding maps bind exact roots, entries, transitions, and parent-authorized reads"
  },
  {
    id: "outstanding-transition-snapshot-union",
    finding: "restriction-snapshot-can-change-the-map",
    file: "lib/validation.mjs",
    search: '        failures.push("outstanding_index_transition_snapshot_changed_map");',
    replace: '',
    test: "connection outstanding maps bind exact roots, entries, transitions, and parent-authorized reads"
  },
  {
    id: "outstanding-transition-terminal-seal-union",
    finding: "terminal-seal-can-change-or-drain-the-map",
    file: "lib/validation.mjs",
    search: '        failures.push("outstanding_index_transition_terminal_seal_mismatch");',
    replace: '',
    test: "connection outstanding maps bind exact roots, entries, transitions, and parent-authorized reads"
  },
  {
    id: "exact-read-connection-authorization-semantics",
    finding: "connection-authorization-read-skips-runtime-and-interval-validation",
    file: "lib/validation.mjs",
    search: '    case "cairn.agent_connection_authorization.v0.1":\n      return validateConnectionAuthorization(object, context);',
    replace: '    case "cairn.agent_connection_authorization.v0.1": return [];',
    test: "mandate v0.3 keeps financial and nonfinancial authority branches disjoint"
  },
  {
    id: "exact-read-connection-state-semantics",
    finding: "connection-state-read-skips-authorization-and-current-head-validation",
    file: "lib/validation.mjs",
    search: '    case "cairn.agent_connection_state_head.v0.1":\n      return validateConnectionStateHead(object, context);',
    replace: '    case "cairn.agent_connection_state_head.v0.1": return [];',
    test: "mandate v0.3 keeps financial and nonfinancial authority branches disjoint"
  },
  {
    id: "connection-authorization-runtime-resolution",
    finding: "connection-authorization-accepts-unresolved-runtime",
    file: "lib/validation.mjs",
    search: '    if (!runtime || runtime.schema !== "cairn.agent_runtime_binding.v0.1") {\n      failures.push("connection_authorization_runtime_unresolved");',
    replace: '    if (false) {\n      failures.push("connection_authorization_runtime_unresolved");',
    test: "mandate v0.3 keeps financial and nonfinancial authority branches disjoint"
  },
  {
    id: "connection-state-current-head",
    finding: "connection-state-current-read-accepts-stale-head",
    file: "lib/validation.mjs",
    search: '    if (context.requireCurrentConnection === true &&\n        !sameObjectRef(resolveCurrentHead(context, objectRef(value, context)), objectRef(value, context))) {',
    replace: '    if (false) {',
    test: "mandate v0.3 keeps financial and nonfinancial authority branches disjoint"
  },
  {
    id: "mandate-connection-authorization-semantics",
    finding: "mandate-skips-connection-authorization-semantic-validation",
    file: "lib/validation.mjs",
    search: '        validateConnectionAuthorization(connectionAuthorization, context).length ||\n        !exactRef(value.agent.connection_authorization_ref, connectionAuthorization, context) ||',
    replace: '        !exactRef(value.agent.connection_authorization_ref, connectionAuthorization, context) ||',
    test: "mandate v0.3 keeps financial and nonfinancial authority branches disjoint"
  },
  {
    id: "gate-authoritative-dependency-projection",
    finding: "gate-request-accepts-an-unresolved-authoritative-manifest",
    file: "lib/validation.mjs",
    search: '  if (!manifest || manifest.schema !== "cairn.gate_dependency_manifest.v0.1" ||\n      !exactRef(request.dependency_manifest_ref, manifest, context) ||\n      request.dependency_manifest_hash !== manifest.manifest_hash ||\n      validateResolvedSignedObject(manifest, context).length ||\n      validateGateDependencyManifest(manifest, context).length) {\n    return ["gate_request_dependency_manifest_unresolved"];\n  }',
    replace: '  if (false) {\n    return ["gate_request_dependency_manifest_unresolved"];\n  }',
    test: "gate, authorization, reservation, cancellation, and receipt branches are executable constraints"
  },
  {
    id: "enumerable-map-leaf-resolution",
    finding: "enumerable-map-leaf-accepts-unresolved-entry",
    file: "lib/validation.mjs",
    search: '        !entryObject || entryObject.schema !== domainProfile.schema || !exactEntry ||',
    replace: '        false ||',
    test: "connection outstanding maps bind exact roots, entries, transitions, and parent-authorized reads"
  },
  {
    id: "enumerable-map-leaf-key-binding",
    finding: "enumerable-map-leaf-does-not-bind-key-to-entry",
    file: "lib/validation.mjs",
    search: '        entryObject[domainProfile.keyField] !== leaf.entry_key ||\n        !validEntry ||',
    replace: '        !validEntry ||',
    test: "connection outstanding maps bind exact roots, entries, transitions, and parent-authorized reads"
  },
  {
    id: "enumerable-map-receiver-domain",
    finding: "receiver-outstanding-map-domain-is-not-closed",
    file: "lib/validation.mjs",
    search: '      ["receiver_outstanding_stream", {\n        entryKind: "receiver_outstanding_stream",\n        schema: "cairn.receiver_outstanding_stream_entry.v0.1",\n        keyField: "outstanding_stream_key",\n        validate: validateReceiverOutstandingStreamEntry\n      }]',
    replace: '      ["receiver_outstanding_stream_disabled", {\n        entryKind: "receiver_outstanding_stream",\n        schema: "cairn.receiver_outstanding_stream_entry.v0.1",\n        keyField: "outstanding_stream_key",\n        validate: validateReceiverOutstandingStreamEntry\n      }]',
    test: "connection outstanding maps bind exact roots, entries, transitions, and parent-authorized reads"
  },
  {
    id: "external-exact-object-verifier",
    finding: "external-dependency-bypasses-release-verifier",
    file: "lib/validation.mjs",
    search: '  return typeof context.externalObjectVerifier === "function" &&\n    context.externalObjectVerifier({ reference, object, expectedSchema }) === true;',
    replace: '  return true;',
    test: "connection outstanding maps bind exact roots, entries, transitions, and parent-authorized reads"
  },
  {
    id: "receiver-outstanding-derived-key",
    finding: "receiver-entry-key-is-caller-selected",
    file: "lib/validation.mjs",
    search: '    if (value.outstanding_stream_key !== receiverOutstandingStreamKey(value)) {\n      failures.push("receiver_outstanding_entry_key_mismatch");\n    }',
    replace: '    if (false) {\n      failures.push("receiver_outstanding_entry_key_mismatch");\n    }',
    test: "connection outstanding maps bind exact roots, entries, transitions, and parent-authorized reads"
  },
  {
    id: "receiver-outstanding-slot-assignments",
    finding: "receiver-entry-does-not-close-event-and-sequence-slots",
    file: "lib/validation.mjs",
    search: '      failures.push("receiver_outstanding_entry_slot_assignment_mismatch");',
    replace: '',
    test: "connection outstanding maps bind exact roots, entries, transitions, and parent-authorized reads"
  },
  {
    id: "receiver-outstanding-trust-manifest",
    finding: "receiver-entry-does-not-close-trust-assignment-set",
    file: "lib/validation.mjs",
    search: '      failures.push("receiver_outstanding_entry_trust_manifest_mismatch");',
    replace: '',
    test: "connection outstanding maps bind exact roots, entries, transitions, and parent-authorized reads"
  },
  {
    id: "receiver-outstanding-connection-lifecycle",
    finding: "receiver-entry-accepts-impossible-connection-state",
    file: "lib/validation.mjs",
    search: '        failures.push("receiver_outstanding_entry_connection_state_mismatch");',
    replace: '',
    test: "connection outstanding maps bind exact roots, entries, transitions, and parent-authorized reads"
  },
  {
    id: "receiver-terminal-evidence-closure",
    finding: "receiver-terminal-evidence-is-not-exactly-resolved",
    file: "lib/validation.mjs",
    search: '      !exactExternalObject(reference, source, profile.schema, context, profile.hash, profile.ids)) {',
    replace: '      false) {',
    test: "connection outstanding maps bind exact roots, entries, transitions, and parent-authorized reads"
  },
  {
    id: "receiver-terminal-plan-transition-set",
    finding: "receiver-terminal-plan-omits-required-release-transitions",
    file: "lib/validation.mjs",
    search: '    if (value.expected_transition_kind_set_root !== receiverTerminalTransitionKindSetRoot(value, entry)) {\n      failures.push("receiver_terminal_plan_transition_kind_set_mismatch");\n    }',
    replace: '',
    test: "connection outstanding maps bind exact roots, entries, transitions, and parent-authorized reads"
  },
  {
    id: "receiver-transition-immutable-identity",
    finding: "receiver-transition-allows-identity-drift",
    file: "lib/validation.mjs",
    search: '        (before !== null && (immutableFields.some((field) =>\n          canonicalHash(before[field]) !== canonicalHash(after[field])) ||',
    replace: '        (before !== null && (false ||',
    test: "connection outstanding maps bind exact roots, entries, transitions, and parent-authorized reads"
  },
  {
    id: "receiver-transition-selector-scope",
    finding: "receiver-transition-skips-selector-and-scope-successors",
    file: "lib/validation.mjs",
    search: '      failures.push("receiver_outstanding_transition_selector_scope_mismatch");',
    replace: '',
    test: "connection outstanding maps bind exact roots, entries, transitions, and parent-authorized reads"
  },
  {
    id: "receiver-transition-terminal-plan",
    finding: "receiver-transition-does-not-require-exact-release-plan",
    file: "lib/validation.mjs",
    search: '          !plan || plan.schema !== "cairn.receiver_terminal_release_plan_core.v0.1" ||\n          !exactRef(value.terminal_release_plan_core_ref, plan, context) ||\n          validateReceiverTerminalReleasePlan(plan, context).length ||\n          !sameObjectRef(plan.receiver_outstanding_stream_entry_ref, value.entry_before_ref) ||\n          !sameObjectRef(plan.terminal_release_evidence_ref, value.terminal_release_evidence_ref) ||\n          plan.authority_transaction_id !== value.authority_transaction_id || plan.release_cause !== value.cause)',
    replace: '          false)',
    test: "connection outstanding maps bind exact roots, entries, transitions, and parent-authorized reads"
  },
  {
    id: "connection-update-full-action-receipt",
    finding: "connection-action-head-update-skips-full-action-receipt-validation",
    file: "lib/validation.mjs",
    search: '        validateActionReceipt(actionTransition, beforeActionState, afterActionState, actionBinding, {\n          ...context, action\n        }).length === 0;',
    replace: '        true;',
    test: "connection outstanding maps bind exact roots, entries, transitions, and parent-authorized reads"
  },
  {
    id: "receiver-terminal-completion-plan-root",
    finding: "receiver-terminal-completion-does-not-bind-plan-roots",
    file: "lib/validation.mjs",
    search: '        value.completed_transition_kind_set_root !== plan.expected_transition_kind_set_root ||',
    replace: '',
    test: "connection outstanding maps bind exact roots, entries, transitions, and parent-authorized reads"
  },
  {
    id: "exact-read-receiver-entry-semantics",
    finding: "receiver-entry-read-skips-semantic-validation",
    file: "lib/validation.mjs",
    search: '    case "cairn.receiver_outstanding_stream_entry.v0.1":\n      return validateReceiverOutstandingStreamEntry(object, context);',
    replace: '    case "cairn.receiver_outstanding_stream_entry.v0.1": return [];',
    test: "connection outstanding maps bind exact roots, entries, transitions, and parent-authorized reads"
  },
  {
    id: "exact-read-receiver-transition-semantics",
    finding: "receiver-transition-read-skips-semantic-validation",
    file: "lib/validation.mjs",
    search: '    case "cairn.receiver_outstanding_stream_transition_receipt.v0.1":\n      return validateReceiverOutstandingStreamTransitionReceipt(object, context);',
    replace: '    case "cairn.receiver_outstanding_stream_transition_receipt.v0.1": return [];',
    test: "connection outstanding maps bind exact roots, entries, transitions, and parent-authorized reads"
  },
  {
    id: "exact-read-terminal-plan-semantics",
    finding: "terminal-release-plan-read-skips-semantic-validation",
    file: "lib/validation.mjs",
    search: '    case "cairn.receiver_terminal_release_plan_core.v0.1":\n      return validateReceiverTerminalReleasePlan(object, context);',
    replace: '    case "cairn.receiver_terminal_release_plan_core.v0.1": return [];',
    test: "connection outstanding maps bind exact roots, entries, transitions, and parent-authorized reads"
  },
  {
    id: "exact-read-terminal-completion-semantics",
    finding: "terminal-release-completion-read-skips-semantic-validation",
    file: "lib/validation.mjs",
    search: '    case "cairn.receiver_terminal_release_completion_receipt.v0.1":\n      return validateReceiverTerminalReleaseCompletion(object, context);',
    replace: '    case "cairn.receiver_terminal_release_completion_receipt.v0.1": return [];',
    test: "connection outstanding maps bind exact roots, entries, transitions, and parent-authorized reads"
  },
  {
    id: "receiver-terminal-completion-identity-assignment-set",
    finding: "terminal-completion-substitutes-foreign-identity-assignment",
    file: "lib/validation.mjs",
    search: '        canonicalHash(sortedUniqueRefs(value.identity_epoch_transition_receipts.map(({ assignment_ref }) => assignment_ref))) !==\n          canonicalHash(sortedUniqueRefs([plan.event_id_slot_assignment_ref, plan.sequence_slot_assignment_ref])) ||',
    replace: '',
    test: "connection outstanding maps bind exact roots, entries, transitions, and parent-authorized reads"
  },
  {
    id: "receiver-terminal-completion-keyset-proof",
    finding: "terminal-completion-does-not-recompute-plan-receipt-keyset-commitment",
    file: "lib/validation.mjs",
    search: '        value.plan_to_receipt_keyset_equality_proof_hash !==\n          receiverTerminalPlanToReceiptKeysetEqualityHash(plan, value) ||',
    replace: '',
    test: "connection outstanding maps bind exact roots, entries, transitions, and parent-authorized reads"
  },
  {
    id: "receiver-terminal-completion-trust-assignment-set",
    finding: "terminal-trust-transitions-do-not-cover-the-planned-assignment-set",
    file: "lib/validation.mjs",
    search: '      if (transitionAssignments.length !== trustAssignmentRefs.length ||\n          canonicalHash(sortedUniqueRefs(transitionAssignments)) !== canonicalHash(sortedUniqueRefs(trustAssignmentRefs))) {\n        failures.push("receiver_terminal_completion_trust_transition_mismatch");\n      }',
    replace: '',
    test: "connection outstanding maps bind exact roots, entries, transitions, and parent-authorized reads"
  },
  {
    id: "receiver-handoff-connection-successor",
    finding: "receiver-handoff-skips-connection-entry-successor",
    file: "lib/validation.mjs",
    search: '        failures.push("receiver_outstanding_transition_connection_successor_mismatch");',
    replace: '',
    test: "connection outstanding maps bind exact roots, entries, transitions, and parent-authorized reads"
  },
  {
    id: "receiver-event-stream-successor",
    finding: "authenticated-receiver-event-skips-stream-successor",
    file: "lib/validation.mjs",
    search: '        failures.push("receiver_outstanding_transition_event_stream_successor_mismatch");',
    replace: '',
    test: "connection outstanding maps bind exact roots, entries, transitions, and parent-authorized reads"
  },
  {
    id: "exact-read-returned-signature",
    finding: "exact-read-accepts-unauthenticated-returned-bytes",
    file: "lib/validation.mjs",
    search: '    if ((schema["x-cairn-signature-pointers"] ?? []).length > 0) {\n      failures.push(...validateResolvedSignedObject(returnedObject, context)\n        .map((code) => `object_read_${code}`));\n    }',
    replace: '',
    test: "exact reads authenticate returned bytes and reject stale mutable heads"
  },
  {
    id: "exact-read-mutable-currentness",
    finding: "exact-read-returns-stale-mutable-head",
    file: "lib/validation.mjs",
    search: '    if (CURRENT_EXACT_READ_OPERATIONS.has(operationName) &&\n        !sameObjectRef(resolveCurrentHead(context, returnedRef), returnedRef)) {\n      failures.push("object_read_current_head_mismatch");\n    }',
    replace: '',
    test: "exact reads authenticate returned bytes and reject stale mutable heads"
  },
  {
    id: "exact-read-historical-authority-semantics",
    finding: "historical-read-incorrectly-requires-current-authority-policy",
    file: "lib/validation.mjs",
    search: '    failures.push(...intrinsicObjectFailures(returnedObject, historicalEvidenceContext(context))',
    replace: '    failures.push(...intrinsicObjectFailures(returnedObject, context)',
    test: "gate, authorization, reservation, cancellation, and receipt branches are executable constraints"
  },
  {
    id: "data-grant-state-operation-currentness",
    finding: "data-grant-state-get-is-not-a-current-head-read",
    file: "lib/validation.mjs",
    search: '  "execution.data_grant_state.get",',
    replace: '',
    test: "binding sets separate direct principals from connected runtimes and bind the exact release"
  },
  {
    id: "data-grant-state-base-grant-binding",
    finding: "data-grant-state-can-cross-wire-a-base-grant",
    file: "lib/validation.mjs",
    search: '        !sameObjectRef(value.data_grant_ref, objectRefFor(grant, grantSchema)) ||',
    replace: '        false ||',
    test: "binding sets separate direct principals from connected runtimes and bind the exact release"
  },
  {
    id: "data-grant-state-genesis-count",
    finding: "data-grant-state-genesis-does-not-bind-issued-read-count",
    file: "lib/validation.mjs",
    search: '          value.remaining_reads !== grant?.maximum_disclosures || value.remaining_reads < 1) {',
    replace: '          false) {',
    test: "binding sets separate direct principals from connected runtimes and bind the exact release"
  },
  {
    id: "data-grant-state-predecessor-chain",
    finding: "data-grant-state-accepts-skipped-predecessor",
    file: "lib/validation.mjs",
    search: '          value.sequence !== predecessor.sequence + 1 || value.revocation_nonce < predecessor.revocation_nonce ||',
    replace: '          false || value.revocation_nonce < predecessor.revocation_nonce ||',
    test: "binding sets separate direct principals from connected runtimes and bind the exact release"
  },
  {
    id: "data-grant-state-transition-accounting",
    finding: "data-grant-state-allows-skipped-reads-or-unversioned-control",
    file: "lib/validation.mjs",
    search: '      if ((isReadDecrement && (value.remaining_reads !== predecessor.remaining_reads - 1 ||\n          value.revocation_nonce !== predecessor.revocation_nonce)) ||\n          (isFinalRead && (predecessor.remaining_reads !== 1 || value.remaining_reads !== 0 ||\n            value.revocation_nonce !== predecessor.revocation_nonce)) ||\n          (isControlTransition && (value.remaining_reads !== predecessor.remaining_reads ||\n            value.revocation_nonce !== predecessor.revocation_nonce + 1))) {\n        failures.push("data_grant_state_transition_mismatch");\n      }',
    replace: '',
    test: "binding sets separate direct principals from connected runtimes and bind the exact release"
  },
  {
    id: "binding-data-grant-head-signature",
    finding: "binding-accepts-unauthenticated-data-grant-head",
    file: "lib/validation.mjs",
    search: '          validateResolvedSignedObject(current, context).length ||\n          validateDataGrantStateHead(current, { ...context, requireDependencySignatures: true }).length ||',
    replace: '          validateDataGrantStateHead(current, { ...context, requireDependencySignatures: true }).length ||',
    test: "binding sets separate direct principals from connected runtimes and bind the exact release"
  },
  {
    id: "binding-runtime-signature",
    finding: "binding-accepts-unauthenticated-runtime",
    file: "lib/validation.mjs",
    search: '            validateResolvedSignedObject(runtime, context).length || runtime.key_status !== "active") {',
    replace: '            runtime.key_status !== "active") {',
    test: "binding sets separate direct principals from connected runtimes and bind the exact release"
  },
  {
    id: "binding-connection-authorization-signature",
    finding: "binding-accepts-unauthenticated-connection-authorization",
    file: "lib/validation.mjs",
    search: '            validateResolvedSignedObject(authorization, context).length ||\n            validateConnectionAuthorization(authorization, { ...context, runtimeBinding: runtime }).length ||',
    replace: '            validateConnectionAuthorization(authorization, { ...context, runtimeBinding: runtime }).length ||',
    test: "binding sets separate direct principals from connected runtimes and bind the exact release"
  },
  {
    id: "binding-runtime-authorization-interval",
    finding: "binding-outlives-runtime-or-connection-authorization",
    file: "lib/validation.mjs",
    search: '        if (![createdAt, expiresAt, runtimeStartsAt, runtimeExpiresAt,\n          authorizationStartsAt, authorizationExpiresAt, connectionUpdatedAt].every(Number.isFinite) ||\n            createdAt >= expiresAt || connectionUpdatedAt > createdAt ||\n            runtimeStartsAt > createdAt || runtimeExpiresAt < expiresAt ||\n            authorizationStartsAt > createdAt || authorizationExpiresAt < expiresAt) {\n          failures.push("binding_runtime_graph_interval_mismatch");\n        }',
    replace: '',
    test: "binding sets separate direct principals from connected runtimes and bind the exact release"
  },
  {
    id: "control-receipt-head-signatures",
    finding: "control-receipt-trusts-unsigned-head-transition",
    file: "lib/validation.mjs",
    search: '        (context.requireDependencySignatures === true && validateResolvedSignedObject(after, context).length) ||',
    replace: '        false ||',
    test: "connection transition binds exact heads, sequence, epochs, nonce, and control basis"
  },
  {
    id: "control-receipt-leaf-signatures",
    finding: "control-receipt-trusts-unsigned-scoped-leaf",
    file: "lib/validation.mjs",
    search: '          (context.requireDependencySignatures === true && validateResolvedSignedObject(leafAfter, context).length) ||',
    replace: '          false ||',
    test: "connection transition binds exact heads, sequence, epochs, nonce, and control basis"
  },
  {
    id: "control-receipt-head-successor",
    finding: "control-receipt-accepts-skipped-head-sequence",
    file: "lib/validation.mjs",
    search: '        (before !== null && (after.sequence !== before.sequence + 1 ||\n          after.previous_head_hash !== before.head_hash || after.principal_id !== before.principal_id ||',
    replace: '        (before !== null && (false ||\n          after.previous_head_hash !== before.head_hash || after.principal_id !== before.principal_id ||',
    test: "connection transition binds exact heads, sequence, epochs, nonce, and control basis"
  },
  {
    id: "action-get-embedded-signatures",
    finding: "action-get-trusts-unsigned-embedded-objects",
    file: "lib/validation.mjs",
    search: '    ]) failures.push(...validateResolvedSignedObject(object, context).map((code) => `action_get_${name}_${code}`));',
    replace: '    ]) failures.push(...[]);',
    test: "gate, authorization, reservation, cancellation, and receipt branches are executable constraints"
  },
  {
    id: "action-get-current-heads",
    finding: "action-get-returns-stale-composite-heads",
    file: "lib/validation.mjs",
    search: '      if (!sameObjectRef(resolveCurrentHead(context, reference), reference)) {\n        failures.push(`action_get_current_${name}_mismatch`);\n      }',
    replace: '',
    test: "gate, authorization, reservation, cancellation, and receipt branches are executable constraints"
  },
  {
    id: "action-get-lineage-head-semantics",
    finding: "action-get-skips-current-lineage-validation",
    file: "lib/validation.mjs",
    search: '    if (validateLineageStateHead(response.current_lineage_state_head, {\n      ...context, requireDependencySignatures: true,\n      lineageCommitment: response.lineage_commitment\n    }).length) {\n      failures.push("action_get_current_lineage_state_invalid");\n    }',
    replace: '',
    test: "gate, authorization, reservation, cancellation, and receipt branches are executable constraints"
  },
  {
    id: "action-authorization-current-revocation-nonce",
    finding: "authorization-ignores-current-principal-revocation-nonce",
    file: "lib/validation.mjs",
    search: '      if (!Number.isInteger(currentPrincipalRevocationNonce) || currentPrincipalRevocationNonce < 0 ||\n          value.principal_revocation_nonce !== currentPrincipalRevocationNonce) {\n        failures.push("authorization_principal_revocation_nonce_mismatch");\n      }',
    replace: '',
    test: "gate, authorization, reservation, cancellation, and receipt branches are executable constraints"
  },
  {
    id: "action-authorization-current-reserved-judgments",
    finding: "authorization-ignores-current-reserved-judgment-set",
    file: "lib/validation.mjs",
    search: '      if (!Array.isArray(requiredReservedJudgments) ||\n          canonicalHash(value.reserved_judgments_decided) !== canonicalHash(requiredReservedJudgments)) {\n        failures.push("authorization_reserved_judgments_mismatch");\n      }',
    replace: '',
    test: "gate, authorization, reservation, cancellation, and receipt branches are executable constraints"
  },
  {
    id: "cancellation-authorization-current-revocation-nonce",
    finding: "cancellation-ignores-current-principal-revocation-nonce",
    file: "lib/validation.mjs",
    search: '      if (!Number.isInteger(currentPrincipalRevocationNonce) || currentPrincipalRevocationNonce < 0 ||\n          value.principal_revocation_nonce !== currentPrincipalRevocationNonce) {\n        failures.push("cancellation_principal_revocation_nonce_mismatch");\n      }',
    replace: '',
    test: "cancellation authority is an exact projection of one binding and one gate chain"
  },
  {
    id: "gate-result-check-order",
    finding: "gate-result-treats-ordered-check-vector-as-a-set",
    file: "lib/validation.mjs",
    search: '    if (canonicalHash(actualCodes) !== canonicalHash(expectedCodes) ||\n        canonicalHash(value.check_results) !== canonicalHash(expectedCheckResults) ||\n        value.decision !== expectedDecision) {',
    replace: '    if (canonicalHash([...actualCodes].sort()) !== canonicalHash([...expectedCodes].sort()) ||\n        canonicalHash([...value.check_results].sort((left, right) => left.code.localeCompare(right.code))) !==\n          canonicalHash([...expectedCheckResults].sort((left, right) => left.code.localeCompare(right.code))) ||\n        value.decision !== expectedDecision) {',
    test: "gate, authorization, reservation, cancellation, and receipt branches are executable constraints"
  },
  {
    id: "receiver-event-identity-transition",
    finding: "authenticated-event-skips-identity-scope-and-assignment-consumption",
    file: "lib/validation.mjs",
    search: '      if (receiverEventIdentityTransitionFailures(value.identity_epoch_transition_receipt_ref,\n        before, after, scopeBefore, scopeAfter, value.authority_transaction_id, context).length) {\n        failures.push("receiver_outstanding_transition_identity_transition_mismatch");\n      }',
    replace: '',
    test: "connection outstanding maps bind exact roots, entries, transitions, and parent-authorized reads"
  },
  {
    id: "compartment-map-domains-closed",
    finding: "compartment-state-map-domains-not-machine-representable",
    file: "lib/objects.mjs",
    search: '      ["map_domain", "enum:connection_outstanding_action|receiver_outstanding_stream|compartment_active_reservation|compartment_economic_atom|compartment_confirmed_event|scoped_execution_control"],\n      ["node_kind", "enum:empty|leaf|branch"],',
    replace: '      ["map_domain", "enum:connection_outstanding_action|receiver_outstanding_stream"],\n      ["node_kind", "enum:empty|leaf|branch"],',
    test: "compartment state heads bind definitions, typed manifests, assets, and predecessors"
  },
  {
    id: "compartment-state-definition-binding",
    finding: "compartment-state-can-detach-from-definition",
    file: "lib/validation.mjs",
    search: '      failures.push("compartment_state_definition_mismatch");',
    replace: '',
    test: "compartment state heads bind definitions, typed manifests, assets, and predecessors"
  },
  {
    id: "compartment-state-asset-binding",
    finding: "compartment-state-allows-cross-asset-ledger-values",
    file: "lib/validation.mjs",
    search: '      if (money.asset !== accountingAsset) failures.push("compartment_state_asset_mismatch");',
    replace: '',
    test: "compartment state heads bind definitions, typed manifests, assets, and predecessors"
  },
  {
    id: "compartment-state-predecessor",
    finding: "compartment-state-accepts-skipped-predecessor",
    file: "lib/validation.mjs",
    search: '          value.sequence !== predecessor.sequence + 1 || value.fencing_token < predecessor.fencing_token ||',
    replace: '          false || value.fencing_token < predecessor.fencing_token ||',
    test: "compartment state heads bind definitions, typed manifests, assets, and predecessors"
  },
  {
    id: "compartment-transition-manifest-projection",
    finding: "compartment-transition-does-not-project-head-manifests",
    file: "lib/validation.mjs",
    search: '        failures.push("compartment_transition_manifest_projection_mismatch");',
    replace: '',
    test: "compartment transitions enforce exact causes, manifests, economics, closure, and chronology"
  },
  {
    id: "compartment-transition-nonempty-cause-delta",
    finding: "compartment-hold-allows-empty-economic-delta",
    file: "lib/validation.mjs",
    search: '        failures.push("compartment_transition_cause_delta_mismatch");',
    replace: '',
    test: "compartment transitions enforce exact causes, manifests, economics, closure, and chronology"
  },
  {
    id: "compartment-transition-close-empty",
    finding: "compartment-closes-with-live-economic-state",
    file: "lib/validation.mjs",
    search: '        failures.push("compartment_transition_close_not_empty");',
    replace: '',
    test: "compartment transitions enforce exact causes, manifests, economics, closure, and chronology"
  },
  {
    id: "compartment-transition-chronology",
    finding: "compartment-transition-signature-predates-commit",
    file: "lib/validation.mjs",
    search: '      failures.push("compartment_transition_chronology_invalid");',
    replace: '',
    test: "compartment transitions enforce exact causes, manifests, economics, closure, and chronology"
  },
  {
    id: "gate-result-request-dependency-signature",
    finding: "gate-result-trusts-an-unsigned-request-dependency",
    file: "lib/validation.mjs",
    search: '    if (gateRequest && validateResolvedSignedObject(gateRequest, context).length) {\n      failures.push("gate_result_request_signature_invalid");\n    }',
    replace: '',
    test: "gate, authorization, reservation, cancellation, and receipt branches are executable constraints"
  },
  {
    id: "gate-request-binding-dependency-signature",
    finding: "gate-request-trusts-an-unsigned-binding-dependency",
    file: "lib/validation.mjs",
    search: '    if (binding && validateResolvedSignedObject(binding, liveContext).length) {\n      failures.push("gate_request_binding_signature_invalid");\n    }',
    replace: '',
    test: "gate, authorization, reservation, cancellation, and receipt branches are executable constraints"
  },
  {
    id: "gate-request-authority-dependency-signature",
    finding: "gate-request-trusts-an-unsigned-authority-dependency",
    file: "lib/validation.mjs",
    search: '    if (authority && validateResolvedSignedObject(authority, liveContext).length) {\n      failures.push("gate_request_authority_signature_invalid");\n    }',
    replace: '',
    test: "gate, authorization, reservation, cancellation, and receipt branches are executable constraints"
  },
  {
    id: "gate-request-confirmation-dependency-signature",
    finding: "gate-request-trusts-an-unsigned-confirmation-dependency",
    file: "lib/validation.mjs",
    search: '    if (confirmation && validateResolvedSignedObject(confirmation, liveContext).length) {\n      failures.push("gate_request_confirmation_signature_invalid");\n    }',
    replace: '',
    test: "gate, authorization, reservation, cancellation, and receipt branches are executable constraints"
  },
  {
    id: "binding-data-grant-principal-closure",
    finding: "binding-accepts-a-foreign-principal-data-grant",
    file: "lib/validation.mjs",
    search: '      if (!grant || grant.schema !== "cairn.data_grant.v0.1" || !grantSchema ||\n          !sameObjectRef(head.data_grant_ref, objectRefFor(grant, grantSchema)) ||\n          validateResolvedSignedObject(grant, context).length ||\n          grant.principal_id !== value.principal_id || current?.principal_id !== value.principal_id) {\n        failures.push("binding_data_grant_principal_mismatch");\n      }',
    replace: '',
    test: "binding sets separate direct principals from connected runtimes and bind the exact release"
  },
  {
    id: "binding-data-grant-runtime-recipient",
    finding: "binding-accepts-a-grant-for-another-runtime",
    file: "lib/validation.mjs",
    search: '      if (value.actor_branch === "agent_runtime" && grant &&\n          (grant.recipient !== runtimeKey ||\n           canonicalHash(grant.audience) !== canonicalHash([runtimeKey]))) {\n        failures.push("binding_data_grant_runtime_recipient_mismatch");\n      }',
    replace: '',
    test: "binding sets separate direct principals from connected runtimes and bind the exact release"
  },
  {
    id: "cancellation-current-reserved-judgments",
    finding: "cancellation-ignores-current-reserved-judgments",
    file: "lib/validation.mjs",
    search: '      } else if (new Set(requiredReservedJudgments.map(canonicalText)).size !== requiredReservedJudgments.length ||\n          canonicalHash([...requiredReservedJudgments].sort((left, right) =>\n            Buffer.compare(Buffer.from(canonicalText(left)), Buffer.from(canonicalText(right))))) !==\n            canonicalHash(requiredReservedJudgments) ||\n          canonicalHash(value.reserved_judgments_decided) !== canonicalHash(requiredReservedJudgments)) {\n        failures.push("cancellation_reserved_judgments_mismatch");\n      }',
    replace: '      }',
    test: "cancellation authority is an exact projection of one binding and one gate chain"
  },
  {
    id: "control-receipt-authorization-resolution",
    finding: "control-receipt-does-not-resolve-its-authority",
    file: "lib/validation.mjs",
    search: '        failures.push("execution_control_receipt_authorization_unresolved");',
    replace: '',
    test: "connection transition binds exact heads, sequence, epochs, nonce, and control basis"
  },
  {
    id: "control-receipt-map-binding",
    finding: "control-receipt-does-not-bind-the-committed-map-transition",
    file: "lib/validation.mjs",
    search: '      failures.push("execution_control_receipt_map_binding_mismatch");',
    replace: '',
    test: "connection transition binds exact heads, sequence, epochs, nonce, and control basis"
  },
  {
    id: "action-get-historical-authority-evidence",
    finding: "historical-action-read-requires-current-authority-state",
    file: "lib/validation.mjs",
    search: '    const evidenceContext = historicalEvidenceContext(context, response.retrieved_at);',
    replace: '    const evidenceContext = context;',
    test: "gate, authorization, reservation, cancellation, and receipt branches are executable constraints"
  },
  {
    id: "receiver-terminal-closure-consumes-event",
    finding: "authenticated-closure-releases-without-consuming-the-closing-event",
    file: "lib/validation.mjs",
    search: '    consumption: "consume_one_and_release" }],',
    replace: '    consumption: "release" }],',
    test: "connection outstanding maps bind exact roots, entries, transitions, and parent-authorized reads"
  },
  {
    id: "receiver-event-successor-entry-refs",
    finding: "receiver-event-receipt-does-not-bind-successor-assignment-refs",
    file: "lib/validation.mjs",
    search: '      !sameObjectRef(receipt.event_id_slot_assignment_after_ref, afterEntry?.event_id_slot_assignment_ref) ||\n      receipt.event_id_slot_assignment_after_hash !== afterEntry?.event_id_slot_assignment_hash ||\n      !sameObjectRef(receipt.sequence_slot_assignment_before_ref, beforeEntry?.sequence_slot_assignment_ref) ||\n      receipt.sequence_slot_assignment_before_hash !== beforeEntry?.sequence_slot_assignment_hash ||\n      !sameObjectRef(receipt.sequence_slot_assignment_after_ref, afterEntry?.sequence_slot_assignment_ref) ||\n      receipt.sequence_slot_assignment_after_hash !== afterEntry?.sequence_slot_assignment_hash) {',
    replace: '      !sameObjectRef(receipt.sequence_slot_assignment_before_ref, beforeEntry?.sequence_slot_assignment_ref) ||\n      receipt.sequence_slot_assignment_before_hash !== beforeEntry?.sequence_slot_assignment_hash) {',
    test: "connection outstanding maps bind exact roots, entries, transitions, and parent-authorized reads"
  },
  {
    id: "receiver-assignment-refs-may-advance",
    finding: "receiver-transition-falsely-freezes-assignment-successor-refs",
    file: "lib/validation.mjs",
    search: '      "outstanding_stream_key", "receiver_sequence_epoch_selector_key", "identity_scope_index_key",',
    replace: '      "outstanding_stream_key", "receiver_sequence_epoch_selector_key", "identity_scope_index_key",\n      "event_id_slot_assignment_ref", "event_id_slot_assignment_hash", "sequence_slot_assignment_ref", "sequence_slot_assignment_hash",',
    test: "connection outstanding maps bind exact roots, entries, transitions, and parent-authorized reads"
  },
  {
    id: "data-grant-expiry-boundary",
    finding: "expired-data-grant-state-rejects-the-expiry-boundary",
    file: "lib/validation.mjs",
    search: '    if (value.state === "expired" ? updatedAt < expiresAt : updatedAt >= expiresAt) {',
    replace: '    if (updatedAt >= expiresAt) {',
    test: "binding sets separate direct principals from connected runtimes and bind the exact release"
  },
  {
    id: "enumerable-map-recursive-descendants",
    finding: "enumerable-map-validation-skips-branch-descendants",
    file: "lib/validation.mjs",
    search: '      for (const child of node.branch_children) visit(child.child_node_ref, child);',
    replace: '      for (const child of node.branch_children) void child;',
    test: "compartment state heads bind definitions, typed manifests, assets, and predecessors"
  },
  {
    id: "compartment-atom-accounting-derived",
    finding: "compartment-balances-are-not-derived-from-the-atom-map",
    file: "lib/validation.mjs",
    search: '          failures.push("compartment_state_atom_accounting_mismatch", `compartment_state_atom_accounting_mismatch:${ledgerClass}`);',
    replace: '',
    test: "compartment state heads bind definitions, typed manifests, assets, and predecessors"
  },
  {
    id: "compartment-outstanding-limit",
    finding: "compartment-accepts-outstanding-exposure-above-its-limit",
    file: "lib/validation.mjs",
    search: '        failures.push("compartment_state_outstanding_limit_exceeded");',
    replace: '',
    test: "compartment state heads bind definitions, typed manifests, assets, and predecessors"
  },
  {
    id: "compartment-atom-delta-keyset",
    finding: "compartment-transition-delta-does-not-cover-the-exact-map-diff",
    file: "lib/validation.mjs",
    search: '        failures.push("compartment_transition_atom_delta_keyset_mismatch");',
    replace: '',
    test: "compartment transitions enforce exact causes, manifests, economics, closure, and chronology"
  },
  {
    id: "compartment-confirmed-event-diff",
    finding: "compartment-transition-accepts-an-unexplained-confirmed-event",
    file: "lib/validation.mjs",
    search: '        failures.push("compartment_transition_confirmed_event_diff_mismatch");',
    replace: '',
    test: "compartment transitions enforce exact causes, manifests, economics, closure, and chronology"
  },
  {
    id: "cancellation-original-action-signature",
    finding: "cancellation-trusts-unsigned-original-action",
    file: "lib/validation.mjs",
    search: '    failures.push("cancellation_original_action_signature_invalid");',
    replace: '',
    test: "cancellation authority is an exact projection of one binding and one gate chain"
  },
  {
    id: "cancellation-original-state-signature",
    finding: "cancellation-trusts-unsigned-original-state",
    file: "lib/validation.mjs",
    search: '    failures.push("cancellation_original_action_state_signature_invalid");',
    replace: '',
    test: "cancellation authority is an exact projection of one binding and one gate chain"
  },
  {
    id: "cancellation-judgment-graph-required",
    finding: "cancellation-judgments-not-derived-from-exact-graph",
    file: "lib/validation.mjs",
    search: '        failures.push("cancellation_reserved_judgment_graph_unresolved");',
    replace: '',
    test: "cancellation authority is an exact projection of one binding and one gate chain"
  },
  {
    id: "binding-data-grant-contract",
    finding: "binding-data-grant-contract-not-exact",
    file: "lib/validation.mjs",
    search: '        failures.push("binding_data_grant_scope_mismatch");',
    replace: '',
    test: "binding sets separate direct principals from connected runtimes and bind the exact release"
  },
  {
    id: "binding-data-grant-interval",
    finding: "binding-outlives-data-grant",
    file: "lib/validation.mjs",
    search: '        failures.push("binding_data_grant_interval_mismatch");',
    replace: '',
    test: "binding sets separate direct principals from connected runtimes and bind the exact release"
  },
  {
    id: "binding-data-grant-live-state",
    finding: "binding-accepts-ineligible-data-grant-state",
    file: "lib/validation.mjs",
    search: '        failures.push("binding_data_grant_state_ineligible");',
    replace: '',
    test: "binding sets separate direct principals from connected runtimes and bind the exact release"
  },
  {
    id: "gate-request-own-signature",
    finding: "gate-request-not-authenticated",
    file: "lib/validation.mjs",
    search: '      failures.push("gate_request_signature_invalid");',
    replace: '',
    test: "gate, authorization, reservation, cancellation, and receipt branches are executable constraints"
  },
  {
    id: "gate-result-own-signature",
    finding: "gate-result-not-authenticated",
    file: "lib/validation.mjs",
    search: '      failures.push("gate_result_signature_invalid");',
    replace: '',
    test: "gate, authorization, reservation, cancellation, and receipt branches are executable constraints"
  },
  {
    id: "gate-dependency-signature",
    finding: "gate-dependency-not-authenticated",
    file: "lib/validation.mjs",
    search: '      authenticationFailures.push(`gate_request_dependency_signature_invalid:${role}`);',
    replace: '',
    test: "gate, authorization, reservation, cancellation, and receipt branches are executable constraints"
  },
  {
    id: "gate-derived-check-results",
    finding: "gate-result-self-selects-check-results",
    file: "lib/validation.mjs",
    search: '    if (canonicalHash(actualCodes) !== canonicalHash(expectedCodes) ||\n        canonicalHash(value.check_results) !== canonicalHash(expectedCheckResults) ||\n        value.decision !== expectedDecision) {\n      failures.push("gate_result_check_set_mismatch");\n    }',
    replace: '',
    test: "gate, authorization, reservation, cancellation, and receipt branches are executable constraints"
  },
  {
    id: "control-receipt-map-proof",
    finding: "control-receipt-does-not-prove-map-change",
    file: "lib/validation.mjs",
    search: '      if (!proofValid) failures.push("execution_control_receipt_map_proof_mismatch");',
    replace: '',
    test: "connection transition binds exact heads, sequence, epochs, nonce, and control basis"
  },
  {
    id: "control-receipt-target",
    finding: "control-receipt-does-not-bind-target",
    file: "lib/validation.mjs",
    search: '          failures.push("execution_control_receipt_target_mismatch");',
    replace: '',
    test: "connection transition binds exact heads, sequence, epochs, nonce, and control basis"
  },
  {
    id: "control-receipt-epoch-nonce",
    finding: "control-receipt-ignores-expected-epoch-nonce",
    file: "lib/validation.mjs",
    search: '          failures.push("execution_control_receipt_epoch_nonce_mismatch");',
    replace: '',
    test: "connection transition binds exact heads, sequence, epochs, nonce, and control basis"
  },
  {
    id: "control-receipt-connection-dependency",
    finding: "joint-control-receipt-skips-connection-dependency",
    file: "lib/validation.mjs",
    search: '        failures.push("execution_control_receipt_connection_dependency_invalid");',
    replace: '',
    test: "connection transition binds exact heads, sequence, epochs, nonce, and control basis"
  },
  {
    id: "control-receipt-outstanding-dependency",
    finding: "joint-control-receipt-skips-outstanding-index",
    file: "lib/validation.mjs",
    search: '        failures.push("execution_control_receipt_outstanding_dependency_invalid");',
    replace: '',
    test: "connection transition binds exact heads, sequence, epochs, nonce, and control basis"
  },
  {
    id: "compartment-reservation-atom-closure",
    finding: "active-reservations-not-closed-over-held-atoms",
    file: "lib/validation.mjs",
    search: '      if (reservationClosureMismatch) {\n        failures.push("compartment_state_reservation_atom_closure_mismatch");\n      }',
    replace: '',
    test: "compartment state heads bind definitions, typed manifests, assets, and predecessors"
  },
  {
    id: "receiver-terminal-single-identity-transition",
    finding: "terminal-release-allows-split-identity-transitions",
    file: "lib/validation.mjs",
    search: '    if (identityTransitionRefs.length !== 1 ||\n        !sameObjectRef(identityTransitionRefs[0], receiverTransition.identity_epoch_transition_receipt_ref)) {\n      failures.push("receiver_terminal_completion_identity_transition_atomicity_mismatch");\n    }',
    replace: '',
    test: "connection outstanding maps bind exact roots, entries, transitions, and parent-authorized reads"
  },
  {
    id: "receiver-event-draining-assigned-epoch",
    finding: "late-event-rejects-valid-draining-epoch",
    file: "lib/validation.mjs",
    search: '      : assignedEpoch < scopeBefore?.accepting_index_epoch &&\n        scopeBefore?.accepting_index_epoch === scopeAfter?.accepting_index_epoch &&\n        assignedEpochBefore.state === "draining" &&',
    replace: '      : false &&',
    test: "connection outstanding maps bind exact roots, entries, transitions, and parent-authorized reads"
  },
  {
    id: "gate-manifest-binding",
    finding: "gate-manifest-detaches-from-authority-graph",
    file: "lib/validation.mjs",
    search: '    failures.push("gate_request_dependency_manifest_binding_mismatch");',
    replace: '',
    test: "gate, authorization, reservation, cancellation, and receipt branches are executable constraints"
  },
  {
    id: "gate-dependency-source-signature",
    finding: "gate-wrapper-launders-an-unsigned-source-attestation",
    file: "lib/validation.mjs",
    search: '      failures.push("gate_dependency_attestation_signature_invalid");',
    replace: '',
    test: "gate, authorization, reservation, cancellation, and receipt branches are executable constraints"
  },
  {
    id: "gate-dependency-active-genesis",
    finding: "gate-dependency-allows-revoked-genesis",
    file: "lib/validation.mjs",
    search: '        (value.sequence === 0 && value.state !== "active") ||',
    replace: '',
    test: "gate, authorization, reservation, cancellation, and receipt branches are executable constraints"
  },
  {
    id: "gate-dependency-subject-continuity",
    finding: "gate-dependency-successor-switches-subject",
    file: "lib/validation.mjs",
    search: '          !source || !sameObjectRef(predecessorSource.subject_ref, source.subject_ref) ||',
    replace: '          !source ||',
    test: "gate, authorization, reservation, cancellation, and receipt branches are executable constraints"
  },
  {
    id: "phase1-gate-allow-remains-unavailable",
    finding: "phase1-partial-gate-authorizes-execution",
    file: "lib/validation.mjs",
    search: '    if (value.decision === "allow") failures.push("phase1_gate_allow_unsupported");',
    replace: '',
    test: "gate, authorization, reservation, cancellation, and receipt branches are executable constraints"
  },
  {
    id: "phase1-redemption-remains-unavailable",
    finding: "phase1-partial-redemption-authorizes-execution",
    file: "lib/validation.mjs",
    search: '    failures.push("phase1_redemption_unsupported");',
    replace: '',
    test: "gate, authorization, reservation, cancellation, and receipt branches are executable constraints"
  },
  {
    id: "gate-role-evidence-required",
    finding: "missing-gate-role-treated-as-pass",
    file: "lib/validation.mjs",
    search: '    return Boolean(state) && state.authenticationFailures.length === 0 && state.eligible;',
    replace: '    return !state || (state.authenticationFailures.length === 0 && state.eligible);',
    test: "gate, authorization, reservation, cancellation, and receipt branches are executable constraints"
  },
  {
    id: "phase1-unimplemented-reserved-judgments-deny",
    finding: "caller-supplied-judgment-wrapper-passes-an-unimplemented-check",
    file: "lib/validation.mjs",
    search: '    "BUSINESS_DEPENDENCIES", "REVIEWS_POLICIES", "RESERVED_JUDGMENTS", "LIMITS",',
    replace: '    "BUSINESS_DEPENDENCIES", "REVIEWS_POLICIES", "LIMITS",',
    test: "gate, authorization, reservation, cancellation, and receipt branches are executable constraints"
  },
  {
    id: "cancellation-original-state-current",
    finding: "cancellation-targets-stale-original-state",
    file: "lib/validation.mjs",
    search: '    failures.push("cancellation_original_action_state_not_current");',
    replace: '',
    test: "cancellation authority is an exact projection of one binding and one gate chain"
  },
  {
    id: "gate-source-issued-before-evaluation",
    finding: "post-evaluation-attestation-backfills-gate",
    file: "lib/validation.mjs",
    search: '        (Number.isFinite(evaluationAt) && Date.parse(value.issued_at) > evaluationAt)) {',
    replace: '        false) {',
    test: "gate, authorization, reservation, cancellation, and receipt branches are executable constraints"
  },
  {
    id: "gate-wrapper-updated-before-evaluation",
    finding: "post-evaluation-wrapper-backfills-gate",
    file: "lib/validation.mjs",
    search: '        (Number.isFinite(evaluationAt) && Date.parse(value.updated_at) > evaluationAt)) {',
    replace: '        false) {',
    test: "gate, authorization, reservation, cancellation, and receipt branches are executable constraints"
  },
  {
    id: "gate-dependency-signature-evaluation-time",
    finding: "post-evaluation-signature-authenticates-gate-dependency",
    file: "lib/validation.mjs",
    search: '    now: Number.isFinite(evaluationAt) ? new Date(evaluationAt).toISOString().replace(".000Z", "Z") : context.now,',
    replace: '    now: context.now,',
    test: "gate, authorization, reservation, cancellation, and receipt branches are executable constraints"
  },
  {
    id: "current-head-resolver-receives-evaluation-time",
    finding: "current-head-resolver-uses-wall-clock-instead-of-gate-time",
    file: "lib/validation.mjs",
    search: '  if (typeof context.currentHeadResolver === "function") return context.currentHeadResolver(reference, evaluationTime);',
    replace: '  if (typeof context.currentHeadResolver === "function") return context.currentHeadResolver(reference);',
    test: "gate, authorization, reservation, cancellation, and receipt branches are executable constraints"
  },
  {
    id: "data-grant-final-read-shortcut-unavailable",
    finding: "inline-disclosure-revives-exhausted-data-grant",
    file: "lib/validation.mjs",
    search: '      if (!current || current.state !== "active" || current.remaining_reads <= 0) {',
    replace: '      if (!current || (current.state !== "active" && current.state !== "exhausted") || current.remaining_reads < 0) {',
    test: "binding sets separate direct principals from connected runtimes and bind the exact release"
  },
  {
    id: "phase1-recovery-control-unavailable",
    finding: "partial-recovery-graph-authorizes-control",
    file: "lib/validation.mjs",
    search: '    if (recovery.every((item) => item !== null)) {\n      failures.push("phase1_recovery_control_unsupported");\n    }',
    replace: '',
    test: "execution controls close global, scoped genesis, recovery, and namespace rotation edges"
  },
  {
    id: "scoped-control-key-derived",
    finding: "scoped-control-key-aliases-different-target",
    file: "lib/validation.mjs",
    search: '      failures.push("scoped_control_leaf_key_mismatch");',
    replace: '',
    test: "execution controls close global, scoped genesis, recovery, and namespace rotation edges"
  },
  {
    id: "global-pause-increments-epoch",
    finding: "global-pause-reuses-epoch",
    file: "lib/validation.mjs",
    search: '    ["pause", beforeState === "active" && afterState === "paused" &&\n      afterPauseEpoch === beforePauseEpoch + 1 && afterNonce === beforeNonce],',
    replace: '    ["pause", beforeState === "active" && afterState === "paused" &&\n      afterPauseEpoch === beforePauseEpoch && afterNonce === beforeNonce],',
    test: "execution controls close global, scoped genesis, recovery, and namespace rotation edges"
  },
  {
    id: "scoped-control-preserves-global-tuple",
    finding: "scoped-control-smuggles-global-transition",
    file: "lib/validation.mjs",
    search: '        failures.push("execution_control_receipt_scoped_global_tuple_mismatch");',
    replace: '',
    test: "execution controls close global, scoped genesis, recovery, and namespace rotation edges"
  },
  {
    id: "namespace-rotation-exact-predecessor",
    finding: "namespace-rotation-skips-generation",
    file: "lib/validation.mjs",
    search: '          failures.push("execution_control_receipt_namespace_rotation_invalid");',
    replace: '',
    test: "execution controls close global, scoped genesis, recovery, and namespace rotation edges"
  },
  {
    id: "ordinary-scoped-control-has-no-outstanding-index",
    finding: "ordinary-scoped-control-imports-connection-authority",
    file: "lib/schema-factory.mjs",
    search: '          ...nonNullProperties([...authorization, ...before, ...after, ...leafAfter]),\n          ...nullProperties([...namespace, ...priorNamespace, ...connection, ...outstanding])',
    replace: '          ...nonNullProperties([...authorization, ...before, ...after, ...leafAfter, ...outstanding]),\n          ...nullProperties([...namespace, ...priorNamespace, ...connection])',
    test: "execution controls close global, scoped genesis, recovery, and namespace rotation edges"
  },
  {
    id: "namespace-genesis-has-no-prior",
    finding: "namespace-genesis-imports-prior-authority",
    file: "lib/schema-factory.mjs",
    search: '      then: { properties: nullProperties(["prior_namespace_ref", "prior_revoked_head_ref"]) },',
    replace: '      then: {},',
    test: "execution controls close global, scoped genesis, recovery, and namespace rotation edges"
  },
  {
    id: "reservation-provenance-immutable",
    finding: "reservation-index-rewrites-authority-provenance",
    file: "lib/validation.mjs",
    search: '          failures.push("compartment_transition_reservation_provenance_mismatch");',
    replace: '',
    test: "compartment transitions enforce exact causes, manifests, economics, closure, and chronology"
  },
  {
    id: "reservation-change-has-economic-cause",
    finding: "reservation-index-changes-without-atom-delta",
    file: "lib/validation.mjs",
    search: '          failures.push("compartment_transition_reservation_change_unexplained");',
    replace: '',
    test: "compartment transitions enforce exact causes, manifests, economics, closure, and chronology"
  },
  {
    id: "confirmed-event-correlates-exact-components",
    finding: "confirmed-event-does-not-match-atom-components",
    file: "lib/validation.mjs",
    search: '          failures.push("compartment_transition_confirmed_event_correlation_mismatch");',
    replace: '',
    test: "compartment transitions enforce exact causes, manifests, economics, closure, and chronology"
  },
  {
    id: "confirmed-event-component-root-domain",
    finding: "confirmed-event-component-root-is-not-domain-separated",
    file: "lib/validation.mjs",
    search: '    schema: "cairn.confirmed_economic_event_component_set_preimage.v0.1",',
    replace: '    schema: "cairn.confirmed_economic_event_component_set_preimage.v0.0",',
    test: "compartment transitions enforce exact causes, manifests, economics, closure, and chronology"
  }
];
