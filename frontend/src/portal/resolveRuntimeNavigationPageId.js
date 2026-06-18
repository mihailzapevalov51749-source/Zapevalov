import { RUNTIME_CALENDAR_SYSTEM_KEY } from "./resolveCorporateCalendarPage.js";
import { RUNTIME_CHAT_SYSTEM_KEY } from "./resolveCorporateChatPage.js";

function normalizeKey(value) {
  return String(value || "").trim().toLowerCase();
}

function parsePageId(value) {
  if (value == null || value === "") {
    return null;
  }

  const parsed = Number(value);
  if (Number.isFinite(parsed) && parsed > 0) {
    return parsed;
  }

  return null;
}

function walkNavigationItems(items, systemKey) {
  if (!Array.isArray(items)) {
    return null;
  }

  for (const item of items) {
    if (!item || typeof item !== "object") {
      continue;
    }

    const itemKey = normalizeKey(item.system_key || item.systemKey);
    if (itemKey === systemKey) {
      const pageId = parsePageId(item.page_id ?? item.pageId);
      if (pageId) {
        return pageId;
      }
    }

    const nested =
      walkNavigationItems(item.children, systemKey) ||
      walkNavigationItems(item.items, systemKey);

    if (nested) {
      return nested;
    }
  }

  return null;
}

/**
 * Resolve runtime page id from navigation tree by system_key.
 *
 * @param {Array<{ system_key?: string, page_id?: number }> | null | undefined} navigationItems
 * @param {string} systemKey
 * @returns {number | null}
 */
export function resolveRuntimeNavigationPageId(navigationItems, systemKey) {
  return walkNavigationItems(navigationItems, normalizeKey(systemKey));
}

export function resolveRuntimeChatPageId(navigationItems) {
  return resolveRuntimeNavigationPageId(navigationItems, RUNTIME_CHAT_SYSTEM_KEY);
}

export function resolveRuntimeCalendarPageId(navigationItems) {
  return resolveRuntimeNavigationPageId(navigationItems, RUNTIME_CALENDAR_SYSTEM_KEY);
}
