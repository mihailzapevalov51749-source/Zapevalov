import { useRef } from "react";

import { chatLayoutStyles } from "../styles/corporateChatStyles";

import { normalizeAvatarSettings } from "../../../shared/avatar/avatarUtils";
import { buildAvatarUrl } from "../../../shared/files/api/filesApi";
import {
  resolveChatDisplayAvatar,
  resolveChatDisplayInitials,
  resolveChatDisplayTitle,
} from "../utils/resolveChatDisplayTitle";
import { isChatCreator, isGroupChat } from "../utils/chatAccessUtils";

import callIcon from "../../../assets/icons/call.png";
import videoIcon from "../../../assets/icons/video.png";
import videoOffIcon from "../../../assets/icons/videoOff.png";
import usersIcon from "../../../assets/icons/users.png";
import settingsIcon from "../../../assets/icons/settings.gif";

const HEADER_AVATAR_SIZE = 30;
const PROFILE_AVATAR_SIZE = 132;

function getChatInitials(chat, currentUser) {
  return resolveChatDisplayInitials(chat, currentUser);
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

function renderChatAvatar(chat, currentUser) {
  const displayAvatar = resolveChatDisplayAvatar(chat, currentUser);
  const avatarUrl = buildAvatarUrl(displayAvatar.avatar_url || "");
  const avatarSettings = displayAvatar.avatar_settings || null;

  if (avatarUrl) return renderAvatarImage({ avatarUrl, avatarSettings });

  return getChatInitials(chat, currentUser);
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

  const showGroupActions = isGroupChat(activeChat);
  const showSettingsButton = showGroupActions && isChatCreator(activeChat, currentUser);
  const isVideoEnabled = Boolean(activeChat?.video_enabled);
  const participantsCount = getParticipantsCount(activeChat);

  function handleOpenSettings(event) {
    event.preventDefault();
    event.stopPropagation();
    onOpenSettings?.();
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
            {renderChatAvatar(activeChat, currentUser)}
          </div>

          <div style={chatLayoutStyles.chatHeaderTitle}>
            {resolveChatDisplayTitle(activeChat, currentUser)}
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

        <div className="chat-header__actions" style={chatLayoutStyles.chatHeaderActions}>
          <div className="chat-header__context-actions">
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

            {showGroupActions ? (
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

                {participantsCount > 0 ? (
                  <span style={participantBadgeStyle}>
                    {formatParticipantsCount(participantsCount)}
                  </span>
                ) : null}
              </button>
            ) : null}

            {showSettingsButton ? (
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
            ) : null}
          </div>
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
