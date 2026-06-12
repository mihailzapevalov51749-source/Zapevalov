const STORAGE_KEY = "yasnopro:designer-system-menu-settings:v1";
const CHANGE_EVENT = "yasnopro:designer-system-menu-settings:changed";

const serverSettingsCache = new Map();
const serverSettingsLoaded = new Set();
const serverSettingsLoadPromises = new Map();

function readAllLocal() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeAllLocal(next) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

function normalizeTenantId(tenantId) {
  const normalized = Number(tenantId);
  return Number.isFinite(normalized) && normalized > 0 ? normalized : 1;
}

function tenantKey(tenantId) {
  return `tenant:${normalizeTenantId(tenantId)}`;
}

function readLocalSettings(tenantId) {
  const all = readAllLocal();
  const tenantSettings = all[tenantKey(tenantId)];
  return tenantSettings && typeof tenantSettings === "object" ? tenantSettings : {};
}

function writeLocalSettings(tenantId, settings) {
  const all = readAllLocal();
  all[tenantKey(tenantId)] = settings && typeof settings === "object" ? settings : {};
  writeAllLocal(all);
}

function normalizeSettingEntry(entry) {
  if (!entry || typeof entry !== "object") {
    return {};
  }

  return {
    ...(entry.title != null ? { title: entry.title } : {}),
    ...(entry.icon != null ? { icon: entry.icon } : {}),
    ...(entry.icon_type != null ? { icon_type: entry.icon_type } : {}),
    ...(entry.icon_file_url != null ? { icon_file_url: entry.icon_file_url } : {}),
    ...(entry.color != null ? { color: entry.color } : {}),
    ...(typeof entry.sort_order === "number" ? { sort_order: entry.sort_order } : {}),
    ...(typeof entry.is_visible === "boolean" ? { is_visible: entry.is_visible } : {}),
    ...(typeof entry.is_bold === "boolean" ? { is_bold: entry.is_bold } : {}),
    ...(typeof entry.is_italic === "boolean" ? { is_italic: entry.is_italic } : {}),
    ...(typeof entry.is_expanded === "boolean" ? { is_expanded: entry.is_expanded } : {}),
    ...(typeof entry.block_id === "number" ? { block_id: entry.block_id } : {}),
  };
}

function mapApiSettingsToCache(settings) {
  const source = settings && typeof settings === "object" ? settings : {};
  const mapped = {};

  for (const [itemKey, entry] of Object.entries(source)) {
    const normalized = normalizeSettingEntry(entry);
    if (Object.keys(normalized).length > 0) {
      mapped[itemKey] = normalized;
    }
  }

  return mapped;
}

async function getDesignerSystemMenuSettingsApi() {
  return import("../../../modules/designer/api/designerSystemMenuSettingsApi.js");
}

function dispatchSettingsChanged(tenantId) {
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent(CHANGE_EVENT, {
        detail: { tenantId: normalizeTenantId(tenantId) },
      }),
    );
  }
}

function setServerCache(tenantId, settings) {
  const normalizedTenantId = normalizeTenantId(tenantId);
  serverSettingsCache.set(normalizedTenantId, settings);
  serverSettingsLoaded.add(normalizedTenantId);
}

export function systemItemKey(item) {
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
  const normalizedTenantId = normalizeTenantId(tenantId);

  if (serverSettingsCache.has(normalizedTenantId)) {
    return serverSettingsCache.get(normalizedTenantId);
  }

  return readLocalSettings(normalizedTenantId);
}

export async function loadDesignerSystemMenuSettings(tenantId) {
  const normalizedTenantId = normalizeTenantId(tenantId);

  if (serverSettingsLoadPromises.has(normalizedTenantId)) {
    return serverSettingsLoadPromises.get(normalizedTenantId);
  }

  const promise = (async () => {
    try {
      const api = await getDesignerSystemMenuSettingsApi();
      const remoteSettings = mapApiSettingsToCache(
        await api.fetchDesignerSystemMenuSettings(normalizedTenantId),
      );

      if (Object.keys(remoteSettings).length > 0) {
        setServerCache(normalizedTenantId, remoteSettings);
        writeLocalSettings(normalizedTenantId, remoteSettings);
      } else {
        const localFallback = readLocalSettings(normalizedTenantId);
        setServerCache(normalizedTenantId, localFallback);
      }
    } catch {
      setServerCache(normalizedTenantId, readLocalSettings(normalizedTenantId));
    } finally {
      serverSettingsLoadPromises.delete(normalizedTenantId);
      dispatchSettingsChanged(normalizedTenantId);
    }

    return getDesignerSystemMenuSettings(normalizedTenantId);
  })();

  serverSettingsLoadPromises.set(normalizedTenantId, promise);
  return promise;
}

export function isDesignerSystemMenuSettingsLoaded(tenantId) {
  return serverSettingsLoaded.has(normalizeTenantId(tenantId));
}

export async function saveDesignerSystemMenuSettings(tenantId, settings) {
  const normalizedTenantId = normalizeTenantId(tenantId);
  const nextSettings =
    settings && typeof settings === "object" ? { ...settings } : {};

  setServerCache(normalizedTenantId, nextSettings);
  writeLocalSettings(normalizedTenantId, nextSettings);
  dispatchSettingsChanged(normalizedTenantId);

  try {
    const payload = {};
    for (const [itemKey, entry] of Object.entries(nextSettings)) {
      payload[itemKey] = normalizeSettingEntry(entry);
    }
    const api = await getDesignerSystemMenuSettingsApi();
    const saved = mapApiSettingsToCache(
      await api.putDesignerSystemMenuSettingsBulk(normalizedTenantId, payload),
    );
    if (Object.keys(saved).length > 0) {
      setServerCache(normalizedTenantId, { ...nextSettings, ...saved });
    }
  } catch {
    // local cache remains as optimistic fallback
  }

  dispatchSettingsChanged(normalizedTenantId);
  return getDesignerSystemMenuSettings(normalizedTenantId);
}

export async function patchDesignerSystemMenuSettings(tenantId, itemKey, patch) {
  if (!itemKey) return getDesignerSystemMenuSettings(tenantId);

  const normalizedTenantId = normalizeTenantId(tenantId);
  const current = getDesignerSystemMenuSettings(normalizedTenantId);
  const nextEntry = {
    ...(current[itemKey] && typeof current[itemKey] === "object" ? current[itemKey] : {}),
    ...(patch && typeof patch === "object" ? patch : {}),
  };
  const next = {
    ...current,
    [itemKey]: nextEntry,
  };

  setServerCache(normalizedTenantId, next);
  writeLocalSettings(normalizedTenantId, next);
  dispatchSettingsChanged(normalizedTenantId);

  try {
    const api = await getDesignerSystemMenuSettingsApi();
    await api.putDesignerSystemMenuSetting(
      normalizedTenantId,
      itemKey,
      normalizeSettingEntry(nextEntry),
    );
  } catch {
    // keep local optimistic state
  }

  return getDesignerSystemMenuSettings(normalizedTenantId);
}

export function applyDesignerSystemMenuSettings(
  items,
  tenantId,
  isSuperadmin,
  options = {},
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
      const isAdminItem = key === "administration" || key === "tenant-administration";
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
        block_id:
          typeof itemSettings.block_id === "number" && Number.isFinite(itemSettings.block_id)
            ? itemSettings.block_id
            : item?.block_id,
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

/** @internal test helper — clears in-memory server cache between isolated test runs */
export function resetDesignerSystemMenuSettingsCache(tenantId = null) {
  if (tenantId != null) {
    const normalizedTenantId = normalizeTenantId(tenantId);
    serverSettingsCache.delete(normalizedTenantId);
    serverSettingsLoaded.delete(normalizedTenantId);
    serverSettingsLoadPromises.delete(normalizedTenantId);
    return;
  }

  serverSettingsCache.clear();
  serverSettingsLoaded.clear();
  serverSettingsLoadPromises.clear();
}

export function resolveDesignerSystemItemKey(input) {
  return systemItemKey(input);
}
