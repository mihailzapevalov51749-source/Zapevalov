import { useMemo } from "react";
import { useLocation } from "react-router-dom";

import PlatformWorkspaceTabPage from "../platform/PlatformWorkspaceTabPage.jsx";
import PlatformWorkspaceTabs from "../platform/PlatformWorkspaceTabs.jsx";
import {
  PLATFORM_WORKSPACE_DEFAULT_TAB_SLUG,
  resolvePlatformWorkspaceTab,
} from "../platform/platformWorkspaceConfig.js";

import "../platform/platformWorkspacePage.css";

function resolveActiveTabSlug(pathname = "") {
  const normalized = String(pathname || "").replace(/\/+$/, "");
  const match = normalized.match(/\/control-plane\/platform\/([^/]+)/);
  return match?.[1] || PLATFORM_WORKSPACE_DEFAULT_TAB_SLUG;
}

export default function PlatformWorkspacePage() {
  const location = useLocation();
  const activeSlug = useMemo(
    () => resolveActiveTabSlug(location.pathname),
    [location.pathname],
  );
  const activeTab = resolvePlatformWorkspaceTab(activeSlug);

  return (
    <div className="platform-workspace">
      <PlatformWorkspaceTabs />
      <div className="platform-workspace__canvas" data-page-canvas>
        <PlatformWorkspaceTabPage tabSlug={activeTab.slug} />
      </div>
    </div>
  );
}
