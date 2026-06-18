import { userHasTenantAccess } from "../auth/tenantMembershipAccess.js";
import { isBridgeSessionUser } from "../../api/sessionBridgeApi.js";
import { isPlatformOwner } from "../platformAccess/platformOwnerAccess.js";

import { normalizeOfficeRuntimePortalId } from "./officeRuntimeTenantGuardRace.js";

/** Office runtime routes protected by {@link OfficeRuntimeTenantGuard}. */
export const OFFICE_RUNTIME_GUARD_ROUTE_PATTERNS = [
  "/tasks",
  "/portal/:portalId/page/:pageId",
  "/portal/:portalId/object-types/:objectTypeRef/data",
  "/portal/:portalId/object-types/:objectTypeRef/:viewKey",
  "/portal/:portalId/object-types/:objectTypeRef",
  "/portal/:portalId/library/:libraryId",
  "/portal/:portalId/workspaces/:workspaceSlug",
  "/portal/:portalId/workspaces/:workspaceSlug/:tabSlug",
  "/portal/:portalId/workspaces/:workspaceSlug/tabs/:tabSlug",
];

const LEGACY_IMPLICIT_PORTAL_PATHS = new Set(["/tasks"]);

/**
 * Resolves tenant portal id for Office runtime guard from URL.
 * Legacy `/tasks` maps to implicit portal 1 (same as PortalPageView fallback).
 */
export function resolveOfficeRuntimeGuardPortalId(pathname, params = {}) {
  const fromParams = normalizeOfficeRuntimePortalId(params.portalId);
  if (fromParams != null) {
    return fromParams;
  }

  const match = String(pathname || "").match(/^\/portal\/(\d+)/);
  if (match) {
    return normalizeOfficeRuntimePortalId(match[1]);
  }

  const normalizedPath = String(pathname || "").replace(/\/+$/, "") || "/";
  if (LEGACY_IMPLICIT_PORTAL_PATHS.has(normalizedPath)) {
    return 1;
  }

  return null;
}

export function userCanAccessOfficeRuntimeTenant(user, tenantId) {
  const normalizedTenantId = normalizeOfficeRuntimePortalId(tenantId);
  if (!user || normalizedTenantId == null) {
    return false;
  }

  if (isBridgeSessionUser(user)) {
    return Number(user.portal_id) === normalizedTenantId;
  }

  if (isPlatformOwner(user)) {
    return true;
  }

  return userHasTenantAccess(user, normalizedTenantId);
}

/**
 * @returns {{ status: "allowed" | "denied", portalId: number | null, reason?: string }}
 */
export function evaluateOfficeRuntimeGuardAccess(user, portalId) {
  const normalizedPortalId = normalizeOfficeRuntimePortalId(portalId);
  if (normalizedPortalId == null) {
    return {
      status: "denied",
      portalId: null,
      reason: "invalid_portal",
    };
  }

  if (userCanAccessOfficeRuntimeTenant(user, normalizedPortalId)) {
    return {
      status: "allowed",
      portalId: normalizedPortalId,
    };
  }

  return {
    status: "denied",
    portalId: normalizedPortalId,
    reason: "no_membership",
  };
}

export function isOfficeRuntimeGuardReady(validated, guardPortalId) {
  return (
    validated?.result != null &&
    normalizeOfficeRuntimePortalId(validated.portalId) ===
      normalizeOfficeRuntimePortalId(guardPortalId)
  );
}
