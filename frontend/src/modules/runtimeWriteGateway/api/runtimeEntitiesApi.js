import { platformApiClient } from "../../designer/api/platformApiClient";

/**
 * Runtime Entity Layer — create object instance (not a table row).
 *
 * @param {number} tenantId
 * @param {string} objectTypeKey
 * @param {{ values: Record<string, unknown> }} payload
 */
export async function createRuntimeEntity(tenantId, objectTypeKey, payload) {
  const { data } = await platformApiClient.post(
    `/runtime/entities/tenants/${tenantId}/${objectTypeKey}`,
    payload,
  );

  return data;
}

/**
 * @param {number} tenantId
 * @param {string} objectTypeKey
 * @param {string} entityId
 */
export async function getRuntimeEntity(tenantId, objectTypeKey, entityId) {
  const normalizedId = String(entityId ?? "").trim();
  const normalizedKey = String(objectTypeKey ?? "").trim();

  if (!normalizedId || !normalizedKey) {
    throw new Error("getRuntimeEntity: tenantId, objectTypeKey and entityId are required");
  }

  const { data } = await platformApiClient.get(
    `/runtime/entities/tenants/${tenantId}/${encodeURIComponent(normalizedKey)}/${encodeURIComponent(normalizedId)}`,
  );

  return data;
}

/**
 * @param {number} tenantId
 * @param {string} objectTypeKey
 * @param {string} entityId
 * @param {{ values: Record<string, unknown> }} payload
 */
export async function updateRuntimeEntity(
  tenantId,
  objectTypeKey,
  entityId,
  payload,
) {
  const { data } = await platformApiClient.patch(
    `/runtime/entities/tenants/${tenantId}/${objectTypeKey}/${entityId}`,
    payload,
  );

  return data;
}
