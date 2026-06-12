import {
  peekPortalHomePagePath,
  resolvePortalHomePagePath,
} from "../../portal/utils/resolvePortalHomePage.js";
import { getStoredRuntimePath } from "../appMode/appModeStorage.js";
import { pathBelongsToTenant } from "./tenantContextResolver.js";

export const TENANT_HOME_PAGE_NOT_FOUND_MESSAGE =
  "Не удалось определить главную страницу компании";

function normalizeTenantId(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

/**
 * Sync tenant runtime entry: stored last path or cached home page only.
 * @returns {string | null}
 */
export function peekTenantRuntimeEntryPath(tenantId) {
  const normalizedTenantId = normalizeTenantId(tenantId);
  if (normalizedTenantId == null) {
    return null;
  }

  const stored = getStoredRuntimePath(normalizedTenantId);
  if (stored && pathBelongsToTenant(stored, normalizedTenantId)) {
    return stored;
  }

  return peekPortalHomePagePath(normalizedTenantId);
}

/**
 * Tenant runtime entry: stored path wins, otherwise strict Home Page Resolver.
 * @returns {Promise<string | null>}
 */
export async function resolveTenantRuntimeEntryPath(tenantId) {
  const normalizedTenantId = normalizeTenantId(tenantId);
  if (normalizedTenantId == null) {
    return null;
  }

  const stored = getStoredRuntimePath(normalizedTenantId);
  if (stored && pathBelongsToTenant(stored, normalizedTenantId)) {
    return stored;
  }

  return resolvePortalHomePagePath(normalizedTenantId, { strict: true });
}
