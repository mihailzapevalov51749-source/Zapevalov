import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

import EmojiIcon from "../../../modules/comments/components/EmojiIcon";
import MessageAvatar from "./MessageAvatar";

import { emojiFileMap } from "../../../modules/comments/emoji/emojiFileMap";

import paperclipIcon from "../../../assets/icons/paperclip.svg";
import sendHorizontalIcon from "../../../assets/icons/SendHorizonal.svg";

import {
  popoverOverlayStyle,
  popoverStyle,
  userButtonStyle,
} from "../../../modules/comments/styles/commentPopoverStyles";

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

const TEXTAREA_MIN_HEIGHT = 18;
const TEXTAREA_MAX_HEIGHT = 144;

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

const composerWrapperStyle = {
  width: "100%",
  border: "none",
  borderTop: "1px solid #E2E8F0",
  background: "#FFFFFF",
  padding: "6px 14px 6px",
  boxSizing: "border-box",
  display: "flex",
  flexDirection: "column",
  justifyContent: "flex-end",
  gap: 4,
  flexShrink: 0,
  position: "relative",
  zIndex: 20,
};

const textareaStyle = {
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
  color: "#0F172A",
  lineHeight: "18px",
  fontFamily: "inherit",
  boxSizing: "border-box",
  padding: 0,
  overflowY: "auto",
};

const toolbarStyle = {
  width: "100%",
  display: "flex",
  alignItems: "flex-end",
  justifyContent: "space-between",
  gap: 10,
  marginTop: 1,
};

const toolbarLeftStyle = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  paddingBottom: 2,
};

const toolbarButtonStyle = {
  width: 24,
  height: 24,
  minWidth: 24,
  border: "none",
  background: "transparent",
  color: "#64748B",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  padding: 0,
};

const toolbarIconStyle = {
  width: 17,
  height: 17,
  objectFit: "contain",
  opacity: 0.9,
};

const sendButtonStyle = {
  width: 38,
  height: 38,
  minWidth: 38,
  border: "none",
  borderRadius: 10,
  background: "#3b6df5",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  padding: 0,
  position: "relative",
  zIndex: 50,
  pointerEvents: "auto",
};

const sendButtonDisabledStyle = {
  ...sendButtonStyle,
  cursor: "default",
  opacity: 0.45,
};

const sendIconStyle = {
  width: 20,
  height: 20,
  objectFit: "contain",
  display: "block",
  filter: "brightness(0) invert(1)",
  pointerEvents: "none",
};

const hiddenInputStyle = {
  display: "none",
};

const attachmentsStyle = {
  width: "100%",
  display: "flex",
  flexWrap: "wrap",
  gap: 6,
  marginBottom: 2,
};

const attachmentItemStyle = {
  maxWidth: "100%",
  height: 26,
  borderRadius: 999,
  background: "#F8FAFC",
  border: "1px solid #E2E8F0",
  padding: "0 8px",
  display: "flex",
  alignItems: "center",
  gap: 6,
  fontSize: 11,
  color: "#475569",
  boxSizing: "border-box",
};

const removeAttachmentButtonStyle = {
  width: 16,
  height: 16,
  minWidth: 16,
  border: "none",
  borderRadius: "50%",
  background: "#E2E8F0",
  color: "#64748B",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 10,
  lineHeight: 1,
  padding: 0,
};

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

export default function MessageComposer({
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
    <div style={composerWrapperStyle}>
      {!!files.length && (
        <div style={attachmentsStyle}>
          {files.map((file, index) => (
            <div key={`${file.name}-${index}`} style={attachmentItemStyle}>
              <span
                style={{
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {file.name}
              </span>

              <button
                type="button"
                style={removeAttachmentButtonStyle}
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

      <textarea
        ref={textareaRef}
        autoFocus={autoFocus}
        value={body}
        placeholder={placeholder}
        disabled={disabled || isSubmitting}
        rows={1}
        style={textareaStyle}
        onChange={(event) => {
          setBody(event.target.value);
        }}
        onKeyDown={handleKeyDown}
      />

      <div style={toolbarStyle}>
        <div style={toolbarLeftStyle}>
          <button
            type="button"
            title="Прикрепить файл"
            style={toolbarButtonStyle}
            disabled={disabled || isSubmitting}
            onClick={() => fileInputRef.current?.click()}
          >
            <img src={paperclipIcon} alt="" style={toolbarIconStyle} />
          </button>

          <button
            ref={mentionButtonRef}
            type="button"
            title="Упомянуть пользователя"
            style={toolbarButtonStyle}
            disabled={disabled || isSubmitting}
            onClick={handleToggleMention}
          >
            @
          </button>

          <button
            ref={emojiButtonRef}
            type="button"
            title="Добавить emoji"
            style={toolbarButtonStyle}
            disabled={disabled || isSubmitting}
            onClick={handleToggleEmoji}
          >
            <EmojiIcon emojiKey="smile" size={18} opacity={1} />
          </button>
        </div>

        <button
          type="button"
          title="Отправить"
          style={canSubmit ? sendButtonStyle : sendButtonDisabledStyle}
          disabled={!canSubmit}
          onClick={handleSubmit}
        >
          <img src={sendHorizontalIcon} alt="" style={sendIconStyle} />
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
                          color: "#0F172A",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {user.label}
                      </div>

                      <div
                        style={{
                          fontSize: 12,
                          color: "#64748B",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {user.email}
                      </div>
                    </div>
                  </button>
                ))}

              {isEmojiOpen &&
                emojiItems.map((emoji) => (
                  <button
                    key={emoji.key}
                    type="button"
                    style={{
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
                    }}
                    onMouseDown={(event) => {
                      event.preventDefault();
                      event.stopPropagation();

                      handleEmojiSelect(emoji);
                    }}
                  >
                    <img
                      src={emoji.icon}
                      alt=""
                      style={{
                        width: 22,
                        height: 22,
                        objectFit: "contain",
                        display: "block",
                      }}
                    />
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
        style={hiddenInputStyle}
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