export function buildTenantAdminPath(tenantId, segment = "") {
  const normalizedTenantId = Number(tenantId) > 0 ? Number(tenantId) : 1;
  const base = `/designer/tenant/${normalizedTenantId}/administration`;
  const normalizedSegment = String(segment || "").replace(/^\//, "");
  return normalizedSegment ? `${base}/${normalizedSegment}` : base;
}

export function resolveStudioTenantIdFromPath(pathname = window.location.pathname) {
  const match = String(pathname || "").match(/\/designer\/tenant\/(\d+)/);
  return match ? Number(match[1]) : null;
}

export function isTenantAdministrationPath(pathname = "") {
  const normalized = String(pathname || "").replace(/\/+$/, "");
  return /^\/designer\/tenant\/\d+\/administration(\/|$)/.test(normalized);
}
