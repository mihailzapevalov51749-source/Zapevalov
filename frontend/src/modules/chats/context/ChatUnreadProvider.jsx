import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { getChats, updateChatReadState } from "../api/chatsApi";
import { getToken } from "../../../api/authApi";
import { getBridgeToken } from "../../../api/sessionBridgeApi";
import {
  applyChatReadLocally,
  areUnreadMapsEqual,
  buildUnreadByChatId,
  CHAT_UNREAD_POLL_INTERVAL_MS,
  getChatUnreadCount,
  mergeIncomingChatList,
  sumChatUnreadCounts,
  upsertChatInUnreadList,
} from "../utils/chatUnreadUtils";

const defaultChatUnreadState = {
  chats: [],
  totalUnreadCount: 0,
  unreadByChatId: {},
  isLoadingChats: false,
  refreshChats: async () => {},
  upsertChat: () => {},
  markChatAsRead: async () => {},
  getUnreadCountForChat: () => 0,
};

const ChatUnreadContext = createContext(defaultChatUnreadState);

function syncUnreadRollups(setters, nextChats) {
  const nextTotalUnreadCount = sumChatUnreadCounts(nextChats);
  const nextUnreadByChatId = buildUnreadByChatId(nextChats);

  setters.setTotalUnreadCount((previousTotal) =>
    previousTotal === nextTotalUnreadCount ? previousTotal : nextTotalUnreadCount,
  );

  setters.setUnreadByChatId((previousMap) =>
    areUnreadMapsEqual(previousMap, nextUnreadByChatId)
      ? previousMap
      : nextUnreadByChatId,
  );
}

export function ChatUnreadProvider({ children, pollIntervalMs = CHAT_UNREAD_POLL_INTERVAL_MS }) {
  const [chats, setChats] = useState([]);
  const [totalUnreadCount, setTotalUnreadCount] = useState(0);
  const [unreadByChatId, setUnreadByChatId] = useState({});
  const [isLoadingChats, setIsLoadingChats] = useState(false);

  const isRefreshingRef = useRef(false);

  const applyIncomingChats = useCallback((incomingChats, { background = false } = {}) => {
    const normalizedIncoming = Array.isArray(incomingChats) ? incomingChats : [];

    setChats((previousChats) => {
      const nextChats =
        background && previousChats.length
          ? mergeIncomingChatList(previousChats, normalizedIncoming)
          : normalizedIncoming;

      syncUnreadRollups(
        {
          setTotalUnreadCount,
          setUnreadByChatId,
        },
        nextChats,
      );

      return nextChats;
    });
  }, []);

  const refreshChats = useCallback(
    async ({ background = false } = {}) => {
      if (!getToken() && getBridgeToken()) {
        return;
      }

      if (isRefreshingRef.current) {
        return;
      }

      isRefreshingRef.current = true;

      try {
        if (!background) {
          setIsLoadingChats(true);
        }

        const data = await getChats();
        applyIncomingChats(data, { background });
      } catch (error) {
        console.error("Ошибка загрузки непрочитанных чатов", error);
      } finally {
        if (!background) {
          setIsLoadingChats(false);
        }

        isRefreshingRef.current = false;
      }
    },
    [applyIncomingChats],
  );

  const upsertChat = useCallback((chat) => {
    setChats((previousChats) => {
      const nextChats = upsertChatInUnreadList(previousChats, chat);

      syncUnreadRollups(
        {
          setTotalUnreadCount,
          setUnreadByChatId,
        },
        nextChats,
      );

      return nextChats;
    });
  }, []);

  const markChatAsRead = useCallback(
    async (chatId, lastReadMessageId) => {
      if (!chatId || !lastReadMessageId) {
        return;
      }

      setChats((previousChats) => {
        const nextChats = applyChatReadLocally(previousChats, chatId);

        syncUnreadRollups(
          {
            setTotalUnreadCount,
            setUnreadByChatId,
          },
          nextChats,
        );

        return nextChats;
      });

      try {
        await updateChatReadState(chatId, lastReadMessageId);
      } catch (error) {
        console.error("Ошибка обновления read-state чата", error);
        await refreshChats({ background: true });
      }
    },
    [refreshChats],
  );

  const getUnreadCountForChat = useCallback(
    (chatId) => {
      if (chatId == null) {
        return 0;
      }

      return Number(unreadByChatId[String(chatId)] || 0);
    },
    [unreadByChatId],
  );

  useEffect(() => {
    refreshChats({ background: false });

    const intervalId = window.setInterval(() => {
      refreshChats({ background: true });
    }, pollIntervalMs);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [pollIntervalMs, refreshChats]);

  const value = useMemo(
    () => ({
      chats,
      totalUnreadCount,
      unreadByChatId,
      isLoadingChats,
      refreshChats,
      upsertChat,
      markChatAsRead,
      getUnreadCountForChat,
    }),
    [
      chats,
      totalUnreadCount,
      unreadByChatId,
      isLoadingChats,
      refreshChats,
      upsertChat,
      markChatAsRead,
      getUnreadCountForChat,
    ],
  );

  return (
    <ChatUnreadContext.Provider value={value}>
      {children}
    </ChatUnreadContext.Provider>
  );
}

export function useChatUnread() {
  return useContext(ChatUnreadContext);
}

export function useChatUnreadCountForChat(chatId, chat) {
  const { unreadByChatId } = useChatUnread();

  if (chatId != null && Object.prototype.hasOwnProperty.call(unreadByChatId, String(chatId))) {
    return Number(unreadByChatId[String(chatId)] || 0);
  }

  return getChatUnreadCount(chat);
}
