import { useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import "../../../portal/components/workspaceRuntimeTabsBar.css";
import { COMPANIES_WORKSPACE_TABS } from "./companiesWorkspaceConfig.js";

function resolveActiveTabSlug(pathname = "") {
  const normalized = String(pathname || "").replace(/\/+$/, "");
  const match = normalized.match(/\/control-plane\/companies\/([^/]+)/);
  return match?.[1] || "clients";
}

export default function CompaniesWorkspaceTabs() {
  const location = useLocation();
  const navigate = useNavigate();
  const activeSlug = useMemo(
    () => resolveActiveTabSlug(location.pathname),
    [location.pathname],
  );

  const enabledTabs = COMPANIES_WORKSPACE_TABS.filter((tab) => tab.enabled);

  return (
    <div className="workspace-runtime-tabs" aria-label="Вкладки пространства Компании">
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
