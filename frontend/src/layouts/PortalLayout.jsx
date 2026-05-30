import { cloneElement, useMemo } from "react";

import NotificationOverlayHost from "../modules/notifications/components/NotificationOverlayHost";
import CreateMenuItemModal from "../modules/navigation/components/CreateMenuItemModal";
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
  onSelectPage,
  onNavigateToPath,
  onSidebarItemAction,
  reloadNavigation,
  menuScale,
  onChangeMenuScale,
  headerContract,
  onHeaderAction,
  searchOverlay = null,
  children,
}) {
  const { sidebarCollapsed, toggleSidebarCollapsed } = useShellSidebarState();
  const sidebarControls = usePlatformSidebarControls({
    portalId,
    reloadNavigation,
    menuScale,
    onChangeMenuScale,
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
    sidebarControls.isEditMode,
    menuScale,
    onChangeMenuScale,
  ]);

  const isAdminRootPage = pathname === "/admin";

  const shouldShowBackButton =
    pathname.startsWith("/admin/") && !isAdminRootPage;

  const handleRuntimeSidebarItemAction = (item, event) => {
    if (typeof onSidebarItemAction === "function") {
      onSidebarItemAction(item, event);
      return;
    }

    if (typeof onNavigateToPath === "function") {
      const path =
        item?.path || item?.url || item?.route || item?.meta?.url || item?.meta?.route;
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
