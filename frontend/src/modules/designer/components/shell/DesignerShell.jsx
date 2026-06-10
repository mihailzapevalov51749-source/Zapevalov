import { useCallback, useEffect, useMemo, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";

import { getMe } from "../../../../api/authApi";
import CreateMenuItemModal from "../../../../modules/navigation/components/CreateMenuItemModal";
import NavigationDeleteDialogs from "../../../../modules/navigation/components/NavigationDeleteDialogs";
import { canManageNavigationMenu } from "../../constants/designerRoles";
import useNotifications from "../../../../modules/notifications/hooks/useNotifications";
import useNotificationNavigationOrchestrator from "../../../../modules/notifications/hooks/useNotificationNavigationOrchestrator";
import NotificationOverlayHost from "../../../../modules/notifications/components/NotificationOverlayHost";
import { useProfileSidePanel } from "../../../../profile/ProfileSidePanelProvider.jsx";
import { useDesignerShell } from "../../context/DesignerShellContext";
import { TRANSITION_TOKENS } from "../../../../shared/layout/transitionTokens";
import { createDesignerHeaderContract } from "../../../../shared/shell/header";
import AppShellFrame from "../../../../shared/shell/AppShellFrame";
import { ShellLayoutModeProvider } from "../../../../shared/shell/ShellLayoutModeContext.jsx";
import { SHELL_LAYOUT_MODE } from "../../../../shared/shell/shellLayoutMode.js";
import { createDesignerSidebarContract } from "../../../../shared/shell/sidebar";
import { usePlatformSidebarControls } from "../../../../shared/shell/sidebar/usePlatformSidebarControls";
import {
  applyDesignerSystemMenuSettings,
  getDesignerSystemMenuSettingsEventName,
} from "../../../../shared/shell/sidebar/designerSystemMenuSettings";
import { defaultCapabilitiesForMode } from "../../../../shared/shell/provider/appShellTypes";
import { emitDesignerShadowSnapshot } from "../../../../shared/shell/shadow/designer";
import { resolveStudioToOfficePath } from "../../../../shared/appMode/appModeNavigation";
import {
  readLeftMenuScale,
  writeLeftMenuScale,
} from "../../../../shared/uiStorage/leftMenuScaleStorage.js";
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
import {
  canAccessControlPlane,
  canAccessTenantAdministration,
  canShowControlPlaneStudioMenuEntry,
  canShowPlatformEventJournalInStudio,
  filterControlPlaneStudioMenuItems,
  filterPlatformStudioMenuItems,
} from "../../../admin/access/adminAccess";
import { buildTenantAdminPath } from "../../../admin/config/tenantAdminPaths";
import { useTenantEnvironment } from "../../../../shared/tenantEnvironment/useTenantEnvironment";
import { SEARCH_MODES } from "../../../../shared/search/searchScopes";
import { YasiiSurfaceContextProvider } from "../../../../yasii/context/YasiiSurfaceContext.jsx";
import { buildDesignerYasiiSurfaceValue } from "../../../../yasii/designer/buildDesignerContextData.js";
import { resolvePlatformDashboardUserId } from "../../../../yasii/hostContextBuilders.js";

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

function hasNavigationRoute(items, route) {
  const normalizedRoute = String(route || "").trim();
  return Array.isArray(items)
    ? items.some((item) => {
        const itemRoute = String(item?.route || item?.path || item?.url || "").trim();
        return itemRoute === normalizedRoute;
      })
    : false;
}

function appendDesignerAdministrationItems(items, user, tenantId, tenantType) {
  const result = [...(Array.isArray(items) ? items : [])];
  const normalizedTenantId = Number(tenantId) > 0 ? Number(tenantId) : 1;
  const tenantAdminPath = buildTenantAdminPath(normalizedTenantId);
  const controlPlanePath = "/control-plane";
  const showControlPlaneEntry = canShowControlPlaneStudioMenuEntry({
    tenantId: normalizedTenantId,
    tenantType,
  });

  if (canAccessTenantAdministration(user) && !hasNavigationRoute(result, tenantAdminPath)) {
    result.push({
      id: "system-designer-tenant-administration",
      title: "Администрирование",
      type: "system_page",
      route: tenantAdminPath,
      path: tenantAdminPath,
      menu_scope: "designer",
      scope: "designer",
      mode: "designer",
      is_system: true,
      is_protected: true,
      sort_order: 9980,
    });
  }

  if (
    showControlPlaneEntry
    && canAccessControlPlane(user)
    && !hasNavigationRoute(result, controlPlanePath)
  ) {
    result.push({
      id: "system-designer-control-plane",
      title: "Управление платформой",
      type: "system_page",
      route: controlPlanePath,
      path: controlPlanePath,
      menu_scope: "designer",
      scope: "designer",
      mode: "designer",
      is_system: true,
      is_protected: true,
      sort_order: 9999,
    });
  }

  return result;
}

function buildDesignerMetaNavigation(tenantId, user, tenantType) {
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
      sort_order: 20,
    },
    {
      id: "system-designer-trash",
      title: "Корзина",
      type: "system_page",
      route: `${base}/trash`,
      path: `${base}/trash`,
      icon: "trash",
      icon_type: "trash",
      menu_scope: "designer",
      scope: "designer",
      mode: "designer",
      is_system: true,
      is_protected: true,
      sort_order: 55,
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
      id: "system-designer-event-journal",
      title: "Журнал событий",
      type: "system_page",
      route: `${base}/event-journal`,
      path: `${base}/event-journal`,
      system_key: "event-journal",
      section: "event-journal",
      menu_scope: "designer",
      scope: "designer",
      mode: "designer",
      is_system: true,
      is_protected: true,
      sort_order: 85,
    },
  ];

  return appendDesignerAdministrationItems(items, user, tenantId, tenantType);
}

export default function DesignerShell() {
  const { tenantId, user } = useDesignerShell();
  const { openProfileSidePanel } = useProfileSidePanel();
  const resolvedPortalId = Number(tenantId) || 1;
  const navigate = useNavigate();
  const location = useLocation();
  const { tenantEnvironment } = useTenantEnvironment();
  const studioTenantType = tenantEnvironment?.tenant_type ?? null;
  const [menuScale, setMenuScale] = useState(() =>
    readLeftMenuScale(resolvedPortalId),
  );

  useEffect(() => {
    setMenuScale(readLeftMenuScale(resolvedPortalId));
  }, [resolvedPortalId]);
  const [headerUser, setHeaderUser] = useState(() => getCachedHeaderUser());
  const [isPageEditMode, setIsPageEditMode] = useState(false);
  const [activeObjectTypeName, setActiveObjectTypeName] = useState("");
  const [activeObjectAdapterLabel, setActiveObjectAdapterLabel] = useState("");
  const [activeWorkspaceTitle, setActiveWorkspaceTitle] = useState("");
  const [systemSettingsVersion, setSystemSettingsVersion] = useState(0);
  const { notifications, unreadCount, markAsRead } = useNotifications();
  const isSuperadmin = isSuperadminUser(headerUser ?? user);

  const isDesignerCustomPage = /\/designer\/tenant\/\d+\/page\/\d+/.test(
    location.pathname
  );

  const [navigationEditMode, setNavigationEditMode] = useState(false);
  const navigationQuery = useMemo(
    () => ({
      scope: "designer",
      mode: "designer",
      forEditMode: navigationEditMode,
    }),
    [navigationEditMode],
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
    writeLeftMenuScale(resolvedPortalId, rounded);
  }, [resolvedPortalId]);

  const hasPersistedDesignerNavigation = sourceMode === "persisted-designer";

  const sidebarControls = usePlatformSidebarControls({
    portalId: resolvedPortalId,
    mode: "designer",
    reloadNavigation,
    navigationItems: navigation,
    menuScale,
    onChangeMenuScale: handleMenuScaleChange,
    onEditModeChange: setNavigationEditMode,
    canEditMenu: canManageNavigationMenu(user),
    canCreateItem: canManageNavigationMenu(user),
    canDragItems: hasPersistedDesignerNavigation && canManageNavigationMenu(user),
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
    const baseItems = buildDesignerMetaNavigation(
      resolvedPortalId,
      headerUser ?? user,
      studioTenantType,
    );
    const withSettings = applyDesignerSystemMenuSettings(
      baseItems,
      resolvedPortalId,
      isSuperadmin,
      {
        showHiddenInEditMode: sidebarControls.isEditMode,
      },
    );
    const merged = mergeDesignerSidebarNavigation(withSettings, navigation);
    let filtered = merged;
    if (
      !canShowControlPlaneStudioMenuEntry({
        tenantId: resolvedPortalId,
        tenantType: studioTenantType,
      })
    ) {
      filtered = filterControlPlaneStudioMenuItems(filtered);
    }
    if (
      !canShowPlatformEventJournalInStudio({
        tenantId: resolvedPortalId,
        tenantType: studioTenantType,
      })
    ) {
      filtered = filterPlatformStudioMenuItems(filtered);
    }
    return filtered;
  }, [
    resolvedPortalId,
    studioTenantType,
    isSuperadmin,
    sidebarControls.isEditMode,
    systemSettingsVersion,
    navigation,
    headerUser,
    user,
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

  const workspaceBreadcrumbContext = useMemo(() => {
    const params = new URLSearchParams(location.search || "");
    const workspaceSlug = String(params.get("workspaceSlug") || "").trim();
    const workspaceTitle = String(params.get("workspaceTitle") || "").trim();
    const homePageId = Number(params.get("workspaceHomePageId"));
    if (workspaceSlug && workspaceTitle && Number.isFinite(homePageId)) {
      return {
        slug: workspaceSlug,
        title: workspaceTitle,
        homePageId,
      };
    }
    const workspaceMatch = location.pathname.match(/\/designer\/tenant\/\d+\/workspaces\/([^/?]+)/);
    if (!workspaceMatch) {
      return null;
    }
    const detailSlug = decodeURIComponent(String(workspaceMatch[1] || "")).trim();
    if (!detailSlug) {
      return null;
    }
    return {
      slug: detailSlug,
      title: activeWorkspaceTitle,
      homePageId: null,
    };
  }, [activeWorkspaceTitle, location.pathname, location.search]);

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

  useEffect(() => {
    const workspaceMatch = location.pathname.match(/\/designer\/tenant\/\d+\/workspaces\/([^/?]+)/);
    if (!workspaceMatch) {
      setActiveWorkspaceTitle("");
      return;
    }
    const workspaceSlug = decodeURIComponent(String(workspaceMatch[1] || "")).trim();
    if (!workspaceSlug) {
      setActiveWorkspaceTitle("");
      return;
    }
    let cancelled = false;
    const loadWorkspaceTitle = async () => {
      try {
        const workspace = await designerApi.getDesignerWorkspaceBySlug(resolvedPortalId, workspaceSlug);
        if (!cancelled) {
          setActiveWorkspaceTitle(String(workspace?.title || "").trim());
        }
      } catch {
        if (!cancelled) {
          setActiveWorkspaceTitle("");
        }
      }
    };
    void loadWorkspaceTitle();
    return () => {
      cancelled = true;
    };
  }, [location.pathname, resolvedPortalId]);

  const yasiiSurfaceContext = useMemo(
    () =>
      buildDesignerYasiiSurfaceValue({
        pathname: location.pathname,
        tenantId: resolvedPortalId,
        userId: resolvePlatformDashboardUserId(),
        objectTypeName: activeObjectTypeName,
        navigationItems: designerSidebarNavigation,
        activeObjectAdapterLabel,
        routeOwner: designerRouteOwner,
      }),
    [
      activeObjectAdapterLabel,
      activeObjectTypeName,
      designerRouteOwner,
      designerSidebarNavigation,
      location.pathname,
      resolvedPortalId,
    ],
  );

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
      workspaceContext: workspaceBreadcrumbContext,
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
    workspaceBreadcrumbContext,
  ]);

  const handleHeaderAction = useCallback(
    (actionKey, payload) => {
      switch (actionKey) {
        case "app-mode-switch":
          navigate(resolveStudioToOfficePath(location.pathname));
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
          openProfileSidePanel();
          return;
        case "breadcrumb-navigate":
        case "context-path-navigate":
          if (typeof payload?.path === "string" && payload.path.trim().length > 0) {
            const breadcrumbId = String(payload?.item?.id ?? "").trim();
            if (breadcrumbId === "designer-objects") {
              publishObjectsSectionRouteOwner(resolvedPortalId);
            }
            if (breadcrumbId === "designer-event-journal") {
              publishRootSectionRouteOwner("event-journal", resolvedPortalId);
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
      openProfileSidePanel,
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
    const itemType = String(item?.type || item?.meta?.type || "").trim().toLowerCase();
    const isWorkspaceItem = itemType === "workspace";

    const targetPath =
      item?.path ||
      item?.route ||
      item?.url ||
      item?.meta?.route ||
      item?.meta?.url;

    // Workspace routes must win over legacy page_id links.
    if (isWorkspaceItem && targetPath) {
      event?.preventDefault?.();
      navigate(targetPath);
      return;
    }

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

    if (targetPath) {
      event.preventDefault();
      const normalizedTarget = String(targetPath).trim().replace(/\/+$/, "");
      const objectsSectionPath = `/designer/tenant/${resolvedPortalId}/object-types`;
      const eventJournalSectionPath = `/designer/tenant/${resolvedPortalId}/event-journal`;
      if (
        normalizedTarget === objectsSectionPath ||
        String(item?.id || "") === "system-designer-objects"
      ) {
        publishObjectsSectionRouteOwner(resolvedPortalId);
      } else if (
        normalizedTarget === eventJournalSectionPath ||
        String(item?.id || "") === "system-designer-event-journal"
      ) {
        publishRootSectionRouteOwner("event-journal", resolvedPortalId);
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
        { id: "designer-pages", label: "Страницы" },
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
      <ShellLayoutModeProvider mode={SHELL_LAYOUT_MODE.EMBEDDED}>
        <AppShellFrame
          headerContract={designerHeaderContract}
          sidebarContract={designerSidebarContract}
          platformZone="studio"
          onHeaderAction={handleHeaderAction}
          onSidebarItemAction={handleSidebarItemAction}
          onSidebarAction={sidebarControls.handleSidebarAction}
          sidebarTransition={TRANSITION_TOKENS.shell.sidebarWidth}
          workspaceTransition={TRANSITION_TOKENS.shell.workspaceLeft}
          workspace={
            <YasiiSurfaceContextProvider value={yasiiSurfaceContext}>
              <div
                className="designer-root"
                data-platform-zone="studio"
                style={{
                  flex: "1 1 auto",
                  height: "100%",
                  minHeight: 0,
                  minWidth: 0,
                  overflowX: "hidden",
                  overflowY: "auto",
                  padding: "20px 24px 32px",
                  boxSizing: "border-box",
                }}
              >
                <Outlet />
              </div>
            </YasiiSurfaceContextProvider>
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
      <NavigationDeleteDialogs
        pendingDeleteId={sidebarControls.pendingDeleteId}
        pendingDeleteItem={sidebarControls.pendingDeleteItem}
        deleteError={sidebarControls.deleteError}
        deleteNotice={sidebarControls.deleteNotice}
        isSubmitting={sidebarControls.isSaving}
        onCancelDelete={sidebarControls.cancelDeleteItem}
        onConfirmDelete={sidebarControls.confirmDeleteItem}
        onCloseNotice={sidebarControls.clearDeleteNotice}
      />
      <NotificationOverlayHost />
    </>
  );
}
