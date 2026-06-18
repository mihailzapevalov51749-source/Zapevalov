import { platformApiClient } from "../../modules/designer/api/platformApiClient";

const cache = new Map();
export const TENANT_ENVIRONMENT_UPDATED_EVENT = "tenant-environment:updated";

function hasBrandingFields(record) {
  return Boolean(record && typeof record === "object" && "name" in record);
}

function emitTenantEnvironmentUpdated(tenantId) {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(
    new CustomEvent(TENANT_ENVIRONMENT_UPDATED_EVENT, {
      detail: { tenantId: Number(tenantId) },
    }),
  );
}

export function peekTenantEnvironmentRecord(tenantId) {
  const id = Number(tenantId);
  if (!Number.isFinite(id) || id <= 0) {
    return null;
  }
  return cache.get(id) ?? null;
}

export async function fetchTenantEnvironment(tenantId, { force = false } = {}) {
  const id = Number(tenantId);
  if (!Number.isFinite(id) || id <= 0) {
    return null;
  }

  if (!force && cache.has(id)) {
    const cached = cache.get(id);
    if (hasBrandingFields(cached)) {
      return cached;
    }
  }

  const response = await platformApiClient.get(`/portals/${id}/environment`);
  const record = response.data;
  cache.set(id, record);
  return record;
}

export function updateTenantEnvironmentRecord(tenantId, patch = {}) {
  const id = Number(tenantId);
  if (!Number.isFinite(id) || id <= 0) {
    return null;
  }

  const existing = cache.get(id) ?? { tenant_id: id };
  const next = {
    ...existing,
    ...patch,
    tenant_id: id,
  };
  cache.set(id, next);
  emitTenantEnvironmentUpdated(id);
  return next;
}

export function invalidateTenantEnvironmentRecord(tenantId) {
  const id = Number(tenantId);
  if (!Number.isFinite(id) || id <= 0) {
    return;
  }

  cache.delete(id);
  emitTenantEnvironmentUpdated(id);
}

export function clearTenantEnvironmentCache() {
  cache.clear();
}
