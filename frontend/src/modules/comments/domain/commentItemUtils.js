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

export function getCommentAuthorId(comment) {
  return String(
    comment?.author?.id ??
      comment?.author?.userId ??
      comment?.author?.user_id ??
      comment?.authorUserId ??
      comment?.author_user_id ??
      comment?.createdById ??
      comment?.created_by_id ??
      ""
  );
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

export function groupReactions(reactions = []) {
  return reactions.reduce((acc, reaction) => {
    if (!reaction?.emojiKey) return acc;

    if (!acc[reaction.emojiKey]) acc[reaction.emojiKey] = [];

    acc[reaction.emojiKey].push(reaction);

    return acc;
  }, {});
}

export function getRepliesLabel(count) {
  if (count === 1) return "1 ответ";
  if (count > 1 && count < 5) return `${count} ответа`;
  return `${count} ответов`;
}

export function getSystemText(comment) {
  const payload = comment.systemPayload || {};

  switch (comment.systemEventKey) {
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
      return comment.body || "Системное изменение";
  }
}

export function isSameCommentId(first, second) {
  if (!first || !second) return false;
  return String(first) === String(second);
}

export function hasHighlightedReply(replies = [], highlightedCommentId) {
  if (!highlightedCommentId) return false;

  return replies.some((reply) =>
    isSameCommentId(reply?.id, highlightedCommentId)
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