import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import ChatCreateModal from "../components/ChatCreateModal";
import ChatParticipantsModal from "../components/ChatParticipantsModal";
import ChatSettingsModal from "../components/ChatSettingsModal";
import ChatSidebar from "../components/ChatSidebar";
import ChatWindow from "../components/ChatWindow";

import FileViewerModal from "../../../shared/files/components/FileViewerModal";

import {
  addChatReaction,
  createChat,
  createChatMessage,
  deleteChatMessage,
  getChatMessages,
  getOrCreateDirectChat,
  updateChat,
  updateChatMessage,
} from "../api/chatsApi";
import { useChatUnread } from "../context/ChatUnreadProvider";
import { getLatestMessageId } from "../utils/chatUnreadUtils";
import { isChatCreator } from "../utils/chatAccessUtils";
import {
  hasActiveChatMessageActivityChanged,
  isMessagesContainerNearBottom,
  mergeChatMessages,
  shouldRefreshActiveChatMessages,
} from "../utils/chatMessageUtils";

import { buildFileUrl } from "../../../shared/files/api/filesApi";
import { buildFileDiscussionContext } from "../../../shared/files/services/fileDiscussionContext";
import { getMe } from "../../../api/authApi";

import {
  PAGE_LAYOUT_PAGE_TYPE,
  PAGE_LAYOUT_TOOLBAR_ZONE,
  useResolvedPageLayoutContract,
} from "../../../shared/appShell/pageLayoutContract";
import { chatLayoutStyles } from "../styles/corporateChatStyles";

function getParentMessageId(message) {
  return message?.parent_message_id || message?.parentMessageId || null;
}

function getMentionedUserIds(payload = {}) {
  return payload.mentioned_user_ids || payload.mentionedUserIds || [];
}

function getPayloadAttachments(payload = {}) {
  if (Array.isArray(payload.attachments)) return payload.attachments;
  if (Array.isArray(payload.files)) return payload.files;

  return [];
}

function getFileId(file = {}) {
  return file.file_id || file.fileId || file.id || null;
}

function getFileName(file = {}) {
  return file.file_name || file.fileName || file.name || "Файл";
}

function getFileUrl(file = {}) {
  return file.file_url || file.fileUrl || file.url || file.downloadUrl || "";
}

function getFileType(file = {}) {
  return (
    file.file_type ||
    file.fileType ||
    file.mime_type ||
    file.mimeType ||
    file.type ||
    ""
  );
}

function getFileSize(file = {}) {
  return file.file_size || file.fileSize || file.size || null;
}

export default function CorporateChatPage({ tenantId }) {
  useResolvedPageLayoutContract({
    pageType: PAGE_LAYOUT_PAGE_TYPE.CHAT_ROOM,
    toolbarZoneId: PAGE_LAYOUT_TOOLBAR_ZONE.APP_HEADER,
    canMinimize: true,
  });

  const messagesRef = useRef(null);
  const lastMarkedReadRef = useRef({ key: "" });
  const previousActiveChatRef = useRef(null);
  const shouldStickToBottomRef = useRef(true);
  const isRefreshingActiveMessagesRef = useRef(false);

  const {
    chats,
    isLoadingChats,
    refreshChats,
    upsertChat,
    markChatAsRead,
  } = useChatUnread();

  const [activeChatId, setActiveChatId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [highlightedMessageId, setHighlightedMessageId] = useState(null);
  const [openedFile, setOpenedFile] = useState(null);

  const [isCreateChatOpen, setIsCreateChatOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isParticipantsOpen, setIsParticipantsOpen] = useState(false);

  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [error, setError] = useState("");

  const activeChat = useMemo(() => {
    return (
      chats.find((chat) => String(chat.id) === String(activeChatId)) || null
    );
  }, [chats, activeChatId]);

  const canManageActiveChat = isChatCreator(activeChat, currentUser);

  const upsertChatInList = (chat) => {
    upsertChat(chat);
  };

  const rootMessages = useMemo(() => {
    return messages.filter((message) => !getParentMessageId(message));
  }, [messages]);

  const repliesByParentId = useMemo(() => {
    return messages.reduce((acc, message) => {
      const parentId = getParentMessageId(message);

      if (!parentId) return acc;

      const key = String(parentId);

      if (!acc[key]) acc[key] = [];

      acc[key].push(message);

      return acc;
    }, {});
  }, [messages]);

  useEffect(() => {
    if (activeChatId || !chats.length) {
      return;
    }

    setActiveChatId(chats[0]?.id || null);
  }, [activeChatId, chats]);

  const loadMessages = useCallback(async (chatId, { background = false } = {}) => {
    if (!chatId) return;

    if (background && isRefreshingActiveMessagesRef.current) {
      return;
    }

    try {
      if (!background) {
        setError("");
        setIsLoadingMessages(true);
      } else {
        isRefreshingActiveMessagesRef.current = true;
      }

      const data = await getChatMessages(chatId, {
        limit: 100,
        offset: 0,
      });

      const incomingMessages = Array.isArray(data?.items) ? data.items : [];

      setMessages((previousMessages) =>
        background
          ? mergeChatMessages(previousMessages, incomingMessages)
          : incomingMessages,
      );
    } catch (requestError) {
      console.error("Ошибка загрузки сообщений", requestError);

      if (!background) {
        setError("Не удалось загрузить сообщения");
      }
    } finally {
      if (!background) {
        setIsLoadingMessages(false);
      } else {
        isRefreshingActiveMessagesRef.current = false;
      }
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    getMe()
      .then((user) => {
        if (!cancelled) {
          setCurrentUser(user);
        }
      })
      .catch((requestError) => {
        console.error("Ошибка загрузки текущего пользователя", requestError);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    previousActiveChatRef.current = null;
    shouldStickToBottomRef.current = true;
    loadMessages(activeChatId);
    lastMarkedReadRef.current.key = "";
  }, [activeChatId, loadMessages]);

  useEffect(() => {
    if (!activeChatId || !activeChat) {
      previousActiveChatRef.current = null;
      return;
    }

    const previousChat = previousActiveChatRef.current;
    previousActiveChatRef.current = activeChat;

    if (
      !previousChat
      || String(previousChat.id) !== String(activeChat.id)
      || !hasActiveChatMessageActivityChanged(previousChat, activeChat)
    ) {
      return;
    }

    if (
      !shouldRefreshActiveChatMessages({
        activeChat,
        localMessages: messages,
      })
    ) {
      return;
    }

    loadMessages(activeChatId, { background: true });
  }, [activeChat, activeChatId, loadMessages, messages]);

  useEffect(() => {
    if (!activeChatId || isLoadingMessages) {
      return;
    }

    const latestMessageId = getLatestMessageId(messages);

    if (!latestMessageId) {
      return;
    }

    const markKey = `${activeChatId}:${latestMessageId}`;

    if (lastMarkedReadRef.current.key === markKey) {
      return;
    }

    lastMarkedReadRef.current.key = markKey;
    markChatAsRead(activeChatId, latestMessageId);
  }, [activeChatId, isLoadingMessages, markChatAsRead, messages]);

  useEffect(() => {
    const container = messagesRef.current;

    if (!container) {
      return undefined;
    }

    function handleScroll() {
      shouldStickToBottomRef.current = isMessagesContainerNearBottom(container);
    }

    container.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      container.removeEventListener("scroll", handleScroll);
    };
  }, [activeChatId]);

  useEffect(() => {
    if (!shouldStickToBottomRef.current) {
      return;
    }

    requestAnimationFrame(() => {
      const container = messagesRef.current;

      if (!container) return;

      container.scrollTop = container.scrollHeight;
    });
  }, [messages]);

  useEffect(() => {
    function handleChatNavigate(event) {
      const detail = event.detail || {};

      const targetChatId = detail.chatId || detail.chat_id || detail.entityId;
      const messageId = detail.messageId || detail.message_id || null;

      if (targetChatId) {
        const normalizedChatId = String(targetChatId);

        const existingChat = chats.find(
          (chat) => String(chat.id) === normalizedChatId
        );

        if (existingChat) {
          setActiveChatId(existingChat.id);
        }
      }

      if (messageId) {
        setHighlightedMessageId(String(messageId));

        window.setTimeout(() => {
          const element = document.getElementById(`message-${messageId}`);

          if (!element) return;

          element.scrollIntoView({
            behavior: "smooth",
            block: "center",
          });

          element.style.transition = "all 180ms ease";
          element.style.background = "#DBEAFE";

          window.setTimeout(() => {
            element.style.background = "";
          }, 2600);
        }, 900);
      }
    }

    window.addEventListener("chat:navigate", handleChatNavigate);

    return () => {
      window.removeEventListener("chat:navigate", handleChatNavigate);
    };
  }, [chats]);

  const handleCreateGroupChat = async (payload = {}) => {
    const createdChat = await createChat({
      title: payload.title,
      description: null,
      type: "group",
      avatar_url: null,
      avatar_settings: null,
      workspace_id: null,
      tenant_id: tenantId,
      participant_ids: payload.participant_ids || [],
    });

    if (createdChat?.id) {
      upsertChatInList(createdChat);
      setActiveChatId(createdChat.id);
      return;
    }

    await refreshChats({ background: true });
  };

  const handleOpenDirectChat = async (user) => {
    const targetUserId = user?.id ?? user?.user_id ?? user?.userId;

    if (!targetUserId) {
      setError("Не удалось определить пользователя для личного чата");
      throw new Error("Не удалось определить пользователя для личного чата");
    }

    try {
      setError("");

      const chat = await getOrCreateDirectChat(targetUserId, tenantId);

      if (!chat?.id) {
        throw new Error("Сервер не вернул личный чат");
      }

      upsertChatInList(chat);
      setActiveChatId(chat.id);
    } catch (requestError) {
      console.error("Ошибка открытия личного чата", requestError);
      setError("Не удалось открыть личный чат");
      throw requestError;
    }
  };

  const handleUpdateChatSettings = async (payload = {}) => {
    if (!activeChatId) return;

    try {
      setError("");

      const updatedChat = await updateChat(activeChatId, {
        title: payload.title,
        avatar_url: payload.avatar_url || null,
        avatar_settings:
          payload.avatar_settings || payload.avatarSettings || null,
      });

      if (updatedChat) {
        upsertChatInList(updatedChat);
      }

      await refreshChats({ background: true });
    } catch (requestError) {
      console.error("Ошибка сохранения настроек чата", requestError);
      setError("Не удалось сохранить настройки чата");
    }
  };

  const handleSubmit = async (payload = {}) => {
    if (!activeChatId) return;

    const message = await createChatMessage(activeChatId, {
      content: payload.content || payload.body || " ",
      parent_message_id: null,
      attachments: getPayloadAttachments(payload),
      mentions: payload.mentions || [],
      mentioned_user_ids: getMentionedUserIds(payload),
    });

    setMessages((prev) => [...prev, message]);
    shouldStickToBottomRef.current = true;

    await refreshChats({ background: true });
  };

  const handleReply = async (payload = {}) => {
    if (!activeChatId) return;

    const parentMessageId =
      payload?.parentMessage?.id || payload?.messageId || null;

    if (!parentMessageId) return;

    const message = await createChatMessage(activeChatId, {
      content: payload.content || payload.body || " ",
      parent_message_id: parentMessageId,
      attachments: getPayloadAttachments(payload),
      mentions: payload.mentions || [],
      mentioned_user_ids: getMentionedUserIds(payload),
    });

    setMessages((prev) => [...prev, message]);
    shouldStickToBottomRef.current = true;

    await refreshChats({ background: true });
  };

  const handleReaction = async (payload = {}) => {
    const messageId = payload?.messageId;
    const emojiKey = payload?.emojiKey;

    if (!messageId || !emojiKey) return;

    await addChatReaction(messageId, emojiKey);
    await loadMessages(activeChatId);
  };

  const handleEditMessage = async (payload = {}) => {
    const messageId = payload?.messageId;
    const content = payload?.content || payload?.body || "";

    if (!messageId || !content.trim()) return;

    const updatedMessage = await updateChatMessage(messageId, {
      content,
      attachments: payload.attachments || [],
      mentions: payload.mentions || [],
      mentioned_user_ids: getMentionedUserIds(payload),
    });

    setMessages((prev) =>
      prev.map((message) =>
        String(message.id) === String(messageId) ? updatedMessage : message
      )
    );
  };

  const handleDeleteMessage = async (messageId) => {
    if (!messageId) return;

    await deleteChatMessage(messageId);

    setMessages((prev) =>
      prev.filter((message) => String(message.id) !== String(messageId))
    );

    await refreshChats({ background: true });
  };

  const handleOpenFile = (file) => {
    if (!file) return;

    const fileId = getFileId(file);
    const fileName = getFileName(file);
    const fileUrl = getFileUrl(file);
    const fileType = getFileType(file);
    const fileSize = getFileSize(file);

    setOpenedFile({
      id: fileId,
      file_id: fileId,
      fileId,

      file_name: fileName,
      fileName,
      name: fileName,

      file_url: fileUrl,
      fileUrl,
      url: fileUrl,

      file_type: fileType,
      fileType,

      file_size: fileSize,
      fileSize,

      raw: file,
    });
  };

  const handleCloseFileViewer = () => {
    setOpenedFile(null);
  };

  return (
    <div style={chatLayoutStyles.page}>
      <ChatSidebar
        chats={chats}
        activeChatId={activeChatId}
        currentUser={currentUser}
        isLoadingChats={isLoadingChats}
        onSelectChat={setActiveChatId}
        onOpenDirectChat={handleOpenDirectChat}
        onCreateGroupChat={() => setIsCreateChatOpen(true)}
        tenantId={tenantId}
      />

      <ChatWindow
        messagesRef={messagesRef}
        activeChat={activeChat}
        currentUser={currentUser}
        rootMessages={rootMessages}
        repliesByParentId={repliesByParentId}
        highlightedMessageId={highlightedMessageId}
        error={error}
        isLoadingMessages={isLoadingMessages}
        onSubmit={handleSubmit}
        onReply={handleReply}
        onReaction={handleReaction}
        onEditMessage={handleEditMessage}
        onDeleteMessage={handleDeleteMessage}
        onOpenSettings={() => {
          if (isChatCreator(activeChat, currentUser)) {
            setIsSettingsOpen(true);
          }
        }}
        onOpenParticipants={() => setIsParticipantsOpen((prev) => !prev)}
        onOpenFile={handleOpenFile}
      />

      <ChatCreateModal
        isOpen={isCreateChatOpen}
        onClose={() => setIsCreateChatOpen(false)}
        onCreate={handleCreateGroupChat}
        tenantId={tenantId}
      />

      <ChatSettingsModal
        chat={activeChat}
        isOpen={isSettingsOpen && canManageActiveChat}
        onClose={() => setIsSettingsOpen(false)}
        onSave={handleUpdateChatSettings}
      />

      <ChatParticipantsModal
        chat={activeChat}
        isOpen={isParticipantsOpen}
        onClose={() => setIsParticipantsOpen(false)}
        currentUser={currentUser}
        tenantId={tenantId}
      />

      <FileViewerModal
        isOpen={Boolean(openedFile)}
        fileUrl={buildFileUrl(openedFile?.file_url || openedFile?.fileUrl || "")}
        fileName={openedFile?.file_name || openedFile?.fileName}
        fileType={openedFile?.file_type || openedFile?.fileType}
        fileId={openedFile?.file_id || openedFile?.fileId || openedFile?.id}
        initialContext={
          openedFile ? buildFileDiscussionContext(openedFile) : null
        }
        userId="1"
        userName="Михаил"
        mode="view"
        onClose={handleCloseFileViewer}
      />
    </div>
  );
}