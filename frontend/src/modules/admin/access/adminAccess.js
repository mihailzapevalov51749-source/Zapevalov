import { isPlatformOwner } from "../../../shared/platformAccess/platformOwnerAccess.js";
import { resolveTenantEnvironmentRoleCode } from "../../../shared/tenantEnvironment/tenantEnvironment.js";
import {
  canAccessTenantAdministration as canAccessTenantAdministrationByRole,
  resolveTenantRoleName,
} from "../../../shared/tenantRoles/tenantRoleModel.js";

const PLATFORM_CONTROL_PLANE_ROLES = new Set(["superadmin", "admin"]);

export function resolveRoleName(user) {
  return resolveTenantRoleName(user);
}

export function canAccessControlPlane(user) {
  if (isPlatformOwner(user)) {
    return true;
  }

  return PLATFORM_CONTROL_PLANE_ROLES.has(resolveRoleName(user));
}

export function canAccessTenantAdministration(user) {
  return canAccessTenantAdministrationByRole(user);
}

/**
 * Temporary UX gate: Studio menu entry to Control Plane is DEV-only.
 * Shows for tenantId=1 (platform dev workspace) or tenant_type=DEV.
 */
export function canShowControlPlaneStudioMenuEntry({ tenantId, tenantType } = {}) {
  const normalizedTenantId = Number(tenantId) > 0 ? Number(tenantId) : 1;

  if (normalizedTenantId === 1) {
    return true;
  }

  return resolveTenantEnvironmentRoleCode({
    tenantId: normalizedTenantId,
    tenantType,
  }) === "DEV";
}

export function isControlPlaneStudioMenuItem(item) {
  const route = String(item?.route || item?.path || item?.url || "").trim();
  return route === "/control-plane"
    || String(item?.id || "") === "system-designer-control-plane";
}

export function filterControlPlaneStudioMenuItems(items) {
  if (!Array.isArray(items)) {
    return [];
  }

  return items
    .filter((item) => !isControlPlaneStudioMenuItem(item))
    .map((item) => ({
      ...item,
      children: filterControlPlaneStudioMenuItems(item.children),
    }));
}

/**
 * Temporary UX gate: Studio event journal is DEV-only.
 * Shows for tenantId=1 (platform dev workspace) or tenant_type=DEV.
 */
export function canShowPlatformEventJournalInStudio({ tenantId, tenantType } = {}) {
  return canShowControlPlaneStudioMenuEntry({ tenantId, tenantType });
}

export function isPlatformEventJournalStudioMenuItem(item) {
  const route = String(item?.route || item?.path || item?.url || "").trim();
  return (
    route.includes("/event-journal")
    || String(item?.id || "") === "system-designer-event-journal"
  );
}

export function isLegacyPlatformDashboardStudioMenuItem(item) {
  const route = String(item?.route || item?.path || item?.url || "").trim();
  return (
    route.includes("/platform/")
    || String(item?.id || "") === "system-designer-platform"
    || String(item?.system_key || "") === "platform"
  );
}

export function filterPlatformStudioMenuItems(items) {
  if (!Array.isArray(items)) {
    return [];
  }

  return items
    .filter(
      (item) =>
        !isPlatformEventJournalStudioMenuItem(item)
        && !isLegacyPlatformDashboardStudioMenuItem(item),
    )
    .map((item) => ({
      ...item,
      children: filterPlatformStudioMenuItems(item.children),
    }));
}
