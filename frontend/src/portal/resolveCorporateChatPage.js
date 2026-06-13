/** Legacy DEV tenant chat page id; prefer runtime navigation system_key. */
export const CORPORATE_CHAT_PAGE_ID = 35;

export const RUNTIME_CHAT_SYSTEM_KEY = "runtime.chat";

export const RUNTIME_MENU_SCOPE = "runtime";

export const RUNTIME_CHAT_NAV_TITLE = "Чат";

function normalizeKey(value) {
  return String(value || "").trim().toLowerCase();
}

/**
 * @param {{ system_key?: string | null, menu_scope?: string | null, title?: string | null } | null | undefined} navItem
 */
export function isRuntimeChatNavigationItem(navItem) {
  if (!navItem || typeof navItem !== "object") {
    return false;
  }

  if (normalizeKey(navItem.system_key) === RUNTIME_CHAT_SYSTEM_KEY) {
    return true;
  }

  return (
    normalizeKey(navItem.menu_scope) === RUNTIME_MENU_SCOPE &&
    String(navItem.title || "").trim() === RUNTIME_CHAT_NAV_TITLE
  );
}

/**
 * @param {{
 *   pageId?: number | null,
 *   activeNavigationItem?: { system_key?: string | null, menu_scope?: string | null, title?: string | null } | null,
 * }} params
 */
export function resolveIsCorporateChatPage({ pageId, activeNavigationItem } = {}) {
  if (Number(pageId) === CORPORATE_CHAT_PAGE_ID) {
    return true;
  }

  return isRuntimeChatNavigationItem(activeNavigationItem);
}
