import { createPortal } from "react-dom";

import MessageAvatar from "./MessageAvatar";

import {
  popoverOverlayStyle,
  popoverStyle,
  userButtonStyle,
} from "../styles/messageItemStyles";

export default function MessageMentionEmojiPopover({
  isOpen,
  mode,
  position,
  size,
  users = [],
  emojiItems = [],
  onClose,
  onMentionUser,
  onEmojiSelect,
}) {
  if (!isOpen || !position) return null;

  return createPortal(
    <>
      <div style={popoverOverlayStyle} onMouseDown={onClose} />

      <div
        style={{
          ...popoverStyle,
          ...size,
          top: position.top,
          left: position.left,
        }}
        onMouseDown={(event) => {
          event.stopPropagation();
        }}
      >
        {mode === "mention" &&
          users.map((user) => (
            <button
              key={user.id}
              type="button"
              style={userButtonStyle}
              onMouseDown={(event) => {
                event.preventDefault();
                event.stopPropagation();
                onMentionUser?.(user);
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

        {mode === "emoji" &&
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
                onEmojiSelect?.(emoji);
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
  );
}