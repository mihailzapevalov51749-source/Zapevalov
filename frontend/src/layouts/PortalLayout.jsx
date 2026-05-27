import { useEffect, useMemo } from "react";

import NotificationOverlayHost from "../modules/notifications/components/NotificationOverlayHost";
import CreateMenuItemModal from "../modules/navigation/components/CreateMenuItemModal";
import { TRANSITION_TOKENS } from "../shared/layout/transitionTokens";
import AppShellFrame from "../shared/shell/AppShellFrame";
import {
  createRuntimeSidebarContract,
} from "../shared/shell/sidebar";
import { resolveAppSidebarWidth } from "../shared/shell/shellSidebarGeometry";
import { usePlatformSidebarControls } from "../shared/shell/sidebar/usePlatformSidebarControls";
import { useShellSidebarState } from "../shared/shell/useShellSidebarState";

const CORPORATE_CHAT_PAGE_ID = 35;

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

function getTableIdFromEntityType(entityType) {
  const normalized = normalizeId(entityType);

  if (!normalized.startsWith("universal_table:")) {
    return "";
  }

  return normalized.replace("universal_table:", "").trim();
}

function dispatchPendingTarget(delay = 0) {
  const pendingTarget = window.__YASNOPRO_PENDING_NOTIFICATION_TARGET__;

  if (!pendingTarget) return;

  window.setTimeout(() => {
    window.dispatchEvent(
      new CustomEvent("yasnopro:notification:pending-target", {
        detail: pendingTarget,
      })
    );
  }, delay);
}

function dispatchChatNavigate(delay = 0) {
  const pendingTarget = window.__YASNOPRO_PENDING_NOTIFICATION_TARGET__;

  if (!pendingTarget) return;

  window.setTimeout(() => {
    window.dispatchEvent(
      new CustomEvent("chat:navigate", {
        detail: pendingTarget,
      })
    );
  }, delay);
}

function getContext(detail) {
  return detail?.context || {};
}

function getSource(detail) {
  const context = getContext(detail);

  return normalizeId(context?.source || detail?.source || "");
}

function getEntityType(detail) {
  const context = getContext(detail);

  return normalizeId(
    detail?.entityType ||
      detail?.entity_type ||
      context?.entity_type ||
      context?.entityType
  );
}

function getEntityId(detail) {
  const context = getContext(detail);

  return normalizeId(
    detail?.entityId ||
      detail?.entity_id ||
      context?.entity_id ||
      context?.entityId
  );
}

function getCommentId(detail) {
  const context = getContext(detail);

  return (
    detail?.commentId ||
    detail?.comment_id ||
    context?.comment_id ||
    context?.commentId ||
    null
  );
}

function getParentCommentId(detail) {
  const context = getContext(detail);

  return (
    detail?.parentCommentId ||
    detail?.parent_comment_id ||
    context?.parent_comment_id ||
    context?.parentCommentId ||
    null
  );
}

function getMessageId(detail) {
  const context = getContext(detail);

  return (
    detail?.messageId ||
    detail?.message_id ||
    context?.message_id ||
    context?.messageId ||
    null
  );
}

function getChatId(detail, entityId) {
  const context = getContext(detail);

  return (
    detail?.chatId ||
    detail?.chat_id ||
    context?.chat_id ||
    context?.chatId ||
    entityId ||
    null
  );
}

function getFileId(detail) {
  const context = getContext(detail);

  return normalizeId(
    detail?.fileId ||
      detail?.file_id ||
      context?.file_id ||
      context?.fileId ||
      detail?.entityId ||
      detail?.entity_id ||
      context?.entity_id ||
      context?.entityId
  );
}

function getTableId({ detail, entityType }) {
  const context = getContext(detail);

  const tableIdFromEntityType = getTableIdFromEntityType(entityType);

  if (tableIdFromEntityType) {
    return tableIdFromEntityType;
  }

  return normalizeId(
    detail?.tableId ||
      detail?.table_id ||
      context?.table_id ||
      context?.tableId
  );
}

function getRowId(detail) {
  const context = getContext(detail);

  return normalizeId(
    detail?.rowId ||
      detail?.row_id ||
      context?.row_id ||
      context?.rowId ||
      detail?.entityId ||
      detail?.entity_id ||
      context?.entity_id ||
      context?.entityId
  );
}

function getTargetTab(detail) {
  const context = getContext(detail);

  return normalizeId(detail?.tab || context?.tab || "");
}

function getHighlightId(detail) {
  const context = getContext(detail);

  return (
    detail?.highlightId ||
    detail?.highlight_id ||
    context?.highlight_id ||
    context?.highlightId ||
    null
  );
}

function buildPendingTarget({
  source,
  tableId,
  rowId,
  fileId,
  commentId,
  parentCommentId,
  messageId,
  chatId,
  tab,
  highlightId,
  entityType,
  entityId,
  detail,
}) {
  if (entityType === "chat") {
    return {
      type: "chat_message",
      entityType,
      entityId,
      chatId,
      messageId,
      tab: "chat",
      highlightId,
      detail,
    };
  }

  switch (source) {
    case "card_comment":
      return {
        type: "card_comment",
        entityType,
        entityId,
        tableId,
        rowId,
        commentId,
        tab: "comments",
        highlightId,
        detail,
      };

    case "card_note":
      return {
        type: "card_note",
        entityType,
        entityId,
        tableId,
        rowId,
        commentId,
        tab: "notes",
        highlightId,
        detail,
      };

    case "card_attachment_file":
      return {
        type: "card_attachment_file",
        entityType,
        entityId,
        tableId,
        rowId,
        fileId,
        commentId,
        tab: "attachments",
        highlightId,
        detail,
      };

    case "comment_attachment_file":
      return {
        type: "comment_attachment_file",
        entityType,
        entityId,
        tableId,
        rowId,
        parentCommentId,
        fileId,
        commentId,
        tab: "comments",
        highlightId,
        detail,
      };

    case "library_file":
      return {
        type: "library_file",
        entityType,
        entityId,
        fileId,
        commentId,
        tab,
        highlightId,
        detail,
      };

    default:
      return {
        type:
          tab === "notes"
            ? "universal_table_row_note"
            : "universal_table_row_comment",

        entityType,
        entityId,
        tableId,
        rowId,
        commentId,
        tab,
        highlightId,
        detail,
      };
  }
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

      const source = getSource(detail);

      const entityType = getEntityType(detail);
      const entityId = getEntityId(detail);

      const tableId = getTableId({
        detail,
        entityType,
      });

      const rowId = getRowId(detail);
      const fileId = getFileId(detail);
      const commentId = getCommentId(detail);
      const parentCommentId = getParentCommentId(detail);
      const messageId = getMessageId(detail);
      const chatId = getChatId(detail, entityId);
      const tab = getTargetTab(detail);
      const highlightId = getHighlightId(detail);

      if (!entityType && !fileId) {
        console.warn("PORTAL NOTIFICATION ROUTER: entity not found", {
          detail,
        });

        return;
      }

      pushNavigationState({
        pageId: activePageId,
        pathname: window.location.pathname,
      });

      const pendingTarget = buildPendingTarget({
        source,
        tableId,
        rowId,
        fileId,
        commentId,
        parentCommentId,
        messageId,
        chatId,
        tab,
        highlightId,
        entityType,
        entityId,
        detail,
      });

      window.__YASNOPRO_PENDING_NOTIFICATION_TARGET__ = pendingTarget;

      console.log("PORTAL NOTIFICATION ROUTER:", pendingTarget);

      if (entityType === "chat") {
        onSelectPage?.(CORPORATE_CHAT_PAGE_ID);

        dispatchChatNavigate(300);
        dispatchChatNavigate(800);
        dispatchChatNavigate(1500);

        return;
      }

      dispatchPendingTarget(0);
      dispatchPendingTarget(300);
      dispatchPendingTarget(800);
      dispatchPendingTarget(1500);
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

    window.addEventListener(
      "yasnopro:notification:navigate",
      handleNotificationNavigate
    );

    window.addEventListener(
      "yasnopro:navigation:return",
      handleReturnToPreviousLocation
    );

    return () => {
      window.removeEventListener(
        "yasnopro:notification:navigate",
        handleNotificationNavigate
      );

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