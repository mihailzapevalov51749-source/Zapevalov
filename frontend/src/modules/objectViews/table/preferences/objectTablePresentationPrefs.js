import { buildOfficeTableRepresentationsPrefsScopeKey } from "../representations/objectTableRepresentationsPrefs";

const STORAGE_KEY_PREFIX = "yasnopro-object-table-presentation-v1";

/**
 * @param {{ tenantId?: string | number, userId?: string, objectTypeKey?: string }} scope
 */
export function buildTablePresentationPrefsStorageKey(scope = {}) {
  const scoped = buildOfficeTableRepresentationsPrefsScopeKey({
    tenantId: scope.tenantId,
    userId: scope.userId,
    objectTypeKey: scope.objectTypeKey,
  });

  return `${STORAGE_KEY_PREFIX}::${scoped}`;
}

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);

    if (!raw) {
      return fallback;
    }

    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

function normalizeWidthsMap(raw) {
  if (!raw || typeof raw !== "object") {
    return {};
  }

  const result = {};

  for (const [key, value] of Object.entries(raw)) {
    const normalizedKey = String(key || "").trim();
    const width = Number(value);

    if (!normalizedKey || !Number.isFinite(width) || width <= 0) {
      continue;
    }

    result[normalizedKey] = width;
  }

  return result;
}

/**
 * @param {{ tenantId?: string | number, userId?: string, objectTypeKey?: string }} scope
 * @param {string} viewKey
 */
export function loadTablePresentationColumnWidths(scope, viewKey) {
  const storageKey = buildTablePresentationPrefsStorageKey(scope);
  const normalizedViewKey = String(viewKey || "").trim();

  if (!normalizedViewKey) {
    return {};
  }

  const store = readJson(storageKey, {});

  if (!store || typeof store !== "object") {
    return {};
  }

  const entry = store[normalizedViewKey];

  return normalizeWidthsMap(entry?.columnWidths);
}

/**
 * @param {{ tenantId?: string | number, userId?: string, objectTypeKey?: string }} scope
 * @param {string} viewKey
 * @param {Record<string, number>} columnWidths
 */
export function saveTablePresentationColumnWidths(scope, viewKey, columnWidths) {
  const storageKey = buildTablePresentationPrefsStorageKey(scope);
  const normalizedViewKey = String(viewKey || "").trim();
  const normalizedWidths = normalizeWidthsMap(columnWidths);

  if (!normalizedViewKey || !Object.keys(normalizedWidths).length) {
    return false;
  }

  const store = readJson(storageKey, {});
  const safeStore = store && typeof store === "object" ? store : {};

  safeStore[normalizedViewKey] = {
    ...(safeStore[normalizedViewKey] && typeof safeStore[normalizedViewKey] === "object"
      ? safeStore[normalizedViewKey]
      : {}),
    columnWidths: normalizedWidths,
  };

  return writeJson(storageKey, safeStore);
}
