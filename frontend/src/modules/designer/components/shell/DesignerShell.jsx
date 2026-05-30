import { useCallback, useEffect, useMemo, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";

import { getMe } from "../../../../api/authApi";
import CreateMenuItemModal from "../../../../modules/navigation/components/CreateMenuItemModal";
import ProfileSidePanel from "../../../../profile/components/ProfileSidePanel";
import useNotifications from "../../../../modules/notifications/hooks/useNotifications";
import useNotificationNavigationOrchestrator from "../../../../modules/notifications/hooks/useNotificationNavigationOrchestrator";
import NotificationOverlayHost from "../../../../modules/notifications/components/NotificationOverlayHost";
import { useDesignerShell } from "../../context/DesignerShellContext";
import { TRANSITION_TOKENS } from "../../../../shared/layout/transitionTokens";
import { createDesignerHeaderContract } from "../../../../shared/shell/header";
import AppShellFrame from "../../../../shared/shell/AppShellFrame";
import { createDesignerSidebarContract } from "../../../../shared/shell/sidebar";
import { usePlatformSidebarControls } from "../../../../shared/shell/sidebar/usePlatformSidebarControls";
import {
  applyDesignerSystemMenuSettings,
  getDesignerSystemMenuSettingsEventName,
} from "../../../../shared/shell/sidebar/designerSystemMenuSettings";
import { defaultCapabilitiesForMode } from "../../../../shared/shell/provider/appShellTypes";
import { emitDesignerShadowSnapshot } from "../../../../shared/shell/shadow/designer";
import { getLastRuntimePath } from "../../../../shared/appMode/appModeStorage";
import useNavigationTree from "../../../../modules/navigation/hooks/useNavigationTree";
import * as designerApi from "../../api/designerApi";
import { mergeDesignerSidebarNavigation } from "../../utils/mergeDesignerSidebarNavigation";
import { DESIGNER_OBJECT_VIEW_HEADER_EVENT } from "../../utils/designerObjectViewHeaderBridge";
import {
  buildDesignerBreadcrumbs,
  resolveDesignerActiveSectionKey,
  resolveObjectTypeNameFromNavigation,
} from "../../../../shared/shell/designer/designerNavigationResolver";
import {
  publishObjectShortcutRouteOwner,
  publishObjectsSectionRouteOwner,
  publishRootSectionRouteOwner,
  resolveDesignerRouteOwner,
  setDesignerRouteOwner,
} from "../../../../shared/shell/designer/designerRouteOwnership";
import SearchResultsOverlay from "../../../../shared/search/SearchResultsOverlay";
import { useHeaderSearchContext } from "../../../../shared/search/useHeaderSearchContext";
import { useHeaderSearchController } from "../../../../shared/search/useHeaderSearchController";
import { canUseHeaderSearch } from "../../../../shared/search/searchRoleUtils";
import { SEARCH_MODES } from "../../../../shared/search/searchScopes";

const DEFAULT_AVATAR_SETTINGS = {
  x: 0,
  y: 0,
  scale: 1,
};
const HEADER_USER_CACHE_KEY = "__YASNOPRO_HEADER_USER_CACHE__";

function getCachedHeaderUser() {
  return window[HEADER_USER_CACHE_KEY] ?? null;
}

function setCachedHeaderUser(nextUser) {
  if (!nextUser) return;
  window[HEADER_USER_CACHE_KEY] = nextUser;
}

function normalizeAvatarSettings(settings) {
  if (!settings) return DEFAULT_AVATAR_SETTINGS;

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

function resolveRoleName(user) {
  return String(user?.role || user?.role_name || user?.roleName || "").trim().toLowerCase();
}

function isSuperadminUser(user) {
  if (!user) return false;
  if (resolveRoleName(user) === "superadmin") return true;
  const roleId = Number(user?.role_id ?? user?.roleId ?? user?.role?.id);
  return Number.isFinite(roleId) && roleId === 4;
}

function appendDesignerAdministrationItem(items, tenantId, isSuperadmin) {
  if (!isSuperadmin) return Array.isArray(items) ? items : [];
  const normalizedTenantId = Number(tenantId) || 1;
  const adminPath = `/designer/tenant/${normalizedTenantId}/administration`;
  const hasAdmin = Array.isArray(items)
    ? items.some((item) => {
        const route = String(item?.route || item?.path || item?.url || "").trim();
        return route === adminPath;
      })
    : false;
  if (hasAdmin) {
    return items;
  }
  return [
    ...(Array.isArray(items) ? items : []),
    {
      id: "system-designer-administration",
      title: "Администрирование",
      type: "system_page",
      route: adminPath,
      path: adminPath,
      menu_scope: "designer",
      scope: "designer",
      mode: "designer",
      is_system: true,
      is_protected: true,
      sort_order: 9999,
    },
  ];
}

function buildDesignerMetaNavigation(tenantId, isSuperadmin) {
  const normalizedTenantId = Number(tenantId) || 1;
  const base = `/designer/tenant/${normalizedTenantId}`;
  const items = [
    {
      id: "system-designer-objects",
      title: "Объекты",
      type: "system_page",
      route: `${base}/object-types`,
      path: `${base}/object-types`,
      menu_scope: "designer",
      scope: "designer",
      mode: "designer",
      is_system: true,
      is_protected: true,
      sort_order: 10,
    },
    {
      id: "system-designer-relations",
      title: "Связи",
      type: "system_page",
      route: `${base}/relations`,
      path: `${base}/relations`,
      menu_scope: "designer",
      scope: "designer",
      mode: "designer",
      is_system: true,
      is_protected: true,
      sort_order: 20,
    },
    {
      id: "system-designer-views",
      title: "Вкладки",
      type: "system_page",
      route: `${base}/views`,
      path: `${base}/views`,
      menu_scope: "designer",
      scope: "designer",
      mode: "designer",
      is_system: true,
      is_protected: true,
      sort_order: 30,
    },
    {
      id: "system-designer-pages",
      title: "Страницы",
      type: "system_page",
      route: `${base}/pages`,
      path: `${base}/pages`,
      menu_scope: "designer",
      scope: "designer",
      mode: "designer",
      is_system: true,
      is_protected: true,
      sort_order: 40,
    },
    {
      id: "system-designer-navigation",
      title: "Навигация",
      type: "system_page",
      route: `${base}/navigation`,
      path: `${base}/navigation`,
      menu_scope: "designer",
      scope: "designer",
      mode: "designer",
      is_system: true,
      is_protected: true,
      sort_order: 50,
    },
    {
      id: "system-designer-processes",
      title: "Бизнес-процессы",
      type: "system_page",
      route: `${base}/processes`,
      path: `${base}/processes`,
      menu_scope: "designer",
      scope: "designer",
      mode: "designer",
      is_system: true,
      is_protected: true,
      sort_order: 60,
    },
    {
      id: "system-designer-workspaces",
      title: "Рабочие пространства",
      type: "system_page",
      route: `${base}/workspaces`,
      path: `${base}/workspaces`,
      menu_scope: "designer",
      scope: "designer",
      mode: "designer",
      is_system: true,
      is_protected: true,
      sort_order: 70,
    },
    {
      id: "system-designer-publishing",
      title: "Публикация",
      type: "system_page",
      route: `${base}/publishing`,
      path: `${base}/publishing`,
      menu_scope: "designer",
      scope: "designer",
      mode: "designer",
      is_system: true,
      is_protected: true,
      sort_order: 80,
    },
    {
      id: "system-designer-platform",
      title: "Платформа",
      type: "system_page",
      route: `${base}/platform/architecture`,
      path: `${base}/platform/architecture`,
      system_key: "platform",
      section: "platform",
      menu_scope: "designer",
      scope: "designer",
      mode: "designer",
      is_system: true,
      is_protected: true,
      sort_order: 85,
    },
  ];

  return appendDesignerAdministrationItem(items, tenantId, isSuperadmin);
}

export default function DesignerShell() {
  const { tenantId, user } = useDesignerShell();
  const resolvedPortalId = Number(tenantId) || 1;
  const navigate = useNavigate();
  const location = useLocation();
  const [menuScale, setMenuScale] = useState(() => {
    const saved = localStorage.getItem("leftMenuScale");
    const parsed = Number(saved);
    return Number.isFinite(parsed) && parsed >= 0.8 && parsed <= 1.4 ? parsed : 1;
  });
  const [headerUser, setHeaderUser] = useState(() => getCachedHeaderUser());
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isPageEditMode, setIsPageEditMode] = useState(false);
  const [activeObjectTypeName, setActiveObjectTypeName] = useState("");
  const [activeObjectAdapterLabel, setActiveObjectAdapterLabel] = useState("");
  const [systemSettingsVersion, setSystemSettingsVersion] = useState(0);
  const { notifications, unreadCount, markAsRead } = useNotifications();
  const isSuperadmin = isSuperadminUser(headerUser ?? user);

  const isDesignerCustomPage = /\/designer\/tenant\/\d+\/page\/\d+/.test(
    location.pathname
  );

  const navigationQuery = useMemo(
    () => ({ scope: "designer", mode: "designer" }),
    []
  );
  const { navigation, reloadNavigation, sourceMode } = useNavigationTree(
    resolvedPortalId,
    navigationQuery
  );

  const headerSearchContextInput = useMemo(
    () => ({
      pathname: location.pathname,
      routeParams: { tenantId: resolvedPortalId },
    }),
    [location.pathname, resolvedPortalId],
  );
  const searchContext = useHeaderSearchContext(headerSearchContextInput);
  const canSearch = canUseHeaderSearch(SEARCH_MODES.DESIGNER, headerUser ?? user);
  const headerSearch = useHeaderSearchController({
    searchContext,
    enabled: canSearch,
    user: headerUser ?? user,
  });

  const handleMenuScaleChange = useCallback((value) => {
    const rounded = Math.max(0.8, Math.min(1.4, Number(value ?? 1)));
    setMenuScale(rounded);
    localStorage.setItem("leftMenuScale", String(rounded));
  }, []);

  const hasPersistedDesignerNavigation = sourceMode === "persisted-designer";

  const sidebarControls = usePlatformSidebarControls({
    portalId: resolvedPortalId,
    mode: "designer",
    reloadNavigation,
    menuScale,
    onChangeMenuScale: handleMenuScaleChange,
    canEditMenu: true,
    canCreateItem: true,
    canDragItems: hasPersistedDesignerNavigation,
    createPayloadDefaults: {
      scope: "designer",
      mode: "designer",
      context: "designer",
    },
  });

  const designerActiveKey = resolveDesignerActiveSectionKey(
    location.pathname,
    resolvedPortalId,
  );
  const activeDesignerObjectId =
    location.pathname.match(/object-types\/([^/]+)/)?.[1] ?? null;
  const activeDesignerPageId = Number(
    location.pathname.match(/\/designer\/tenant\/\d+\/page\/(\d+)/)?.[1]
  );

  useNotificationNavigationOrchestrator({
    activePageId: Number.isFinite(activeDesignerPageId)
      ? activeDesignerPageId
      : null,
    onSelectPage: (pageId) => {
      if (pageId == null) {
        return;
      }
      navigate(`/designer/tenant/${resolvedPortalId}/page/${pageId}`);
    },
    user: headerUser ?? user,
  });

  const designerSidebarNavigation = useMemo(() => {
    const baseItems = buildDesignerMetaNavigation(resolvedPortalId, isSuperadmin);
    const withSettings = applyDesignerSystemMenuSettings(
      baseItems,
      resolvedPortalId,
      isSuperadmin,
      {
        showHiddenInEditMode: sidebarControls.isEditMode,
      },
    );
    return mergeDesignerSidebarNavigation(withSettings, navigation);
  }, [
    resolvedPortalId,
    isSuperadmin,
    sidebarControls.isEditMode,
    systemSettingsVersion,
    navigation,
  ]);

  useEffect(() => {
    const handleNavigationReload = () => {
      reloadNavigation();
    };

    window.addEventListener("yasnopro:designer-navigation:reload", handleNavigationReload);
    return () => {
      window.removeEventListener(
        "yasnopro:designer-navigation:reload",
        handleNavigationReload,
      );
    };
  }, [reloadNavigation]);

  useEffect(() => {
    const eventName = getDesignerSystemMenuSettingsEventName();
    const handleSystemSettingsChanged = () => {
      setSystemSettingsVersion((previous) => previous + 1);
    };
    window.addEventListener(eventName, handleSystemSettingsChanged);
    return () => {
      window.removeEventListener(eventName, handleSystemSettingsChanged);
    };
  }, []);

  const designerRouteOwner = useMemo(
    () =>
      resolveDesignerRouteOwner(
        location.pathname,
        designerSidebarNavigation,
        resolvedPortalId,
      ),
    [location.pathname, designerSidebarNavigation, resolvedPortalId],
  );

  useEffect(() => {
    if (designerRouteOwner) {
      setDesignerRouteOwner(designerRouteOwner);
    }
  }, [designerRouteOwner]);

  const designerSidebarContract = useMemo(() => {
    const base = createDesignerSidebarContract({
      navigationItems: designerSidebarNavigation,
      reloadNavigation,
      sourceMode,
      activePath: location.pathname,
      activePageId: Number.isFinite(activeDesignerPageId)
        ? activeDesignerPageId
        : undefined,
      tenantId: resolvedPortalId,
      routeOwner: designerRouteOwner,
      menuScale,
      isEditMode: sidebarControls.isEditMode,
      onChangeMenuScale: handleMenuScaleChange,
      canEditMenu: true,
      canCreateItem: true,
      canOpenSettings: true,
      canDragItems: hasPersistedDesignerNavigation && sidebarControls.isEditMode,
      canScaleMenu: true,
    });

    return {
      ...base,
      editMode: sidebarControls.isEditMode,
      isSaving: sidebarControls.isSaving,
      menuScale,
    };
  }, [
    designerSidebarNavigation,
    reloadNavigation,
    sourceMode,
    location.pathname,
    activeDesignerPageId,
    menuScale,
    hasPersistedDesignerNavigation,
    sidebarControls.isEditMode,
    sidebarControls.isSaving,
    handleMenuScaleChange,
    designerRouteOwner,
  ]);

  const loadHeaderUser = useCallback(async () => {
    try {
      const data = await getMe();
      setHeaderUser({
        ...data,
        avatar_settings: normalizeAvatarSettings(data.avatar_settings),
      });
      setCachedHeaderUser({
        ...data,
        avatar_settings: normalizeAvatarSettings(data.avatar_settings),
      });
    } catch {
      setHeaderUser((previous) => previous ?? getCachedHeaderUser());
    }
  }, []);

  useEffect(() => {
    loadHeaderUser();
  }, [loadHeaderUser]);

  const avatarSettings = useMemo(
    () => normalizeAvatarSettings(headerUser?.avatar_settings),
    [headerUser?.avatar_settings]
  );

  useEffect(() => {
    setIsPageEditMode(false);
  }, [location.pathname]);

  useEffect(() => {
    const objectTypeId = location.pathname.match(/\/object-types\/([^/?]+)/)?.[1];
    if (!objectTypeId) {
      setActiveObjectTypeName("");
      return;
    }

    let cancelled = false;
    const loadObjectType = async () => {
      try {
        const data = await designerApi.getObjectType(resolvedPortalId, objectTypeId);
        if (cancelled) return;
        const nextName = String(data?.name || data?.title || "").trim();
        setActiveObjectTypeName(
          nextName ||
            resolveObjectTypeNameFromNavigation(navigation, objectTypeId) ||
            objectTypeId,
        );
      } catch {
        if (!cancelled) {
          setActiveObjectTypeName(
            resolveObjectTypeNameFromNavigation(navigation, objectTypeId) ||
              objectTypeId,
          );
        }
      }
    };

    loadObjectType();
    return () => {
      cancelled = true;
    };
  }, [location.pathname, resolvedPortalId, navigation]);

  useEffect(() => {
    const handleObjectViewHeader = (event) => {
      const detail = event?.detail;
      if (!detail) {
        setActiveObjectAdapterLabel("");
        return;
      }

      const isDataRoute = /\/object-types\/[^/]+\/data\/?$/.test(location.pathname);
      if (!isDataRoute) {
        return;
      }

      const routeObjectTypeId = location.pathname.match(
        /\/object-types\/([^/?]+)/,
      )?.[1];

      if (
        detail.objectTypeId &&
        routeObjectTypeId &&
        String(detail.objectTypeId) !== String(routeObjectTypeId)
      ) {
        return;
      }

      setActiveObjectAdapterLabel(String(detail.activeAdapterLabel || "").trim());
    };

    window.addEventListener(DESIGNER_OBJECT_VIEW_HEADER_EVENT, handleObjectViewHeader);

    return () => {
      window.removeEventListener(
        DESIGNER_OBJECT_VIEW_HEADER_EVENT,
        handleObjectViewHeader,
      );
    };
  }, [location.pathname]);

  useEffect(() => {
    if (!/\/object-types\/[^/]+\/data\/?$/.test(location.pathname)) {
      setActiveObjectAdapterLabel("");
    }
  }, [location.pathname]);

  const designerHeaderContract = useMemo(() => {
    const breadcrumbNavigationItems =
      designerSidebarContract.navigationItems ?? designerSidebarNavigation;
    const breadcrumbActiveItemId = designerSidebarContract.activeItemId ?? null;
    const pathChain = buildDesignerBreadcrumbs(location.pathname, {
      tenantId: resolvedPortalId,
      objectTypeName: activeObjectTypeName,
      navigationItems: breadcrumbNavigationItems,
      activeItemId: breadcrumbActiveItemId,
      activePageId: Number.isFinite(activeDesignerPageId)
        ? activeDesignerPageId
        : null,
      activeObjectAdapterLabel,
      routeOwner: designerRouteOwner,
    });

    return createDesignerHeaderContract({
      tenantId,
      user: {
        id: headerUser?.id ?? user?.id,
        name: headerUser?.full_name ?? user?.full_name,
        email: headerUser?.email ?? user?.email,
        avatarUrl: headerUser?.avatar_url ?? user?.avatar_url,
      },
      pathname: location.pathname,
      searchQuery: headerSearch.searchQuery,
      searchPlaceholder: searchContext.label,
      notificationUnreadCount: unreadCount,
      notificationItems: notifications,
      onReadNotification: markAsRead,
      avatarSettings,
      canSearch,
      canViewNotifications: true,
      canEditPage: isDesignerCustomPage,
      canOpenSettings: isDesignerCustomPage,
      isEditMode: isPageEditMode,
      pathChain,
      activeItemId: breadcrumbActiveItemId,
      navigationItems: breadcrumbNavigationItems,
      routeOwner: designerRouteOwner,
      meta: {
        canGoBack: window.history.length > 1,
      },
    });
  }, [
    tenantId,
    user,
    headerUser,
    location.pathname,
    unreadCount,
    notifications,
    markAsRead,
    avatarSettings,
    canSearch,
    headerSearch.searchQuery,
    searchContext.label,
    isDesignerCustomPage,
    isPageEditMode,
    activeObjectTypeName,
    activeObjectAdapterLabel,
    designerSidebarNavigation,
    designerSidebarContract,
    designerRouteOwner,
  ]);

  const handleHeaderAction = useCallback(
    (actionKey, payload) => {
      switch (actionKey) {
        case "app-mode-switch":
          navigate(getLastRuntimePath());
          return;
        case "search-change":
        case "search":
          headerSearch.onQueryChange?.(String(payload?.value ?? ""));
          return;
        case "search-open-first":
        case "search-submit": {
          const firstPath = headerSearch.openFirstResult?.();
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
          setIsProfileOpen(true);
          return;
        case "breadcrumb-navigate":
        case "context-path-navigate":
          if (typeof payload?.path === "string" && payload.path.trim().length > 0) {
            const breadcrumbId = String(payload?.item?.id ?? "").trim();
            if (breadcrumbId === "designer-objects") {
              publishObjectsSectionRouteOwner(resolvedPortalId);
            }
            if (breadcrumbId === "designer-platform") {
              publishRootSectionRouteOwner("platform", resolvedPortalId);
            }
            navigate(payload.path);
          }
          return;
        case "back": {
          if (window.history.length > 1) {
            navigate(-1);
          }
          return;
        }
        case "enter-edit-mode":
          if (!isDesignerCustomPage) {
            return;
          }
          setIsPageEditMode(true);
          window.dispatchEvent(
            new CustomEvent("yasnopro:designer-page:enter-edit-mode", {
              detail: { pathname: location.pathname, tenantId: resolvedPortalId },
            })
          );
          return;
        case "exit-edit-mode":
          setIsPageEditMode(false);
          window.dispatchEvent(
            new CustomEvent("yasnopro:designer-page:exit-edit-mode", {
              detail: { pathname: location.pathname, tenantId: resolvedPortalId },
            })
          );
          return;
        default:
          return;
      }
    },
    [
      navigate,
      isDesignerCustomPage,
      location.pathname,
      resolvedPortalId,
      headerSearch,
    ]
  );

  const handleSidebarItemAction = (item, event) => {
    if (item?.disabled) {
      return;
    }

    const isObjectTypeItem =
      item?.type === "object_type" ||
      item?.meta?.is_object_type === true ||
      Boolean(item?.object_type_id) ||
      Boolean(item?.meta?.object_type_id);

    if (isObjectTypeItem) {
      const objectTypePath =
        item?.path ||
        item?.url ||
        item?.route ||
        item?.meta?.url ||
        item?.meta?.route;

      if (typeof objectTypePath === "string" && objectTypePath.trim().length > 0) {
        event?.preventDefault?.();
        publishObjectShortcutRouteOwner(item, resolvedPortalId);
        navigate(objectTypePath);
        return;
      }
    }

    const itemScope =
      item?.meta?.menu_scope ||
      item?.meta?.scope ||
      item?.meta?.mode ||
      item?.meta?.context ||
      item?.menu_scope ||
      item?.scope ||
      item?.mode ||
      item?.context;

    const pageId = item?.pageId ?? item?.page_id ?? item?.meta?.page_id;
    if (
      (itemScope === "designer" || (!itemScope && pageId != null)) &&
      typeof pageId === "number" &&
      Number.isFinite(pageId)
    ) {
      event.preventDefault();
      navigate(`/designer/tenant/${resolvedPortalId}/page/${pageId}`);
      return;
    }

    const targetPath =
      item?.path ||
      item?.route ||
      item?.url ||
      item?.meta?.route ||
      item?.meta?.url;

    if (targetPath) {
      event.preventDefault();
      const normalizedTarget = String(targetPath).trim().replace(/\/+$/, "");
      const objectsSectionPath = `/designer/tenant/${resolvedPortalId}/object-types`;
      const platformSectionPath = `/designer/tenant/${resolvedPortalId}/platform`;
      if (
        normalizedTarget === objectsSectionPath ||
        String(item?.id || "") === "system-designer-objects"
      ) {
        publishObjectsSectionRouteOwner(resolvedPortalId);
      } else if (
        normalizedTarget === platformSectionPath ||
        String(item?.id || "") === "system-designer-platform"
      ) {
        publishRootSectionRouteOwner("platform", resolvedPortalId);
      }
      navigate(targetPath);
      return;
    }

    if (typeof pageId === "number" && Number.isFinite(pageId)) {
      event.preventDefault();
      navigate(`/designer/tenant/${resolvedPortalId}/page/${pageId}`);
      return;
    }
  };

  useEffect(() => {
    if (!import.meta.env.DEV) {
      return;
    }

    emitDesignerShadowSnapshot({
      mode: "designer",
      pathname: location.pathname,
      activeItemId: `designer-${designerActiveKey}`,
      activeDesignerObjectId,
      collapsed: false,
      navigation: [
        { id: "designer-objects", label: "Объекты" },
        { id: "designer-relations", label: "Связи" },
        { id: "designer-views", label: "Вкладки" },
        { id: "designer-users", label: "Пользователи" },
        { id: "designer-settings", label: "Системные настройки" },
      ],
      header: {
        title: "Типы объектов",
        subtitle: "Студия",
        modeActions: [
          {
            id: "app-mode-switch",
            actionKey: "app-mode-switch",
            target: "runtime",
          },
        ],
        pageActions: [],
      },
      capabilities: defaultCapabilitiesForMode("designer"),
      geometry: {
        sidebarWidth: 0,
        workspaceLeftOffset: 0,
        workspaceTopOffset: 0,
      },
      timestamp: Date.now(),
    });
  }, [
    location.pathname,
    designerActiveKey,
    activeDesignerObjectId,
  ]);

  return (
    <>
      <AppShellFrame
        headerContract={designerHeaderContract}
        sidebarContract={designerSidebarContract}
        onHeaderAction={handleHeaderAction}
        onSidebarItemAction={handleSidebarItemAction}
        onSidebarAction={sidebarControls.handleSidebarAction}
        sidebarTransition={TRANSITION_TOKENS.shell.sidebarWidth}
        workspaceTransition={TRANSITION_TOKENS.shell.workspaceLeft}
        workspace={
          <div
            className="designer-root"
            style={{
              flex: "1 1 auto",
              height: "100%",
              minHeight: 0,
              overflow: "auto",
              padding: "20px 24px 32px",
              boxSizing: "border-box",
            }}
          >
            <Outlet />
          </div>
        }
      />
      <SearchResultsOverlay
        isVisible={headerSearch.isOverlayVisible}
        isLoading={headerSearch.isLoading}
        error={headerSearch.error}
        results={headerSearch.results}
        scopeLabel={searchContext.label}
        onClose={headerSearch.closeResults}
      />
      {sidebarControls.isEditMode && sidebarControls.isCreateMenuOpen ? (
        <div
          style={{
            position: "fixed",
            left: 24,
            bottom: 24,
            zIndex: 1200,
            width: 320,
          }}
        >
          <CreateMenuItemModal
            onCreate={async (data) => {
              await sidebarControls.createItem(data);
              sidebarControls.setIsCreateMenuOpen(false);
            }}
            onClose={() => sidebarControls.setIsCreateMenuOpen(false)}
          />
        </div>
      ) : null}
      <NotificationOverlayHost />
      <ProfileSidePanel
        isOpen={isProfileOpen}
        onClose={() => {
          setIsProfileOpen(false);
          loadHeaderUser();
          window.dispatchEvent(new CustomEvent("user:profile-updated"));
        }}
      />
    </>
  );
}
