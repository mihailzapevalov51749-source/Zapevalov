import {
  buildDefaultDesignerPath,
  buildDefaultRuntimePath,
  pathBelongsToTenant,
  resolveTenantIdFromPathname,
} from "../tenantContext/tenantContextResolver.js";
import {
  getStoredDesignerPath,
  getStoredRuntimePath,
} from "./appModeStorage.js";

/**
 * Studio → Office: tenant from current URL; localStorage never overrides URL tenant.
 */
export function resolveStudioToOfficePath(pathname) {
  const tenantId = resolveTenantIdFromPathname(pathname);
  if (tenantId) {
    const stored = getStoredRuntimePath(tenantId);
    if (stored && pathBelongsToTenant(stored, tenantId)) {
      return stored;
    }
    return buildDefaultRuntimePath(tenantId);
  }

  return getStoredRuntimePath(1) || buildDefaultRuntimePath(1);
}

/**
 * Office → Studio: portalId from current URL; fallback only when URL has no tenant.
 */
export function resolveOfficeToStudioPath(pathname, tenantIdFallback = 1) {
  const tenantFromUrl = resolveTenantIdFromPathname(pathname);
  const tenantId = tenantFromUrl ?? Number(tenantIdFallback) ?? 1;

  const stored = getStoredDesignerPath(tenantId);
  if (stored && pathBelongsToTenant(stored, tenantId)) {
    return stored;
  }

  return buildDefaultDesignerPath(tenantId);
}

/** Root `/` entry — last path allowed only when URL has no tenant. */
export function resolveRootEntryPath() {
  return getStoredRuntimePath(1) || buildDefaultRuntimePath(1);
}

export function resolveRuntimeFallbackPath(tenantId) {
  const normalizedTenantId = Number(tenantId) > 0 ? Number(tenantId) : 1;
  const stored = getStoredRuntimePath(normalizedTenantId);
  if (stored && pathBelongsToTenant(stored, normalizedTenantId)) {
    return stored;
  }
  return buildDefaultRuntimePath(normalizedTenantId);
}

/** Yasii return path: pre-workspace URL wins; otherwise tenant-aware fallback for current tab. */
export function resolveYasiiReturnPath(preWorkspacePath) {
  const trimmed = String(preWorkspacePath || "").trim();
  if (trimmed) {
    return trimmed;
  }

  const stored = getStoredRuntimePath(1);
  const tenantId = resolveTenantIdFromPathname(stored) ?? 1;
  return resolveRuntimeFallbackPath(tenantId);
}
