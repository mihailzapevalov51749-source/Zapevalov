const PROTECTED_MENU_TITLES = ["главная страница", "мои задачи"];

const DEFAULT_BLOCK_REASON =
  "Пункт меню нельзя удалить, так как он является системным или имеет связанные зависимости.";

function isProtectedMenuTitle(title) {
  return PROTECTED_MENU_TITLES.includes(String(title || "").trim().toLowerCase());
}

/**
 * Returns a user-facing reason when delete must be blocked on the client.
 *
 * @param {Record<string, unknown> | null | undefined} item
 * @returns {string | null}
 */
export function getNavigationDeleteBlockReason(item) {
  if (!item) {
    return "Пункт меню не найден.";
  }

  const itemId = String(item.id || "").trim();

  if (itemId.startsWith("system-") || itemId.startsWith("system-designer-fallback-")) {
    return DEFAULT_BLOCK_REASON;
  }

  if (item.is_protected === true || item.isProtected === true) {
    return DEFAULT_BLOCK_REASON;
  }

  if (item.is_system === true || item.isSystem === true) {
    return DEFAULT_BLOCK_REASON;
  }

  if (item.type === "object_type" || item.object_type_id) {
    return "Пункт меню объекта нельзя удалить из меню. Управляйте объектами в Designer.";
  }

  if (isProtectedMenuTitle(item.title) || isProtectedMenuTitle(item.display_title)) {
    return DEFAULT_BLOCK_REASON;
  }

  return null;
}

export function canShowNavigationDeleteAction(item) {
  return getNavigationDeleteBlockReason(item) == null;
}
