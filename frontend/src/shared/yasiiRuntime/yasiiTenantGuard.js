import { userHasTenantAccess } from "../auth/tenantMembershipAccess.js";
import { isPlatformOwner } from "../platformAccess/platformOwnerAccess.js";

import { normalizeOfficeRuntimePortalId } from "../officeRuntime/officeRuntimeTenantGuardRace.js";

export function userCanAccessYasiiTenant(user, tenantId) {
  const normalizedTenantId = normalizeOfficeRuntimePortalId(tenantId);
  if (!user || normalizedTenantId == null) {
    return false;
  }

  if (isPlatformOwner(user)) {
    return true;
  }

  return userHasTenantAccess(user, normalizedTenantId);
}

/**
 * @returns {{ status: "allowed" | "denied", portalId: number | null, reason?: string }}
 */
export function evaluateYasiiGuardAccess(user, tenantId) {
  const normalizedTenantId = normalizeOfficeRuntimePortalId(tenantId);
  if (normalizedTenantId == null) {
    return {
      status: "denied",
      portalId: null,
      reason: "no_tenant",
    };
  }

  if (userCanAccessYasiiTenant(user, normalizedTenantId)) {
    return {
      status: "allowed",
      portalId: normalizedTenantId,
    };
  }

  return {
    status: "denied",
    portalId: normalizedTenantId,
    reason: "no_membership",
  };
}

export function isYasiiGuardReady(validated, guardTenantId) {
  return (
    validated?.result != null &&
    normalizeOfficeRuntimePortalId(validated.portalId) ===
      normalizeOfficeRuntimePortalId(guardTenantId)
  );
}
