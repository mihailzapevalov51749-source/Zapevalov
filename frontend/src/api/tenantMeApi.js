import { platformApiClient } from "../modules/designer/api/platformApiClient";
import { normalizeCurrentUser } from "./authApi";

function normalizeTenantMeUser(data) {
  const normalized = normalizeCurrentUser(data);
  return {
    ...normalized,
    identity_context: data?.identity_context ?? null,
  };
}

function tenantMePath(tenantId) {
  const normalizedTenantId = Number(tenantId);
  if (!Number.isFinite(normalizedTenantId) || normalizedTenantId <= 0) {
    throw new Error("tenantId обязателен");
  }

  return `/tenants/${normalizedTenantId}/users/me`;
}

export async function getTenantMe(tenantId) {
  const response = await platformApiClient.get(tenantMePath(tenantId));
  return normalizeTenantMeUser(response.data);
}

export async function updateTenantMe(tenantId, payload) {
  const response = await platformApiClient.patch(tenantMePath(tenantId), payload);
  return normalizeTenantMeUser(response.data);
}
