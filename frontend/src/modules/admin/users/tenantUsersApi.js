import { platformApiClient } from "../../designer/api/platformApiClient";

function tenantAdministrationBase(tenantId) {
  const normalizedTenantId = Number(tenantId);
  if (!Number.isFinite(normalizedTenantId) || normalizedTenantId <= 0) {
    throw new Error("tenantId обязателен");
  }

  return `/designer/tenants/${normalizedTenantId}/administration`;
}

export async function getTenantUsers(tenantId) {
  const response = await platformApiClient.get(`${tenantAdministrationBase(tenantId)}/users`);
  return response.data;
}

export async function getTenantRoles(tenantId) {
  const response = await platformApiClient.get(`${tenantAdministrationBase(tenantId)}/roles`);
  return response.data;
}

export async function createTenantUser(tenantId, payload) {
  const response = await platformApiClient.post(
    `${tenantAdministrationBase(tenantId)}/users`,
    payload,
  );
  return response.data;
}

export async function updateTenantUser(tenantId, userId, payload) {
  const response = await platformApiClient.patch(
    `${tenantAdministrationBase(tenantId)}/users/${userId}`,
    payload,
  );
  return response.data;
}

export async function deleteTenantUser(tenantId, userId) {
  const response = await platformApiClient.delete(
    `${tenantAdministrationBase(tenantId)}/users/${userId}`,
  );
  return response.data;
}

export async function sendTenantUserInvite(tenantId, userId) {
  const response = await platformApiClient.post(
    `${tenantAdministrationBase(tenantId)}/users/${userId}/invite`,
  );
  return response.data;
}
