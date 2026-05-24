import { useEffect, useState } from "react";

import LeftSidebar from "../modules/navigation/components/LeftSidebar";

import NotificationOverlayHost from "../modules/notifications/components/NotificationOverlayHost";

const SIDEBAR_EXPANDED_WIDTH = 220;
const SIDEBAR_COLLAPSED_WIDTH = 0;

const CORPORATE_CHAT_PAGE_ID = 35;

const SIDEBAR_COLLAPSED_KEY = "yasnopro-sidebar-collapsed";

function getInitialSidebarCollapsed() {
  try {
    return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "true";
  } catch {
    return false;
  }
}

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
  onEnterEditMode,
  reloadNavigation,
  menuScale,
  onChangeMenuScale,
  children,
}) {
 const [sidebarCollapsed, setSidebarCollapsed] = useState(
  getInitialSidebarCollapsed
);

  const sidebarWidth = sidebarCollapsed
    ? SIDEBAR_COLLAPSED_WIDTH
    : SIDEBAR_EXPANDED_WIDTH;

  const pathname = window.location.pathname;

  const isAdminRootPage = pathname === "/admin";

  const shouldShowBackButton =
    pathname.startsWith("/admin/") && !isAdminRootPage;

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

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        minHeight: "100vh",
        maxHeight: "100vh",
        background: "#f8fafc",
        overflow: "hidden",
        boxSizing: "border-box",
      }}
    >
      <LeftSidebar
        items={navigation}
        activePageId={activePageId}
        onSelectPage={onSelectPage}
        topOffset={0}
        width={sidebarWidth}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => {
  setSidebarCollapsed((prev) => {
    const next = !prev;

    try {
      localStorage.setItem(
        SIDEBAR_COLLAPSED_KEY,
        String(next)
      );
    } catch {
      // ignore
    }

    return next;
  });
}}
        portalId={1}
        reloadNavigation={reloadNavigation}
        menuScale={menuScale}
        onChangeMenuScale={onChangeMenuScale}
      />

      <main
        style={{
          position: "fixed",
          top: 0,
          left: sidebarWidth,
          right: 0,
          bottom: 0,

          height: "100vh",
          minHeight: 0,

          background: "#f8fafc",

          overflow: "hidden",

          boxSizing: "border-box",

          display: "flex",
          flexDirection: "column",

          transition: "left 180ms ease",
        }}
      >
        <div
          style={{
            flex: 1,
            minHeight: 0,
            width: "100%",
            overflow: "hidden",
            boxSizing: "border-box",
          }}
        >
          {typeof children === "function"
            ? children({
                showBackButton: shouldShowBackButton,
                onBack: () => window.history.back(),
              })
            : children}
        </div>
      </main>

      <NotificationOverlayHost />
    </div>
  );
}