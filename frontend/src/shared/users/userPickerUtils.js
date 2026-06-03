import {
  MENTION_POPOVER_HEIGHT,
  MENTION_POPOVER_WIDTH,
  loadSystemUsers,
} from "../communication/domain/messageItemUtils";

const USER_PICKER_POPOVER_GAP = 6;
const USER_PICKER_VIEWPORT_MARGIN = 12;

/**
 * bottom-start with top-start fallback when there is not enough space below.
 */
export function getUserPickerPopoverPosition(rect) {
  if (!rect) {
    return { top: 8, left: 8 };
  }

  const viewportWidth =
    window.innerWidth || document.documentElement.clientWidth;
  const viewportHeight =
    window.innerHeight || document.documentElement.clientHeight;

  const width = MENTION_POPOVER_WIDTH;
  const height = MENTION_POPOVER_HEIGHT;

  let left = rect.left;
  let top = rect.bottom + USER_PICKER_POPOVER_GAP;

  if (left + width > viewportWidth - USER_PICKER_VIEWPORT_MARGIN) {
    left = viewportWidth - width - USER_PICKER_VIEWPORT_MARGIN;
  }

  if (left < USER_PICKER_VIEWPORT_MARGIN) {
    left = USER_PICKER_VIEWPORT_MARGIN;
  }

  const fitsBelow =
    top + height <= viewportHeight - USER_PICKER_VIEWPORT_MARGIN;
  const fitsAbove =
    rect.top - USER_PICKER_POPOVER_GAP - height >= USER_PICKER_VIEWPORT_MARGIN;

  if (!fitsBelow && fitsAbove) {
    top = rect.top - height - USER_PICKER_POPOVER_GAP;
  } else if (!fitsBelow) {
    top = Math.max(
      USER_PICKER_VIEWPORT_MARGIN,
      viewportHeight - height - USER_PICKER_VIEWPORT_MARGIN,
    );
  }

  if (top < USER_PICKER_VIEWPORT_MARGIN) {
    top = USER_PICKER_VIEWPORT_MARGIN;
  }

  return { top, left };
}

/**
 * Display label priority for user picker (matches product requirement).
 */
export function getUserDisplayLabel(user) {
  if (!user || typeof user !== "object") {
    return "";
  }

  return (
    user.display_name ||
    user.displayName ||
    user.full_name ||
    user.fullName ||
    user.name ||
    user.username ||
    user.email ||
    ""
  );
}

export function normalizePickerUser(user) {
  const id = user?.id ?? user?.user_id ?? user?.userId ?? null;

  const label =
    getUserDisplayLabel(user) ||
    (id != null ? `Пользователь #${id}` : "Без имени");

  return {
    id,
    label,
    email: user?.email || "",
    avatar_url: user?.avatar_url || user?.avatarUrl || "",
    avatar_settings:
      user?.avatar_settings ||
      user?.avatarSettings || {
        x: 0,
        y: 0,
        scale: 1,
      },
    isActive: user?.is_active !== false && user?.isActive !== false,
  };
}

export function filterUsersByQuery(users, query) {
  const normalizedQuery = String(query || "")
    .trim()
    .toLowerCase();

  if (!normalizedQuery) {
    return users;
  }

  return users.filter((user) => {
    const label = String(user.label || "").toLowerCase();
    const email = String(user.email || "").toLowerCase();

    return (
      label.includes(normalizedQuery) || email.includes(normalizedQuery)
    );
  });
}

let cachedUsers = null;
let cachedUsersPromise = null;

export async function loadPickerUsers() {
  if (cachedUsers) {
    return cachedUsers;
  }

  if (!cachedUsersPromise) {
    cachedUsersPromise = loadSystemUsers()
      .then((list) => {
        cachedUsers = (Array.isArray(list) ? list : [])
          .map(normalizePickerUser)
          .filter((user) => user.id != null && user.isActive);

        return cachedUsers;
      })
      .catch((error) => {
        console.error("Не удалось загрузить пользователей:", error);
        cachedUsers = [];
        return cachedUsers;
      })
      .finally(() => {
        cachedUsersPromise = null;
      });
  }

  return cachedUsersPromise;
}

export function findPickerUserById(users, userId) {
  if (userId == null || userId === "") {
    return null;
  }

  const targetId = String(userId);

  return users.find((user) => String(user.id) === targetId) || null;
}
