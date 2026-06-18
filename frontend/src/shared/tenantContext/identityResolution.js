export const IDENTITY_CONTEXT_TENANT_MEMBER = "tenant_member";
export const IDENTITY_CONTEXT_PLATFORM_SERVICE = "platform_service_access";

/**
 * Future security model: platform service access inside tenant is not a tenant employee.
 * Enforcement of read-only business data is not implemented yet.
 */
export function isPlatformServiceIdentity(user) {
  return user?.identity_context === IDENTITY_CONTEXT_PLATFORM_SERVICE;
}

export function isTenantMemberIdentity(user) {
  return user?.identity_context === IDENTITY_CONTEXT_TENANT_MEMBER;
}

export function resolveDisplayRoleLabel(user) {
  if (!user) return "user";

  const effectiveRole = String(user.effective_role || "").trim().toLowerCase();
  if (effectiveRole) {
    return effectiveRole;
  }

  if (typeof user.role === "string" && user.role.trim()) {
    return user.role;
  }
  return "user";
}
