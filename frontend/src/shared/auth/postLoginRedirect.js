import { getStoredRuntimePath } from "../appMode/appModeStorage.js";
import {
  formatTenantHomePageNotFoundMessage,
  resolveTenantRuntimeEntryPath,
} from "../tenantContext/resolveTenantRuntimeEntryPath.js";
import { pathBelongsToTenant } from "../tenantContext/tenantContextResolver.js";
import { isBridgeSessionUser } from "../../api/sessionBridgeApi.js";
import { userHasTenantAccess, resolvePrimaryTenantId } from "./tenantMembershipAccess.js";

export { userHasTenantAccess, resolvePrimaryTenantId } from "./tenantMembershipAccess.js";

export const TENANT_ACCESS_DENIED_MESSAGE =
  "У пользователя нет доступа к выбранной компании";

export function isCompanyUser(user) {
  return resolvePrimaryTenantId(user) != null;
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
  const tenantId = resolvePrimaryTenantId(user);
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

  if (isBridgeSessionUser(user)) {
    const bridgePortalId = normalizeTenantId(user?.portal_id);
    if (bridgePortalId == null) {
      return {
        path: null,
        error: "Bridge session: portal_id не определён",
      };
    }

    if (requested != null && requested !== bridgePortalId) {
      return {
        path: null,
        error: TENANT_ACCESS_DENIED_MESSAGE,
      };
    }

    const stored = getStoredRuntimePath(bridgePortalId);
    if (stored && pathBelongsToTenant(stored, bridgePortalId)) {
      return { path: stored };
    }

    const path = await resolveTenantRuntimeEntryPath(bridgePortalId);
    if (!path) {
      return {
        path: null,
        error: formatTenantHomePageNotFoundMessage(bridgePortalId),
      };
    }

    return { path };
  }

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
        error: formatTenantHomePageNotFoundMessage(requested),
      };
    }

    return { path };
  }

  if (isCompanyUser(user)) {
    const tenantId = resolvePrimaryTenantId(user);
    const path = await resolveCompanyUserEntryPath(user);
    if (!path) {
      return {
        path: null,
        error: formatTenantHomePageNotFoundMessage(tenantId),
      };
    }

    return { path };
  }

  const path = await resolvePlatformUserEntryPath();
  if (!path) {
    return {
      path: null,
      error: formatTenantHomePageNotFoundMessage(1),
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

export function parseRequestedTenantKey(searchParams) {
  if (!searchParams) {
    return null;
  }

  const fromGetter =
    typeof searchParams.get === "function"
      ? searchParams.get("tenantKey")
      : null;

  if (fromGetter) {
    const normalized = String(fromGetter).trim().toLowerCase();
    return normalized || null;
  }

  const raw = String(searchParams.tenantKey || searchParams.tenant_key || "").trim();
  return raw ? raw.toLowerCase() : null;
}

