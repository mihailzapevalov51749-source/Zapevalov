import { useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import "../../../portal/components/workspaceRuntimeTabsBar.css";
import {
  PLATFORM_WORKSPACE_DEFAULT_TAB_SLUG,
  PLATFORM_WORKSPACE_TABS,
} from "./platformWorkspaceConfig.js";

function resolveActiveTabSlug(pathname = "") {
  const normalized = String(pathname || "").replace(/\/+$/, "");
  const match = normalized.match(/\/control-plane\/platform\/([^/]+)/);
  return match?.[1] || PLATFORM_WORKSPACE_DEFAULT_TAB_SLUG;
}

export default function PlatformWorkspaceTabs() {
  const location = useLocation();
  const navigate = useNavigate();
  const activeSlug = useMemo(
    () => resolveActiveTabSlug(location.pathname),
    [location.pathname],
  );

  const enabledTabs = PLATFORM_WORKSPACE_TABS.filter((tab) => tab.enabled);

  return (
    <div className="workspace-runtime-tabs" aria-label="Вкладки пространства Платформа">
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
