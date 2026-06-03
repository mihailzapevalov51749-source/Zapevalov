/**
 * Namespaced keys for entity system columns in View Engine tables.
 * User-defined fields (e.g. task "status") keep their catalog keys unchanged.
 */

export const SYSTEM_COLUMN_KEY_PREFIX = "__system_";

export const SYSTEM_COLUMN_KEYS = {
  id: `${SYSTEM_COLUMN_KEY_PREFIX}id`,
  status: `${SYSTEM_COLUMN_KEY_PREFIX}status`,
  created_at: `${SYSTEM_COLUMN_KEY_PREFIX}created_at`,
  updated_at: `${SYSTEM_COLUMN_KEY_PREFIX}updated_at`,
};

/** System columns prepended to the table when includeSystemColumns is true. */
export const VIEW_ENGINE_SYSTEM_COLUMN_KEYS = [
  SYSTEM_COLUMN_KEYS.id,
  SYSTEM_COLUMN_KEYS.created_at,
];

const LEGACY_SYSTEM_KEY_TO_NAMESPACED = {
  id: SYSTEM_COLUMN_KEYS.id,
  status: SYSTEM_COLUMN_KEYS.status,
  created_at: SYSTEM_COLUMN_KEYS.created_at,
  updated_at: SYSTEM_COLUMN_KEYS.updated_at,
};

/**
 * @param {string | null | undefined} key
 * @returns {boolean}
 */
export function isNamespacedSystemColumnKey(key) {
  return String(key || "").startsWith(SYSTEM_COLUMN_KEY_PREFIX);
}

/**
 * Maps legacy system keys (id, status, created_at) to namespaced keys.
 *
 * @param {string | null | undefined} key
 * @returns {string}
 */
export function normalizeSystemColumnKey(key) {
  const normalized = String(key || "").trim();

  if (!normalized) {
    return "";
  }

  if (isNamespacedSystemColumnKey(normalized)) {
    return normalized;
  }

  return LEGACY_SYSTEM_KEY_TO_NAMESPACED[normalized] || normalized;
}

/**
 * @param {import("./contracts").ViewEngineColumn | null | undefined} column
 * @returns {boolean}
 */
export function isViewEngineSystemColumn(column) {
  if (!column) {
    return false;
  }

  return Boolean(
    column.isSystem ||
      column.source === "system" ||
      isNamespacedSystemColumnKey(column.key),
  );
}

/**
 * Runtime list API sort parameter (entity columns + catalog field keys).
 *
 * @param {string | null | undefined} columnOrSortField
 * @returns {string}
 */
export function systemColumnKeyToRuntimeSortField(columnOrSortField) {
  const normalized = normalizeSystemColumnKey(columnOrSortField);

  switch (normalized) {
    case SYSTEM_COLUMN_KEYS.created_at:
      return "created_at";
    case SYSTEM_COLUMN_KEYS.updated_at:
      return "updated_at";
    default:
      return String(columnOrSortField || "").trim();
  }
}

/**
 * UI sort state field aligned with table column keys.
 *
 * @param {string | null | undefined} sortField
 * @param {import("./contracts").ViewEngineColumn[]} [columns]
 * @returns {string}
 */
export function normalizeSortFieldForTableColumns(sortField, columns = []) {
  const raw = String(sortField || "").trim();

  if (!raw) {
    return "";
  }

  const namespaced = normalizeSystemColumnKey(raw);
  const columnList = Array.isArray(columns) ? columns : [];
  const hasColumn = (key) => columnList.some((column) => column?.key === key);

  if (hasColumn(namespaced)) {
    return namespaced;
  }

  if (hasColumn(raw)) {
    return raw;
  }

  if (raw === "created_at" && hasColumn(SYSTEM_COLUMN_KEYS.created_at)) {
    return SYSTEM_COLUMN_KEYS.created_at;
  }

  if (raw === "updated_at" && hasColumn(SYSTEM_COLUMN_KEYS.updated_at)) {
    return SYSTEM_COLUMN_KEYS.updated_at;
  }

  return raw;
}

/**
 * @param {string | null | undefined} columnKey
 * @param {string | null | undefined} sortField
 * @returns {boolean}
 */
export function columnMatchesSortField(columnKey, sortField) {
  const column = String(columnKey || "").trim();
  const sort = String(sortField || "").trim();

  if (!column || !sort) {
    return false;
  }

  if (column === sort) {
    return true;
  }

  return normalizeSystemColumnKey(column) === normalizeSystemColumnKey(sort);
}
