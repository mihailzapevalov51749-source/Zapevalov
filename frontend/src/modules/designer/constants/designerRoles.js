import { canAccessTenantDesigner } from "../../../shared/tenantRoles/tenantRoleModel.js";

export const DESIGNER_ROLES = new Set([
  "admin",
  "superadmin",
  "platform_designer",
  "platform_architect",
]);

export function getStoredCurrentUser() {
  const possibleKeys = ["currentUser", "user", "authUser", "profile", "me"];

  for (const key of possibleKeys) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) {
        continue;
      }

      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        return parsed;
      }
    } catch {
      // ignore malformed storage entries
    }
  }

  return null;
}

export function canAccessDesigner(user) {
  return canAccessTenantDesigner(user);
}

export function canManageNavigationMenu(user) {
  return canAccessDesigner(user);
}
