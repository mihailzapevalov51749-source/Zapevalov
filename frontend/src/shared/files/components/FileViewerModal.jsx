import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import FileViewer from "./FileViewer";
import CommentsPanel from "../../../modules/comments/components/CommentsPanel";

import chatIcon from "../../../assets/icons/chat.png";
import closeIcon from "../../../assets/icons/x.svg";

const SIDEBAR_SETTINGS_KEY = "yasnopro-sidebar-collapsed";

const EXPANDED_LEFT_OFFSET = 220;
const COLLAPSED_LEFT_OFFSET = 0;

function readSidebarCollapsed() {
  try {
    return (
      localStorage.getItem(
        SIDEBAR_SETTINGS_KEY
      ) === "true"
    );
  } catch {
    return false;
  }
}

const WORKSPACE_TOP_OFFSET = 0;
const COMMENTS_PANEL_WIDTH = 380;

const getOverlayStyle = ({
  workspaceLeftOffset = WORKSPACE_LEFT_OFFSET,
  workspaceTopOffset = WORKSPACE_TOP_OFFSET,
}) => ({
  position: "fixed",
  left: workspaceLeftOffset,
  top: workspaceTopOffset,
  right: 0,
  bottom: 0,
  zIndex: 999999,
  background: "#FFFFFF",
  overflow: "hidden",
});

const floatingActionsBaseStyle = {
  position: "absolute",
  top: 4,
  right: 158,
  zIndex: 3000,
  display: "flex",
  alignItems: "center",
  gap: 10,
  transition: "none",
};

const iconButtonStyle = {
  width: 26,
  height: 26,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  border: "none",
  background: "transparent",
  cursor: "pointer",
  padding: 0,
  opacity: 0.82,
  transition: "opacity 0.15s ease",
};

const iconStyle = {
  width: 18,
  height: 18,
  objectFit: "contain",
};

const viewerStyle = {
  position: "relative",
  zIndex: 1,
  width: "100%",
  height: "100%",
  overflow: "hidden",
  background: "#FFFFFF",
};

const viewerWithCommentsStyle = {
  ...viewerStyle,
  width: `calc(100% - ${COMMENTS_PANEL_WIDTH}px)`,
};

const commentsPanelStyle = {
  position: "absolute",
  top: 0,
  right: 0,
  bottom: 0,
  width: COMMENTS_PANEL_WIDTH,
  zIndex: 2000,
  pointerEvents: "auto",
  background: "#FFFFFF",
  borderLeft: "1px solid #E2E8F0",
  boxShadow: "-12px 0 32px rgba(15, 23, 42, 0.08)",
  display: "flex",
  flexDirection: "column",
  paddingTop: 14,
  boxSizing: "border-box",
};

const commentsUnavailableStyle = {
  padding: 16,
  fontSize: 13,
  lineHeight: 1.5,
  color: "#64748B",
};

function normalizeId(value) {
  return String(value ?? "").trim();
}

function hasInitialCommentContext(initialContext) {
  return Boolean(
    initialContext?.commentId ||
      initialContext?.comment_id ||
      initialContext?.highlight_id ||
      initialContext?.highlightId
  );
}

function ensureEntityLocationRegistry() {
  if (!window.__YASNOPRO_ENTITY_LOCATION_REGISTRY__) {
    window.__YASNOPRO_ENTITY_LOCATION_REGISTRY__ = {
      tables: {},
      files: {},
    };
  }

  if (!window.__YASNOPRO_ENTITY_LOCATION_REGISTRY__.files) {
    window.__YASNOPRO_ENTITY_LOCATION_REGISTRY__.files = {};
  }

  if (!window.__YASNOPRO_ENTITY_LOCATION_REGISTRY__.tables) {
    window.__YASNOPRO_ENTITY_LOCATION_REGISTRY__.tables = {};
  }

  return window.__YASNOPRO_ENTITY_LOCATION_REGISTRY__;
}

function normalizeContext(detail = {}) {
  return {
    ...(detail?.detail?.context || {}),
    ...(detail?.context || {}),

    type:
      detail?.type ||
      detail?.context?.type ||
      detail?.detail?.context?.type ||
      null,

    source:
      detail?.source ||
      detail?.context?.source ||
      detail?.detail?.context?.source ||
      null,

    tab:
      detail?.tab ||
      detail?.context?.tab ||
      detail?.detail?.context?.tab ||
      null,

    entity_type:
      detail?.entityType ||
      detail?.entity_type ||
      detail?.context?.entity_type ||
      detail?.context?.entityType ||
      detail?.detail?.context?.entity_type ||
      detail?.detail?.context?.entityType ||
      null,

    entity_id:
      detail?.entityId ||
      detail?.entity_id ||
      detail?.context?.entity_id ||
      detail?.context?.entityId ||
      detail?.detail?.context?.entity_id ||
      detail?.detail?.context?.entityId ||
      null,

    table_id:
      detail?.tableId ||
      detail?.table_id ||
      detail?.context?.table_id ||
      detail?.context?.tableId ||
      detail?.detail?.context?.table_id ||
      detail?.detail?.context?.tableId ||
      null,

    row_id:
      detail?.rowId ||
      detail?.row_id ||
      detail?.context?.row_id ||
      detail?.context?.rowId ||
      detail?.detail?.context?.row_id ||
      detail?.detail?.context?.rowId ||
      null,

    file_id:
      detail?.fileId ||
      detail?.file_id ||
      detail?.context?.file_id ||
      detail?.context?.fileId ||
      detail?.detail?.context?.file_id ||
      detail?.detail?.context?.fileId ||
      null,

    file_url:
      detail?.fileUrl ||
      detail?.file_url ||
      detail?.context?.file_url ||
      detail?.context?.fileUrl ||
      detail?.detail?.context?.file_url ||
      detail?.detail?.context?.fileUrl ||
      null,

    comment_id:
      detail?.commentId ||
      detail?.comment_id ||
      detail?.context?.comment_id ||
      detail?.context?.commentId ||
      detail?.detail?.context?.comment_id ||
      detail?.detail?.context?.commentId ||
      null,

    parent_comment_id:
      detail?.parentCommentId ||
      detail?.parent_comment_id ||
      detail?.context?.parent_comment_id ||
      detail?.context?.parentCommentId ||
      detail?.detail?.context?.parent_comment_id ||
      detail?.detail?.context?.parentCommentId ||
      null,

    highlight_id:
      detail?.highlightId ||
      detail?.highlight_id ||
      detail?.context?.highlight_id ||
      detail?.context?.highlightId ||
      detail?.detail?.context?.highlight_id ||
      detail?.detail?.context?.highlightId ||
      null,
  };
}

function isSameFileTarget({
  targetEntityType,
  targetEntityId,
  targetFileId,
  targetFileUrl,
  fileId,
  fileUrl,
}) {
  const currentFileId = normalizeId(fileId);
  const currentFileUrl = normalizeId(fileUrl);

  const normalizedTargetEntityType = normalizeId(targetEntityType);
  const normalizedTargetEntityId = normalizeId(targetEntityId);
  const normalizedTargetFileId = normalizeId(targetFileId);
  const normalizedTargetFileUrl = normalizeId(targetFileUrl);

  if (normalizedTargetEntityType === "file") {
    return Boolean(
      (currentFileId &&
        currentFileId === normalizedTargetFileId) ||
        (currentFileUrl &&
          currentFileUrl === normalizedTargetFileUrl)
    );
  }

  return Boolean(
    (currentFileId && currentFileId === normalizedTargetFileId) ||
      (currentFileUrl && currentFileUrl === normalizedTargetFileUrl)
  );
}

export default function FileViewerModal({
  isOpen,
  fileUrl,
  fileName,
  fileType,
  fileId,
  userId,
  userName,
  mode = "view",
  initialContext = null,
  workspaceLeftOffset,
  workspaceTopOffset = WORKSPACE_TOP_OFFSET,
  onClose,
}) {
  const [isCommentsOpen, setIsCommentsOpen] = useState(
    hasInitialCommentContext(initialContext)
  );

  const [notificationContext, setNotificationContext] =
    useState(initialContext);

    const [sidebarCollapsed, setSidebarCollapsed] =
  useState(readSidebarCollapsed);

const effectiveWorkspaceLeftOffset =
  workspaceLeftOffset !== undefined
    ? workspaceLeftOffset
    : sidebarCollapsed
      ? COLLAPSED_LEFT_OFFSET
      : EXPANDED_LEFT_OFFSET;

  const discussionFileId =
    normalizeId(initialContext?.file_id) ||
    normalizeId(initialContext?.fileId) ||
    normalizeId(fileId) ||
    null;

  useEffect(() => {
    const normalizedFileId = normalizeId(discussionFileId);
    const normalizedFileUrl = normalizeId(fileUrl);

    if (!normalizedFileId && !normalizedFileUrl) return;

    const registry = ensureEntityLocationRegistry();

    const location = {
      module: "fileViewer",
      fileId: normalizedFileId,
      fileUrl: normalizedFileUrl,
      fileName: fileName || "",
      pageId: window.location.pathname || "",
    };

    if (normalizedFileId) {
      registry.files[normalizedFileId] = location;
    }

    if (normalizedFileUrl) {
      registry.files[normalizedFileUrl] = location;
    }

    console.log("REGISTER FILE LOCATION:", location);
  }, [discussionFileId, fileUrl, fileName]);

  useEffect(() => {
    if (!isOpen) {
      setIsCommentsOpen(false);
      setNotificationContext(null);
      return;
    }

    if (hasInitialCommentContext(initialContext)) {
      setNotificationContext(initialContext);
      setIsCommentsOpen(true);
    }
  }, [isOpen, discussionFileId, initialContext]);

  useEffect(() => {
    function handlePendingTarget(event) {
      const detail = event.detail || {};
      const context = normalizeContext(detail);

      const isTarget = isSameFileTarget({
        targetEntityType: context.entity_type,
        targetEntityId: context.entity_id,
        targetFileId: context.file_id,
        targetFileUrl: context.file_url,
        fileId: discussionFileId,
        fileUrl,
      });

      if (!isTarget) return;

      setNotificationContext(context);
      setIsCommentsOpen(true);
    }

    window.addEventListener(
      "yasnopro:notification:pending-target",
      handlePendingTarget
    );

    return () => {
      window.removeEventListener(
        "yasnopro:notification:pending-target",
        handlePendingTarget
      );
    };
  }, [discussionFileId, fileUrl]);

  if (!isOpen) return null;

  const floatingActionsStyle = {
    ...floatingActionsBaseStyle,
    right: isCommentsOpen ? COMMENTS_PANEL_WIDTH + 158 : 158,
  };

  const handleToggleComments = () => {
    setIsCommentsOpen((prev) => !prev);
  };

  const handleIconMouseEnter = (event) => {
    event.currentTarget.style.opacity = "1";
    event.currentTarget.style.transform = "none";
  };

  const handleIconMouseLeave = (event) => {
    event.currentTarget.style.opacity = "0.82";
    event.currentTarget.style.transform = "none";
  };

  const effectiveInitialContext = notificationContext || initialContext;

  return createPortal(
    <div
      style={getOverlayStyle({
        workspaceLeftOffset:
  effectiveWorkspaceLeftOffset,
        workspaceTopOffset,
      })}
    >
      <div style={floatingActionsStyle}>
        <button
          type="button"
          style={iconButtonStyle}
          onClick={onClose}
          title="Закрыть"
          aria-label="Закрыть"
          onMouseEnter={handleIconMouseEnter}
          onMouseLeave={handleIconMouseLeave}
        >
          <img src={closeIcon} alt="" style={iconStyle} />
        </button>

        <button
          type="button"
          style={iconButtonStyle}
          onClick={handleToggleComments}
          title="Комментарии к документу"
          aria-label="Комментарии к документу"
          onMouseEnter={handleIconMouseEnter}
          onMouseLeave={handleIconMouseLeave}
        >
          <img src={chatIcon} alt="" style={iconStyle} />
        </button>
      </div>

      <div style={isCommentsOpen ? viewerWithCommentsStyle : viewerStyle}>
        <FileViewer
          fileUrl={fileUrl}
          fileName={fileName}
          fileType={fileType}
          userId={userId}
          userName={userName}
          mode={mode}
        />
      </div>

      {isCommentsOpen && (
        <div style={commentsPanelStyle}>
          {discussionFileId ? (
            <CommentsPanel
              entityType="file"
              entityId={discussionFileId}
              fileId={discussionFileId}
              initialContext={effectiveInitialContext}
            />
          ) : (
            <div style={commentsUnavailableStyle}>
              Комментарии недоступны: не передан ID файла.
            </div>
          )}
        </div>
      )}
    </div>,
    document.body
  );

  useEffect(() => {
  function handleStorageChange() {
    setSidebarCollapsed(
      readSidebarCollapsed()
    );
  }

  window.addEventListener(
    "storage",
    handleStorageChange
  );

  return () => {
    window.removeEventListener(
      "storage",
      handleStorageChange
    );
  };
}, []);

}