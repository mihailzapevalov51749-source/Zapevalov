import { useEffect, useRef, useState } from "react";

import bellIcon from "../../../assets/icons/bell.png";
import { emitNotificationNavigate } from "../navigation/notificationNavigationBus";

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

  const tableId =
    context.table_id ||
    notification.table_id ||
    null;

  const rowId =
    context.row_id ||
    notification.row_id ||
    null;

  const highlightId =
    context.highlight_id ||
    notification.highlight_id ||
    null;

  console.log("NOTIFICATION NAVIGATE:", {
    notification,
    source,
    entityType,
    entityId,
    tableId,
    rowId,
    fileId,
    commentId,
    parentCommentId,
    highlightId,
    context,
  });

  if (!entityType && !fileId) return;

  emitNotificationNavigate({
    notification,
    source,
    entityType,
    entityId: String(entityId || ""),
    tableId,
    rowId,
    fileId,
    commentId,
    parentCommentId,
    highlightId,
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

export default function NotificationBell({
  unreadCount = 0,
  notifications = [],
  onReadNotification,
}) {
  const [isOpen, setIsOpen] = useState(false);

  const wrapperRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener(
      "mousedown",
      handleClickOutside
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleClickOutside
      );
    };
  }, []);

  const handleNotificationClick = async (item) => {
    await onReadNotification?.(item.id);

    setIsOpen(false);

    emitNotificationNavigateEvent(item);
  };

  return (
    <div
      ref={wrapperRef}
      style={{ position: "relative" }}
    >
      <button
        type="button"
        onClick={() =>
          setIsOpen((prev) => !prev)
        }
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
            {unreadCount > 99
              ? "99+"
              : unreadCount}
          </div>
        )}
      </button>

      {isOpen && (
        <div
          style={{
            position: "absolute",
            top: 44,
            right: 0,
            width: 390,
            maxHeight: 520,
            overflowY: "auto",
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: 14,
            boxShadow:
              "0 10px 40px rgba(15, 23, 42, 0.14)",
            zIndex: 1000,
          }}
        >
          <div
            style={{
              padding: "14px 16px",
              borderBottom:
                "1px solid #e2e8f0",
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
            const accent =
              getNotificationAccent(item.type);

            return (
              <button
                key={item.id}
                type="button"
                onClick={() =>
                  handleNotificationClick(item)
                }
                style={{
                  width: "100%",
                  padding: 14,
                  border: "none",
                  borderBottom:
                    "1px solid #f1f5f9",
                  background: item.is_read
                    ? "#ffffff"
                    : "#f8fbff",
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
                    opacity: item.is_read
                      ? 0.35
                      : 1,
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
                      justifyContent:
                        "space-between",
                      gap: 8,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: item.is_read
                          ? 600
                          : 700,
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
                      {formatNotificationTime(
                        item.created_at ||
                          item.createdAt
                      )}
                    </div>
                  </div>

                  <div
                    style={{
                      fontSize: 13,
                      color: "#475569",
                      lineHeight: 1.4,
                    }}
                  >
                    {getNotificationPreview(
                      item
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}