import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

import MessageAvatar from "../communication/components/MessageAvatar";
import {
  MENTION_POPOVER_HEIGHT,
  MENTION_POPOVER_WIDTH,
} from "../communication/domain/messageItemUtils";
import {
  popoverOverlayStyle,
  popoverStyle,
  userButtonStyle,
} from "../communication/styles/messageItemStyles";
import {
  fieldEditorInlineInputStyle,
  fieldEditorInputStyle,
} from "../fieldEditors/fieldEditorStyles";
import {
  filterUsersByQuery,
  getUserPickerPopoverPosition,
} from "./userPickerUtils";

function buildTriggerStyle(inline) {
  const base = inline ? fieldEditorInlineInputStyle : fieldEditorInputStyle;

  return {
    ...base,
    display: "flex",
    alignItems: "center",
    gap: 8,
    cursor: "pointer",
    textAlign: "left",
    paddingRight: inline ? 20 : 32,
    position: "relative",
    width: "100%",
  };
}

function buildTriggerReadOnlyStyle(inline) {
  return {
    ...buildTriggerStyle(inline),
    cursor: "default",
    background: inline ? "transparent" : "#f8fafc",
  };
}

const chevronStyle = {
  position: "absolute",
  right: 10,
  top: "50%",
  transform: "translateY(-50%)",
  fontSize: 11,
  color: "#94a3b8",
  pointerEvents: "none",
};

const searchInputStyle = {
  width: "100%",
  boxSizing: "border-box",
  margin: "0 0 4px",
  padding: "8px 10px",
  fontSize: 13,
  lineHeight: 1.3,
  color: "#0f172a",
  background: "#f8fafc",
  border: "1px solid #e2e8f0",
  borderRadius: 8,
  outline: "none",
};

const placeholderStyle = {
  color: "#94a3b8",
  fontSize: 14,
};

const userNameStyle = {
  minWidth: 0,
  fontSize: 14,
  fontWeight: 500,
  color: "#0f172a",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};

const userEmailSecondaryStyle = {
  fontSize: 12,
  color: "#64748b",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};

function SelectedUserDisplay({ user, placeholder }) {
  if (!user) {
    return <span style={placeholderStyle}>{placeholder}</span>;
  }

  return (
    <>
      <MessageAvatar
        authorName={user.label}
        avatarUrl={user.avatar_url}
        avatarSettings={user.avatar_settings}
        size={24}
      />
      <span style={userNameStyle}>{user.label}</span>
    </>
  );
}

export default function UserPicker({
  users = [],
  selectedUser = null,
  selectedUserId = null,
  onChange,
  readOnly = false,
  autoFocus = false,
  inline = false,
  isLoading = false,
  placeholder = "Выберите пользователя",
  emptyListText = "Пользователи не найдены",
  onDismiss,
}) {
  const triggerStyle = buildTriggerStyle(inline);
  const triggerReadOnlyStyle = buildTriggerReadOnlyStyle(inline);
  const triggerRef = useRef(null);
  const searchInputRef = useRef(null);

  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  const resolvedSelectedUser = useMemo(() => {
    if (selectedUser) {
      return selectedUser;
    }

    if (selectedUserId == null) {
      return null;
    }

    const targetId = String(selectedUserId);

    return users.find((user) => String(user.id) === targetId) || null;
  }, [selectedUser, selectedUserId, users]);

  const filteredUsers = useMemo(
    () => filterUsersByQuery(users, searchQuery),
    [searchQuery, users],
  );

  const closePicker = ({ notifyDismiss = true } = {}) => {
    setIsOpen(false);
    setPosition(null);
    setSearchQuery("");

    if (notifyDismiss) {
      onDismiss?.();
    }
  };

  const openPicker = () => {
    if (readOnly || isLoading) {
      return;
    }

    const rect = triggerRef.current?.getBoundingClientRect();
    setPosition(getUserPickerPopoverPosition(rect));
    setIsOpen(true);
  };

  useEffect(() => {
    if (!autoFocus || readOnly || isLoading) {
      return;
    }

    const rect = triggerRef.current?.getBoundingClientRect();

    if (!rect) {
      return;
    }

    setPosition(getUserPickerPopoverPosition(rect));
    setIsOpen(true);
  }, [autoFocus, isLoading, readOnly]);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      searchInputRef.current?.focus();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [isOpen]);

  const handleSelectUser = (user) => {
    const parsed = Number(user.id);

    onChange?.(Number.isFinite(parsed) && parsed > 0 ? parsed : null);
    closePicker({ notifyDismiss: false });
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        style={readOnly ? triggerReadOnlyStyle : triggerStyle}
        disabled={readOnly || isLoading}
        onClick={openPicker}
      >
        <SelectedUserDisplay
          user={resolvedSelectedUser}
          placeholder={isLoading ? "Загрузка..." : placeholder}
        />
        {!readOnly ? <span style={chevronStyle}>▾</span> : null}
      </button>

      {isOpen &&
        position &&
        createPortal(
          <>
            <div style={popoverOverlayStyle} onMouseDown={closePicker} />
            <div
              data-user-picker-popover="true"
              style={{
                ...popoverStyle,
                width: MENTION_POPOVER_WIDTH,
                maxHeight: MENTION_POPOVER_HEIGHT,
                top: position.top,
                left: position.left,
              }}
              onMouseDown={(event) => {
                event.preventDefault();
                event.stopPropagation();
              }}
            >
              <input
                ref={searchInputRef}
                type="search"
                value={searchQuery}
                placeholder="Поиск по имени или email"
                style={searchInputStyle}
                onChange={(event) => setSearchQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Escape") {
                    closePicker();
                  }
                }}
              />

              {filteredUsers.length === 0 ? (
                <div
                  style={{
                    padding: "12px 10px",
                    fontSize: 13,
                    color: "#94a3b8",
                  }}
                >
                  {emptyListText}
                </div>
              ) : (
                filteredUsers.map((user) => (
                  <button
                    key={user.id}
                    type="button"
                    style={userButtonStyle}
                    onMouseDown={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      handleSelectUser(user);
                    }}
                  >
                    <MessageAvatar
                      authorName={user.label}
                      avatarUrl={user.avatar_url}
                      avatarSettings={user.avatar_settings}
                      size={32}
                    />
                    <div
                      style={{
                        minWidth: 0,
                        display: "flex",
                        flexDirection: "column",
                        gap: 2,
                      }}
                    >
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 700,
                          color: "#0f172a",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {user.label}
                      </div>
                      {user.email ? (
                        <div style={userEmailSecondaryStyle}>{user.email}</div>
                      ) : null}
                    </div>
                  </button>
                ))
              )}
            </div>
          </>,
          document.body,
        )}
    </>
  );
}
