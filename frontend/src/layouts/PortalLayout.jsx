import { cloneElement, useMemo } from "react";

import NotificationOverlayHost from "../modules/notifications/components/NotificationOverlayHost";
import FileViewerOverlayHost from "../shared/files/components/FileViewerOverlayHost";
import CreateMenuItemModal from "../modules/navigation/components/CreateMenuItemModal";
import NavigationDeleteDialogs from "../modules/navigation/components/NavigationDeleteDialogs";
import { canManageNavigationMenu, getStoredCurrentUser } from "../modules/designer/constants/designerRoles";
import useNotificationNavigationOrchestrator from "../modules/notifications/hooks/useNotificationNavigationOrchestrator";
import { TRANSITION_TOKENS } from "../shared/layout/transitionTokens";
import AppShellFrame from "../shared/shell/AppShellFrame";
import {
  createRuntimeSidebarContract,
} from "../shared/shell/sidebar";
import { resolveAppSidebarWidth } from "../shared/shell/shellSidebarGeometry";
import { usePlatformSidebarControls } from "../shared/shell/sidebar/usePlatformSidebarControls";
import { useShellSidebarState } from "../shared/shell/useShellSidebarState";

export default function PortalLayout({
  portalId = 1,
  navigation,
  activePageId,
  activeSidebarItemId = null,
  activeSidebarParentIds = [],
  onSelectPage,
  onNavigateToPath,
  onSidebarItemAction,
  reloadNavigation,
  menuScale,
  onChangeMenuScale,
  headerContract,
  onHeaderAction,
  searchOverlay = null,
  onNavigationEditModeChange,
  children,
}) {
  const { sidebarCollapsed, toggleSidebarCollapsed } = useShellSidebarState();
  const canEditNavigationMenu = canManageNavigationMenu(getStoredCurrentUser());
  const sidebarControls = usePlatformSidebarControls({
    portalId,
    reloadNavigation,
    navigationItems: navigation,
    menuScale,
    onChangeMenuScale,
    onEditModeChange: onNavigationEditModeChange,
    canEditMenu: canEditNavigationMenu,
    canCreateItem: canEditNavigationMenu,
    canDragItems: canEditNavigationMenu,
  });

  const pathname = window.location.pathname;
  const sidebarWidth = resolveAppSidebarWidth(sidebarCollapsed);
  const workspaceLeftOffset = resolveAppSidebarWidth(sidebarCollapsed);

  useNotificationNavigationOrchestrator({
    activePageId,
    onSelectPage,
  });

  const runtimeSidebarContract = useMemo(() => {
    return createRuntimeSidebarContract({
      collapsed: sidebarCollapsed,
      onToggleCollapse: toggleSidebarCollapsed,
      navigationItems: navigation,
      reloadNavigation,
      activePath: pathname,
      activePageId,
      activeItemId: activeSidebarItemId ?? undefined,
      activeParentIds: Array.isArray(activeSidebarParentIds) ? activeSidebarParentIds : [],
      isEditMode: sidebarControls.isEditMode,
      menuScale,
      canScaleMenu: typeof onChangeMenuScale === "function",
    });
  }, [
    sidebarCollapsed,
    toggleSidebarCollapsed,
    navigation,
    reloadNavigation,
    pathname,
    activePageId,
    activeSidebarItemId,
    activeSidebarParentIds,
    sidebarControls.isEditMode,
    menuScale,
    onChangeMenuScale,
  ]);

  const isAdminRootPage = pathname === "/admin";

  const shouldShowBackButton =
    pathname.startsWith("/admin/") && !isAdminRootPage;

  const resolveRuntimeWorkspacePath = (item) => {
    const raw = String(
      item?.targetPath ||
        item?.path ||
        item?.url ||
        item?.route ||
        item?.meta?.targetPath ||
        item?.meta?.url ||
        item?.meta?.route ||
        "",
    ).trim();

    if (!raw) {
      return null;
    }

    if (raw.startsWith("/portal/")) {
      return raw;
    }

    const designerMatch = raw.match(/\/designer\/tenant\/\d+\/workspaces\/([^/?#]+)/i);
    if (designerMatch?.[1]) {
      return `/portal/${portalId}/workspaces/${decodeURIComponent(designerMatch[1])}`;
    }

    return null;
  };

  const handleRuntimeSidebarItemAction = (item, event) => {
    if (typeof onSidebarItemAction === "function") {
      onSidebarItemAction(item, event);
      return;
    }

    if (typeof onNavigateToPath === "function") {
      const itemType = String(item?.type || "").trim();
      const path =
        itemType === "workspace"
          ? resolveRuntimeWorkspacePath(item)
          : item?.targetPath ||
            item?.path ||
            item?.url ||
            item?.route ||
            item?.meta?.targetPath ||
            item?.meta?.url ||
            item?.meta?.route;

      if (path && String(path).startsWith("/portal/")) {
        event?.preventDefault?.();
        onNavigateToPath(path);
        return;
      }
    }

    if (typeof onSelectPage !== "function") {
      return;
    }

    const pageId = item?.pageId ?? item?.page_id ?? item?.meta?.page_id;
    if (pageId == null) {
      return;
    }

    event?.preventDefault?.();
    onSelectPage(pageId);
  };

  const workspace =
    typeof children === "function"
      ? children({
          showBackButton: shouldShowBackButton,
          onBack: () => window.history.back(),
        })
      : children;

  return (
    <>
      <AppShellFrame
        headerContract={headerContract}
        sidebarContract={runtimeSidebarContract}
        sidebarCollapsed={sidebarCollapsed}
        onToggleSidebarCollapse={toggleSidebarCollapsed}
        workspace={workspace}
        onHeaderAction={onHeaderAction}
        onSidebarItemAction={handleRuntimeSidebarItemAction}
        onSidebarAction={sidebarControls.handleSidebarAction}
        sidebarWidth={sidebarWidth}
        workspaceLeftOffset={workspaceLeftOffset}
        sidebarTransition={TRANSITION_TOKENS.shell.sidebarWidth}
        workspaceTransition={TRANSITION_TOKENS.shell.workspaceLeft}
      />
      {searchOverlay
        ? cloneElement(searchOverlay, { workspaceLeftOffset })
        : null}
      <NotificationOverlayHost />
      <FileViewerOverlayHost workspaceLeftOffset={workspaceLeftOffset} />
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
    </>
  );
}
