import { buildControlPlaneUsersRolesPath } from "../config/controlPlanePaths.js";

export const USERS_ROLES_WORKSPACE_TABS = [
  {
    id: "users",
    slug: "users",
    label: "Пользователи",
    route: buildControlPlaneUsersRolesPath("users"),
    enabled: true,
  },
  {
    id: "roles",
    slug: "roles",
    label: "Роли",
    route: buildControlPlaneUsersRolesPath("roles"),
    enabled: true,
  },
];

export function resolveUsersRolesWorkspaceTab(slug = "users") {
  const normalized = String(slug || "").trim() || "users";
  return (
    USERS_ROLES_WORKSPACE_TABS.find((tab) => tab.slug === normalized && tab.enabled)
    ?? USERS_ROLES_WORKSPACE_TABS[0]
  );
}
