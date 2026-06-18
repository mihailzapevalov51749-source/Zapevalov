import { useMemo } from "react";
import { useLocation } from "react-router-dom";

import GlobalUsersPage from "../globalUsers/GlobalUsersPage";
import PlatformRolesPage from "../platformRoles/PlatformRolesPage";
import PlatformUsersPage from "../platformUsers/PlatformUsersPage";
import UsersRolesWorkspaceTabs from "../usersRoles/UsersRolesWorkspaceTabs";

import "../usersRoles/usersRolesWorkspacePage.css";

function resolveActiveTabSlug(pathname = "") {
  const normalized = String(pathname || "").replace(/\/+$/, "");
  const match = normalized.match(/\/control-plane\/users-roles\/([^/]+)/);
  return match?.[1] || "users";
}

export default function UsersRolesWorkspacePage() {
  const location = useLocation();
  const activeSlug = useMemo(
    () => resolveActiveTabSlug(location.pathname),
    [location.pathname],
  );

  return (
    <div className="users-roles-workspace">
      <UsersRolesWorkspaceTabs />
      <div className="users-roles-workspace__canvas" data-page-canvas>
        {activeSlug === "roles" ? (
          <PlatformRolesPage />
        ) : activeSlug === "global-users" ? (
          <GlobalUsersPage />
        ) : (
          <PlatformUsersPage />
        )}
      </div>
    </div>
  );
}
