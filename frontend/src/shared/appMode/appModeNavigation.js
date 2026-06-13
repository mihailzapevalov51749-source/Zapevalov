import {
  resolvePlatformUserEntryPath,
  resolvePostLoginPath,
} from "../auth/postLoginRedirect.js";
import {
  buildDefaultDesignerPath,
  pathBelongsToTenant,
  resolveTenantIdFromPathname,
} from "../tenantContext/tenantContextResolver.js";
import {
  peekTenantRuntimeEntryPath,
  resolveTenantRuntimeEntryPath,
} from "../tenantContext/resolveTenantRuntimeEntryPath.js";
import {
  getStoredDesignerPath,
  getStoredRuntimePath,
} from "./appModeStorage.js";

/**
 * Studio → Office (sync): stored path or cached home page for URL tenant.
 * @returns {string | null}
 */
export function resolveStudioToOfficePath(pathname) {
  const tenantId = resolveTenantIdFromPathname(pathname);
  if (tenantId) {
    const stored = getStoredRuntimePath(tenantId);
    if (stored && pathBelongsToTenant(stored, tenantId)) {
      return stored;
    }
    return peekTenantRuntimeEntryPath(tenantId);
  }

  return peekTenantRuntimeEntryPath(1);
}

/**
 * Studio → Office (async): stored path or strict Home Page Resolver.
 * @returns {Promise<string | null>}
 */
export async function resolveStudioToOfficePathAsync(pathname) {
  const tenantId = resolveTenantIdFromPathname(pathname) ?? 1;
  return resolveTenantRuntimeEntryPath(tenantId);
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

/** Root `/` entry — tenant-aware when user context is available. */
export async function resolveRootEntryPath(user = null) {
  if (user) {
    const { path } = await resolvePostLoginPath(user, {});
    if (path) {
      return path;
    }
  }

  return resolvePlatformUserEntryPath();
}

/**
 * @returns {string | null}
 */
export function resolveRuntimeFallbackPath(tenantId) {
  const normalizedTenantId = Number(tenantId) > 0 ? Number(tenantId) : 1;
  return peekTenantRuntimeEntryPath(normalizedTenantId);
}

/**
 * @returns {Promise<string | null>}
 */
export async function resolveRuntimeFallbackPathAsync(tenantId) {
  const normalizedTenantId = Number(tenantId) > 0 ? Number(tenantId) : 1;
  return resolveTenantRuntimeEntryPath(normalizedTenantId);
}

/** Yasii return path: pre-workspace URL wins; otherwise tenant-aware fallback. */
export async function resolveYasiiReturnPath(preWorkspacePath, tenantId = null) {
  const trimmed = String(preWorkspacePath || "").trim();
  if (trimmed) {
    return trimmed;
  }

  const normalizedTenantId = Number(tenantId);
  if (Number.isFinite(normalizedTenantId) && normalizedTenantId > 0) {
    return resolveTenantRuntimeEntryPath(normalizedTenantId);
  }

  return resolvePlatformUserEntryPath();
}
