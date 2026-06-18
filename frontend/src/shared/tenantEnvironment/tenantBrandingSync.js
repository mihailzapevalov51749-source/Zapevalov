import { updateTenantEnvironmentRecord } from "./tenantEnvironmentApi.js";

export function syncTenantBrandingFromPortal(portal = null) {
  const tenantId = Number(portal?.id);
  if (!Number.isFinite(tenantId) || tenantId <= 0) {
    return null;
  }

  return updateTenantEnvironmentRecord(tenantId, {
    name: portal?.name ?? "",
    short_name: portal?.short_name ?? portal?.shortName ?? null,
    code: portal?.code ?? null,
  });
}
