import { useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import "../../portal/components/workspaceRuntimeTabsBar.css";
import {
  getProfileWorkspaceTabs,
  PROFILE_WORKSPACE_DEFAULT_TAB_SLUG,
} from "./profileWorkspaceConfig.js";
import { isProfileModePlatform } from "./profileMode.js";

function resolveActiveTabSlug(pathname = "", mode = "platform") {
  const normalized = String(pathname || "").replace(/\/+$/, "");

  if (isProfileModePlatform(mode)) {
    const match = normalized.match(/\/control-plane\/platform-profile\/([^/]+)/);
    return match?.[1] || PROFILE_WORKSPACE_DEFAULT_TAB_SLUG;
  }

  const studioMatch = normalized.match(
    /\/designer\/tenant\/\d+\/administration\/settings\/([^/]+)/,
  );
  if (studioMatch?.[1]) {
    return studioMatch[1];
  }

  if (/\/administration\/settings(?:\/|$)/.test(normalized)) {
    return PROFILE_WORKSPACE_DEFAULT_TAB_SLUG;
  }

  const legacyMatch = normalized.match(/\/control-plane\/companies\/clients\/\d+\/profile\/([^/]+)/);
  return legacyMatch?.[1] || PROFILE_WORKSPACE_DEFAULT_TAB_SLUG;
}

export default function ProfileWorkspaceTabs({ mode, portalId = null, ariaLabel = "Вкладки профиля" }) {
  const location = useLocation();
  const navigate = useNavigate();
  const activeSlug = useMemo(
    () => resolveActiveTabSlug(location.pathname, mode),
    [location.pathname, mode],
  );

  const enabledTabs = getProfileWorkspaceTabs(mode, portalId).filter((tab) => tab.enabled);

  return (
    <div className="workspace-runtime-tabs" aria-label={ariaLabel}>
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
