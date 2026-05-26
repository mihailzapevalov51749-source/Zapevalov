export const DESIGNER_ROLES = new Set([
  "admin",
  "superadmin",
  "platform_designer",
  "platform_architect",
]);

export function canAccessDesigner(user) {
  if (!user) {
    return false;
  }

  const roleName = user.role || user.role_name || user.roleName;
  return DESIGNER_ROLES.has(roleName);
}
