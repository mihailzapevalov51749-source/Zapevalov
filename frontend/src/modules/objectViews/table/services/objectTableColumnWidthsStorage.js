import { getTablePresentationFieldKeys } from "../../services/columnPresentationUtils";
import { isTableBaseStateKey, TABLE_BASE_STATE_KEY } from "../preferences/tableBaseState";
import {
  buildTablePresentationPrefsStorageKey,
  loadTablePresentationColumnWidths,
  saveTablePresentationColumnWidths,
} from "../preferences/objectTablePresentationPrefs";

const STORAGE_KEY_PREFIX = "objectTableColumnWidths";

function isAllModeColumnWidthsViewKey(viewKey) {
  const normalized = String(viewKey || "").trim();

  return isTableBaseStateKey(normalized) || normalized === "default_table";
}

/**
 * @param {string | null | undefined} activeViewKey
 * @param {string | null | undefined} contractKey
 */
export function resolveColumnWidthsViewKey(activeViewKey, contractKey = "") {
  const active = String(activeViewKey || "").trim();
  const contract = String(contractKey || "").trim();

  if (isAllModeColumnWidthsViewKey(active)) {
    return TABLE_BASE_STATE_KEY;
  }

  if (!active && isAllModeColumnWidthsViewKey(contract)) {
    return TABLE_BASE_STATE_KEY;
  }

  return active || contract || TABLE_BASE_STATE_KEY;
}

function buildColumnWidthsStorageKeyParts(scope = {}, viewKeyOverride = undefined) {
  const tenantId = String(scope.tenantId ?? "").trim() || "0";
  const objectTypeKey = String(scope.objectTypeKey || "default").trim() || "default";
  const viewKey =
    viewKeyOverride !== undefined
      ? String(viewKeyOverride || "").trim() || TABLE_BASE_STATE_KEY
      : resolveColumnWidthsViewKey(scope.viewKey, scope.contractKey);
  const userId = String(scope.userId ?? "").trim();

  return { tenantId, objectTypeKey, viewKey, userId };
}

function formatColumnWidthsStorageKey({ tenantId, objectTypeKey, viewKey, userId }) {
  if (userId) {
    return `${STORAGE_KEY_PREFIX}:${tenantId}:${objectTypeKey}:${viewKey}:${userId}`;
  }

  return `${STORAGE_KEY_PREFIX}:${tenantId}:${objectTypeKey}:${viewKey}`;
}

/**
 * @param {{
 *   tenantId?: string | number | null,
 *   objectTypeKey?: string | null,
 *   viewKey?: string | null,
 *   contractKey?: string | null,
 *   userId?: string | null,
 * }} scope
 */
export function buildColumnWidthsStorageKey(scope = {}) {
  return formatColumnWidthsStorageKey(buildColumnWidthsStorageKeyParts(scope));
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

function loadLegacyColumnWidths(scope, viewKey) {
  const legacyScope = {
    tenantId: scope.tenantId,
    userId: scope.userId,
    objectTypeKey: scope.objectTypeKey,
  };

  let fromLegacy = loadTablePresentationColumnWidths(legacyScope, viewKey);

  if (
    Object.keys(fromLegacy).length === 0 &&
    viewKey === TABLE_BASE_STATE_KEY
  ) {
    fromLegacy = loadTablePresentationColumnWidths(legacyScope, "default_table");
  }

  return fromLegacy;
}

function readPrimaryColumnWidths(scope, viewKey) {
  const storageKey = formatColumnWidthsStorageKey(
    buildColumnWidthsStorageKeyParts(scope, viewKey),
  );
  const fromPrimary = normalizeWidthsMap(readJson(storageKey, null));

  if (
    Object.keys(fromPrimary).length > 0 ||
    viewKey !== TABLE_BASE_STATE_KEY
  ) {
    return fromPrimary;
  }

  const legacyFlatKey = formatColumnWidthsStorageKey(
    buildColumnWidthsStorageKeyParts(scope, "default_table"),
  );

  return normalizeWidthsMap(readJson(legacyFlatKey, null));
}

function saveLegacyColumnWidths(scope, widths) {
  const legacyScope = {
    tenantId: scope.tenantId,
    userId: scope.userId,
    objectTypeKey: scope.objectTypeKey,
  };
  const viewKey = resolveColumnWidthsViewKey(scope.viewKey, scope.contractKey);

  return saveTablePresentationColumnWidths(legacyScope, viewKey, widths);
}

/**
 * @param {{
 *   tenantId?: string | number | null,
 *   objectTypeKey?: string | null,
 *   viewKey?: string | null,
 *   userId?: string | null,
 *   contract?: import('../../services/objectViewContract').ObjectViewContract | null,
 * }} scope
 */
export function loadColumnWidths(scope) {
  const viewKey = resolveColumnWidthsViewKey(scope.viewKey, scope.contractKey);

  if (!viewKey) {
    return {};
  }

  const fromPrimary = readPrimaryColumnWidths(scope, viewKey);

  if (Object.keys(fromPrimary).length > 0) {
    const normalized = filterColumnWidthsForContract(fromPrimary, scope.contract);

    if (Object.keys(normalized).length > 0) {
      return normalized;
    }
  }

  const fromLegacy = loadLegacyColumnWidths({ ...scope, viewKey }, viewKey);

  if (Object.keys(fromLegacy).length > 0) {
    const normalized = filterColumnWidthsForContract(fromLegacy, scope.contract);

    if (Object.keys(normalized).length > 0) {
      writeJson(
        formatColumnWidthsStorageKey(buildColumnWidthsStorageKeyParts(scope, viewKey)),
        normalized,
      );
    }

    return normalized;
  }

  return {};
}

/**
 * @param {{
 *   tenantId?: string | number | null,
 *   objectTypeKey?: string | null,
 *   viewKey?: string | null,
 *   userId?: string | null,
 *   contract?: import('../../services/objectViewContract').ObjectViewContract | null,
 * }} scope
 * @param {Record<string, number>} widths
 */
export function saveColumnWidths(scope, widths) {
  const viewKey = resolveColumnWidthsViewKey(scope.viewKey, scope.contractKey);
  const normalized = filterColumnWidthsForContract(widths, scope.contract);

  if (!viewKey || !Object.keys(normalized).length) {
    return false;
  }

  const storageKey = formatColumnWidthsStorageKey(
    buildColumnWidthsStorageKeyParts(scope, viewKey),
  );
  const saved = writeJson(storageKey, normalized);

  if (saved) {
    saveLegacyColumnWidths({ ...scope, viewKey }, normalized);
  }

  return saved;
}

/**
 * @param {{
 *   tenantId?: string | number | null,
 *   objectTypeKey?: string | null,
 *   viewKey?: string | null,
 *   userId?: string | null,
 *   contract?: import('../../services/objectViewContract').ObjectViewContract | null,
 * }} scope
 * @param {string} fieldKey
 * @param {number} width
 */
export function saveColumnWidth(scope, fieldKey, width) {
  const normalizedFieldKey = String(fieldKey || "").trim();
  const numericWidth = Number(width);

  if (!normalizedFieldKey || !Number.isFinite(numericWidth) || numericWidth <= 0) {
    return false;
  }

  const current = loadColumnWidths(scope);

  return saveColumnWidths(scope, {
    ...current,
    [normalizedFieldKey]: numericWidth,
  });
}

/**
 * @param {{
 *   tenantId?: string | number | null,
 *   objectTypeKey?: string | null,
 *   viewKey?: string | null,
 *   userId?: string | null,
 * }} scope
 */
export function clearColumnWidths(scope) {
  const viewKey = resolveColumnWidthsViewKey(scope.viewKey, scope.contractKey);

  if (!viewKey) {
    return false;
  }

  try {
    localStorage.removeItem(
      formatColumnWidthsStorageKey(buildColumnWidthsStorageKeyParts(scope, viewKey)),
    );

    if (viewKey === TABLE_BASE_STATE_KEY) {
      localStorage.removeItem(
        formatColumnWidthsStorageKey(
          buildColumnWidthsStorageKeyParts(scope, "default_table"),
        ),
      );
    }
  } catch {
    return false;
  }

  saveLegacyColumnWidths({ ...scope, viewKey }, {});

  return true;
}

function filterColumnWidthsForContract(widths, contract) {
  const normalized = normalizeWidthsMap(widths);

  if (!contract) {
    return normalized;
  }

  const allowedKeys = new Set(getTablePresentationFieldKeys(contract));
  const filtered = {};

  for (const [key, value] of Object.entries(normalized)) {
    if (allowedKeys.has(key)) {
      filtered[key] = value;
    }
  }

  return filtered;
}

export { buildTablePresentationPrefsStorageKey };
