import { useCallback, useEffect, useMemo, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";

import { getMe } from "../../../api/authApi";
import useNotifications from "../../notifications/hooks/useNotifications";
import useNotificationNavigationOrchestrator from "../../notifications/hooks/useNotificationNavigationOrchestrator";
import NotificationOverlayHost from "../../notifications/components/NotificationOverlayHost";
import { useProfileSidePanel } from "../../../profile/ProfileSidePanelProvider.jsx";
import { TRANSITION_TOKENS } from "../../../shared/layout/transitionTokens";
import { createDesignerHeaderContract } from "../../../shared/shell/header";
import AppShellFrame from "../../../shared/shell/AppShellFrame";
import { ShellLayoutModeProvider } from "../../../shared/shell/ShellLayoutModeContext.jsx";
import { SHELL_LAYOUT_MODE } from "../../../shared/shell/shellLayoutMode.js";
import SearchResultsOverlay from "../../../shared/search/SearchResultsOverlay";
import { useHeaderSearchContext } from "../../../shared/search/useHeaderSearchContext";
import { useHeaderSearchController } from "../../../shared/search/useHeaderSearchController";
import { canUseHeaderSearch } from "../../../shared/search/searchRoleUtils";
import { SEARCH_MODES } from "../../../shared/search/searchScopes";
import {
  readControlPlaneLeftMenuScale,
  writeControlPlaneActiveSection,
  writeControlPlaneLeftMenuScale,
} from "../../../shared/uiStorage/controlPlaneUiStorage.js";
import { resolveControlPlanePageMeta } from "../config/controlPlaneNavigation.js";
import { resolveControlPlaneSectionKey, resolveControlPlaneReturnToStudioPath } from "../config/controlPlanePaths.js";
import { resolveUserAvatarUrl } from "../platformUsers/platformUserUtils.js";
import { createControlPlaneSidebarContract } from "./createControlPlaneSidebarContract.js";
import { useControlPlaneSidebarState } from "./useControlPlaneSidebarState.js";
import { usePlatformSettings } from "../platformProfile/PlatformSettingsProvider.jsx";

const DEFAULT_AVATAR_SETTINGS = {
  x: 0,
  y: 0,
  scale: 1,
};

function normalizeAvatarSettings(settings) {
  if (!settings) {
    return DEFAULT_AVATAR_SETTINGS;
  }

  if (typeof settings === "string") {
    try {
      return {
        ...DEFAULT_AVATAR_SETTINGS,
        ...JSON.parse(settings),
      };
    } catch {
      return DEFAULT_AVATAR_SETTINGS;
    }
  }

  if (typeof settings === "object") {
    return {
      ...DEFAULT_AVATAR_SETTINGS,
      ...settings,
    };
  }

  return DEFAULT_AVATAR_SETTINGS;
}

export default function ControlPlaneShell() {
  const navigate = useNavigate();
  const location = useLocation();
  const { platformName, platformShortName } = usePlatformSettings();
  const { openProfileSidePanel } = useProfileSidePanel();
  const { sidebarCollapsed, toggleSidebarCollapsed } = useControlPlaneSidebarState();
  const [menuScale, setMenuScale] = useState(() => readControlPlaneLeftMenuScale(1));
  const [isMenuEditMode, setIsMenuEditMode] = useState(false);
  const [headerUser, setHeaderUser] = useState(null);
  const { notifications, unreadCount, markAsRead } = useNotifications();

  useNotificationNavigationOrchestrator({
    activePageId: null,
    onSelectPage: null,
    user: headerUser,
    enabled: false,
  });

  const pageMeta = useMemo(
    () => resolveControlPlanePageMeta(location.pathname),
    [location.pathname],
  );

  useEffect(() => {
    writeControlPlaneActiveSection(resolveControlPlaneSectionKey(location.pathname));
  }, [location.pathname]);

  useEffect(() => {
    const brand = platformName || "ЯсноПро";
    const pageTitle = pageMeta.title ? `${pageMeta.title} — ${brand}` : brand;
    document.title = pageTitle;
  }, [pageMeta.title, platformName]);

  const handleMenuScaleChange = useCallback((value) => {
    const rounded = writeControlPlaneLeftMenuScale(value);
    setMenuScale(rounded);
  }, []);

  const headerSearchContextInput = useMemo(
    () => ({
      pathname: location.pathname,
      mode: SEARCH_MODES.DESIGNER,
    }),
    [location.pathname],
  );
  const searchContext = useHeaderSearchContext(headerSearchContextInput);
  const canSearch = canUseHeaderSearch(SEARCH_MODES.DESIGNER, headerUser);
  const headerSearch = useHeaderSearchController({
    searchContext,
    enabled: canSearch,
    user: headerUser,
  });

  useEffect(() => {
    let isMounted = true;

    async function loadHeaderUser() {
      try {
        const data = await getMe();
        if (isMounted) {
          setHeaderUser({
            ...data,
            avatar_settings: normalizeAvatarSettings(data?.avatar_settings),
          });
        }
      } catch {
        if (isMounted) {
          setHeaderUser(null);
        }
      }
    }

    loadHeaderUser();

    return () => {
      isMounted = false;
    };
  }, []);

  const avatarSettings = useMemo(
    () => normalizeAvatarSettings(headerUser?.avatar_settings),
    [headerUser?.avatar_settings],
  );

  const sidebarContract = useMemo(
    () =>
      createControlPlaneSidebarContract({
        activePath: location.pathname,
        menuScale,
        isEditMode: isMenuEditMode,
        onChangeMenuScale: handleMenuScaleChange,
        platformName,
      }),
    [handleMenuScaleChange, isMenuEditMode, location.pathname, menuScale, platformName],
  );

  const headerContract = useMemo(() => {
    const pathChain = [
      {
        id: "control-plane-root",
        label: platformShortName || platformName || "Control Plane",
        path: "/control-plane",
      },
      ...(Array.isArray(pageMeta.breadcrumbTrail) && pageMeta.breadcrumbTrail.length > 0
        ? pageMeta.breadcrumbTrail.map((item, index) => ({
            id: `control-plane-breadcrumb-${index}`,
            label: item.label,
            path: item.path,
          }))
        : location.pathname !== "/control-plane"
          ? [
              {
                id: "control-plane-current",
                label: pageMeta.title,
                path: location.pathname,
              },
            ]
          : []),
    ];

    return createDesignerHeaderContract({
      user: {
        id: headerUser?.id,
        name: headerUser?.full_name,
        email: headerUser?.email,
        avatarUrl: resolveUserAvatarUrl(headerUser),
      },
      pathname: location.pathname,
      title: pageMeta.title,
      subtitle: pageMeta.subtitle,
      searchQuery: headerSearch.searchQuery,
      searchPlaceholder: searchContext.label,
      notificationUnreadCount: unreadCount,
      notificationItems: notifications,
      onReadNotification: markAsRead,
      avatarSettings,
      canSearch,
      canViewNotifications: true,
      canEditPage: false,
      canOpenSettings: false,
      isEditMode: false,
      pathChain,
      meta: {
        canGoBack: window.history.length > 1,
      },
    });
  }, [
    avatarSettings,
    canSearch,
    headerSearch.searchQuery,
    headerUser,
    location.pathname,
    markAsRead,
    notifications,
    pageMeta.breadcrumbTrail,
    pageMeta.subtitle,
    pageMeta.title,
    platformName,
    platformShortName,
    searchContext.label,
    unreadCount,
  ]);

  const handleHeaderAction = useCallback(
    (actionKey, payload) => {
      switch (actionKey) {
        case "search-change":
          headerSearch.onQueryChange?.(payload?.value ?? "");
          return;
        case "search-submit":
          headerSearch.submitSearch?.();
          return;
        case "search-result-select": {
          const firstPath = payload?.path || payload?.item?.path;
          if (typeof firstPath === "string" && firstPath.trim()) {
            navigate(firstPath);
            headerSearch.closeResults?.();
          }
          return;
        }
        case "search-clear":
          headerSearch.onQueryChange?.("");
          headerSearch.clearResults?.();
          return;
        case "profile":
          openProfileSidePanel();
          return;
        case "breadcrumb-navigate":
        case "context-path-navigate":
          if (typeof payload?.path === "string" && payload.path.trim()) {
            navigate(payload.path);
          }
          return;
        case "back":
          if (window.history.length > 1) {
            navigate(-1);
          }
          return;
        default:
          return;
      }
    },
    [headerSearch, navigate, openProfileSidePanel],
  );

  const handleSidebarItemAction = useCallback(
    (item, event) => {
      if (item?.disabled) {
        return;
      }

      const targetPath =
        item?.path || item?.route || item?.url || item?.meta?.route || item?.meta?.url;

      if (typeof targetPath === "string" && targetPath.trim()) {
        event?.preventDefault?.();
        navigate(targetPath);
      }
    },
    [navigate],
  );

  const handleSidebarAction = useCallback(
    (actionKey, payload) => {
      if (actionKey === "return-to-studio") {
        navigate(resolveControlPlaneReturnToStudioPath());
        return;
      }

      if (actionKey === "toggle-edit-mode" || actionKey === "open-menu-settings") {
        setIsMenuEditMode((previous) => !previous);
        return;
      }

      if (actionKey === "menu-scale" && payload?.step != null) {
        handleMenuScaleChange(menuScale + Number(payload.step));
      }
    },
    [handleMenuScaleChange, menuScale, navigate],
  );

  return (
    <>
      <ShellLayoutModeProvider mode={SHELL_LAYOUT_MODE.EMBEDDED}>
        <AppShellFrame
          headerContract={headerContract}
          sidebarContract={sidebarContract}
          sidebarCollapsed={sidebarCollapsed}
          onToggleSidebarCollapsed={toggleSidebarCollapsed}
          platformZone="studio"
          onHeaderAction={handleHeaderAction}
          onSidebarItemAction={handleSidebarItemAction}
          onSidebarAction={handleSidebarAction}
          sidebarTransition={TRANSITION_TOKENS.shell.sidebarWidth}
          workspaceTransition={TRANSITION_TOKENS.shell.workspaceLeft}
          workspace={
            <div
              className="control-plane-root"
              data-platform-zone="studio"
              style={{
                flex: "1 1 auto",
                height: "100%",
                minHeight: 0,
                minWidth: 0,
                overflowX: "hidden",
                overflowY: "auto",
                padding: "8px 12px 20px",
                boxSizing: "border-box",
                background: "#F8FAFC",
              }}
            >
              <Outlet />
            </div>
          }
        />
      </ShellLayoutModeProvider>

      <SearchResultsOverlay
        isVisible={headerSearch.isOverlayVisible}
        isLoading={headerSearch.isLoading}
        error={headerSearch.error}
        results={headerSearch.results}
        scopeLabel={searchContext.label}
        onClose={headerSearch.closeResults}
      />
      <NotificationOverlayHost />
    </>
  );
}
