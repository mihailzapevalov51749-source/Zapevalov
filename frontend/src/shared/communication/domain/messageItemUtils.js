const API_BASE_URL = "http://127.0.0.1:8010";

export const COLLAPSE_TEXT_LENGTH = 260;
export const COLLAPSE_LINE_COUNT = 4;

export const MENTION_POPOVER_WIDTH = 320;
export const MENTION_POPOVER_HEIGHT = 190;

export const EMOJI_POPOVER_WIDTH = 292;
export const EMOJI_POPOVER_HEIGHT = 260;

export function getToken() {
  return (
    localStorage.getItem("token") ||
    localStorage.getItem("access_token") ||
    localStorage.getItem("authToken") ||
    ""
  );
}

export async function loadSystemUsers() {
  const token = getToken();

  const response = await fetch(`${API_BASE_URL}/users/`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  if (!response.ok) {
    throw new Error("Не удалось загрузить пользователей");
  }

  const data = await response.json();

  if (Array.isArray(data)) return data;
  if (Array.isArray(data.items)) return data.items;
  if (Array.isArray(data.users)) return data.users;
  if (Array.isArray(data.results)) return data.results;

  return [];
}

export function getCurrentUserId() {
  const possibleKeys = ["user", "currentUser", "authUser", "profile", "me"];

  for (const key of possibleKeys) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;

      const parsed = JSON.parse(raw);
      const id = parsed?.id ?? parsed?.user_id ?? parsed?.userId;

      if (id) return String(id);
    } catch {
      // ignore
    }
  }

  return "";
}

export function getMessageAuthorId(message) {
  return String(
    message?.author?.id ??
      message?.author?.userId ??
      message?.author?.user_id ??
      message?.created_by?.id ??
      message?.created_by?.userId ??
      message?.created_by?.user_id ??
      message?.authorUserId ??
      message?.author_user_id ??
      message?.createdById ??
      message?.created_by_id ??
      ""
  );
}

export function getMessageAuthorName(message) {
  return (
    message?.author?.fullName ||
    message?.author?.full_name ||
    message?.author?.name ||
    message?.author?.email ||
    message?.created_by?.fullName ||
    message?.created_by?.full_name ||
    message?.created_by?.name ||
    message?.created_by?.email ||
    "Пользователь"
  );
}

export function getMessageAvatarUrl(message) {
  return (
    message?.author?.avatarUrl ||
    message?.author?.avatar_url ||
    message?.created_by?.avatarUrl ||
    message?.created_by?.avatar_url ||
    ""
  );
}

export function getMessageAvatarSettings(message) {
  return (
    message?.author?.avatarSettings ||
    message?.author?.avatar_settings ||
    message?.created_by?.avatarSettings ||
    message?.created_by?.avatar_settings ||
    null
  );
}

export function getMessageBody(message) {
  return message?.body || message?.content || "";
}

export function normalizeUser(user) {
  const id = user?.id ?? user?.user_id ?? user?.key ?? user?.value ?? "";

  const label =
    user?.full_name ||
    user?.fullName ||
    user?.name ||
    user?.label ||
    user?.email ||
    "Без имени";

  return {
    id,
    label,
    full_name: label,
    email: user?.email || "",
    avatar_url: user?.avatar_url || user?.avatarUrl || "",
    avatar_settings:
      user?.avatar_settings ||
      user?.avatarSettings ||
      {
        x: 0,
        y: 0,
        scale: 1,
      },
  };
}

export function formatDate(value) {
  if (!value) return "";

  try {
    return new Date(value).toLocaleString("ru-RU", {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

export function normalizeReactionEmojiKey(reaction) {
  return (
    reaction?.emojiKey ||
    reaction?.emoji_key ||
    reaction?.emoji ||
    reaction?.code ||
    ""
  );
}

export function groupReactions(reactions = []) {
  if (!Array.isArray(reactions)) return {};

  return reactions.reduce((acc, reaction) => {
    const emojiKey = normalizeReactionEmojiKey(reaction);

    if (!emojiKey) return acc;

    if (!acc[emojiKey]) acc[emojiKey] = [];

    acc[emojiKey].push(reaction);

    return acc;
  }, {});
}

export function getRepliesLabel(count) {
  if (count === 1) return "1 ответ";
  if (count > 1 && count < 5) return `${count} ответа`;
  return `${count} ответов`;
}

export function getSystemText(message) {
  const payload = message.systemPayload || message.system_payload || {};

  switch (message.systemEventKey || message.system_event_key) {
    case "status_changed":
      return `Статус изменён: ${payload.from || "—"} → ${payload.to || "—"}`;

    case "due_date_changed":
      return `Срок изменён: ${payload.from || "—"} → ${payload.to || "—"}`;

    case "assignee_changed":
      return `Исполнитель изменён: ${payload.from || "—"} → ${
        payload.to || "—"
      }`;

    case "priority_changed":
      return `Приоритет изменён: ${payload.from || "—"} → ${payload.to || "—"}`;

    case "file_added":
      return `Добавлен файл: ${
        payload.fileName || payload.file_name || "Файл"
      }`;

    default:
      return getMessageBody(message) || "Системное изменение";
  }
}

export function isSameMessageId(first, second) {
  if (!first || !second) return false;
  return String(first) === String(second);
}

export function hasHighlightedReply(replies = [], highlightedMessageId) {
  if (!highlightedMessageId) return false;

  return replies.some((reply) =>
    isSameMessageId(reply?.id, highlightedMessageId)
  );
}

export function isLongText(text) {
  const value = String(text || "");

  if (value.length > COLLAPSE_TEXT_LENGTH) return true;

  return value.split(/\r\n|\r|\n/).length > COLLAPSE_LINE_COUNT;
}

export function getAttachmentName(file) {
  return (
    file?.fileName ||
    file?.file_name ||
    file?.name ||
    file?.originalName ||
    file?.original_name ||
    "Файл"
  );
}

export function getAttachmentKey(file, index) {
  return String(
    file?.id ||
      file?.fileId ||
      file?.file_id ||
      file?.url ||
      file?.fileUrl ||
      file?.file_url ||
      `${getAttachmentName(file)}_${index}`
  );
}

export function emojiCodeToChar(code) {
  if (!code) return "";

  try {
    return String.fromCodePoint(
      ...String(code)
        .split("-")
        .map((part) => parseInt(part, 16))
    );
  } catch {
    return "";
  }
}

export function getPopoverPosition(rect, width, height) {
  if (!rect) {
    return {
      top: 8,
      left: 8,
    };
  }

  const viewportWidth =
    window.innerWidth || document.documentElement.clientWidth;

  const viewportHeight =
    window.innerHeight || document.documentElement.clientHeight;

  let left = rect.left;
  let top = rect.top - height - 10;

  if (left + width > viewportWidth - 12) {
    left = viewportWidth - width - 12;
  }

  if (left < 12) {
    left = 12;
  }

  if (top < 12) {
    top = 12;
  }

  if (top + height > viewportHeight - 12) {
    top = viewportHeight - height - 12;
  }

  return {
    top,
    left,
  };
}