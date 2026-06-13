import { getStoredRuntimePath } from "../appMode/appModeStorage.js";
import {
  resolveTenantRuntimeEntryPath,
  TENANT_HOME_PAGE_NOT_FOUND_MESSAGE,
} from "../tenantContext/resolveTenantRuntimeEntryPath.js";
import { userHasTenantAccess } from "./tenantMembershipAccess.js";

export { userHasTenantAccess } from "./tenantMembershipAccess.js";

export const TENANT_ACCESS_DENIED_MESSAGE =
  "У пользователя нет доступа к выбранной компании";

export function isCompanyUser(user) {
  const parsed = Number(user?.tenant_id);
  return Number.isFinite(parsed) && parsed > 0;
}

export function isPlatformUser(user) {
  return !isCompanyUser(user);
}

function normalizeTenantId(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export async function resolvePlatformUserEntryPath() {
  const stored = getStoredRuntimePath(1);
  if (stored) {
    return stored;
  }

  return resolveTenantRuntimeEntryPath(1);
}

export async function resolveCompanyUserEntryPath(user) {
  const tenantId = normalizeTenantId(user?.tenant_id);
  if (tenantId == null) {
    return resolvePlatformUserEntryPath();
  }

  return resolveTenantRuntimeEntryPath(tenantId);
}

/**
 * @returns {Promise<{ path: string | null, error?: string }>}
 */
export async function resolvePostLoginPath(user, { requestedTenantId } = {}) {
  const requested = normalizeTenantId(requestedTenantId);

  if (requested != null) {
    if (!userHasTenantAccess(user, requested)) {
      return {
        path: null,
        error: TENANT_ACCESS_DENIED_MESSAGE,
      };
    }

    const path = await resolveTenantRuntimeEntryPath(requested);
    if (!path) {
      return {
        path: null,
        error: TENANT_HOME_PAGE_NOT_FOUND_MESSAGE,
      };
    }

    return { path };
  }

  if (isCompanyUser(user)) {
    const path = await resolveCompanyUserEntryPath(user);
    if (!path) {
      return {
        path: null,
        error: TENANT_HOME_PAGE_NOT_FOUND_MESSAGE,
      };
    }

    return { path };
  }

  const path = await resolvePlatformUserEntryPath();
  if (!path) {
    return {
      path: null,
      error: TENANT_HOME_PAGE_NOT_FOUND_MESSAGE,
    };
  }

  return { path };
}

export function parseRequestedTenantId(searchParams) {
  if (!searchParams) {
    return null;
  }

  const fromGetter =
    typeof searchParams.get === "function"
      ? searchParams.get("tenantId")
      : null;

  if (fromGetter) {
    return normalizeTenantId(fromGetter);
  }

  const raw = String(searchParams.tenantId || searchParams.tenant_id || "").trim();
  return normalizeTenantId(raw);
}

