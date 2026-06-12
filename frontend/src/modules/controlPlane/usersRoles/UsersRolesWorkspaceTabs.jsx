import { useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import "../../../portal/components/workspaceRuntimeTabsBar.css";
import { USERS_ROLES_WORKSPACE_TABS } from "./usersRolesWorkspaceConfig.js";

function resolveActiveTabSlug(pathname = "") {
  const normalized = String(pathname || "").replace(/\/+$/, "");
  const match = normalized.match(/\/control-plane\/users-roles\/([^/]+)/);
  return match?.[1] || "users";
}

export default function UsersRolesWorkspaceTabs() {
  const location = useLocation();
  const navigate = useNavigate();
  const activeSlug = useMemo(
    () => resolveActiveTabSlug(location.pathname),
    [location.pathname],
  );

  const enabledTabs = USERS_ROLES_WORKSPACE_TABS.filter((tab) => tab.enabled);

  return (
    <div className="workspace-runtime-tabs" aria-label="Вкладки пространства Пользователи и роли">
      <nav className="workspace-runtime-tabs__list">
        {enabledTabs.map((tab) => {
          const isActive = tab.slug === activeSlug;

          return (
            <button
              key={tab.id}
              type="button"
              className={`workspace-runtime-tabs__tab${isActive ? " is-active" : ""}`}
              onClick={() => navigate(tab.route)}
              aria-current={isActive ? "page" : undefined}
            >
              {tab.label}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
