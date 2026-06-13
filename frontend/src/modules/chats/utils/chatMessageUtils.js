import { getChatActivityTimestamp } from "./chatUnreadUtils.js";

export function getChatLastMessage(chat) {
  return chat?.last_message || chat?.lastMessage || null;
}

export function getChatLastMessageId(chat) {
  const lastMessage = getChatLastMessage(chat);
  const messageId = Number(lastMessage?.id);

  if (!Number.isFinite(messageId) || messageId <= 0) {
    return null;
  }

  return messageId;
}

export function getActiveChatMessageSignature(chat) {
  const lastMessage = getChatLastMessage(chat);

  return [
    lastMessage?.id ?? "",
    lastMessage?.created_at ?? lastMessage?.createdAt ?? "",
    getChatActivityTimestamp(chat),
  ].join("|");
}

export function hasActiveChatMessageActivityChanged(previousChat, nextChat) {
  if (!previousChat || !nextChat) {
    return false;
  }

  if (String(previousChat.id) !== String(nextChat.id)) {
    return false;
  }

  return (
    getActiveChatMessageSignature(previousChat)
    !== getActiveChatMessageSignature(nextChat)
  );
}

export function mergeChatMessages(existingMessages = [], incomingMessages = []) {
  const normalizedExisting = Array.isArray(existingMessages) ? existingMessages : [];
  const normalizedIncoming = Array.isArray(incomingMessages) ? incomingMessages : [];
  const byId = new Map();

  for (const message of normalizedExisting) {
    if (message?.id == null) {
      continue;
    }

    byId.set(String(message.id), message);
  }

  for (const message of normalizedIncoming) {
    if (message?.id == null) {
      continue;
    }

    byId.set(String(message.id), message);
  }

  return Array.from(byId.values()).sort((leftMessage, rightMessage) => {
    const leftTime =
      Date.parse(leftMessage?.created_at || leftMessage?.createdAt || "")
      || Number(leftMessage?.id)
      || 0;
    const rightTime =
      Date.parse(rightMessage?.created_at || rightMessage?.createdAt || "")
      || Number(rightMessage?.id)
      || 0;

    if (leftTime !== rightTime) {
      return leftTime - rightTime;
    }

    return Number(leftMessage?.id || 0) - Number(rightMessage?.id || 0);
  });
}

export function shouldRefreshActiveChatMessages({
  activeChat,
  localMessages = [],
} = {}) {
  const remoteLatestMessageId = getChatLastMessageId(activeChat);
  const localLatestMessageId = localMessages.reduce((maxId, message) => {
    const messageId = Number(message?.id);

    if (!Number.isFinite(messageId) || messageId <= 0) {
      return maxId;
    }

    return Math.max(maxId, messageId);
  }, 0) || null;

  if (!remoteLatestMessageId) {
    return false;
  }

  if (!localLatestMessageId) {
    return true;
  }

  return remoteLatestMessageId > localLatestMessageId;
}

export function isMessagesContainerNearBottom(container, threshold = 80) {
  if (!container) {
    return true;
  }

  const distanceFromBottom =
    container.scrollHeight - container.scrollTop - container.clientHeight;

  return distanceFromBottom <= threshold;
}
