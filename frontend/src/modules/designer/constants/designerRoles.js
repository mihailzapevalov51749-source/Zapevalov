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

function normalizeRoleName(roleName) {
  return String(roleName || "").trim().toLowerCase();
}

function collectUserRoleNames(user) {
  const names = [];
  const primary = user.role || user.role_name || user.roleName;

  if (primary) {
    names.push(normalizeRoleName(primary));
  }

  if (Array.isArray(user.roles)) {
    for (const role of user.roles) {
      if (typeof role === "string") {
        names.push(normalizeRoleName(role));
      } else if (role && typeof role === "object") {
        names.push(
          normalizeRoleName(role.name || role.slug || role.role || role.role_name),
        );
      }
    }
  }

  return names.filter(Boolean);
}

export function canAccessDesigner(user) {
  if (!user) {
    return false;
  }

  return collectUserRoleNames(user).some((roleName) => DESIGNER_ROLES.has(roleName));
}
