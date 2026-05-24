import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

import EmojiIcon from "../../comments/components/EmojiIcon";
import MessageAvatar from "../../../shared/communication/components/MessageAvatar";

import { emojiFileMap } from "../../comments/emoji/emojiFileMap";

import paperclipIcon from "../../../assets/icons/paperclip.svg";
import sendHorizontalIcon from "../../../assets/icons/SendHorizonal.svg";

import {
  popoverOverlayStyle,
  popoverStyle,
  userButtonStyle,
} from "../../comments/styles/commentPopoverStyles";

const API_BASE_URL = "http://127.0.0.1:8010";

const DEFAULT_AVATAR_SETTINGS = {
  x: 0,
  y: 0,
  scale: 1,
};

const MENTION_POPOVER_WIDTH = 320;
const MENTION_POPOVER_HEIGHT = 190;
const EMOJI_POPOVER_WIDTH = 292;
const EMOJI_POPOVER_HEIGHT = 260;

const TEXTAREA_MIN_HEIGHT = 22;
const TEXTAREA_MAX_HEIGHT = 120;

function getToken() {
  return (
    localStorage.getItem("token") ||
    localStorage.getItem("access_token") ||
    localStorage.getItem("authToken") ||
    ""
  );
}

async function loadSystemUsers() {
  const token = getToken();

  const response = await fetch(`${API_BASE_URL}/users/`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  if (!response.ok) {
    throw new Error("Не удалось загрузить пользователей");
  }

  const data = await response.json();

  if (Array.isArray(data)) return data;
  if (Array.isArray(data.items)) return data.items;
  if (Array.isArray(data.users)) return data.users;
  if (Array.isArray(data.results)) return data.results;

  return [];
}

function normalizeUser(user) {
  const id = user?.id ?? user?.user_id ?? user?.key ?? user?.value ?? "";

  const label =
    user?.full_name ||
    user?.fullName ||
    user?.name ||
    user?.label ||
    user?.email ||
    "Без имени";

  return {
    id,
    label,
    full_name: label,
    email: user?.email || "",
    avatar_url: user?.avatar_url || user?.avatarUrl || "",
    avatar_settings:
      user?.avatar_settings ||
      user?.avatarSettings ||
      DEFAULT_AVATAR_SETTINGS,
  };
}

function emojiCodeToChar(code) {
  if (!code) return "";

  try {
    return String.fromCodePoint(
      ...String(code)
        .split("-")
        .map((part) => parseInt(part, 16))
    );
  } catch {
    return "";
  }
}

function getPopoverPosition(rect, width, height) {
  if (!rect) {
    return {
      top: 8,
      left: 8,
    };
  }

  const viewportWidth =
    window.innerWidth || document.documentElement.clientWidth;

  const viewportHeight =
    window.innerHeight || document.documentElement.clientHeight;

  let left = rect.left;
  let top = rect.top - height - 10;

  if (left + width > viewportWidth - 12) {
    left = viewportWidth - width - 12;
  }

  if (left < 12) {
    left = 12;
  }

  if (top < 12) {
    top = 12;
  }

  if (top + height > viewportHeight - 12) {
    top = viewportHeight - height - 12;
  }

  return {
    top,
    left,
  };
}

export default function ChatComposer({
  placeholder = "Написать сообщение...",
  disabled = false,
  autoFocus = false,
  submitErrorLabel = "Ошибка отправки сообщения",
  onSubmit,
}) {
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);

  const emojiButtonRef = useRef(null);
  const mentionButtonRef = useRef(null);

  const [body, setBody] = useState("");
  const [files, setFiles] = useState([]);
  const [users, setUsers] = useState([]);
  const [mentionedUserIds, setMentionedUserIds] = useState([]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEmojiOpen, setIsEmojiOpen] = useState(false);
  const [isMentionOpen, setIsMentionOpen] = useState(false);
  const [popoverPosition, setPopoverPosition] = useState(null);

  const resizeTextarea = () => {
    const element = textareaRef.current;

    if (!element) return;

    element.style.height = "auto";
    element.style.height = `${Math.min(
      element.scrollHeight,
      TEXTAREA_MAX_HEIGHT
    )}px`;
  };

  useEffect(() => {
    async function loadUsers() {
      try {
        const data = await loadSystemUsers();

        setUsers(data.map(normalizeUser).filter((user) => user.id));
      } catch (error) {
        console.error("Ошибка загрузки пользователей", error);
        setUsers([]);
      }
    }

    loadUsers();
  }, []);

  useEffect(() => {
    if (!autoFocus) return;

    requestAnimationFrame(() => {
      textareaRef.current?.focus();
    });
  }, [autoFocus]);

  useEffect(() => {
    resizeTextarea();
  }, [body]);

  const emojiItems = useMemo(() => {
    return Object.entries(emojiFileMap)
      .map(([code, icon]) => ({
        key: code,
        code,
        icon,
        symbol: emojiCodeToChar(code),
      }))
      .filter((emoji) => emoji.icon && emoji.symbol);
  }, []);

  const normalizedBody = String(body || "");
  const hasText = normalizedBody.trim().length > 0;
  const hasFiles = Array.isArray(files) && files.length > 0;
  const canSubmit = (hasText || hasFiles) && !disabled && !isSubmitting;

  const closePopovers = () => {
    setIsEmojiOpen(false);
    setIsMentionOpen(false);
    setPopoverPosition(null);
  };

  const focusTextarea = () => {
    requestAnimationFrame(() => {
      textareaRef.current?.focus();
      resizeTextarea();
    });
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;

    try {
      setIsSubmitting(true);

      await onSubmit?.({
        body: normalizedBody.trim() || " ",
        content: normalizedBody.trim() || " ",
        files,
        attachments: files,
        mentioned_user_ids: mentionedUserIds,
        mentionedUserIds,
        mentions: mentionedUserIds.map((userId) => ({
          user_id: userId,
          mention_key: String(userId),
        })),
      });

      setBody("");
      setFiles([]);
      setMentionedUserIds([]);
      closePopovers();

      requestAnimationFrame(() => {
        resizeTextarea();
        focusTextarea();
      });
    } catch (error) {
      console.error(submitErrorLabel, error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (event) => {
    if (event.key !== "Enter") return;
    if (event.shiftKey) return;

    event.preventDefault();
    handleSubmit();
  };

  const handleMentionUser = (user) => {
    const normalizedUser = normalizeUser(user);

    if (!normalizedUser.id) return;

    const mentionText = `@${normalizedUser.label} `;

    setBody((prev) => `${String(prev || "")}${mentionText}`);

    setMentionedUserIds((prev) => {
      if (prev.includes(normalizedUser.id)) return prev;
      return [...prev, normalizedUser.id];
    });

    closePopovers();
    focusTextarea();
  };

  const handleToggleMention = () => {
    const rect = mentionButtonRef.current?.getBoundingClientRect();

    setPopoverPosition(
      getPopoverPosition(
        rect,
        MENTION_POPOVER_WIDTH,
        MENTION_POPOVER_HEIGHT
      )
    );

    setIsMentionOpen((prev) => !prev);
    setIsEmojiOpen(false);
  };

  const handleToggleEmoji = () => {
    const rect = emojiButtonRef.current?.getBoundingClientRect();

    setPopoverPosition(
      getPopoverPosition(rect, EMOJI_POPOVER_WIDTH, EMOJI_POPOVER_HEIGHT)
    );

    setIsEmojiOpen((prev) => !prev);
    setIsMentionOpen(false);
  };

  const handleEmojiSelect = (emoji) => {
    if (!emoji?.symbol) return;

    setBody((prev) => `${String(prev || "")}${emoji.symbol}`);

    closePopovers();
    focusTextarea();
  };

  const activePopoverSize = isMentionOpen
    ? {
        width: MENTION_POPOVER_WIDTH,
        maxHeight: MENTION_POPOVER_HEIGHT,
      }
    : {
        width: EMOJI_POPOVER_WIDTH,
        maxHeight: EMOJI_POPOVER_HEIGHT,
      };

  return (
    <div style={styles.composer}>
      {!!files.length && (
        <div style={styles.attachments}>
          {files.map((file, index) => (
            <div key={`${file.name}-${index}`} style={styles.attachmentItem}>
              <span style={styles.attachmentName}>{file.name}</span>

              <button
                type="button"
                style={styles.removeAttachmentButton}
                onClick={() =>
                  setFiles((prev) =>
                    prev.filter((_, fileIndex) => fileIndex !== index)
                  )
                }
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      <div style={styles.inputRow}>
        <textarea
          ref={textareaRef}
          autoFocus={autoFocus}
          value={body}
          placeholder={placeholder}
          disabled={disabled || isSubmitting}
          rows={1}
          style={styles.textarea}
          onChange={(event) => {
            setBody(event.target.value);
          }}
          onKeyDown={handleKeyDown}
        />
      </div>

      <div style={styles.toolbar}>
        <div style={styles.toolbarLeft}>
          <button
            type="button"
            title="Прикрепить файл"
            style={styles.toolbarButton}
            disabled={disabled || isSubmitting}
            onClick={() => fileInputRef.current?.click()}
          >
            <img src={paperclipIcon} alt="" style={styles.toolbarIcon} />
          </button>

          <button
            ref={mentionButtonRef}
            type="button"
            title="Упомянуть пользователя"
            style={styles.toolbarButton}
            disabled={disabled || isSubmitting}
            onClick={handleToggleMention}
          >
            @
          </button>

          <button
            ref={emojiButtonRef}
            type="button"
            title="Добавить emoji"
            style={styles.toolbarButton}
            disabled={disabled || isSubmitting}
            onClick={handleToggleEmoji}
          >
            <EmojiIcon emojiKey="smile" size={18} opacity={1} />
          </button>
        </div>

        <button
          type="button"
          title="Отправить"
          style={canSubmit ? styles.sendButton : styles.sendButtonDisabled}
          disabled={!canSubmit}
          onClick={handleSubmit}
        >
          <img src={sendHorizontalIcon} alt="" style={styles.sendIcon} />
        </button>
      </div>

      {(isEmojiOpen || isMentionOpen) &&
        popoverPosition &&
        createPortal(
          <>
            <div style={popoverOverlayStyle} onMouseDown={closePopovers} />

            <div
              style={{
                ...popoverStyle,
                ...activePopoverSize,
                top: popoverPosition.top,
                left: popoverPosition.left,
              }}
              onMouseDown={(event) => {
                event.stopPropagation();
              }}
            >
              {isMentionOpen &&
                users.map((user) => (
                  <button
                    key={user.id}
                    type="button"
                    style={userButtonStyle}
                    onMouseDown={(event) => {
                      event.preventDefault();
                      event.stopPropagation();

                      handleMentionUser(user);
                    }}
                  >
                    <MessageAvatar
                      authorName={user.label}
                      avatarUrl={user.avatar_url}
                      avatarSettings={user.avatar_settings}
                      size={32}
                    />

                    <div style={styles.userInfo}>
                      <div style={styles.userName}>{user.label}</div>
                      <div style={styles.userEmail}>{user.email}</div>
                    </div>
                  </button>
                ))}

              {isEmojiOpen &&
                emojiItems.map((emoji) => (
                  <button
                    key={emoji.key}
                    type="button"
                    style={styles.emojiButton}
                    onMouseDown={(event) => {
                      event.preventDefault();
                      event.stopPropagation();

                      handleEmojiSelect(emoji);
                    }}
                  >
                    <img src={emoji.icon} alt="" style={styles.emojiIcon} />
                  </button>
                ))}
            </div>
          </>,
          document.body
        )}

      <input
        ref={fileInputRef}
        type="file"
        multiple
        style={styles.hiddenInput}
        onChange={(event) => {
          const selectedFiles = Array.from(event.target.files || []);

          if (!selectedFiles.length) return;

          setFiles((prev) => [...prev, ...selectedFiles]);

          event.target.value = "";
          focusTextarea();
        }}
      />
    </div>
  );
}

const styles = {
  composer: {
    width: "100%",
    minHeight: 44,
    padding: "8px 14px 8px",
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "column",
    justifyContent: "flex-end",
    gap: 4,
    background: "#FFFFFF",
  },

  inputRow: {
    width: "100%",
    minHeight: 26,
    padding: "4px 8px",
    boxSizing: "border-box",
    background: "#FFFFFF",
    border: "1px solid #E5E7EB",
    borderRadius: 4,
    display: "flex",
    alignItems: "center",
  },

  textarea: {
    width: "100%",
    minHeight: TEXTAREA_MIN_HEIGHT,
    maxHeight: TEXTAREA_MAX_HEIGHT,
    height: TEXTAREA_MIN_HEIGHT,
    border: "none",
    resize: "none",
    outline: "none",
    background: "transparent",
    fontSize: 13,
    fontWeight: 400,
    color: "#111827",
    lineHeight: "18px",
    fontFamily: "inherit",
    boxSizing: "border-box",
    padding: 0,
    overflowY: "auto",
  },

  toolbar: {
    width: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    marginTop: -1,
  },

  toolbarLeft: {
    display: "flex",
    alignItems: "center",
    gap: 4,
  },

  toolbarButton: {
    width: 24,
    height: 24,
    minWidth: 24,
    border: "none",
    background: "transparent",
    color: "#6B7280",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    padding: 0,
    fontSize: 15,
  },

  toolbarIcon: {
    width: 16,
    height: 16,
    objectFit: "contain",
    opacity: 0.85,
  },

  sendButton: {
    width: 30,
    height: 30,
    minWidth: 30,
    border: "none",
    borderRadius: 9,
    background: "#8EA8FF",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    padding: 0,
  },

  sendButtonDisabled: {
    width: 34,
    height: 34,
    minWidth: 34,
    border: "none",
    borderRadius: 9,
    background: "#C7D2FE",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "default",
    padding: 0,
    opacity: 0.75,
  },

  sendIcon: {
    width: 16,
    height: 16,
    objectFit: "contain",
    display: "block",
    filter: "brightness(0) invert(1)",
    pointerEvents: "none",
  },

  hiddenInput: {
    display: "none",
  },

  attachments: {
    width: "100%",
    display: "flex",
    flexWrap: "wrap",
    gap: 6,
  },

  attachmentItem: {
    maxWidth: "100%",
    height: 26,
    borderRadius: 999,
    background: "#F9FAFB",
    border: "1px solid #E5E7EB",
    padding: "0 8px",
    display: "flex",
    alignItems: "center",
    gap: 6,
    fontSize: 11,
    color: "#4B5563",
    boxSizing: "border-box",
  },

  attachmentName: {
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },

  removeAttachmentButton: {
    width: 16,
    height: 16,
    minWidth: 16,
    border: "none",
    borderRadius: "50%",
    background: "#E5E7EB",
    color: "#6B7280",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 10,
    lineHeight: 1,
    padding: 0,
  },

  userInfo: {
    minWidth: 0,
    display: "flex",
    flexDirection: "column",
    gap: 2,
  },

  userName: {
    fontSize: 13,
    fontWeight: 700,
    color: "#111827",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },

  userEmail: {
    fontSize: 12,
    color: "#6B7280",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },

  emojiButton: {
    width: 36,
    height: 34,
    border: "none",
    borderRadius: 8,
    background: "transparent",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    padding: 0,
  },

  emojiIcon: {
    width: 22,
    height: 22,
    objectFit: "contain",
    display: "block",
  },
};