import { useMemo } from "react";
import { useLocation } from "react-router-dom";

import PlatformProfileTabPage from "../platformProfile/PlatformProfileTabPage.jsx";
import PlatformProfileWorkspaceTabs from "../platformProfile/PlatformProfileWorkspaceTabs.jsx";
import {
  PLATFORM_PROFILE_DEFAULT_TAB_SLUG,
  resolvePlatformProfileWorkspaceTab,
} from "../platformProfile/platformProfileWorkspaceConfig.js";

import "../platformProfile/platformProfileWorkspacePage.css";

function resolveActiveTabSlug(pathname = "") {
  const normalized = String(pathname || "").replace(/\/+$/, "");
  const match = normalized.match(/\/control-plane\/platform-profile\/([^/]+)/);
  return match?.[1] || PLATFORM_PROFILE_DEFAULT_TAB_SLUG;
}

export default function PlatformProfileWorkspacePage() {
  const location = useLocation();
  const activeSlug = useMemo(
    () => resolveActiveTabSlug(location.pathname),
    [location.pathname],
  );
  const activeTab = resolvePlatformProfileWorkspaceTab(activeSlug);

  return (
    <div className="platform-profile-workspace">
      <PlatformProfileWorkspaceTabs />
      <div className="platform-profile-workspace__canvas" data-page-canvas>
        <PlatformProfileTabPage tabSlug={activeTab.slug} />
      </div>
    </div>
  );
}
