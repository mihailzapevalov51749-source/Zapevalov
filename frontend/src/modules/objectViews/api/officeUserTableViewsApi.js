import { platformApiClient } from "../../designer/api/platformApiClient";

function encodeObjectTypeKey(objectTypeKey) {
  return encodeURIComponent(String(objectTypeKey ?? "").trim());
}

/**
 * @param {number | string} tenantId
 * @param {string} objectTypeKey
 */
export async function listOfficeUserTableViews(tenantId, objectTypeKey) {
  const { data } = await platformApiClient.get(
    `/runtime/office-user-views/tenants/${tenantId}/${encodeObjectTypeKey(objectTypeKey)}`,
  );

  return data;
}

/**
 * @param {number | string} tenantId
 * @param {string} objectTypeKey
 * @param {Record<string, unknown>} payload
 */
export async function createOfficeUserTableView(tenantId, objectTypeKey, payload) {
  const { data } = await platformApiClient.post(
    `/runtime/office-user-views/tenants/${tenantId}/${encodeObjectTypeKey(objectTypeKey)}`,
    payload,
  );

  return data;
}

/**
 * @param {number | string} tenantId
 * @param {string} objectTypeKey
 * @param {string} viewId
 * @param {Record<string, unknown>} payload
 */
export async function updateOfficeUserTableView(
  tenantId,
  objectTypeKey,
  viewId,
  payload,
) {
  const { data } = await platformApiClient.patch(
    `/runtime/office-user-views/tenants/${tenantId}/${encodeObjectTypeKey(objectTypeKey)}/${viewId}`,
    payload,
  );

  return data;
}

/**
 * @param {number | string} tenantId
 * @param {string} objectTypeKey
 * @param {string} viewId
 */
export async function deleteOfficeUserTableView(tenantId, objectTypeKey, viewId) {
  await platformApiClient.delete(
    `/runtime/office-user-views/tenants/${tenantId}/${encodeObjectTypeKey(objectTypeKey)}/${viewId}`,
  );
}
