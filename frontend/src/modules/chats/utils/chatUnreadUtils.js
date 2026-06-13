export const CHAT_UNREAD_POLL_INTERVAL_MS = 5000;

export function getChatUnreadCount(chat) {
  return Number(chat?.unread_count ?? chat?.unreadCount ?? 0) || 0;
}

export function sumChatUnreadCounts(chats = []) {
  if (!Array.isArray(chats)) {
    return 0;
  }

  return chats.reduce(
    (total, chat) => total + getChatUnreadCount(chat),
    0,
  );
}

export function buildUnreadByChatId(chats = []) {
  if (!Array.isArray(chats)) {
    return {};
  }

  return chats.reduce((acc, chat) => {
    if (chat?.id == null) {
      return acc;
    }

    acc[String(chat.id)] = getChatUnreadCount(chat);
    return acc;
  }, {});
}

export function applyChatReadLocally(chats = [], chatId) {
  if (!Array.isArray(chats) || chatId == null) {
    return Array.isArray(chats) ? chats : [];
  }

  return chats.map((chat) =>
    String(chat.id) === String(chatId)
      ? {
          ...chat,
          unread_count: 0,
          unreadCount: 0,
        }
      : chat,
  );
}

export function upsertChatInUnreadList(chats = [], chat) {
  if (!chat?.id) {
    return Array.isArray(chats) ? chats : [];
  }

  const normalizedChats = Array.isArray(chats) ? chats : [];
  const existingIndex = normalizedChats.findIndex(
    (item) => String(item.id) === String(chat.id),
  );

  if (existingIndex === -1) {
    return [chat, ...normalizedChats];
  }

  return normalizedChats.map((item, index) =>
    index === existingIndex
      ? {
          ...item,
          ...chat,
        }
      : item,
  );
}

export function getLatestMessageId(messages = []) {
  if (!Array.isArray(messages) || !messages.length) {
    return null;
  }

  return messages.reduce((maxId, message) => {
    const messageId = Number(message?.id);

    if (!Number.isFinite(messageId) || messageId <= 0) {
      return maxId;
    }

    return Math.max(maxId, messageId);
  }, 0) || null;
}

export function getChatActivityTimestamp(chat) {
  return (
    chat?.last_message?.created_at ||
    chat?.lastMessage?.createdAt ||
    chat?.updated_at ||
    chat?.updatedAt ||
    chat?.created_at ||
    chat?.createdAt ||
    ""
  );
}

export function getChatPollingSignature(chat) {
  const lastMessage = chat?.last_message || chat?.lastMessage || null;

  return [
    getChatUnreadCount(chat),
    getChatActivityTimestamp(chat),
    lastMessage?.id ?? "",
    lastMessage?.content ?? "",
    chat?.title ?? "",
  ].join("|");
}

export function mergeChatPollingFields(existingChat, incomingChat) {
  if (getChatPollingSignature(existingChat) === getChatPollingSignature(incomingChat)) {
    return existingChat;
  }

  const unreadCount = getChatUnreadCount(incomingChat);
  const lastMessage =
    incomingChat?.last_message ||
    incomingChat?.lastMessage ||
    existingChat?.last_message ||
    existingChat?.lastMessage ||
    null;

  return {
    ...existingChat,
    ...incomingChat,
    created_by_id:
      incomingChat?.created_by_id
      ?? incomingChat?.createdById
      ?? existingChat?.created_by_id
      ?? existingChat?.createdById,
    unread_count: unreadCount,
    unreadCount,
    last_message: lastMessage,
    lastMessage: lastMessage,
    updated_at:
      incomingChat?.updated_at ||
      incomingChat?.updatedAt ||
      existingChat?.updated_at ||
      existingChat?.updatedAt,
    updatedAt:
      incomingChat?.updated_at ||
      incomingChat?.updatedAt ||
      existingChat?.updatedAt ||
      existingChat?.updated_at,
  };
}

export function sortChatsByActivity(chats = []) {
  return [...chats].sort((leftChat, rightChat) => {
    const leftTime = Date.parse(getChatActivityTimestamp(leftChat)) || 0;
    const rightTime = Date.parse(getChatActivityTimestamp(rightChat)) || 0;

    if (rightTime !== leftTime) {
      return rightTime - leftTime;
    }

    return Number(leftChat?.id || 0) - Number(rightChat?.id || 0);
  });
}

export function mergeIncomingChatList(existingChats = [], incomingChats = []) {
  const normalizedExisting = Array.isArray(existingChats) ? existingChats : [];
  const normalizedIncoming = Array.isArray(incomingChats) ? incomingChats : [];

  if (!normalizedExisting.length) {
    return normalizedIncoming.slice();
  }

  if (!normalizedIncoming.length) {
    return normalizedExisting;
  }

  const incomingById = new Map(
    normalizedIncoming.map((chat) => [String(chat.id), chat]),
  );

  let activityChanged = false;
  const mergedInExistingOrder = [];

  for (const existingChat of normalizedExisting) {
    const incomingChat = incomingById.get(String(existingChat.id));

    if (!incomingChat) {
      continue;
    }

    incomingById.delete(String(existingChat.id));

    const mergedChat = mergeChatPollingFields(existingChat, incomingChat);

    if (
      getChatActivityTimestamp(mergedChat) !==
      getChatActivityTimestamp(existingChat)
    ) {
      activityChanged = true;
    }

    mergedInExistingOrder.push(mergedChat);
  }

  const newChats = normalizedIncoming.filter((chat) =>
    !normalizedExisting.some(
      (existingChat) => String(existingChat.id) === String(chat.id),
    ),
  );

  if (newChats.length > 0) {
    activityChanged = true;
  }

  const combined = [...newChats, ...mergedInExistingOrder];

  if (!activityChanged) {
    return combined;
  }

  return sortChatsByActivity(combined);
}

export function areUnreadMapsEqual(leftMap = {}, rightMap = {}) {
  const leftKeys = Object.keys(leftMap);
  const rightKeys = Object.keys(rightMap);

  if (leftKeys.length !== rightKeys.length) {
    return false;
  }

  return leftKeys.every(
    (key) => Number(leftMap[key] || 0) === Number(rightMap[key] || 0),
  );
}
