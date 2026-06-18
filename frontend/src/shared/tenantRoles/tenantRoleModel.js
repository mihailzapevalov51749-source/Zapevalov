import { isPlatformOwner } from "../platformAccess/platformOwnerAccess.js";
import { isInfrastructureSuperadmin } from "../platformAccess/infrastructureSuperadminAccess.js";

export const TENANT_SUPERADMIN = "superadmin";
export const TENANT_ADMIN = "admin";
export const TENANT_USER = "user";

export const TENANT_SYSTEM_ROLE_ORDER = [
  TENANT_SUPERADMIN,
  TENANT_ADMIN,
  TENANT_USER,
];

export const TENANT_SYSTEM_ROLES = new Set(TENANT_SYSTEM_ROLE_ORDER);

export const TENANT_DESIGNER_ROLES = new Set([TENANT_SUPERADMIN, TENANT_ADMIN]);
export const TENANT_ADMINISTRATION_ROLES = new Set([TENANT_SUPERADMIN]);
export const TENANT_USER_MANAGEMENT_ROLES = new Set([TENANT_SUPERADMIN]);
export const TENANT_MODULES_READER_ROLES = new Set([TENANT_SUPERADMIN, TENANT_ADMIN]);

export const PLATFORM_DESIGNER_ROLES = new Set([
  TENANT_SUPERADMIN,
  TENANT_ADMIN,
  "platform_designer",
  "platform_architect",
]);

export const HIDDEN_TENANT_UI_ROLES = new Set([
  "editor",
  "company_superadmin",
  "company_super_admin",
  "tenant_admin",
  "company_admin",
  "owner",
  "platform_designer",
  "platform_architect",
  "platform_admin",
]);

const LEGACY_TENANT_ROLE_ALIASES = {
  company_superadmin: TENANT_SUPERADMIN,
  company_super_admin: TENANT_SUPERADMIN,
  tenant_admin: TENANT_ADMIN,
  company_admin: TENANT_ADMIN,
};

export const TENANT_ROLE_OPTIONS_FALLBACK = [
  { id: 1, name: TENANT_SUPERADMIN, description: "" },
  { id: 2, name: TENANT_ADMIN, description: "" },
  { id: 3, name: TENANT_USER, description: "" },
];

export function isTenantScopedUser(user) {
  const tenantId = Number(user?.tenant_id);
  return Number.isFinite(tenantId) && tenantId > 0;
}

export function normalizeTenantRoleName(roleName) {
  const normalized = String(roleName || "").trim().toLowerCase();
  if (!normalized) {
    return "";
  }

  return LEGACY_TENANT_ROLE_ALIASES[normalized] || normalized;
}

export function resolveTenantRoleName(user) {
  const rawRole = String(
    user?.role?.name || user?.role || user?.role_name || user?.roleName || "",
  )
    .trim()
    .toLowerCase();

  if (!rawRole) {
    return "";
  }

  if (!isTenantScopedUser(user)) {
    return rawRole;
  }

  return normalizeTenantRoleName(rawRole);
}

export function resolveTenantRoleDisplay(userOrRoleName) {
  const roleName =
    typeof userOrRoleName === "string"
      ? userOrRoleName
      : resolveTenantRoleName(userOrRoleName);

  const canonical = normalizeTenantRoleName(roleName);
  if (TENANT_SYSTEM_ROLES.has(canonical)) {
    return canonical;
  }

  return canonical || "—";
}

/** @deprecated Use resolveTenantRoleDisplay */
export function resolveTenantRoleLabel(userOrRoleName) {
  return resolveTenantRoleDisplay(userOrRoleName);
}

export function filterTenantSystemRoles(roles) {
  const source = Array.isArray(roles) ? roles : [];
  const byCanonicalName = new Map();

  for (const role of source) {
    const canonical = normalizeTenantRoleName(role?.name);
    if (!TENANT_SYSTEM_ROLES.has(canonical) || HIDDEN_TENANT_UI_ROLES.has(canonical)) {
      continue;
    }

    if (!byCanonicalName.has(canonical)) {
      byCanonicalName.set(canonical, {
        ...role,
        name: canonical,
      });
    }
  }

  return TENANT_SYSTEM_ROLE_ORDER.map((name, index) => {
    if (byCanonicalName.has(name)) {
      return byCanonicalName.get(name);
    }

    const fallback = TENANT_ROLE_OPTIONS_FALLBACK.find((role) => role.name === name);
    return fallback ? { ...fallback, id: fallback.id ?? index + 1 } : null;
  }).filter(Boolean);
}

export function isCompanyOwner(user) {
  return Boolean(user?.is_company_owner ?? user?.isCompanyOwner);
}

function isActiveMembership(membership) {
  if (membership?.is_active === false) {
    return false;
  }

  const membershipStatus = String(membership?.membership_status || "active")
    .trim()
    .toLowerCase();

  return !membershipStatus || membershipStatus === "active";
}

export function collectActiveMembershipRoleKeys(user) {
  const memberships = Array.isArray(user?.tenant_memberships)
    ? user.tenant_memberships
    : [];
  const roleKeys = new Set();

  for (const membership of memberships) {
    if (!isActiveMembership(membership)) {
      continue;
    }

    const roleKey = normalizeTenantRoleName(membership?.role_key);
    if (roleKey) {
      roleKeys.add(roleKey);
    }
  }

  return roleKeys;
}

function userHasMembershipRole(user, allowedRoles) {
  const roleKeys = collectActiveMembershipRoleKeys(user);
  for (const roleKey of roleKeys) {
    if (allowedRoles.has(roleKey)) {
      return true;
    }
  }

  return false;
}

export function canAccessTenantDesigner(user) {
  if (!user) {
    return false;
  }

  if (isInfrastructureSuperadmin(user)) {
    return true;
  }

  if (isPlatformOwner(user)) {
    return true;
  }

  if (userHasMembershipRole(user, TENANT_DESIGNER_ROLES)) {
    return true;
  }

  if (isTenantScopedUser(user)) {
    return TENANT_DESIGNER_ROLES.has(resolveTenantRoleName(user));
  }

  return PLATFORM_DESIGNER_ROLES.has(resolveTenantRoleName(user));
}

export function canAccessTenantAdministration(user) {
  if (isInfrastructureSuperadmin(user)) {
    return true;
  }

  if (isPlatformOwner(user)) {
    return true;
  }

  if (userHasMembershipRole(user, TENANT_ADMINISTRATION_ROLES)) {
    return true;
  }

  if (!isTenantScopedUser(user)) {
    return false;
  }

  return TENANT_ADMINISTRATION_ROLES.has(resolveTenantRoleName(user));
}

export function canManageTenantUsers(user) {
  if (isInfrastructureSuperadmin(user)) {
    return true;
  }

  if (isPlatformOwner(user)) {
    return true;
  }

  if (userHasMembershipRole(user, TENANT_USER_MANAGEMENT_ROLES)) {
    return true;
  }

  if (!isTenantScopedUser(user)) {
    return false;
  }

  return TENANT_USER_MANAGEMENT_ROLES.has(resolveTenantRoleName(user));
}

export function canReadTenantModules(user) {
  if (isInfrastructureSuperadmin(user)) {
    return true;
  }

  if (isPlatformOwner(user)) {
    return true;
  }

  if (userHasMembershipRole(user, TENANT_MODULES_READER_ROLES)) {
    return true;
  }

  if (!isTenantScopedUser(user)) {
    return false;
  }

  return TENANT_MODULES_READER_ROLES.has(resolveTenantRoleName(user));
}
