import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import bellIcon from "../../../assets/icons/bell.png";
import { Z_INDEX_LAYERS } from "../../../shared/layout/zIndexTokens";
import { emitNotificationNavigate } from "../navigation/notificationNavigationBus";

const DROPDOWN_WIDTH = 390;
const DROPDOWN_TOP_OFFSET = 44;
const DROPDOWN_MAX_HEIGHT = 520;
/** Compensates `.app-header-renderer__notification-wrap { transform: scale(0.88) }` lost after Portal. */
const DROPDOWN_VISUAL_SCALE = 0.88;

function emitNotificationNavigateEvent(notification) {
  const context = notification?.context || {};

  const source =
    context?.source ||
    notification?.source ||
    "";

  const entityType =
    context.entity_type ||
    notification.entity_type ||
    "";

  const entityId =
    context.entity_id ||
    notification.entity_id ||
    "";

  const commentId =
    context.comment_id ||
    notification.comment_id ||
    null;

  const parentCommentId =
    context.parent_comment_id ||
    notification.parent_comment_id ||
    null;

  const fileId =
    context.file_id ||
    notification.file_id ||
    null;

  const highlightId =
    context.highlight_id ||
    notification.highlight_id ||
    null;

  const noteId =
    context.note_id ||
    notification.note_id ||
    null;

  const tab = context.tab || notification.tab || null;

  const publishedRuntimeRef =
    context.published_runtime_ref || context.publishedRuntimeRef || null;

  console.log("NOTIFICATION NAVIGATE:", {
    notification,
    source,
    entityType,
    entityId,
    fileId,
    commentId,
    parentCommentId,
    noteId,
    highlightId,
    context,
  });

  if (!entityType && !fileId) return;

  emitNotificationNavigate({
    notification,
    source,
    entityType,
    entityId: String(entityId || ""),
    fileId,
    commentId,
    parentCommentId,
    highlightId,
    noteId,
    tab,
    published_runtime_ref: publishedRuntimeRef,
    context,
  });
}

function getNotificationPreview(item) {
  if (item?.message) return item.message;

  switch (item?.type) {
    case "comment_reply":
      return "Вам ответили в комментариях";

    case "comment_mention":
      return "Вас упомянули";

    case "task_assigned":
      return "Вам назначили задачу";

    case "task_status_changed":
      return "Изменён статус задачи";

    case "workflow_request":
      return "Требуется согласование";

    case "document_approved":
      return "Документ согласован";

    case "system_alert":
      return "Системное уведомление";

    default:
      return "Новое уведомление";
  }
}

function getNotificationAccent(type) {
  switch (type) {
    case "comment_reply":
      return "#2563EB";

    case "comment_mention":
      return "#7C3AED";

    case "task_assigned":
      return "#059669";

    case "workflow_request":
      return "#EA580C";

    case "system_alert":
      return "#DC2626";

    default:
      return "#94A3B8";
  }
}

function formatNotificationTime(value) {
  if (!value) return "";

  try {
    return new Date(value).toLocaleString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

function NotificationDropdownPortal({
  anchorRef,
  dropdownRef,
  notifications,
  onItemClick,
}) {
  const [position, setPosition] = useState(null);

  const updatePosition = useCallback(() => {
    const anchor = anchorRef.current;

    if (!anchor) {
      return;
    }

    const rect = anchor.getBoundingClientRect();

    setPosition({
      top: rect.top + DROPDOWN_TOP_OFFSET,
      left: rect.right - DROPDOWN_WIDTH,
    });
  }, [anchorRef]);

  useLayoutEffect(() => {
    updatePosition();

    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [updatePosition]);

  if (!position) {
    return null;
  }

  return createPortal(
    <div
      ref={dropdownRef}
      style={{
        position: "fixed",
        top: position.top,
        left: position.left,
        width: DROPDOWN_WIDTH,
        maxHeight: DROPDOWN_MAX_HEIGHT,
        overflowY: "auto",
        background: "#ffffff",
        border: "1px solid #e2e8f0",
        borderRadius: 14,
        boxShadow: "0 10px 40px rgba(15, 23, 42, 0.14)",
        zIndex: Z_INDEX_LAYERS.notificationDropdown,
        transform: `scale(${DROPDOWN_VISUAL_SCALE})`,
        transformOrigin: "top right",
      }}
    >
      <div
        style={{
          padding: "14px 16px",
          borderBottom: "1px solid #e2e8f0",
          fontSize: 15,
          fontWeight: 700,
          color: "#0f172a",
        }}
      >
        Уведомления
      </div>

      {!notifications.length && (
        <div
          style={{
            padding: 20,
            fontSize: 14,
            color: "#64748b",
          }}
        >
          Нет уведомлений
        </div>
      )}

      {notifications.map((item) => {
        const accent = getNotificationAccent(item.type);

        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onItemClick(item)}
            style={{
              width: "100%",
              padding: 14,
              border: "none",
              borderBottom: "1px solid #f1f5f9",
              background: item.is_read ? "#ffffff" : "#f8fbff",
              cursor: "pointer",
              textAlign: "left",
              display: "flex",
              gap: 12,
            }}
          >
            <div
              style={{
                width: 8,
                minWidth: 8,
                borderRadius: 999,
                background: accent,
                opacity: item.is_read ? 0.35 : 1,
              }}
            />

            <div
              style={{
                flex: 1,
                minWidth: 0,
                display: "flex",
                flexDirection: "column",
                gap: 4,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 8,
                }}
              >
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: item.is_read ? 600 : 700,
                    color: "#0f172a",
                  }}
                >
                  {item.title}
                </div>

                <div
                  style={{
                    fontSize: 11,
                    color: "#94A3B8",
                    whiteSpace: "nowrap",
                  }}
                >
                  {formatNotificationTime(item.created_at || item.createdAt)}
                </div>
              </div>

              <div
                style={{
                  fontSize: 13,
                  color: "#475569",
                  lineHeight: 1.4,
                }}
              >
                {getNotificationPreview(item)}
              </div>
            </div>
          </button>
        );
      })}
    </div>,
    document.body,
  );
}

export default function NotificationBell({
  unreadCount = 0,
  notifications = [],
  onReadNotification,
}) {
  const [isOpen, setIsOpen] = useState(false);

  const wrapperRef = useRef(null);
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (
        wrapperRef.current?.contains(event.target) ||
        dropdownRef.current?.contains(event.target)
      ) {
        return;
      }

      setIsOpen(false);
    }

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleNotificationClick = async (item) => {
    await onReadNotification?.(item.id);

    setIsOpen(false);

    emitNotificationNavigateEvent(item);
  };

  return (
    <div ref={wrapperRef} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        title="Уведомления"
        style={{
          position: "relative",
          width: 34,
          height: 34,
          padding: 5,
          border: "1px solid #cbd5e1",
          borderRadius: 8,
          background: "#ffffff",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <img
          src={bellIcon}
          alt="Уведомления"
          style={{
            width: 18,
            height: 18,
            objectFit: "contain",
            display: "block",
          }}
        />

        {unreadCount > 0 && (
          <div
            style={{
              position: "absolute",
              top: -4,
              right: -4,
              minWidth: 18,
              height: 18,
              padding: "0 4px",
              borderRadius: 999,
              background: "#2563eb",
              color: "#ffffff",
              fontSize: 11,
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxSizing: "border-box",
            }}
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </div>
        )}
      </button>

      {isOpen ? (
        <NotificationDropdownPortal
          anchorRef={wrapperRef}
          dropdownRef={dropdownRef}
          notifications={notifications}
          onItemClick={handleNotificationClick}
        />
      ) : null}
    </div>
  );
}
