import { useEffect, useMemo, useState } from "react";

import {
  getOrCreateDirectChat,
  searchUsers,
} from "../api/chatsApi";

import { chatLayoutStyles } from "../styles/corporateChatStyles";

import searchIcon from "../../../assets/icons/search.png";

const DEFAULT_AVATAR_SETTINGS = {
  x: 0,
  y: 0,
  scale: 1,
};

const SIDEBAR_AVATAR_SIZE = 36;
const PROFILE_AVATAR_SIZE = 132;

function normalizeAvatarSettings(settings) {
  if (!settings) return DEFAULT_AVATAR_SETTINGS;

  if (typeof settings === "string") {
    try {
      return {
        ...DEFAULT_AVATAR_SETTINGS,
        ...JSON.parse(settings),
      };
    } catch {
      return DEFAULT_AVATAR_SETTINGS;
    }
  }

  if (typeof settings === "object") {
    return {
      ...DEFAULT_AVATAR_SETTINGS,
      ...settings,
    };
  }

  return DEFAULT_AVATAR_SETTINGS;
}

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

function getUserInitials(user) {
  const fullName = String(
    user?.full_name ||
      user?.fullName ||
      user?.name ||
      "П"
  ).trim();

  return fullName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function renderUserAvatar(user) {
  const avatarUrl =
    user?.avatar_url || user?.avatarUrl;

  const settings = normalizeAvatarSettings(
    user?.avatar_settings || user?.avatarSettings
  );

  const ratio =
    SIDEBAR_AVATAR_SIZE / PROFILE_AVATAR_SIZE;

  const avatarX = (settings.x || 0) * ratio;
  const avatarY = (settings.y || 0) * ratio;
  const avatarScale = settings.scale || 1;

  if (avatarUrl) {
    return (
      <div style={chatLayoutStyles.chatAvatarImageClip}>
        <img
          src={avatarUrl}
          alt=""
          draggable={false}
          style={{
            ...chatLayoutStyles.chatAvatarImage,
            transform: `translate(${avatarX}px, ${avatarY}px) scale(${avatarScale})`,
          }}
        />
      </div>
    );
  }

  return getUserInitials(user);
}

function renderChatAvatar(chat) {
  const avatarUrl =
    chat?.avatar_url || chat?.avatarUrl;

  const settings = normalizeAvatarSettings(
    chat?.avatar_settings || chat?.avatarSettings
  );

  const ratio =
    SIDEBAR_AVATAR_SIZE / PROFILE_AVATAR_SIZE;

  const avatarX = (settings.x || 0) * ratio;
  const avatarY = (settings.y || 0) * ratio;
  const avatarScale = settings.scale || 1;

  if (avatarUrl) {
    return (
      <div style={chatLayoutStyles.chatAvatarImageClip}>
        <img
          src={avatarUrl}
          alt=""
          draggable={false}
          style={{
            ...chatLayoutStyles.chatAvatarImage,
            transform: `translate(${avatarX}px, ${avatarY}px) scale(${avatarScale})`,
          }}
        />
      </div>
    );
  }

  return getChatInitials(chat);
}

function getLastMessageText(chat) {
  return (
    chat?.last_message?.content ||
    chat?.lastMessage?.content ||
    chat?.description ||
    "Нет сообщений"
  );
}

function getUnreadCount(chat) {
  return chat?.unread_count || chat?.unreadCount || 0;
}

function getLastMessageTime(chat) {
  const rawDate =
    chat?.last_message?.created_at ||
    chat?.lastMessage?.createdAt ||
    chat?.updated_at ||
    chat?.created_at;

  if (!rawDate) return "";

  const date = new Date(rawDate);

  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleTimeString("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function renderChatItem({
  chat,
  activeChatId,
  onSelectChat,
}) {
  const isActive = chat.id === activeChatId;

  const unreadCount = getUnreadCount(chat);
  const lastMessageTime = getLastMessageTime(chat);

  return (
    <button
      key={chat.id}
      type="button"
      style={{
        ...chatLayoutStyles.chatButton,
        ...(isActive
          ? chatLayoutStyles.activeChatButton
          : {}),
      }}
      onClick={() => onSelectChat?.(chat.id)}
    >
      <div style={chatLayoutStyles.chatAvatar}>
       {renderChatAvatar(chat)}
       </div>

      <div style={chatLayoutStyles.chatMain}>
        <div style={chatLayoutStyles.chatTitleRow}>
          <div style={chatLayoutStyles.chatTitle}>
            {chat.title}
          </div>
        </div>

        <div style={chatLayoutStyles.chatPreview}>
          {getLastMessageText(chat)}
        </div>
      </div>

      <div style={chatLayoutStyles.chatMeta}>
        <div style={chatLayoutStyles.chatTime}>
          {lastMessageTime}
        </div>

        {unreadCount > 0 && (
          <div style={chatLayoutStyles.unreadBadge}>
            {unreadCount > 99 ? "99+" : unreadCount}
          </div>
        )}
      </div>
    </button>
  );
}

function renderUserItem({
  user,
  onOpenDirectChat,
}) {
  const fullName =
    user?.full_name ||
    user?.fullName ||
    user?.name ||
    "Пользователь";

  return (
    <button
      key={`user-${user.id}`}
      type="button"
      style={chatLayoutStyles.chatButton}
      onClick={() => onOpenDirectChat?.(user)}
    >
      <div style={chatLayoutStyles.chatAvatar}>
        {renderUserAvatar(user)}
      </div>

      <div style={chatLayoutStyles.chatMain}>
        <div style={chatLayoutStyles.chatTitle}>
          {fullName}
        </div>

        <div style={chatLayoutStyles.chatPreview}>
          Начать личную переписку
        </div>
      </div>
    </button>
  );
}

export default function ChatSidebar({
  chats = [],
  activeChatId,
  isLoadingChats,
  onSelectChat,
  onCreateGroupChat,
}) {
  const [activeFilter, setActiveFilter] =
    useState("all");

  const [searchValue, setSearchValue] =
    useState("");

  const [foundUsers, setFoundUsers] = useState([]);
  const [isSearchingUsers, setIsSearchingUsers] =
    useState(false);

  useEffect(() => {
    const query = searchValue.trim();

    if (!query) {
      setFoundUsers([]);
      return;
    }

    const timeout = setTimeout(async () => {
      try {
        setIsSearchingUsers(true);

        const users = await searchUsers(query);

        setFoundUsers(Array.isArray(users) ? users : []);
      } catch (error) {
        console.error(
          "Ошибка поиска пользователей",
          error
        );

        setFoundUsers([]);
      } finally {
        setIsSearchingUsers(false);
      }
    }, 300);

    return () => clearTimeout(timeout);
  }, [searchValue]);

  const filteredChats = useMemo(() => {
    const query = searchValue.trim().toLowerCase();

    return chats.filter((chat) => {
      const title = String(
        chat?.title || ""
      ).toLowerCase();

      const description = String(
        chat?.description || ""
      ).toLowerCase();

      const lastMessage = String(
        getLastMessageText(chat)
      ).toLowerCase();

      const matchesSearch =
        !query ||
        title.includes(query) ||
        description.includes(query) ||
        lastMessage.includes(query);

      if (!matchesSearch) return false;

      if (activeFilter === "unread") {
        return getUnreadCount(chat) > 0;
      }

      if (activeFilter === "favorite") {
        return Boolean(
          chat?.is_favorite || chat?.isFavorite
        );
      }

      return true;
    });
  }, [activeFilter, chats, searchValue]);

  async function handleOpenDirectChat(user) {
    try {
      const chat = await getOrCreateDirectChat(
        user.id
      );

      if (chat?.id) {
        onSelectChat?.(chat.id);
      }
    } catch (error) {
      console.error(
        "Ошибка открытия личного чата",
        error
      );
    }
  }

  const pinnedChats = filteredChats.filter(
    (chat) => chat?.is_pinned || chat?.isPinned
  );

  const projectChats = filteredChats.filter(
    (chat) => chat?.type === "project"
  );

  const groupChats = filteredChats.filter(
    (chat) => chat?.type === "group"
  );

  const directChats = filteredChats.filter(
    (chat) => chat?.type === "direct"
  );

  const recentChats = filteredChats.filter(
    (chat) =>
      !chat?.is_pinned &&
      !["project", "group", "direct"].includes(
        chat?.type
      )
  );

  const sections = [
    {
      title: "Закреплённые",
      chats: pinnedChats,
    },
    {
      title: "Чаты проектов",
      chats: projectChats,
    },
    {
      title: "Группы",
      chats: groupChats,
    },
    {
      title: "Личные сообщения",
      chats: directChats,
    },
    {
      title: "Недавние",
      chats: recentChats,
    },
  ];

  const hasSearch =
    searchValue.trim().length > 0;

  return (
    <aside style={chatLayoutStyles.sidebar}>
      <div style={chatLayoutStyles.sidebarHeader}>
        <div style={chatLayoutStyles.sidebarTopRow}>
          <div>
            <div style={chatLayoutStyles.title}>
              Чаты
            </div>

            </div>

          <button
            type="button"
            style={chatLayoutStyles.sidebarAddButton}
            title="Создать групповой чат"
            onClick={() => onCreateGroupChat?.()}
          >
            +
          </button>
        </div>

        <div style={chatLayoutStyles.sidebarSearchBox}>
          <img
            src={searchIcon}
            alt=""
            style={chatLayoutStyles.sidebarSearchIconImage}
          />

          <input
            value={searchValue}
            onChange={(event) =>
              setSearchValue(event.target.value)
            }
            placeholder="Чаты и пользователи"
            style={chatLayoutStyles.sidebarSearchInput}
          />
        </div>

        <div style={chatLayoutStyles.sidebarTabs}>
          <button
            type="button"
            style={{
              ...chatLayoutStyles.sidebarTab,
              ...(activeFilter === "all"
                ? chatLayoutStyles.activeSidebarTab
                : {}),
            }}
            onClick={() => setActiveFilter("all")}
          >
            Все
          </button>

          <button
            type="button"
            style={{
              ...chatLayoutStyles.sidebarTab,
              ...(activeFilter === "unread"
                ? chatLayoutStyles.activeSidebarTab
                : {}),
            }}
            onClick={() => setActiveFilter("unread")}
          >
            Непрочитанные
          </button>

          <button
            type="button"
            style={{
              ...chatLayoutStyles.sidebarTab,
              ...(activeFilter === "favorite"
                ? chatLayoutStyles.activeSidebarTab
                : {}),
            }}
            onClick={() => setActiveFilter("favorite")}
          >
            Избранные
          </button>
        </div>
      </div>

      <div style={chatLayoutStyles.sidebarBody}>
        {isLoadingChats && (
          <div style={chatLayoutStyles.subtitle}>
            Загрузка чатов...
          </div>
        )}

        {!isLoadingChats && hasSearch && (
          <>
            {!!filteredChats.length && (
              <div style={{ marginBottom: 16 }}>
                <div
                  style={{
                    padding: "0 8px 6px",
                    fontSize: 11,
                    fontWeight: 700,
                    color: "#6B7280",
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                  }}
                >
                  Чаты
                </div>

                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 2,
                  }}
                >
                  {filteredChats.map((chat) =>
                    renderChatItem({
                      chat,
                      activeChatId,
                      onSelectChat,
                    })
                  )}
                </div>
              </div>
            )}

            {!!foundUsers.length && (
              <div>
                <div
                  style={{
                    padding: "0 8px 6px",
                    fontSize: 11,
                    fontWeight: 700,
                    color: "#6B7280",
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                  }}
                >
                  Пользователи
                </div>

                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 2,
                  }}
                >
                  {foundUsers.map((user) =>
                    renderUserItem({
                      user,
                      onOpenDirectChat:
                        handleOpenDirectChat,
                    })
                  )}
                </div>
              </div>
            )}

            {!filteredChats.length &&
              !foundUsers.length &&
              !isSearchingUsers && (
                <div style={chatLayoutStyles.empty}>
                  Ничего не найдено
                </div>
              )}
          </>
        )}

        {!isLoadingChats &&
          !hasSearch &&
          sections.map((section) => {
            if (!section.chats.length) {
              return null;
            }

            return (
              <div
                key={section.title}
                style={{ marginBottom: 16 }}
              >
                <div
                  style={{
                    padding: "0 8px 6px",
                    fontSize: 11,
                    fontWeight: 700,
                    color: "#6B7280",
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                  }}
                >
                  {section.title}
                </div>

                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 2,
                  }}
                >
                  {section.chats.map((chat) =>
                    renderChatItem({
                      chat,
                      activeChatId,
                      onSelectChat,
                    })
                  )}
                </div>
              </div>
            );
          })}
      </div>
    </aside>
  );
}