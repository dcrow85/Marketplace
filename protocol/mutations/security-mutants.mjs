export const SECURITY_MUTANTS = [
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
    search: "export function acceptEnvelopeOperation(envelope, context = {}, resultRef = null) {\n  try {\n    const transport = validateEnvelopeTransportUnsafe(envelope, context);",
    replace: "export function acceptEnvelopeOperation(envelope, context = {}, resultRef = null) {\n  try {\n    const transport = { failures: [] };",
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
  }
];
