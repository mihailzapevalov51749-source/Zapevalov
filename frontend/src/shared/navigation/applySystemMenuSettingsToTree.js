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
  const itemSettings = settings[item.id] || {};

  const nextItem = {
    ...item,
    ...itemSettings,
    isSystem: true,
    is_visible:
      itemSettings.is_visible === undefined
        ? item.is_visible
        : itemSettings.is_visible,
  };

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
