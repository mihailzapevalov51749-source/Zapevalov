import { platformApiClient } from "../modules/designer/api/platformApiClient";

function buildRelationFieldPath(tenantId, entityId, fieldKey, suffix = "") {
  const normalizedTenantId = Number(tenantId);
  const normalizedEntityId = String(entityId ?? "").trim();
  const normalizedFieldKey = String(fieldKey ?? "").trim();

  if (!normalizedTenantId || !normalizedEntityId || !normalizedFieldKey) {
    throw new Error(
      "runtimeRelationFieldsApi: tenantId, entityId and fieldKey are required",
    );
  }

  const base = `/runtime/relation-fields/tenants/${normalizedTenantId}/entities/${encodeURIComponent(normalizedEntityId)}/fields/${encodeURIComponent(normalizedFieldKey)}`;

  return suffix ? `${base}/${suffix}` : base;
}

/**
 * @param {number} tenantId
 * @param {string} entityId
 * @param {string} fieldKey
 */
export async function getRelationFieldState(tenantId, entityId, fieldKey) {
  const { data } = await platformApiClient.get(
    buildRelationFieldPath(tenantId, entityId, fieldKey),
  );

  return data;
}

/**
 * @param {number} tenantId
 * @param {string} entityId
 * @param {string} fieldKey
 */
export async function getRelationFieldMetadata(tenantId, entityId, fieldKey) {
  const { data } = await platformApiClient.get(
    buildRelationFieldPath(tenantId, entityId, fieldKey, "metadata"),
  );

  return data;
}

/**
 * @param {number} tenantId
 * @param {string} entityId
 * @param {string} fieldKey
 * @param {{ target_entity_id: string }} payload
 */
export async function createRelationFieldLink(tenantId, entityId, fieldKey, payload) {
  const { data } = await platformApiClient.post(
    buildRelationFieldPath(tenantId, entityId, fieldKey, "links"),
    payload,
  );

  return data;
}

/**
 * @param {number} tenantId
 * @param {string} entityId
 * @param {string} fieldKey
 * @param {{ target_entity_id: string }} payload
 */
export async function deleteRelationFieldLink(tenantId, entityId, fieldKey, payload) {
  const { data } = await platformApiClient.delete(
    buildRelationFieldPath(tenantId, entityId, fieldKey, "links"),
    { data: payload },
  );

  return data;
}
