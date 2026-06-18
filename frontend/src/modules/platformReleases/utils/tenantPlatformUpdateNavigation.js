import {
  isTenantScopedUser,
  resolveTenantRoleName,
  TENANT_DESIGNER_ROLES,
} from "../../../shared/tenantRoles/tenantRoleModel.js";

export const TENANT_PLATFORM_UPDATE_ACTION_KEY = "open-platform-update";
export const TENANT_PLATFORM_UPDATE_SIDEBAR_ACTION_ID = "tenant-platform-update";

const EXCLUDED_TENANT_TYPES = new Set([
  "DEV",
  "TEMPLATE",
  "LEGACY_TEMPLATE",
  "PLATFORM_TEMPLATE",
]);

export function isClientTenantType(tenantType) {
  return String(tenantType || "").trim().toUpperCase() === "CLIENT";
}

export function canManageTenantPlatformUpdates(user) {
  if (!user) {
    return false;
  }

  if (!isTenantScopedUser(user)) {
    return false;
  }

  return TENANT_DESIGNER_ROLES.has(resolveTenantRoleName(user));
}

export function shouldShowTenantPlatformUpdateSidebar({
  tenantType,
  user,
  availableCount = 0,
  isControlPlane = false,
}) {
  if (isControlPlane) {
    return false;
  }

  if (!isClientTenantType(tenantType)) {
    return false;
  }

  if (EXCLUDED_TENANT_TYPES.has(String(tenantType || "").trim().toUpperCase())) {
    return false;
  }

  if (!canManageTenantPlatformUpdates(user)) {
    return false;
  }

  return Number(availableCount) > 0;
}

export function buildTenantPlatformUpdateSidebarAction(availableCount = 0) {
  const count = Number(availableCount) > 0 ? Number(availableCount) : 0;
  if (count <= 0) {
    return null;
  }

  return {
    id: TENANT_PLATFORM_UPDATE_SIDEBAR_ACTION_ID,
    kind: "action",
    label: "Обновление платформы",
    actionKey: TENANT_PLATFORM_UPDATE_ACTION_KEY,
    badgeCount: count,
    className: "app-sidebar-renderer__service-action--update",
  };
}
