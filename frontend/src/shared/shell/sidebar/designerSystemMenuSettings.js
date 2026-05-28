const STORAGE_KEY = "yasnopro:designer-system-menu-settings:v1";
const CHANGE_EVENT = "yasnopro:designer-system-menu-settings:changed";

function readAll() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeAll(next) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

function tenantKey(tenantId) {
  const normalized = Number(tenantId) || 1;
  return `tenant:${normalized}`;
}

function systemItemKey(item) {
  const id = String(item?.id || "").trim();
  if (id.startsWith("system-designer-")) {
    return id.replace("system-designer-", "");
  }
  const explicitKey = String(item?.system_key ?? item?.systemKey ?? "").trim();
  if (explicitKey) return explicitKey;
  const route = String(item?.route ?? item?.path ?? item?.url ?? "").trim();
  if (!route) return "";
  return route.split("/").filter(Boolean).pop() || "";
}

export function getDesignerSystemMenuSettings(tenantId) {
  const all = readAll();
  const key = tenantKey(tenantId);
  const tenantSettings = all[key];
  return tenantSettings && typeof tenantSettings === "object" ? tenantSettings : {};
}

export function saveDesignerSystemMenuSettings(tenantId, settings) {
  const all = readAll();
  all[tenantKey(tenantId)] = settings && typeof settings === "object" ? settings : {};
  writeAll(all);
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: { tenantId } }));
}

export function patchDesignerSystemMenuSettings(tenantId, itemKey, patch) {
  if (!itemKey) return;
  const current = getDesignerSystemMenuSettings(tenantId);
  const next = {
    ...current,
    [itemKey]: {
      ...(current[itemKey] && typeof current[itemKey] === "object" ? current[itemKey] : {}),
      ...(patch && typeof patch === "object" ? patch : {}),
    },
  };
  saveDesignerSystemMenuSettings(tenantId, next);
}

export function applyDesignerSystemMenuSettings(
  items,
  tenantId,
  isSuperadmin,
  options = {}
) {
  const showHiddenInEditMode = options.showHiddenInEditMode === true;
  const settings = getDesignerSystemMenuSettings(tenantId);
  const source = Array.isArray(items) ? items : [];
  const mapped = source
    .map((item, index) => {
      const key = systemItemKey(item);
      const itemSettings =
        key && settings[key] && typeof settings[key] === "object" ? settings[key] : {};
      const defaultVisible = item?.is_visible !== false;
      const isAdminItem = key === "administration";
      if (isAdminItem && !Boolean(isSuperadmin)) {
        return null;
      }
      const visibleFromSettings =
        typeof itemSettings.is_visible === "boolean" ? itemSettings.is_visible : defaultVisible;
      const isVisible = visibleFromSettings;
      if (!isVisible && !showHiddenInEditMode) return null;
      const fallbackOrder =
        typeof item?.sort_order === "number" && Number.isFinite(item.sort_order)
          ? item.sort_order
          : (index + 1) * 10;
      const sortOrder =
        typeof itemSettings.sort_order === "number" && Number.isFinite(itemSettings.sort_order)
          ? itemSettings.sort_order
          : fallbackOrder;
      return {
        ...item,
        title:
          typeof itemSettings.title === "string" && itemSettings.title.trim().length > 0
            ? itemSettings.title
            : item?.title,
        icon: itemSettings.icon ?? item?.icon,
        icon_type: itemSettings.icon_type ?? item?.icon_type,
        icon_file_url: itemSettings.icon_file_url ?? item?.icon_file_url,
        color:
          typeof itemSettings.color === "string" ? itemSettings.color : item?.color,
        is_bold:
          typeof itemSettings.is_bold === "boolean"
            ? itemSettings.is_bold
            : item?.is_bold,
        is_italic:
          typeof itemSettings.is_italic === "boolean"
            ? itemSettings.is_italic
            : item?.is_italic,
        is_expanded:
          typeof itemSettings.is_expanded === "boolean"
            ? itemSettings.is_expanded
            : item?.is_expanded,
        is_visible: isVisible,
        sort_order: sortOrder,
        system_key: key || item?.system_key,
      };
    })
    .filter(Boolean);

  return mapped.sort((a, b) => {
    const left = Number(a?.sort_order ?? 0);
    const right = Number(b?.sort_order ?? 0);
    if (left !== right) return left - right;
    return String(a?.id || "").localeCompare(String(b?.id || ""));
  });
}

export function getDesignerSystemMenuSettingsEventName() {
  return CHANGE_EVENT;
}

export function resolveDesignerSystemItemKey(input) {
  return systemItemKey(input);
}
