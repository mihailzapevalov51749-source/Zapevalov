const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8010";

export const MENTION_POPOVER_WIDTH = 320;
export const MENTION_POPOVER_HEIGHT = 190;

export function getAuthToken() {
  return (
    localStorage.getItem("token") ||
    localStorage.getItem("access_token") ||
    localStorage.getItem("authToken") ||
    ""
  );
}

export async function loadSystemUsers() {
  const token = getAuthToken();

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

export function normalizeUser(user) {
  const id =
    user?.id ??
    user?.user_id ??
    user?.key ??
    user?.value ??
    "";

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
    email: user?.email || "",
    avatar_url: user?.avatar_url || user?.avatarUrl || "",
  };
}

export function getInitials(fullName) {
  if (!fullName) return "?";

  return String(fullName)
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export function getPopoverPosition(rect) {
  if (!rect) return { top: 8, left: 8 };

  const viewportWidth =
    window.innerWidth || document.documentElement.clientWidth;

  const viewportHeight =
    window.innerHeight || document.documentElement.clientHeight;

  let left = rect.left;
  let top = rect.top - MENTION_POPOVER_HEIGHT - 10;

  if (left + MENTION_POPOVER_WIDTH > viewportWidth - 12) {
    left = viewportWidth - MENTION_POPOVER_WIDTH - 12;
  }

  if (left < 12) left = 12;

  if (top < 12) top = 12;

  if (top + MENTION_POPOVER_HEIGHT > viewportHeight - 12) {
    top = viewportHeight - MENTION_POPOVER_HEIGHT - 12;
  }

  return { top, left };
}

export function getEntityId(row) {
  return row?.id || row?.row_id || row?.rowId || "";
}

export function getTableId(row) {
  return (
    row?.table_id ||
    row?.tableId ||
    row?.table?.id ||
    row?.source_table_id ||
    row?.sourceTableId ||
    row?.values?.table_id ||
    row?.values?.tableId ||
    ""
  );
}

export function stripHtml(value) {
  return String(value || "")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .trim();
}

export function hasContent(value) {
  return Boolean(stripHtml(value));
}

export function getCurrentTimeLabel() {
  return new Date().toLocaleTimeString("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function collectMentionPayloadFromHtml(html) {
  const template = document.createElement("template");
  template.innerHTML = html || "";

  const nodes = Array.from(
    template.content.querySelectorAll("[data-note-mention-user-id]")
  );

  const mentionedUserIds = [];
  const mentionKeys = [];

  nodes.forEach((node) => {
    const userId = Number(
      node.getAttribute("data-note-mention-user-id")
    );

    const mentionKey = node.getAttribute("data-note-mention-key");

    if (!userId || !mentionKey) return;

    mentionedUserIds.push(userId);
    mentionKeys.push(mentionKey);
  });

  return {
    mentionedUserIds,
    mentionKeys,
  };
}