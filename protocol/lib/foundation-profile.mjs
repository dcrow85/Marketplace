function deepFreeze(value) {
  if (value === null || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const member of Object.values(value)) deepFreeze(member);
  return Object.freeze(value);
}

export const FOUNDATION_OPERATIONS = deepFreeze([
  ["capabilities.get", false, "public_read", "emptyRequest", "capabilitiesResponse", false, "none", null, null, "none"],
  ["runtime_binding.get", false, "public_read", "objectRefRequest", "agent-runtime-binding.schema.json", false, "none", null, null, "none"],
  ["intent.put", true, "private_state_write", "active-intent.schema.json", "storedObjectResponse", true, "principal_signature_and_data_grant", "intent_storage", "write_object", "records_principal_signed_intent_only"],
  ["intent.get", false, "private_read", "objectRefRequest", "active-intent.schema.json", true, "data_grant", "intent_read", "read_local", "none"],
  ["data_grant.get", false, "private_read", "objectRefRequest", "data-grant.schema.json", true, "data_grant", "grant_read", "read_local", "none"],
  ["projection.get", false, "private_read", "objectRefRequest", "scoped-projection.schema.json", true, "data_grant", "projection_read", "read_local", "none"],
  ["object.resolve", false, "private_read", "objectRefRequest", "resolvedObjectResponse", true, "data_grant", "object_resolution", "read_local", "none"],
  ["action.prepare", true, "preparation_only", "action-proposal.schema.json", "action-preparation-receipt.schema.json", true, "data_grant_and_signed_proposal", "action_preparation", "derive", "none"],
  ["action.get", false, "private_read", "objectRefRequest", "action-record.schema.json", true, "data_grant", "action_read", "read_local", "none"],
  ["receipt.get", false, "private_read", "objectRefRequest", "action-preparation-receipt.schema.json", true, "data_grant", "receipt_read", "read_local", "none"]
]);

export const FOUNDATION_DATA_GRANT_USES = deepFreeze({
  read_local: { action_authority: false },
  derive: { action_authority: false },
  disclose_to_audience: { action_authority: false },
  retain_until_expiry: { action_authority: false },
  write_object: {
    operation: "intent.put",
    object_schema: "cairn.active_intent.v0.1",
    authority_effect: "records_principal_signed_intent_only",
    action_authority: false
  }
});

const BODY_ROOT = "https://cairn.cards/protocol/schemas/v0.1/operation-bodies.schema.json#/$defs/";
const SCHEMA_ROOT = "https://cairn.cards/protocol/schemas/v0.1/";

function schemaUri(shortName) {
  return shortName.endsWith(".schema.json") ? `${SCHEMA_ROOT}${shortName}` : `${BODY_ROOT}${shortName}`;
}

export function operationTuple(operation) {
  return [
    operation.name,
    operation.mutating,
    operation.consequence,
    operation.request_schema,
    operation.response_schema,
    operation.data_grant_required,
    operation.authorization_requirement,
    operation.grant_purpose,
    operation.grant_use,
    operation.authority_effect,
    operation.implementation_status
  ];
}

export const EXACT_FOUNDATION_OPERATION_TUPLES = deepFreeze(
  FOUNDATION_OPERATIONS.map(([name, mutating, consequence, request, response, grant, authorization, purpose, use, authority]) =>
    Object.freeze([
      name,
      mutating,
      consequence,
      schemaUri(request),
      schemaUri(response),
      grant,
      authorization,
      purpose,
      use,
      authority,
      "schema_only"
    ])
  )
);

export const SIGNED_OBJECT_ANNOTATIONS = deepFreeze({
  "cairn.action_preparation_receipt.v0.1": ["/receipt_id", "/receipt_hash", "/issuer_signature", [], null, null],
  "cairn.action_proposal.v0.1": ["/action_proposal_id", "/action_proposal_hash", "/agent_signature", [], null, null],
  "cairn.action_record.v0.1": ["/action_id", "/action_hash", "/action_service_signature", [], null, null],
  "cairn.active_intent.v0.1": ["/intent_id", "/intent_hash", "/principal_signature", [], null, null],
  "cairn.agent_judgment.v0.1": ["/judgment_id", "/judgment_hash", "/issuer_signature", [], null, null],
  "cairn.agent_runtime_binding.v0.1": [
    "/runtime_binding_id",
    "/runtime_binding_hash",
    "/provider_signature",
    [["/agent_identity/runtime_instance_key_id", "/runtime_public_key/key_id"]],
    null,
    null
  ],
  "cairn.continuation_bundle.v0.1": ["/bundle_id", "/bundle_hash", "/issuer_signature", [], null, null],
  "cairn.continuation_disclosure_authorization.v0.1": ["/authorization_id", "/authorization_hash", "/principal_signature", [], null, null],
  "cairn.data_grant.v0.1": ["/grant_id", "/grant_hash", "/principal_signature", [], null, null],
  "cairn.effect_descriptor.v0.1": [
    "/effect_descriptor_id",
    "/descriptor_hash",
    "/descriptor_issuer_signature",
    [],
    { source_pointer: "/effect_semantics", target_pointer: "/effect_id" },
    null
  ],
  "cairn.envelope.v0.1": [
    "/message_id",
    "/envelope_hash",
    "/signature",
    [["/sender/runtime_key_id", "/signature/key_id"]],
    null,
    { source_pointer: "/body", target_pointer: "/body_hash" }
  ],
  "cairn.scoped_projection.v0.1": ["/projection_id", "/projection_hash", "/issuer_signature", [], null, null]
});
