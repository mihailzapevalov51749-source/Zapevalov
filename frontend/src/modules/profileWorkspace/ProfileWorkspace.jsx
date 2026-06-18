import { useMemo } from "react";
import { useLocation, useParams } from "react-router-dom";

import { resolveStudioTenantIdFromPath } from "../admin/config/tenantAdminPaths.js";
import ProfileProvider from "./ProfileProvider.jsx";
import ProfileTabPage from "./ProfileTabPage.jsx";
import ProfileWorkspaceTabs from "./ProfileWorkspaceTabs.jsx";
import { useProfile } from "./ProfileContext.jsx";
import { isProfileModePlatform, PROFILE_MODE_PLATFORM } from "./profileMode.js";
import {
  PROFILE_WORKSPACE_DEFAULT_TAB_SLUG,
  resolveProfileWorkspaceTab,
} from "./profileWorkspaceConfig.js";
import { resolveProfileWorkspaceHostClass } from "./profileWorkspaceLayout.js";

import "./profileWorkspacePage.css";

function resolveActiveTabSlug(pathname = "", mode = PROFILE_MODE_PLATFORM) {
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

function ProfileWorkspaceCanvas({ mode, portalId }) {
  const location = useLocation();
  const { isLoading, loadError } = useProfile();
  const activeSlug = useMemo(
    () => resolveActiveTabSlug(location.pathname, mode),
    [location.pathname, mode],
  );
  const activeTab = resolveProfileWorkspaceTab(mode, activeSlug, portalId);

  if (isLoading) {
    return <div className="profile-workspace__state">Загрузка профиля...</div>;
  }

  if (loadError) {
    return <div className="profile-workspace__state profile-workspace__state--error">{loadError}</div>;
  }

  if (!activeTab) {
    return null;
  }

  return <ProfileTabPage tabSlug={activeTab.slug} />;
}

function ProfileWorkspaceInner({ mode, portalId = null, ariaLabel }) {
  const location = useLocation();
  const hostClass = resolveProfileWorkspaceHostClass(location.pathname);

  return (
    <div className={["profile-workspace", hostClass].filter(Boolean).join(" ")}>
      <ProfileWorkspaceTabs mode={mode} portalId={portalId} ariaLabel={ariaLabel} />
      <div className="profile-workspace__canvas" data-page-canvas>
        <ProfileWorkspaceCanvas mode={mode} portalId={portalId} />
      </div>
    </div>
  );
}

export default function ProfileWorkspace({
  mode = PROFILE_MODE_PLATFORM,
  portalId = null,
  ariaLabel = "Вкладки профиля",
}) {
  const location = useLocation();
  const { portalId: portalIdParam } = useParams();
  const resolvedPortalId =
    portalId
    ?? resolveStudioTenantIdFromPath(location.pathname)
    ?? (portalIdParam ? Number(portalIdParam) : null);

  return (
    <ProfileProvider mode={mode} tenantId={resolvedPortalId}>
      <ProfileWorkspaceInner
        mode={mode}
        portalId={resolvedPortalId}
        ariaLabel={ariaLabel}
      />
    </ProfileProvider>
  );
}
