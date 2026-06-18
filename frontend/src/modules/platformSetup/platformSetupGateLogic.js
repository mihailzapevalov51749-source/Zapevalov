import { resolvePrimaryTenantId } from "../../shared/auth/tenantMembershipAccess.js";
import { isBridgeSessionUser } from "../../api/sessionBridgeApi.js";

/**
 * Matches isCompanyUser() in shared/auth/postLoginRedirect.js.
 */
function hasActiveCompanyTenantAccess(user) {
  return resolvePrimaryTenantId(user) != null;
}

/**
 * Platform owner first-setup is only for users without company tenant access.
 * Active tenant_membership always wins over platform/setup checks.
 */
export function shouldShowPlatformOwnerFirstSetup(user, setupState) {
  if (isBridgeSessionUser(user)) {
    return false;
  }

  return Boolean(setupState?.needs_owner_setup) && !hasActiveCompanyTenantAccess(user);
}
