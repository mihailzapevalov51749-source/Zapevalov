import { useEffect, useMemo, useRef, useState } from "react";

import {
  addChatParticipant,
  getChatParticipants,
  getUsers,
  removeChatParticipant,
  searchUsers,
} from "../api/chatsApi";

import searchIcon from "../../../assets/icons/search.png";

const AVATAR_SIZE = 36;
const PROFILE_AVATAR_SIZE = 132;

function normalizeUsersResponse(result) {
  if (Array.isArray(result)) return result;

  return result?.items || result?.users || result?.data || [];
}

function normalizeAvatarSettings(settings) {
  if (!settings) {
    return {
      x: 0,
      y: 0,
      scale: 1,
    };
  }

  if (typeof settings === "string") {
    try {
      return {
        x: 0,
        y: 0,
        scale: 1,
        ...JSON.parse(settings),
      };
    } catch {
      return {
        x: 0,
        y: 0,
        scale: 1,
      };
    }
  }

  return {
    x: 0,
    y: 0,
    scale: 1,
    ...settings,
  };
}

export default function ChatParticipantsModal({
  chat,
  currentUser,
  isOpen,
  onClose,
}) {
  const modalRef = useRef(null);

  const [participants, setParticipants] = useState([]);
  const [searchValue, setSearchValue] = useState("");
  const [foundUsers, setFoundUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  const participantIds = useMemo(() => {
    return new Set(participants.map((item) => item.user_id));
  }, [participants]);

  useEffect(() => {
    if (!isOpen || !chat?.id) return;

    loadParticipants();
  }, [isOpen, chat?.id]);

  useEffect(() => {
    if (!isOpen) return;

    const timeout = setTimeout(async () => {
      try {
        setIsSearching(true);

        const query = searchValue.trim();

        const result = query ? await searchUsers(query) : await getUsers();

        setFoundUsers(normalizeUsersResponse(result));
      } catch (error) {
        console.error("Ошибка поиска пользователей", error);
        setFoundUsers([]);
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(timeout);
  }, [isOpen, searchValue]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        onClose?.();
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, onClose]);

  async function loadParticipants() {
    try {
      setIsLoading(true);

      const data = await getChatParticipants(chat.id);

      setParticipants(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Ошибка загрузки участников", error);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleAddUser(user) {
    try {
      await addChatParticipant(chat.id, {
        user_id: user.id,
        role: "member",
      });

      await loadParticipants();
    } catch (error) {
      console.error("Ошибка добавления участника", error);
    }
  }

  async function handleRemoveUser(userId) {
    try {
      await removeChatParticipant(chat.id, userId);

      await loadParticipants();
    } catch (error) {
      console.error("Ошибка удаления участника", error);
    }
  }

  function getFullName(user) {
    return user?.full_name || user?.name || user?.email || "Пользователь";
  }

  function renderAvatar(user) {
    const fullName = getFullName(user);

    const avatarUrl = user?.avatar_url || user?.avatarUrl;

    const settings = normalizeAvatarSettings(
      user?.avatar_settings || user?.avatarSettings
    );

    const ratio = AVATAR_SIZE / PROFILE_AVATAR_SIZE;

    const avatarX = (settings.x || 0) * ratio;
    const avatarY = (settings.y || 0) * ratio;
    const avatarScale = settings.scale || 1;

    if (avatarUrl) {
      return (
        <div
          style={{
            width: AVATAR_SIZE,
            height: AVATAR_SIZE,
            borderRadius: "50%",
            overflow: "hidden",
            background: "#E2E8F0",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <img
            src={avatarUrl}
            alt=""
            draggable={false}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "contain",
              display: "block",
              userSelect: "none",
              pointerEvents: "none",
              transformOrigin: "center center",
              transform: `translate(${avatarX}px, ${avatarY}px) scale(${avatarScale})`,
            }}
          />
        </div>
      );
    }

    return (
      <div
        style={{
          width: AVATAR_SIZE,
          height: AVATAR_SIZE,
          borderRadius: "50%",
          background: "#E0E7FF",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#3730A3",
          fontSize: 13,
          fontWeight: 700,
          flexShrink: 0,
        }}
      >
        {fullName.charAt(0).toUpperCase()}
      </div>
    );
  }

  function renderStatus(text, color = "#22C55E") {
    return (
      <div
        style={{
          fontSize: 11,
          fontWeight: 500,
          color,
          display: "flex",
          alignItems: "center",
          gap: 5,
          lineHeight: 1.15,
        }}
      >
        <div
          style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: color,
            flexShrink: 0,
          }}
        />

        {text}
      </div>
    );
  }

  function renderUserRow({
    user,
    statusText,
    statusColor,
    action,
    opacity = 1,
  }) {
    const fullName = getFullName(user);

    return (
      <div
        key={user.id}
        style={{
          display: "grid",
          gridTemplateColumns: "36px minmax(0,1fr) 30px",
          alignItems: "center",
          gap: 12,
          minHeight: 42,
          opacity,
        }}
      >
        {renderAvatar(user)}

        <div
          style={{
            minWidth: 0,
          }}
        >
          <div
            style={{
              fontSize: 13,
              fontWeight: 700,
              lineHeight: 1.15,
              color: "#0F172A",
              marginBottom: 4,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {fullName}
          </div>

          {renderStatus(statusText, statusColor)}
        </div>

        {action}
      </div>
    );
  }

  if (!isOpen || !chat) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 5000,
        pointerEvents: "none",
      }}
    >
      <div
        ref={modalRef}
        style={{
          position: "absolute",
          top: 98,
          right: 14,
          width: 300,
          height: "auto",
          maxHeight: "calc(100vh - 120px)",
          background: "#FFFFFF",
          border: "1px solid rgba(226,232,240,0.9)",
          borderRadius: 8,
          boxShadow: "0 18px 56px rgba(15,23,42,0.18)",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          pointerEvents: "auto",
        }}
      >
        <div
          style={{
            padding: "14px 16px 10px",
            borderBottom: "1px solid rgba(226,232,240,0.9)",
          }}
        >
          <div
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: "#0F172A",
              marginBottom: 10,
            }}
          >
            Добавить участников
          </div>

          <div
            style={{
              height: 34,
              border: "1px solid #DCE3F1",
              borderRadius: 7,
              padding: "0 10px",
              display: "flex",
              alignItems: "center",
              gap: 7,
              background: "#FFFFFF",
            }}
          >
            <img
              src={searchIcon}
              alt=""
              style={{
                width: 13,
                height: 13,
                opacity: 0.65,
              }}
            />

            <input
              value={searchValue}
              onChange={(event) => setSearchValue(event.target.value)}
              placeholder="Введите фамилию"
              style={{
                flex: 1,
                border: "none",
                outline: "none",
                background: "transparent",
                fontSize: 13,
                color: "#0F172A",
              }}
            />
          </div>
        </div>

        <div
          style={{
            overflowY: "auto",
            padding: "14px 16px 16px",
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: "#475569",
              marginBottom: 10,
            }}
          >
            Участники чата ({participants.length})
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            {participants.map((item) => {
              const user = item.user || {};

              const isCreator =
                String(user?.id) === String(chat?.created_by_id);

              return renderUserRow({
                user,
                statusText: isCreator ? "Создатель" : "Онлайн",
                statusColor: "#22C55E",
                action: !isCreator ? (
                  <button
                    type="button"
                    onClick={() => handleRemoveUser(user.id)}
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: "50%",
                      border: "1px solid #D8DEE9",
                      background: "#FFFFFF",
                      fontSize: 18,
                      fontWeight: 300,
                      color: "#94A3B8",
                      cursor: "pointer",
                      padding: 0,
                      lineHeight: 1,
                    }}
                  >
                    ×
                  </button>
                ) : (
                  <div />
                ),
              });
            })}
          </div>

          <div
            style={{
              height: 1,
              background: "rgba(226,232,240,0.9)",
              margin: "14px 0",
            }}
          />

          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: "#475569",
              marginBottom: 10,
            }}
          >
            Пользователи системы
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            {foundUsers.map((user) => {
              const isAdded = participantIds.has(user.id);

              return renderUserRow({
                user,
                statusText: isAdded ? "Уже в чате" : "Добавить",
                statusColor: "#94A3B8",
                opacity: isAdded ? 0.5 : 1,
                action: (
                  <button
                    type="button"
                    disabled={isAdded}
                    onClick={() => handleAddUser(user)}
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: "50%",
                      border: "1px solid #D8DEE9",
                      background: "#FFFFFF",
                      fontSize: 18,
                      fontWeight: 300,
                      color: isAdded ? "#CBD5E1" : "#6366F1",
                      cursor: isAdded ? "default" : "pointer",
                      padding: 0,
                      lineHeight: 1,
                    }}
                  >
                    +
                  </button>
                ),
              });
            })}
          </div>
        </div>
      </div>
    </div>
  );
}