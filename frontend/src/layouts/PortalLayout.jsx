import { useEffect, useMemo } from "react";

import NotificationOverlayHost from "../modules/notifications/components/NotificationOverlayHost";
import CreateMenuItemModal from "../modules/navigation/components/CreateMenuItemModal";
import {
  subscribeNotificationNavigate,
} from "../modules/notifications/navigation/notificationNavigationBus";
import { orchestrateNotificationNavigation } from "../modules/notifications/navigation/notificationNavigationOrchestrator";
import { TRANSITION_TOKENS } from "../shared/layout/transitionTokens";
import AppShellFrame from "../shared/shell/AppShellFrame";
import {
  createRuntimeSidebarContract,
} from "../shared/shell/sidebar";
import { resolveAppSidebarWidth } from "../shared/shell/shellSidebarGeometry";
import { usePlatformSidebarControls } from "../shared/shell/sidebar/usePlatformSidebarControls";
import { useShellSidebarState } from "../shared/shell/useShellSidebarState";

function normalizeId(value) {
  return String(value ?? "").trim();
}

function ensureNavigationState() {
  if (!window.__YASNOPRO_NAVIGATION_STATE__) {
    window.__YASNOPRO_NAVIGATION_STATE__ = {
      stack: [],
      current: null,
    };
  }

  return window.__YASNOPRO_NAVIGATION_STATE__;
}

function pushNavigationState(state) {
  const navigationState = ensureNavigationState();

  if (navigationState.current) {
    navigationState.stack.push(navigationState.current);
  }

  navigationState.current = state;

  console.log("PUSH NAVIGATION STATE:", navigationState);
}

function popNavigationState() {
  const navigationState = ensureNavigationState();

  const previous = navigationState.stack.pop() || null;

  navigationState.current = previous;

  console.log("POP NAVIGATION STATE:", navigationState);

  return previous;
}

export default function PortalLayout({
  navigation,
  activePageId,
  onSelectPage,
  reloadNavigation,
  menuScale,
  onChangeMenuScale,
  headerContract,
  onHeaderAction,
  children,
}) {
  const { sidebarCollapsed, toggleSidebarCollapsed } = useShellSidebarState();
  const sidebarControls = usePlatformSidebarControls({
    portalId: 1,
    reloadNavigation,
    menuScale,
    onChangeMenuScale,
  });

  const pathname = window.location.pathname;
  const sidebarWidth = resolveAppSidebarWidth(sidebarCollapsed);
  const workspaceLeftOffset = resolveAppSidebarWidth(sidebarCollapsed);

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
    if (typeof onSelectPage !== "function") {
      return;
    }

    if (item?.pageId == null) {
      return;
    }

    event.preventDefault();
    onSelectPage(item.pageId);
  };

  useEffect(() => {
    function handleNotificationNavigate(event) {
      const detail = event.detail || {};
      orchestrateNotificationNavigation({
        detail,
        activePageId,
        onSelectPage,
        pushNavigationState,
        navigateToRuntimeRoute: (runtimeRoute) => {
          window.history.pushState({}, "", runtimeRoute);
          window.dispatchEvent(new PopStateEvent("popstate"));
        },
      });
    }

    function handleReturnToPreviousLocation() {
      const previous = popNavigationState();

      if (!previous) return;

      if (
        previous.pageId &&
        normalizeId(previous.pageId) !== normalizeId(activePageId)
      ) {
        onSelectPage?.(previous.pageId);
      }
    }

    const unsubscribeNotificationNavigate = subscribeNotificationNavigate(
      handleNotificationNavigate
    );

    window.addEventListener(
      "yasnopro:navigation:return",
      handleReturnToPreviousLocation
    );

    return () => {
      unsubscribeNotificationNavigate();

      window.removeEventListener(
        "yasnopro:navigation:return",
        handleReturnToPreviousLocation
      );
    };
  }, [activePageId, onSelectPage, navigation]);

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