export const RUNTIME_CALENDAR_SYSTEM_KEY = "runtime.calendar";

export const RUNTIME_CALENDAR_NAV_TITLE = "Календарь";

function normalizeKey(value) {
  return String(value || "").trim().toLowerCase();
}

/**
 * @param {{ system_key?: string | null, menu_scope?: string | null, title?: string | null } | null | undefined} navItem
 */
export function isRuntimeCalendarNavigationItem(navItem) {
  if (!navItem || typeof navItem !== "object") {
    return false;
  }

  if (normalizeKey(navItem.system_key) === RUNTIME_CALENDAR_SYSTEM_KEY) {
    return true;
  }

  return (
    normalizeKey(navItem.menu_scope) === "runtime" &&
    String(navItem.title || "").trim() === RUNTIME_CALENDAR_NAV_TITLE
  );
}

/**
 * @param {{
 *   pageId?: number | null,
 *   activeNavigationItem?: { system_key?: string | null, menu_scope?: string | null, title?: string | null } | null,
 * }} params
 */
export function resolveIsCorporateCalendarPage({ pageId, activeNavigationItem } = {}) {
  return isRuntimeCalendarNavigationItem(activeNavigationItem);
}
