export function isObjectTypeNavigationItem(item) {
  return item?.type === "object_type" || item?.object_type_id != null;
}

function isExplicitBoolean(value) {
  return value === true || value === false;
}

function hasNonIconMenuOverrideFields(value) {
  if (!value || typeof value !== "object") {
    return false;
  }

  if (typeof value.title === "string" && value.title.trim()) {
    return true;
  }
  if (typeof value.color === "string" && value.color.trim()) {
    return true;
  }
  if (isExplicitBoolean(value.is_visible)) {
    return true;
  }
  if (isExplicitBoolean(value.is_bold)) {
    return true;
  }
  if (isExplicitBoolean(value.is_italic)) {
    return true;
  }
  if (isExplicitBoolean(value.is_expanded)) {
    return true;
  }
  if (typeof value.sort_order === "number" && Number.isFinite(value.sort_order)) {
    return true;
  }
  if (typeof value.block_id === "number" && Number.isFinite(value.block_id)) {
    return true;
  }

  return false;
}

function applySanitizedNavigationMenuIconSetting(sanitized, value) {
  if (!("icon_file_url" in value)) {
    return;
  }

  const url = String(value.icon_file_url || "").trim();
  if (url) {
    sanitized.icon_file_url = url;
    return;
  }

  if (value.icon_file_url === null && hasNonIconMenuOverrideFields(value)) {
    sanitized.icon_file_url = null;
  }
}

export function resolveNavigationMenuIconFileUrl(item) {
  if (!item || typeof item !== "object") {
    return null;
  }

  const rawUrl = isObjectTypeNavigationItem(item)
    ? item.display_icon_file_url ?? item.icon_file_url
    : item.icon_file_url ?? item.display_icon_file_url;

  const normalized = String(rawUrl || "").trim();
  return normalized || null;
}

export function hasNavigationMenuIcon(item) {
  return Boolean(resolveNavigationMenuIconFileUrl(item));
}

export function sanitizeNavigationMenuSettingRecord(value) {
  if (!value || typeof value !== "object") {
    return null;
  }

  const sanitized = {};

  if (typeof value.title === "string" && value.title.trim()) {
    sanitized.title = value.title.trim();
  }

  if ("icon_file_url" in value) {
    applySanitizedNavigationMenuIconSetting(sanitized, value);
  }

  if (typeof value.color === "string" && value.color.trim()) {
    sanitized.color = value.color.trim();
  }
  if (typeof value.sort_order === "number" && Number.isFinite(value.sort_order)) {
    sanitized.sort_order = value.sort_order;
  }
  if (isExplicitBoolean(value.is_visible)) {
    sanitized.is_visible = value.is_visible;
  }
  if (isExplicitBoolean(value.is_bold)) {
    sanitized.is_bold = value.is_bold;
  }
  if (isExplicitBoolean(value.is_italic)) {
    sanitized.is_italic = value.is_italic;
  }
  if (isExplicitBoolean(value.is_expanded)) {
    sanitized.is_expanded = value.is_expanded;
  }
  if (typeof value.block_id === "number" && Number.isFinite(value.block_id)) {
    sanitized.block_id = value.block_id;
  }

  return Object.keys(sanitized).length > 0 ? sanitized : null;
}

export function mergeNavigationMenuSettingRecord(previous = {}, partial = {}) {
  const base =
    previous && typeof previous === "object" ? { ...previous } : {};

  delete base.icon;
  delete base.icon_type;
  delete base.iconType;

  const next = {
    ...base,
    ...(partial && typeof partial === "object" ? partial : {}),
  };

  delete next.icon;
  delete next.icon_type;
  delete next.iconType;

  if ("icon_file_url" in partial) {
    const url = String(partial.icon_file_url || "").trim();
    next.icon_file_url = url || null;
  }

  return next;
}

export function buildNavigationMenuSavePayload(data = {}) {
  if (!data || typeof data !== "object") {
    return {};
  }

  const payload = {};

  if (typeof data.title === "string") {
    payload.title = data.title;
  }
  if (typeof data.color === "string") {
    payload.color = data.color;
  }
  if (typeof data.is_bold === "boolean") {
    payload.is_bold = data.is_bold;
  }
  if (typeof data.is_italic === "boolean") {
    payload.is_italic = data.is_italic;
  }
  if (typeof data.is_visible === "boolean") {
    payload.is_visible = data.is_visible;
  }
  if ("icon_file_url" in data) {
    const url = String(data.icon_file_url || "").trim();
    payload.icon_file_url = url || null;
  }

  return payload;
}

export function stripNavigationMenuSystemIconsFromItem(item) {
  if (!item || typeof item !== "object") {
    return item;
  }

  const next = { ...item };
  delete next.icon;
  delete next.icon_type;
  delete next.iconType;

  if (!resolveNavigationMenuIconFileUrl(next)) {
    delete next.icon_file_url;
    if (!isObjectTypeNavigationItem(next)) {
      delete next.display_icon_file_url;
      delete next.display_icon_type;
    }
  }

  return next;
}
