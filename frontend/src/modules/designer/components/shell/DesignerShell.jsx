import { useCallback, useEffect, useMemo, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";

import CreateMenuItemModal from "../../../../modules/navigation/components/CreateMenuItemModal";
import { useDesignerShell } from "../../context/DesignerShellContext";
import { TRANSITION_TOKENS } from "../../../../shared/layout/transitionTokens";
import { createDesignerHeaderContract } from "../../../../shared/shell/header";
import AppShellFrame from "../../../../shared/shell/AppShellFrame";
import { createDesignerSidebarContract } from "../../../../shared/shell/sidebar";
import { usePlatformSidebarControls } from "../../../../shared/shell/sidebar/usePlatformSidebarControls";
import { defaultCapabilitiesForMode } from "../../../../shared/shell/provider/appShellTypes";
import { emitDesignerShadowSnapshot } from "../../../../shared/shell/shadow/designer";
import { getLastRuntimePath } from "../../../../shared/appMode/appModeStorage";
import useNavigationTree from "../../../../modules/navigation/hooks/useNavigationTree";

function resolveDesignerActiveKey(pathname) {
  if (pathname.includes("/relations")) {
    return "relations";
  }

  if (pathname.includes("/views")) {
    return "views";
  }

  if (pathname.includes("/users")) {
    return "users";
  }

  if (pathname.includes("/settings")) {
    return "settings";
  }

  if (pathname.includes("/object-types")) {
    return "objects";
  }

  return "objects";
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
  console.log("[RENDER DesignerShell]", {
    tenantId,
    pathname: location.pathname,
    menuScale,
  });

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

  const designerSidebarContract = useMemo(() => {
    const base = createDesignerSidebarContract({
      navigationItems: navigation,
      reloadNavigation,
      sourceMode,
      activePath: location.pathname,
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
    navigation,
    reloadNavigation,
    sourceMode,
    location.pathname,
    menuScale,
    hasPersistedDesignerNavigation,
    sidebarControls.isEditMode,
    sidebarControls.isSaving,
    handleMenuScaleChange,
  ]);

  const designerHeaderContract = useMemo(() => {
    return createDesignerHeaderContract({
      tenantId,
      user,
      pathname: location.pathname,
    });
  }, [tenantId, user, location.pathname]);

  const handleHeaderAction = (actionKey) => {
    if (actionKey === "app-mode-switch") {
      navigate(getLastRuntimePath());
    }
  };

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
        subtitle: "Режим аналитика",
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
    </>
  );
}
