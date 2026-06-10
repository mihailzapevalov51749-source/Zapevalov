import { platformApiClient } from "../../modules/designer/api/platformApiClient";

const cache = new Map();

export function peekTenantEnvironmentRecord(tenantId) {
  const id = Number(tenantId);
  if (!Number.isFinite(id) || id <= 0) {
    return null;
  }
  return cache.get(id) ?? null;
}

export async function fetchTenantEnvironment(tenantId) {
  const id = Number(tenantId);
  if (!Number.isFinite(id) || id <= 0) {
    return null;
  }

  if (cache.has(id)) {
    return cache.get(id);
  }

  const response = await platformApiClient.get(`/portals/${id}/environment`);
  const record = response.data;
  cache.set(id, record);
  return record;
}

export function clearTenantEnvironmentCache() {
  cache.clear();
}
