import { getCurrentUserId } from "../../../shared/communication/domain/messageItemUtils.js";

export const DIRECT_CHAT_FALLBACK_TITLE = "Личная переписка";
export const GROUP_CHAT_FALLBACK_TITLE = "Групповой чат";
export const DEFAULT_CHAT_FALLBACK_TITLE = "Чат";

export function resolveCurrentUserId(currentUser) {
  const directId =
    currentUser?.id ?? currentUser?.user_id ?? currentUser?.userId ?? null;

  if (directId != null && directId !== "") {
    return String(directId);
  }

  return getCurrentUserId() || "";
}

function getParticipantUserId(participant = {}) {
  return String(
    participant?.user_id ??
      participant?.userId ??
      participant?.user?.id ??
      participant?.user?.user_id ??
      participant?.user?.userId ??
      "",
  );
}

function normalizeCompanionUser(participant) {
  if (!participant) {
    return null;
  }

  if (participant.user && typeof participant.user === "object") {
    return participant.user;
  }

  if (
    participant.full_name ||
    participant.fullName ||
    participant.email ||
    participant.avatar_url ||
    participant.avatarUrl
  ) {
    return participant;
  }

  return null;
}

export function resolveDirectChatCompanion(chat, currentUser) {
  const currentUserId = resolveCurrentUserId(currentUser);
  const participants =
    chat?.participants || chat?.members || chat?.users || [];

  if (!Array.isArray(participants) || !participants.length) {
    return null;
  }

  const otherParticipant = participants.find((participant) => {
    const participantUserId = getParticipantUserId(participant);

    return participantUserId && participantUserId !== currentUserId;
  });

  return normalizeCompanionUser(otherParticipant);
}

export function resolveChatDisplayTitle(chat, currentUser) {
  if (!chat) {
    return DEFAULT_CHAT_FALLBACK_TITLE;
  }

  const chatType = chat.type || chat.chat_type || chat.chatType || "";

  if (chatType === "direct") {
    const companion = resolveDirectChatCompanion(chat, currentUser);

    if (companion) {
      return (
        companion.full_name ||
        companion.fullName ||
        companion.name ||
        companion.email ||
        DIRECT_CHAT_FALLBACK_TITLE
      );
    }

    const rawTitle = String(chat.title || "").trim();

    if (rawTitle && rawTitle !== DIRECT_CHAT_FALLBACK_TITLE) {
      return rawTitle;
    }

    return DIRECT_CHAT_FALLBACK_TITLE;
  }

  if (chatType === "group") {
    return chat.title || GROUP_CHAT_FALLBACK_TITLE;
  }

  return chat.title || DEFAULT_CHAT_FALLBACK_TITLE;
}

export function resolveChatDisplayAvatar(chat, currentUser) {
  const chatType = chat?.type || chat?.chat_type || chat?.chatType || "";

  if (chatType === "direct") {
    const companion = resolveDirectChatCompanion(chat, currentUser);

    if (companion) {
      return {
        avatar_url: companion.avatar_url || companion.avatarUrl || null,
        avatar_settings:
          companion.avatar_settings || companion.avatarSettings || null,
        initialsUser: companion,
      };
    }
  }

  return {
    avatar_url: chat?.avatar_url || chat?.avatarUrl || null,
    avatar_settings:
      chat?.avatar_settings || chat?.avatarSettings || null,
    initialsUser: null,
  };
}

export function resolveChatDisplayInitials(chat, currentUser) {
  const { initialsUser } = resolveChatDisplayAvatar(chat, currentUser);
  const titleSource = initialsUser || {
    full_name: resolveChatDisplayTitle(chat, currentUser),
  };

  const fullName = String(
    titleSource.full_name ||
      titleSource.fullName ||
      titleSource.name ||
      titleSource.email ||
      "Ч",
  ).trim();

  if (!fullName) {
    return "Ч";
  }

  return fullName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}
