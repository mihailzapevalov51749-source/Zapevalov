import { useRef } from "react";

import { chatLayoutStyles } from "../styles/corporateChatStyles";

import { normalizeAvatarSettings } from "../../../shared/avatar/avatarUtils";

import callIcon from "../../../assets/icons/call.png";
import videoIcon from "../../../assets/icons/video.png";
import videoOffIcon from "../../../assets/icons/videoOff.png";
import usersIcon from "../../../assets/icons/users.png";
import settingsIcon from "../../../assets/icons/settings.gif";

const HEADER_AVATAR_SIZE = 30;
const PROFILE_AVATAR_SIZE = 132;

function getChatInitials(chat) {
  const title = String(chat?.title || "Ч").trim();

  if (!title) return "Ч";

  return title
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
}

function renderAvatarImage({ avatarUrl, avatarSettings }) {
  const settings = normalizeAvatarSettings(avatarSettings);
  const ratio = HEADER_AVATAR_SIZE / PROFILE_AVATAR_SIZE;

  return (
    <div style={chatLayoutStyles.chatHeaderAvatarClip}>
      <img
        src={avatarUrl}
        alt=""
        draggable={false}
        style={{
          ...chatLayoutStyles.chatHeaderAvatarImage,
          transform: `translate(${(settings.x || 0) * ratio}px, ${
            (settings.y || 0) * ratio
          }px) scale(${settings.scale || 1})`,
        }}
      />
    </div>
  );
}

function renderChatAvatar(chat) {
  const avatarUrl = chat?.avatar_url || chat?.avatarUrl || "";
  const avatarSettings = chat?.avatar_settings || chat?.avatarSettings || null;

  if (avatarUrl) return renderAvatarImage({ avatarUrl, avatarSettings });

  return getChatInitials(chat);
}

function getParticipantsCount(chat) {
  if (Array.isArray(chat?.participants)) return chat.participants.length;
  if (Array.isArray(chat?.members)) return chat.members.length;
  if (Array.isArray(chat?.users)) return chat.users.length;

  return (
    Number(
      chat?.participants_count ??
        chat?.participantsCount ??
        chat?.members_count ??
        chat?.membersCount ??
        chat?.users_count ??
        chat?.usersCount ??
        0
    ) || 0
  );
}

function formatParticipantsCount(count) {
  return count > 99 ? "99+" : String(count);
}

export default function ChatHeader({
  activeChat,
  currentUser,
  onOpenSettings,
  onOpenParticipants,
}) {
  const settingsButtonRef = useRef(null);

  const isGroupChat = activeChat?.type === "group";
  const isChatCreator = currentUser?.id === activeChat?.created_by_id;
  const isVideoEnabled = Boolean(activeChat?.video_enabled);
  const participantsCount = getParticipantsCount(activeChat);

  function handleOpenSettings() {
    if (!settingsButtonRef.current) {
      onOpenSettings?.(null);
      return;
    }

    onOpenSettings?.(settingsButtonRef.current.getBoundingClientRect());
  }

  function handleOpenParticipants(event) {
    event.preventDefault();
    event.stopPropagation();

    onOpenParticipants?.();
  }

  return (
    <div style={chatLayoutStyles.chatHeader}>
      <div style={chatLayoutStyles.chatHeaderTop}>
        <div style={chatLayoutStyles.chatHeaderInfo}>
          <div style={chatLayoutStyles.chatHeaderAvatar}>
            {renderChatAvatar(activeChat)}
          </div>

          <div style={chatLayoutStyles.chatHeaderTitle}>
            {activeChat?.title || "Чат"}
          </div>
        </div>

        <div style={chatLayoutStyles.chatHeaderTabs}>
          <button
            type="button"
            style={{
              ...chatLayoutStyles.chatHeaderTab,
              ...chatLayoutStyles.activeChatHeaderTab,
            }}
          >
            Чат
          </button>

          <button
            type="button"
            style={chatLayoutStyles.chatHeaderAddButton}
            title="Добавить сущность"
          >
            +
          </button>
        </div>

        <div style={chatLayoutStyles.chatHeaderActions}>
          <button
            type="button"
            style={chatLayoutStyles.chatHeaderActionButton}
            title="Звонок"
          >
            <img
              src={callIcon}
              alt="call"
              style={chatLayoutStyles.chatHeaderActionIcon}
            />
          </button>

          <button
            type="button"
            style={chatLayoutStyles.chatHeaderActionButton}
            title="Видео"
          >
            <img
              src={isVideoEnabled ? videoIcon : videoOffIcon}
              alt="video"
              style={chatLayoutStyles.chatHeaderActionIcon}
            />
          </button>

          {isGroupChat && (
            <button
              type="button"
              style={{
                ...chatLayoutStyles.chatHeaderActionButton,
                position: "relative",
              }}
              title={`Участники: ${participantsCount}`}
              onMouseDown={(event) => {
                event.preventDefault();
                event.stopPropagation();
              }}
              onClick={handleOpenParticipants}
            >
              <img
                src={usersIcon}
                alt="users"
                style={chatLayoutStyles.chatHeaderActionIcon}
              />

              {participantsCount > 0 && (
                <span style={participantBadgeStyle}>
                  {formatParticipantsCount(participantsCount)}
                </span>
              )}
            </button>
          )}

          {isGroupChat && isChatCreator && (
           <button
  ref={settingsButtonRef}
  type="button"
  style={chatLayoutStyles.chatHeaderActionButton}
  title="Настройки"
  onMouseDown={(event) => {
    event.preventDefault();
    event.stopPropagation();
  }}
  onClick={handleOpenSettings}
>
              
              <img
                src={settingsIcon}
                alt="settings"
                style={chatLayoutStyles.chatHeaderActionIcon}
              />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

const participantBadgeStyle = {
  position: "absolute",
  top: -5,
  right: -5,

  minWidth: 16,
  height: 16,
  padding: "0 4px",

  borderRadius: 999,

  background: "#2563EB",
  color: "#FFFFFF",
  border: "2px solid #FFFFFF",

  fontSize: 10,
  fontWeight: 800,
  lineHeight: "12px",

  display: "flex",
  alignItems: "center",
  justifyContent: "center",

  boxSizing: "border-box",
  pointerEvents: "none",
};