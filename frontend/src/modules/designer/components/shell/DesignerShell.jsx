import { useCallback, useEffect, useMemo, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";

import { getMe } from "../../../../api/authApi";
import CreateMenuItemModal from "../../../../modules/navigation/components/CreateMenuItemModal";
import ProfileSidePanel from "../../../../profile/components/ProfileSidePanel";
import useNotifications from "../../../../modules/notifications/hooks/useNotifications";
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

function resolveDesignerActiveKey(pathname) {
  if (pathname.includes("/administration")) {
    return "administration";
  }
  if (pathname.includes("/navigation")) {
    return "navigation";
  }
  if (pathname.includes("/processes")) {
    return "processes";
  }
  if (pathname.includes("/workspaces")) {
    return "workspaces";
  }
  if (pathname.includes("/publishing")) {
    return "publishing";
  }
  if (pathname.includes("/pages")) {
    return "pages";
  }
  if (pathname.includes("/relations")) {
    return "relations";
  }

  if (pathname.includes("/views")) {
    return "views";
  }

  if (pathname.includes("/object-types")) {
    return "objects";
  }

  return "objects";
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
      title: "Представления",
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
  ];

  return appendDesignerAdministrationItem(items, tenantId, isSuperadmin);
}

function resolveDesignerTabLabel(tabKey) {
  const normalized = String(tabKey || "").toLowerCase();
  if (normalized === "general") return "Общие";
  if (normalized === "fields") return "Поля";
  if (normalized === "relations") return "Связи";
  if (normalized === "views") return "Представления";
  if (normalized === "runtime-preview") return "Runtime Preview";
  return normalized ? normalized : "Раздел";
}

function resolveDesignerPageLabel(pathname, navigationItems) {
  const pageId = Number(pathname.match(/\/page\/(\d+)/)?.[1]);
  if (!Number.isFinite(pageId)) return "Страница";
  if (!Array.isArray(navigationItems)) return `Страница ${pageId}`;

  const match = navigationItems.find((item) => {
    const itemPageId = Number(item?.pageId ?? item?.page_id ?? item?.meta?.page_id);
    return Number.isFinite(itemPageId) && itemPageId === pageId;
  });
  return String(match?.title || match?.label || "").trim() || `Страница ${pageId}`;
}

function buildDesignerPathChain(pathname, tenantId, objectTypeName, navigationItems) {
  const normalizedTenantId = Number(tenantId) || 1;
  const base = `/designer/tenant/${normalizedTenantId}`;

  if (pathname.includes("/object-types")) {
    const chain = [
      { id: "designer-objects", label: "Объекты", path: `${base}/object-types` },
    ];
    const objectMatch = pathname.match(/\/object-types\/([^/?]+)/);
    if (objectMatch) {
      const objectTypeId = objectMatch[1];
      const normalizedObjectName = String(objectTypeName || "").trim();
      chain.push({
        id: "designer-object",
        label: normalizedObjectName || objectTypeId,
        path: `${base}/object-types/${objectTypeId}/general`,
      });
      const tabMatch = pathname.match(/\/object-types\/[^/]+\/([^/?]+)/);
      if (tabMatch) {
        const tabKey = String(tabMatch[1] || "");
        chain.push({
          id: "designer-tab",
          label: resolveDesignerTabLabel(tabKey),
        });
      }
    }
    return chain;
  }

  if (pathname.includes("/page/")) {
    const pageLabel = resolveDesignerPageLabel(pathname, navigationItems);
    return [{ id: "designer-page", label: pageLabel, active: true }];
  }

  if (pathname.includes("/relations")) {
    return [{ id: "designer-relations", label: "Связи", path: `${base}/relations`, active: true }];
  }
  if (pathname.includes("/views")) {
    return [
      { id: "designer-views", label: "Представления", path: `${base}/views`, active: true },
    ];
  }
  if (pathname.includes("/pages")) {
    return [{ id: "designer-pages", label: "Страницы", active: true }];
  }
  if (pathname.includes("/navigation")) {
    return [{ id: "designer-navigation", label: "Навигация", active: true }];
  }
  if (pathname.includes("/processes")) {
    return [{ id: "designer-processes", label: "Бизнес-процессы", active: true }];
  }
  if (pathname.includes("/workspaces")) {
    return [{ id: "designer-workspaces", label: "Рабочие пространства", active: true }];
  }
  if (pathname.includes("/publishing")) {
    return [{ id: "designer-publishing", label: "Публикация", active: true }];
  }
  if (pathname.includes("/administration")) {
    const normalized = pathname.replace(/\/+$/, "");
    const root = `${base}/administration`;
    if (normalized === root) {
      return [{ id: "designer-administration", label: "Администрирование", active: true }];
    }
    const section = normalized.slice(root.length + 1).split("/")[0];
    const sectionLabelMap = {
      users: "Пользователи системы",
      roles: "Роли и доступы",
      "org-structure": "Оргструктура",
      departments: "Подразделения",
      modules: "Модули",
      integrations: "Интеграции",
      "audit-log": "Журнал событий",
      audit: "Журнал событий",
      "ai-assistants": "AI-ассистенты",
      "system-settings": "Настройка системы",
      system: "Настройка системы",
    };
    return [
      { id: "designer-administration", label: "Администрирование", path: root },
      {
        id: "designer-administration-section",
        label: sectionLabelMap[section] || "Раздел",
        active: true,
      },
    ];
  }

  return [{ id: "designer-root", label: "Студия", path: base, active: true }];
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

  const designerActiveKey = resolveDesignerActiveKey(location.pathname);
  const activeDesignerObjectId =
    location.pathname.match(/object-types\/([^/]+)/)?.[1] ?? null;
  const activeDesignerPageId = Number(
    location.pathname.match(/\/designer\/tenant\/\d+\/page\/(\d+)/)?.[1]
  );

  const designerSidebarNavigation = useMemo(() => {
    const baseItems = buildDesignerMetaNavigation(resolvedPortalId, isSuperadmin);
    return applyDesignerSystemMenuSettings(baseItems, resolvedPortalId, isSuperadmin, {
      showHiddenInEditMode: sidebarControls.isEditMode,
    });
  }, [resolvedPortalId, isSuperadmin, sidebarControls.isEditMode, systemSettingsVersion]);

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
        setActiveObjectTypeName(nextName || objectTypeId);
      } catch {
        if (!cancelled) {
          setActiveObjectTypeName(objectTypeId);
        }
      }
    };

    loadObjectType();
    return () => {
      cancelled = true;
    };
  }, [location.pathname, resolvedPortalId]);

  const designerHeaderContract = useMemo(() => {
    return createDesignerHeaderContract({
      tenantId,
      user: {
        id: headerUser?.id ?? user?.id,
        name: headerUser?.full_name ?? user?.full_name,
        email: headerUser?.email ?? user?.email,
        avatarUrl: headerUser?.avatar_url ?? user?.avatar_url,
      },
      pathname: location.pathname,
      searchQuery: "",
      notificationUnreadCount: unreadCount,
      notificationItems: notifications,
      onReadNotification: markAsRead,
      avatarSettings,
      canSearch: false,
      canViewNotifications: true,
      canEditPage: isDesignerCustomPage,
      canOpenSettings: isDesignerCustomPage,
      isEditMode: isPageEditMode,
      pathChain: buildDesignerPathChain(
        location.pathname,
        resolvedPortalId,
        activeObjectTypeName,
        navigation
      ),
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
    isDesignerCustomPage,
    isPageEditMode,
    activeObjectTypeName,
    navigation,
  ]);

  const handleHeaderAction = useCallback(
    (actionKey, payload) => {
      switch (actionKey) {
        case "app-mode-switch":
          navigate(getLastRuntimePath());
          return;
        case "profile":
          setIsProfileOpen(true);
          return;
        case "breadcrumb-navigate":
          if (typeof payload?.path === "string" && payload.path.trim().length > 0) {
            navigate(payload.path);
          }
          return;
        case "context-path-navigate":
          if (typeof payload?.path === "string" && payload.path.trim().length > 0) {
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
    ]
  );

  const handleSidebarItemAction = (item, event) => {
    if (item?.disabled) {
      return;
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
        { id: "designer-views", label: "Представления" },
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
            style={{
              flex: 1,
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
