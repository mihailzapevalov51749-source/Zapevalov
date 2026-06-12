import { useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import "../../../portal/components/workspaceRuntimeTabsBar.css";
import {
  PLATFORM_PROFILE_DEFAULT_TAB_SLUG,
  PLATFORM_PROFILE_WORKSPACE_TABS,
} from "./platformProfileWorkspaceConfig.js";

function resolveActiveTabSlug(pathname = "") {
  const normalized = String(pathname || "").replace(/\/+$/, "");
  const match = normalized.match(/\/control-plane\/platform-profile\/([^/]+)/);
  return match?.[1] || PLATFORM_PROFILE_DEFAULT_TAB_SLUG;
}

export default function PlatformProfileWorkspaceTabs() {
  const location = useLocation();
  const navigate = useNavigate();
  const activeSlug = useMemo(
    () => resolveActiveTabSlug(location.pathname),
    [location.pathname],
  );

  const enabledTabs = PLATFORM_PROFILE_WORKSPACE_TABS.filter((tab) => tab.enabled);

  return (
    <div className="workspace-runtime-tabs" aria-label="Вкладки пространства Профиль платформы">
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
