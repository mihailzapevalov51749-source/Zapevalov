import {
  resolveCompanyUserEntryPath,
  resolvePlatformUserEntryPath,
} from "../../../shared/auth/postLoginRedirect.js";
import { canNavigateBackInBrowserHistory } from "../../../shared/navigation/canNavigateBackInBrowserHistory.js";
import { resolveTenantIdFromPathname } from "../../../shared/tenantContext/tenantContextResolver.js";
import { resolveTenantRuntimeEntryPath } from "../../../shared/tenantContext/resolveTenantRuntimeEntryPath.js";

export { canNavigateBackInBrowserHistory };

function normalizeTenantId(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

/**
 * Resolve tenant home when Designer access screen has no browser back history.
 * @returns {Promise<string | null>}
 */
export async function resolveDesignerAccessDeniedHomePath(pathname, user = null) {
  const tenantIdFromPath = resolveTenantIdFromPathname(pathname);
  if (tenantIdFromPath != null) {
    return resolveTenantRuntimeEntryPath(tenantIdFromPath);
  }

  const userTenantId = normalizeTenantId(user?.tenant_id);
  if (userTenantId != null) {
    return resolveCompanyUserEntryPath(user);
  }

  return resolvePlatformUserEntryPath();
}
