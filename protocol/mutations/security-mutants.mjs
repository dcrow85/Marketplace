export const SECURITY_MUTANTS = [
  {
    id: "minimum-kernel-bundle-pin",
    finding: "minimum-kernel-release-boundary",
    file: "minimum-trust-kernel.json",
    jsonPointer: "/foundation_bundle_hash",
    value: "sha-256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    expectedStage: "kernel",
    expectedOutput: "minimum kernel foundation bundle hash differs"
  },
  {
    id: "minimum-kernel-operation-surface",
    finding: "minimum-kernel-release-boundary",
    file: "minimum-trust-kernel.json",
    jsonPointer: "/included_operations/9",
    value: "action.execute",
    expectedStage: "kernel",
    expectedOutput: "minimum kernel operation surface differs"
  },
  {
    id: "minimum-kernel-mutation-boundary",
    finding: "minimum-kernel-release-boundary",
    file: "minimum-trust-kernel.json",
    jsonPointer: "/allowed_local_mutations/1/authority_effect",
    value: "records_execution_authority",
    expectedStage: "kernel",
    expectedOutput: "minimum kernel allowed mutation boundary differs"
  },
  {
    id: "minimum-kernel-execution-exclusion",
    finding: "minimum-kernel-release-boundary",
    file: "minimum-trust-kernel.json",
    jsonPointer: "/excluded_profiles/0",
    value: "cairn-supervised-execution-v0.2",
    expectedStage: "kernel",
    expectedOutput: "minimum kernel excluded profiles differ"
  },
  {
    id: "total-signed-object-boundary",
    finding: "validators-total-fail-closed",
    file: "lib/validation.mjs",
    search: '  } catch {\n    return ["signed_object_malformed"];\n  }\n}',
    replace: '  } catch {\n    throw new Error("mutant escaped validation boundary");\n  }\n}',
    test: "all exported validation boundaries return stable failures for malformed input"
  },
  {
    id: "total-runtime-binding-boundary",
    finding: "validators-total-fail-closed",
    file: "lib/validation.mjs",
    search: '  } catch {\n    return ["runtime_binding_malformed"];\n  }\n}',
    replace: '  } catch {\n    throw new Error("mutant escaped runtime boundary");\n  }\n}',
    test: "all exported validation boundaries return stable failures for malformed input"
  },
  {
    id: "total-data-grant-boundary",
    finding: "validators-total-fail-closed",
    file: "lib/validation.mjs",
    search: '  } catch {\n    return ["data_grant_malformed"];\n  }\n}',
    replace: '  } catch {\n    throw new Error("mutant escaped grant boundary");\n  }\n}',
    test: "all exported validation boundaries return stable failures for malformed input"
  },
  {
    id: "total-envelope-boundary",
    finding: "validators-total-fail-closed",
    file: "lib/validation.mjs",
    search: '  } catch {\n    return ["envelope_operation_malformed"];\n  }\n}',
    replace: '  } catch {\n    throw new Error("mutant escaped envelope boundary");\n  }\n}',
    test: "all exported validation boundaries return stable failures for malformed input"
  },
  {
    id: "total-continuation-boundary",
    finding: "validators-total-fail-closed",
    file: "lib/validation.mjs",
    search: '  } catch {\n    return ["continuation_binding_malformed"];\n  }\n}',
    replace: '  } catch {\n    throw new Error("mutant escaped continuation boundary");\n  }\n}',
    test: "all exported validation boundaries return stable failures for malformed input"
  },
  {
    id: "total-proposal-effect-boundary",
    finding: "validators-total-fail-closed",
    file: "lib/validation.mjs",
    search: 'export function validateProposalEffectBinding(proposal, descriptor) {\n  try {\n    return validateProposalEffectBindingUnsafe(proposal, descriptor);\n  } catch {\n    return ["proposal_effect_input_malformed"];\n  }\n}',
    replace: 'export function validateProposalEffectBinding(proposal, descriptor) {\n  try {\n    return validateProposalEffectBindingUnsafe(proposal, descriptor);\n  } catch {\n    throw new Error("mutant escaped proposal/effect boundary");\n  }\n}',
    test: "all exported validation boundaries return stable failures for malformed input"
  },
  {
    id: "total-resolved-response-boundary",
    finding: "validators-total-fail-closed",
    file: "lib/validation.mjs",
    search: '  } catch {\n    return ["resolved_response_malformed"];\n  }\n}',
    replace: '  } catch {\n    throw new Error("mutant escaped resolution boundary");\n  }\n}',
    test: "all exported validation boundaries return stable failures for malformed input"
  },
  {
    id: "total-preparation-boundary",
    finding: "validators-total-fail-closed",
    file: "lib/validation.mjs",
    search: 'export function validatePreparationReceipt(receipt, context = {}) {\n  try {\n    return validatePreparationReceiptUnsafe(receipt, context);\n  } catch {\n    return ["preparation_input_malformed"];\n  }\n}',
    replace: 'export function validatePreparationReceipt(receipt, context = {}) {\n  try {\n    return validatePreparationReceiptUnsafe(receipt, context);\n  } catch {\n    throw new Error("mutant escaped preparation boundary");\n  }\n}',
    test: "all exported validation boundaries return stable failures for malformed input"
  },
  {
    id: "total-capabilities-boundary",
    finding: "validators-total-fail-closed",
    file: "lib/validation.mjs",
    search: '  } catch {\n    return ["capabilities_response_malformed"];\n  }\n}',
    replace: '  } catch {\n    throw new Error("mutant escaped capabilities boundary");\n  }\n}',
    test: "all exported validation boundaries return stable failures for malformed input"
  },
  {
    id: "idempotency-prior-record-type",
    finding: "typed-idempotency-record",
    file: "lib/validation.mjs",
    search: "        if (!idempotencyRecordIsValid(prior, context)) {",
    replace: "        if (false) {",
    test: "idempotency records are typed and replay precedes changed new-work state"
  },
  {
    id: "idempotency-result-reference",
    finding: "typed-idempotency-record",
    file: "lib/validation.mjs",
    search: "      if (!idempotencyRecordIsValid(record, context)) {",
    replace: "      if (false) {",
    test: "idempotency records are typed and replay precedes changed new-work state"
  },
  {
    id: "idempotency-replay-before-new-work",
    finding: "idempotency-replay-order",
    file: "lib/validation.mjs",
    search: "      if (prior !== undefined) {",
    replace: "      if (false && prior !== undefined) {",
    test: "idempotency records are typed and replay precedes changed new-work state"
  },
  {
    id: "idempotency-fresh-transport",
    finding: "idempotency-replay-order",
    file: "lib/validation.mjs",
    search: "export function acceptEnvelopeOperation(envelope, context = {}, resultRef = null, preflight = null) {\n  try {\n    const transport = validateEnvelopeTransportUnsafe(envelope, context);",
    replace: "export function acceptEnvelopeOperation(envelope, context = {}, resultRef = null, preflight = null) {\n  try {\n    const transport = { failures: [] };",
    test: "idempotency records are typed and replay precedes changed new-work state"
  },
  {
    id: "idempotency-tuple-key-encoding",
    finding: "idempotency-namespace-confusion",
    file: "lib/validation.mjs",
    search: "  return canonicalText([authorityNamespace, idempotencyKey]);",
    replace: "  return `${authorityNamespace}|${idempotencyKey}`;",
    test: "idempotency state keys preserve the exact namespace and key tuple"
  },
  {
    id: "capabilities-schema-exact-slot",
    finding: "exact-capabilities-surface",
    file: "schemas/operation-bodies.schema.json",
    jsonPointer: "/$defs/capabilitiesResponse/properties/operations/prefixItems/0",
    value: { type: "string" },
    test: "capabilities response pins the exact operation surface and bundle"
  },
  {
    id: "capabilities-registry-cross-check",
    finding: "exact-capabilities-surface",
    file: "lib/validation.mjs",
    search: "    if (!operations || !canonicalEqual(response.operations, operations)) return [\"capabilities_operation_surface_mismatch\"];",
    replace: "    if (!operations) return [\"capabilities_operation_surface_mismatch\"];",
    test: "capabilities response pins the exact operation surface and bundle"
  },
  {
    id: "capabilities-bundle-cross-check",
    finding: "exact-capabilities-surface",
    file: "lib/validation.mjs",
    search: "    if (!context.bundleHash || response.bundle_hash !== context.bundleHash) return [\"capabilities_bundle_hash_mismatch\"];",
    replace: "    if (!context.bundleHash) return [\"capabilities_bundle_hash_mismatch\"];",
    test: "capabilities response pins the exact operation surface and bundle"
  },
  {
    id: "grant-field-path-schema-nonempty",
    finding: "nonempty-disclosure-scope",
    file: "schemas/data-grant.schema.json",
    jsonPointer: "/properties/resource_scopes/items/properties/field_paths/minItems",
    value: 0,
    test: "DataGrant schema rejects empty field scopes and audiences"
  },
  {
    id: "grant-audience-schema-nonempty",
    finding: "nonempty-disclosure-scope",
    file: "schemas/data-grant.schema.json",
    jsonPointer: "/properties/audience/minItems",
    value: 0,
    test: "DataGrant schema rejects empty field scopes and audiences"
  },
  {
    id: "grant-field-path-semantic-nonempty",
    finding: "nonempty-disclosure-scope",
    file: "lib/validation.mjs",
    search: "else if (grant.resource_scopes.some((scope) => !Array.isArray(scope?.field_paths) || scope.field_paths.length === 0)) {",
    replace: "else if (false) {",
    test: "DataGrant validator rejects empty field scopes and audiences"
  },
  {
    id: "grant-audience-semantic-nonempty",
    finding: "nonempty-disclosure-scope",
    file: "lib/validation.mjs",
    search: "grant.audience.length === 0",
    replace: "false",
    test: "DataGrant validator rejects empty field scopes and audiences"
  },
  {
    id: "annotation-recursive-freeze",
    finding: "deep-annotation-immutability",
    file: "lib/foundation-profile.mjs",
    search: "  for (const member of Object.values(value)) deepFreeze(member);",
    replace: "  // mutation control: nested values are no longer frozen",
    test: "foundation annotation profile is recursively immutable"
  },
  {
    id: "continuation-state-schema",
    finding: "continuation-contract-alignment",
    file: "lib/validation.mjs",
    search: "    if (!stateValidate || !stateValidate(reservation)) {",
    replace: "    if (false) {",
    test: "continuation reservation state has one closed vocabulary and exact graph bindings"
  },
  {
    id: "continuation-bundle-ref",
    finding: "continuation-contract-alignment",
    file: "lib/validation.mjs",
    search: "    if (!sameObjectRef(exactBundleRef, authorization.bundle_ref)) failures.push(\"bundle_ref_mismatch\");",
    replace: "    if (false) failures.push(\"bundle_ref_mismatch\");",
    test: "continuation reservation state has one closed vocabulary and exact graph bindings"
  },
  {
    id: "continuation-state-grant-graph",
    finding: "continuation-contract-alignment",
    file: "lib/validation.mjs",
    search: "    if (!canonicalEqual(sortedRefs(reservation.data_grant_refs), sortedRefs(authorization.data_grant_refs))) failures.push(\"disclosure_grant_graph_mismatch\");",
    replace: "    if (false) failures.push(\"disclosure_grant_graph_mismatch\");",
    test: "continuation reservation state has one closed vocabulary and exact graph bindings"
  },
  {
    id: "resolved-key-exact-utc",
    finding: "strict-resolver-timestamps",
    file: "lib/validation.mjs",
    search: 'function isProtocolTimestamp(value) {\n  if (typeof value !== "string") return false;\n  const match = PROTOCOL_TIMESTAMP.exec(value);\n  if (!match) return false;\n  const parsed = instant(value);\n  if (!Number.isFinite(parsed)) return false;\n  const date = new Date(parsed);\n  return date.getUTCFullYear() === Number(match[1]) &&\n    date.getUTCMonth() + 1 === Number(match[2]) &&\n    date.getUTCDate() === Number(match[3]) &&\n    date.getUTCHours() === Number(match[4]) &&\n    date.getUTCMinutes() === Number(match[5]) &&\n    date.getUTCSeconds() === Number(match[6]);\n}',
    replace: 'function isProtocolTimestamp(value) {\n  return Number.isFinite(instant(value));\n}',
    test: "resolved key timestamps require the exact protocol UTC representation"
  },
  {
    id: "signed-object-exact-utc-schema",
    finding: "strict-object-timestamps",
    file: "schemas/common.schema.json",
    jsonPointer: "/$defs/timestamp/pattern",
    value: "Z$",
    test: "signed-object timestamps require the exact RFC 3339 UTC separator"
  },
  {
    id: "write-object-non-authorizing",
    finding: "write-object-normative-semantics",
    file: "lib/foundation-profile.mjs",
    search: '    authority_effect: "records_principal_signed_intent_only",\n    action_authority: false',
    replace: '    authority_effect: "records_principal_signed_intent_only",\n    action_authority: true',
    expectedStage: "build",
    expectedOutput: "write_object must store only the principal-signed foundation intent"
  },
  {
    id: "nonmutating-idempotency-null-sentinel",
    finding: "nonmutating-envelope-admission",
    file: "lib/validation.mjs",
    search: "  const priorRecord = idempotencyStateKey === null\n    ? undefined\n    : context.idempotencyRecords?.get(idempotencyStateKey);",
    replace: "  const priorRecord = idempotencyStateKey && context.idempotencyRecords?.get(idempotencyStateKey);",
    test: "runtime_binding.get resolves only the registered ref at its exact URI",
    testFile: "tests/reference-service.test.mjs"
  },
  {
    id: "grant-exact-runtime-recipient",
    finding: "exact-runtime-grant-binding",
    file: "lib/validation.mjs",
    search: "        recipient: envelope.sender.runtime_key_id ?? envelope.sender.actor_id,",
    replace: "        recipient: envelope.sender.actor_id,",
    test: "envelope grants and idempotency fingerprints bind the exact runtime, not only its provider"
  },
  {
    id: "fingerprint-exact-runtime",
    finding: "exact-runtime-idempotency-binding",
    file: "lib/validation.mjs",
    search: "    sender_runtime_key_id: envelope.sender.runtime_key_id,\n",
    replace: "",
    test: "envelope grants and idempotency fingerprints bind the exact runtime, not only its provider"
  },
  {
    id: "private-read-direct-principal",
    finding: "provider-runtime-collapse",
    file: "lib/validation.mjs",
    search: "    if (envelope.principal_id !== null && envelope.sender?.actor_id !== envelope.principal_id) {",
    replace: "    if (operation.mutating && envelope.sender?.actor_id !== envelope.principal_id) {",
    test: "a provider cannot drop the runtime key and reuse a provider-wide private-read grant",
    testFile: "tests/reference-service.test.mjs"
  },
  {
    id: "idempotency-result-factory-lazy",
    finding: "replay-new-work-side-effect",
    file: "lib/validation.mjs",
    search: "export function acceptEnvelopeOperation(envelope, context = {}, resultRef = null, preflight = null) {\n  try {",
    replace: "export function acceptEnvelopeOperation(envelope, context = {}, resultRef = null, preflight = null) {\n  try {\n    if (typeof resultRef === \"function\") resultRef();",
    test: "same-fingerprint retry returns the original result instead of accepting new work"
  },
  {
    id: "operation-preflight-before-result",
    finding: "service-preflight-order",
    file: "lib/validation.mjs",
    search: "      if (preflightFailures.length) return { accepted: false, failures: unique(preflightFailures) };",
    replace: "      if (false) return { accepted: false, failures: unique(preflightFailures) };",
    test: "operation preflight runs after validation but before result creation"
  },
  {
    id: "result-provider-unavailable-status",
    finding: "server-failure-classification",
    file: "lib/validation.mjs",
    search: "        return { accepted: false, failures: [\"operation_result_unavailable\"] };",
    replace: "        return { accepted: false, failures: [\"envelope_acceptance_malformed\"] };",
    test: "a preparation factory failure rolls the transaction back closed",
    testFile: "tests/reference-service.test.mjs"
  },
  {
    id: "service-operation-allowlist",
    finding: "consequential-operation-exposure",
    file: "reference-service/service.mjs",
    search: "    if (!operation) return failure(400, \"operation_unknown\");",
    replace: "    if (!operation) return { ok: true, status: 202, body: {}, replayed: false };",
    test: "unknown and consequential operation names fail before any state or factory work",
    testFile: "tests/reference-service.test.mjs"
  },
  {
    id: "service-auth-principal",
    finding: "authenticated-identity-binding",
    file: "reference-service/service.mjs",
    search: "      authentication.principalId !== envelope?.principal_id ||",
    replace: "      false ||",
    test: "authentication and validation failures leave nonce, idempotency, and result state untouched",
    testFile: "tests/reference-service.test.mjs"
  },
  {
    id: "service-auth-actor",
    finding: "authenticated-identity-binding",
    file: "reference-service/service.mjs",
    search: "      authentication.actorId !== envelope?.sender?.actor_id",
    replace: "      false",
    test: "authentication and validation failures leave nonce, idempotency, and result state untouched",
    testFile: "tests/reference-service.test.mjs"
  },
  {
    id: "service-auth-authority-namespace",
    finding: "authenticated-authority-namespace",
    file: "reference-service/service.mjs",
    search: "    if (operation.mutating && (typeof authentication.authorityNamespace !== \"string\" || authentication.authorityNamespace.length === 0)) {",
    replace: "    if (false) {",
    test: "authentication and validation failures leave nonce, idempotency, and result state untouched",
    testFile: "tests/reference-service.test.mjs"
  },
  {
    id: "service-key-resolver-unavailable-status",
    finding: "signing-key-http-status-classification",
    file: "reference-service/service.mjs",
    search: "  if (failures.some((code) => /(?:^|_)signing_key_(unknown|record_invalid|record_incomplete|id_mismatch|type_mismatch|controller_missing|status_invalid|validity_invalid|history_incomplete)$/.test(code))) return 503;",
    replace: "  if (false) return 503;",
    test: "signing-key failures distinguish resolver faults from denied authority",
    testFile: "tests/reference-service.test.mjs"
  },
  {
    id: "service-key-authority-denied-status",
    finding: "signing-key-http-status-classification",
    file: "reference-service/service.mjs",
    search: "  if (failures.some((code) => /(?:^|_)signing_key_(inactive|revoked|not_current|not_valid_at_signature|revoked_at_signature)$/.test(code))) return 403;",
    replace: "  if (false) return 403;",
    test: "signing-key failures distinguish resolver faults from denied authority",
    testFile: "tests/reference-service.test.mjs"
  },
  {
    id: "service-preparation-no-effect",
    finding: "proposal-only-boundary",
    file: "reference-service/service.mjs",
    search: "      external_effect: false,",
    replace: "      external_effect: true,",
    test: "action.prepare creates only a draft action and an explicit no-effect receipt",
    testFile: "tests/reference-service.test.mjs"
  },
  {
    id: "service-replay-branch",
    finding: "idempotent-replay-purity",
    file: "reference-service/service.mjs",
    search: "        if (operation.mutating && admission.replayed) {",
    replace: "        if (false && operation.mutating && admission.replayed) {",
    test: "fresh-envelope replay returns the original result before changed new-work state",
    testFile: "tests/reference-service.test.mjs"
  },
  {
    id: "service-grant-consumption",
    finding: "disclosure-counter-enforcement",
    file: "reference-service/service.mjs",
    search: "    state.remaining_disclosures -= 1;",
    replace: "    state.remaining_disclosures -= 0;",
    test: "grant disclosures are consumed once per successful new operation and never on replay",
    testFile: "tests/reference-service.test.mjs"
  },
  {
    id: "service-grant-replay-charge",
    finding: "replay-disclosure-charge",
    file: "reference-service/service.mjs",
    search: "        if (operation.mutating && admission.replayed) {\n          const resultAccess",
    replace: "        if (operation.mutating && admission.replayed) {\n          for (const ref of envelope.authorization_refs) draft.grantStatesByRef.get(objectRefKey(ref)).remaining_disclosures -= 1;\n          const resultAccess",
    test: "fresh-envelope replay returns the original result before changed new-work state",
    testFile: "tests/reference-service.test.mjs"
  },
  {
    id: "service-private-read-owner",
    finding: "private-object-authority",
    file: "reference-service/service.mjs",
    search: "  return access?.visibility === \"private\" && access.principal_id === envelope.principal_id\n    ? null\n    : \"object_not_found\";",
    replace: "  return access?.visibility === \"private\"\n    ? null\n    : \"object_not_found\";",
    test: "private object ownership defeats a self-signed cross-principal read grant",
    testFile: "tests/reference-service.test.mjs"
  },
  {
    id: "service-preparation-owner",
    finding: "proposal-resource-authority",
    file: "reference-service/service.mjs",
    search: "    if (access?.visibility !== \"public\" && !(access?.visibility === \"private\" && access.principal_id === envelope.principal_id)) {",
    replace: "    if (access?.visibility !== \"public\" && access?.visibility !== \"private\") {",
    test: "service access preflight runs before IDs or signatures",
    testFile: "tests/reference-service.test.mjs"
  },
  {
    id: "service-stored-uri-binding",
    finding: "resolved-uri-binding",
    file: "reference-service/service.mjs",
    search: "  if (!object || uri !== body.retrieval_uri) return failure(404, \"object_not_found\");",
    replace: "  if (!object) return failure(404, \"object_not_found\");",
    test: "runtime_binding.get resolves only the registered ref at its exact URI",
    testFile: "tests/reference-service.test.mjs"
  },
  {
    id: "service-resolved-object-binding",
    finding: "resolved-ref-content-binding",
    file: "reference-service/service.mjs",
    search: "  if (bindingFailures.length) return failure(statusForFailures(bindingFailures), \"resolved_object_invalid\", bindingFailures);",
    replace: "  if (false) return failure(statusForFailures(bindingFailures), \"resolved_object_invalid\", bindingFailures);",
    test: "runtime_binding.get resolves only the registered ref at its exact URI",
    testFile: "tests/reference-service.test.mjs"
  },
  {
    id: "service-response-schema-binding",
    finding: "operation-response-type-binding",
    file: "reference-service/service.mjs",
    search: "  if (!responseSchema || responseSchema[\"x-cairn-object-schema\"] !== object.schema) {",
    replace: "  if (false) {",
    test: "response types remain operation-specific even under corrupted access metadata",
    testFile: "tests/reference-service.test.mjs"
  },
  {
    id: "service-replay-ref-content-binding",
    finding: "replay-result-integrity",
    file: "reference-service/service.mjs",
    search: "          const object = resolvedStoredObject(admission.result_ref, draft, context, { allowExpired: true });",
    replace: "          const object = draft.objectsByRef.get(objectRefKey(admission.result_ref));",
    test: "replay fails closed when its stored exact result binding is corrupt",
    testFile: "tests/reference-service.test.mjs"
  },
  {
    id: "service-replay-operation-binding",
    finding: "replay-operation-integrity",
    file: "reference-service/service.mjs",
    search: "              action.idempotency_key !== envelope.idempotency_key ||",
    replace: "              false ||",
    test: "replay result remains bound to the original operation after idempotency-state corruption",
    testFile: "tests/reference-service.test.mjs"
  },
  {
    id: "service-response-defensive-copy",
    finding: "returned-state-aliasing",
    file: "reference-service/service.mjs",
    search: "  return { ok: true, status, body: structuredClone(body), replayed };",
    replace: "  return { ok: true, status, body, replayed };",
    test: "returned bodies cannot alias committed in-memory state",
    testFile: "tests/reference-service.test.mjs"
  },
  {
    id: "service-registry-snapshot",
    finding: "mutable-policy-injection",
    file: "reference-service/service.mjs",
    search: "  const registry = trustedFoundation.registry;",
    replace: "  const registry = foundation.registry;",
    test: "reference service advertises the exact proposal-only ten-operation surface",
    testFile: "tests/reference-service.test.mjs"
  },
  {
    id: "service-ajv-snapshot",
    finding: "mutable-validator-injection",
    file: "reference-service/service.mjs",
    search: "  const ajv = trustedFoundation.ajv;",
    replace: "  const ajv = foundation.ajv;",
    test: "reference service advertises the exact proposal-only ten-operation surface",
    testFile: "tests/reference-service.test.mjs"
  },
  {
    id: "service-no-store-exposure",
    finding: "unadvertised-direct-mutation-surface",
    file: "reference-service/service.mjs",
    search: "    registry,\n    capabilities,",
    replace: "    registry,\n    stores,\n    capabilities,",
    test: "reference service advertises the exact proposal-only ten-operation surface",
    testFile: "tests/reference-service.test.mjs"
  },
  {
    id: "service-signer-exact-draft",
    finding: "signer-draft-tampering",
    file: "reference-service/service.mjs",
    search: "  if (canonicalText(expected) !== canonicalText(signed)) {",
    replace: "  if (false) {",
    test: "the injected signer may sign but cannot rewrite the service draft",
    testFile: "tests/reference-service.test.mjs"
  },
  {
    id: "service-seeder-insert-only",
    finding: "grant-state-resurrection",
    file: "reference-service/service.mjs",
    search: "      if (draft.objectsByRef.has(key) || draft.grantStatesByRef.has(key)) {",
    replace: "      if (false) {",
    test: "trusted seeding is insert-only and cannot resurrect a consumed grant",
    testFile: "tests/reference-service.test.mjs"
  },
  {
    id: "service-runtime-binding-fork",
    finding: "runtime-identity-index-fork",
    file: "reference-service/service.mjs",
    search: "      if (!sameObjectRef(existingRef, ref)) throw new TypeError(\"runtime binding identity fork rejected\");",
    replace: "      if (false) throw new TypeError(\"runtime binding identity fork rejected\");",
    test: "trusted seeding is insert-only and cannot resurrect a consumed grant",
    testFile: "tests/reference-service.test.mjs"
  },
  {
    id: "service-object-identity-fork",
    finding: "generated-identity-fork",
    file: "reference-service/service.mjs",
    search: "  if (priorRefKey !== undefined && priorRefKey !== key) {",
    replace: "  if (false) {",
    test: "service-generated object identities cannot fork across new operations",
    testFile: "tests/reference-service.test.mjs"
  },
  {
    id: "service-proposal-graph-binding",
    finding: "preparation-input-persistence",
    file: "reference-service/service.mjs",
    search: "            envelope.body,\n            objectUri(staged.action.action_proposal_ref),",
    replace: "            staged.action,\n            objectUri(staged.action.action_proposal_ref),",
    test: "action.prepare creates only a draft action and an explicit no-effect receipt",
    testFile: "tests/reference-service.test.mjs"
  },
  {
    id: "memory-transaction-rollback",
    finding: "transaction-rollback",
    file: "reference-service/state.mjs",
    search: "      if (outcome?.commit !== false) {",
    replace: "      if (true) {",
    test: "memory transactions roll back every map and nonce when commit is false",
    testFile: "tests/reference-service.test.mjs"
  },
  {
    id: "memory-transaction-value-isolation",
    finding: "transaction-shallow-alias",
    file: "reference-service/state.mjs",
    search: "  return new Map([...source].map(([key, value]) => [key, structuredClone(value)]));",
    replace: "  return new Map(source);",
    test: "memory transactions roll back every map and nonce when commit is false",
    testFile: "tests/reference-service.test.mjs"
  },
  {
    id: "service-signed-capabilities",
    finding: "advertised-operation-completeness",
    file: "reference-service/service.mjs",
    search: "        if (operation.name === \"capabilities.get\") {",
    replace: "        if (false) {",
    test: "reference service advertises the exact proposal-only ten-operation surface",
    testFile: "tests/reference-service.test.mjs"
  },
  {
    id: "http-route-conjunction",
    finding: "transport-route-boundary",
    file: "reference-service/http.mjs",
    search: "    if (request.method !== \"POST\" || url.pathname !== \"/cairn/0.1/messages\") {",
    replace: "    if (request.method !== \"POST\" && url.pathname !== \"/cairn/0.1/messages\") {",
    test: "HTTP facade keeps capabilities public and enforces route, media, version, and idempotency boundaries",
    testFile: "tests/reference-service.test.mjs"
  },
  {
    id: "http-exact-json-media-type",
    finding: "transport-media-type-boundary",
    file: "reference-service/http.mjs",
    search: "    if (mediaType(request) !== \"application/json\") {",
    replace: "    if (!mediaType(request).startsWith(\"application/json\")) {",
    test: "HTTP facade keeps capabilities public and enforces route, media, version, and idempotency boundaries",
    testFile: "tests/reference-service.test.mjs"
  },
  {
    id: "http-version-required",
    finding: "transport-version-boundary",
    file: "reference-service/http.mjs",
    search: "    if (request.headers[\"cairn-protocol-version\"] !== \"0.1\") {",
    replace: "    if (false) {",
    test: "HTTP facade keeps capabilities public and enforces route, media, version, and idempotency boundaries",
    testFile: "tests/reference-service.test.mjs"
  },
  {
    id: "http-idempotency-header-binding",
    finding: "transport-idempotency-boundary",
    file: "reference-service/http.mjs",
    search: "    if (operation?.mutating && request.headers[\"idempotency-key\"] !== envelope.idempotency_key) {",
    replace: "    if (false) {",
    test: "HTTP facade keeps capabilities public and enforces route, media, version, and idempotency boundaries",
    testFile: "tests/reference-service.test.mjs"
  },
  {
    id: "http-body-limit",
    finding: "transport-body-limit",
    file: "reference-service/http.mjs",
    search: "    if (size > maximumBytes) {",
    replace: "    if (false) {",
    test: "HTTP body limits and authentication errors fail before service dispatch",
    testFile: "tests/reference-service.test.mjs"
  },
  {
    id: "http-duplicate-member-rejection",
    finding: "runtime-ijson-duplicate-members",
    file: "reference-service/http.mjs",
    search: "  rejectDuplicateMembers(text);",
    replace: "  // duplicate members accepted by mutant",
    test: "HTTP facade keeps capabilities public and enforces route, media, version, and idempotency boundaries",
    testFile: "tests/reference-service.test.mjs"
  },
  {
    id: "http-fatal-utf8",
    finding: "runtime-ijson-utf8",
    file: "reference-service/http.mjs",
    search: "  const text = new TextDecoder(\"utf-8\", { fatal: true }).decode(Buffer.concat(chunks));",
    replace: "  const text = new TextDecoder(\"utf-8\").decode(Buffer.concat(chunks));",
    test: "HTTP facade keeps capabilities public and enforces route, media, version, and idempotency boundaries",
    testFile: "tests/reference-service.test.mjs"
  },
  {
    id: "historical-signature-key-state",
    finding: "historical-proof-verifiability",
    file: "lib/validation.mjs",
    search: "      historicalKeyProof === true ? signature.signed_at : null",
    replace: "      null",
    test: "historical receipts survive later key revocation while new signatures fail",
    testFile: "tests/reference-service.test.mjs"
  },
  {
    id: "historical-signature-key-status-enum",
    finding: "historical-proof-key-status-vocabulary",
    file: "lib/validation.mjs",
    search: "  if (key.status !== \"active\" && key.status !== \"revoked\") failures.push(\"signing_key_status_invalid\");",
    replace: "  // unknown key status accepted by mutant",
    test: "historical receipt verification rejects unknown signing-key status values",
    testFile: "tests/reference-service.test.mjs"
  },
  {
    id: "historical-object-expiry",
    finding: "historical-proof-lifecycle-separation",
    file: "lib/validation.mjs",
    search: "    historicalObjectLifecycle !== true &&",
    replace: "    historicalKeyProof !== true &&",
    test: "historical key verification does not revive an expired private object",
    testFile: "tests/reference-service.test.mjs"
  },
  {
    id: "active-intent-revision-identity",
    finding: "intent-revision-family-identity",
    file: "reference-service/service.mjs",
    search: "  if (object.schema === \"cairn.active_intent.v0.1\") identity.push(object.revision);",
    replace: "  // revision omitted by mutant",
    test: "intent identity permits signed revisions but rejects a fork at one revision",
    testFile: "tests/reference-service.test.mjs"
  }
];
