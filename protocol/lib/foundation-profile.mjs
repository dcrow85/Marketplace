export const FOUNDATION_OPERATIONS = Object.freeze([
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
].map(Object.freeze));

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

export const EXACT_FOUNDATION_OPERATION_TUPLES = Object.freeze(
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
