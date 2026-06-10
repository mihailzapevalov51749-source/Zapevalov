const PORTAL_TENANT_RE = /^\/portal\/(\d+)(?:\/|$)/;
const DESIGNER_TENANT_RE = /^\/designer\/tenant\/(\d+)(?:\/|$)/;

function normalizePathname(pathname = "") {
  return String(pathname || "").trim().split(/[?#]/)[0];
}

/**
 * Tenant id from current URL. Returns null when route is not tenant-scoped.
 */
export function resolveTenantIdFromPathname(pathname = "") {
  const path = normalizePathname(pathname);
  const portalMatch = path.match(PORTAL_TENANT_RE);
  if (portalMatch) {
    const id = Number(portalMatch[1]);
    return Number.isFinite(id) && id > 0 ? id : null;
  }

  const designerMatch = path.match(DESIGNER_TENANT_RE);
  if (designerMatch) {
    const id = Number(designerMatch[1]);
    return Number.isFinite(id) && id > 0 ? id : null;
  }

  return null;
}

export function resolveTenantIdFromPath(fullPath = "") {
  return resolveTenantIdFromPathname(fullPath);
}

export function pathBelongsToTenant(fullPath, tenantId) {
  const normalizedTenantId = Number(tenantId);
  if (!Number.isFinite(normalizedTenantId) || normalizedTenantId <= 0) {
    return false;
  }
  return resolveTenantIdFromPath(fullPath) === normalizedTenantId;
}

export function buildDefaultRuntimePath(tenantId) {
  const id = Number(tenantId);
  return Number.isFinite(id) && id > 0 ? `/portal/${id}/page/1` : "/portal/1/page/1";
}

export function buildDefaultDesignerPath(tenantId) {
  const id = Number(tenantId);
  return Number.isFinite(id) && id > 0
    ? `/designer/tenant/${id}/object-types`
    : "/designer/tenant/1/object-types";
}
