import {
  resolveMenuItemVisibility,
} from "./mergeRuntimeMenuLayers.js";
import {
  sanitizeNavigationMenuSettingRecord,
  stripNavigationMenuSystemIconsFromItem,
  isObjectTypeNavigationItem,
} from "./navigationMenuIconPolicy.js";

const PROTECTED_MENU_TITLES = ["главная страница", "мои задачи"];

export function isProtectedMenuItem(item) {
  const title = String(item?.title || "").trim().toLowerCase();

  return (
    PROTECTED_MENU_TITLES.includes(title) ||
    item?.is_home === true ||
    item?.isHome === true ||
    item?.type === "home"
  );
}

export function shouldApplySystemMenuSettings(item) {
  if (!item || typeof item !== "object") {
    return false;
  }

  if (isProtectedMenuItem(item)) {
    return true;
  }

  if (item.is_system === true || item.isSystem === true) {
    return true;
  }

  if (item.is_protected === true) {
    return true;
  }

  const id = String(item.id || "");
  return id.startsWith("system-") || id.startsWith("cp-");
}

export function isSystemMenuItem(itemId, data = null, item = null) {
  const id = String(itemId || "");

  if (id.startsWith("system-") || id.startsWith("cp-")) {
    return true;
  }

  if (data?.isSystem) {
    return true;
  }

  if (item && shouldApplySystemMenuSettings(item)) {
    return true;
  }

  return isProtectedMenuItem(data);
}

export function applySystemSettingsToItem(item, settings) {
  const itemId = String(item.id ?? "");
  const itemSettings = settings[itemId] || settings[item.id] || {};
  const sanitized = sanitizeNavigationMenuSettingRecord(itemSettings) || {};

  const nextItem = stripNavigationMenuSystemIconsFromItem({
    ...item,
    isSystem: true,
    block_id:
      sanitized.block_id !== undefined ? sanitized.block_id : item.block_id,
    is_visible: resolveMenuItemVisibility(
      item.is_visible,
      sanitized.is_visible,
      undefined,
    ),
  });

  if (sanitized.title !== undefined) {
    nextItem.title = sanitized.title;
  }
  if (
    !isObjectTypeNavigationItem(item) &&
    sanitized.icon_file_url !== undefined
  ) {
    if (sanitized.icon_file_url) {
      nextItem.icon_file_url = sanitized.icon_file_url;
    } else {
      delete nextItem.icon_file_url;
      delete nextItem.display_icon_file_url;
    }
  }
  if (sanitized.color !== undefined) {
    nextItem.color = sanitized.color;
  }
  if (sanitized.is_bold !== undefined) {
    nextItem.is_bold = sanitized.is_bold;
  }
  if (sanitized.is_italic !== undefined) {
    nextItem.is_italic = sanitized.is_italic;
  }
  if (sanitized.is_expanded !== undefined) {
    nextItem.is_expanded = sanitized.is_expanded;
  }
  if (sanitized.sort_order !== undefined) {
    nextItem.sort_order = sanitized.sort_order;
  }

  if (Array.isArray(item.children)) {
    nextItem.children = item.children.map((child) =>
      applySystemSettingsToItem(child, settings),
    );
  }

  return nextItem;
}

export function applySystemMenuSettingsToTree(tree = [], systemSettings = {}) {
  return tree.map((item) => {
    const children = Array.isArray(item.children)
      ? applySystemMenuSettingsToTree(item.children, systemSettings)
      : item.children;

    const nextItem = { ...item, children };

    if (!shouldApplySystemMenuSettings(nextItem)) {
      return nextItem;
    }

    return applySystemSettingsToItem({ ...nextItem, isSystem: true }, systemSettings);
  });
}

export function sortNavigationTreeBySortOrder(tree = []) {
  if (!Array.isArray(tree) || tree.length === 0) {
    return [];
  }

  return [...tree]
    .sort((left, right) => {
      const leftOrder = Number(left?.sort_order ?? 0);
      const rightOrder = Number(right?.sort_order ?? 0);
      if (leftOrder !== rightOrder) {
        return leftOrder - rightOrder;
      }
      return String(left?.id || "").localeCompare(String(right?.id || ""));
    })
    .map((item) => ({
      ...item,
      children: Array.isArray(item.children)
        ? sortNavigationTreeBySortOrder(item.children)
        : item.children,
    }));
}
