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
  if (!user) {
    return false;
  }

  const roleName = user.role || user.role_name || user.roleName;
  return DESIGNER_ROLES.has(roleName);
}
