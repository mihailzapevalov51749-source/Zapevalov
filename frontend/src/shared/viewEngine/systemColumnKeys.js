/**
 * Namespaced keys for entity system columns in View Engine tables.
 * User-defined fields (e.g. task "status") keep their catalog keys unchanged.
 */

import { SYSTEM_ENTITY_FIELD_KEYS } from "../runtime/systemEntityFields";

export const SYSTEM_COLUMN_KEY_PREFIX = "__system_";

export const SYSTEM_COLUMN_KEYS = {
  id: SYSTEM_ENTITY_FIELD_KEYS.id,
  status: `${SYSTEM_COLUMN_KEY_PREFIX}status`,
  createdBy: SYSTEM_ENTITY_FIELD_KEYS.createdBy,
  createdAt: SYSTEM_ENTITY_FIELD_KEYS.createdAt,
  updatedBy: SYSTEM_ENTITY_FIELD_KEYS.updatedBy,
  updatedAt: SYSTEM_ENTITY_FIELD_KEYS.updatedAt,
  recordVersion: SYSTEM_ENTITY_FIELD_KEYS.recordVersion,
  /** @deprecated use createdAt */
  created_at: SYSTEM_ENTITY_FIELD_KEYS.createdAt,
  /** @deprecated use updatedAt */
  updated_at: SYSTEM_ENTITY_FIELD_KEYS.updatedAt,
};

/** Legacy prepend list — prefer catalog/system fields in projection order. */
export const VIEW_ENGINE_SYSTEM_COLUMN_KEYS = [
  SYSTEM_COLUMN_KEYS.id,
  SYSTEM_COLUMN_KEYS.createdAt,
];

const LEGACY_SYSTEM_KEY_TO_NAMESPACED = {
  id: SYSTEM_COLUMN_KEYS.id,
  status: SYSTEM_COLUMN_KEYS.status,
  created_by: SYSTEM_COLUMN_KEYS.createdBy,
  created_at: SYSTEM_COLUMN_KEYS.createdAt,
  updated_by: SYSTEM_COLUMN_KEYS.updatedBy,
  updated_at: SYSTEM_COLUMN_KEYS.updatedAt,
  version: SYSTEM_COLUMN_KEYS.recordVersion,
  record_version: SYSTEM_COLUMN_KEYS.recordVersion,
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
    case SYSTEM_COLUMN_KEYS.createdAt:
      return "created_at";
    case SYSTEM_COLUMN_KEYS.updatedAt:
      return "updated_at";
    case SYSTEM_COLUMN_KEYS.createdBy:
      return "created_by";
    case SYSTEM_COLUMN_KEYS.updatedBy:
      return "updated_by";
    case SYSTEM_COLUMN_KEYS.recordVersion:
      return "record_version";
    case SYSTEM_COLUMN_KEYS.id:
      return "id";
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

  if (raw === "created_at" && hasColumn(SYSTEM_COLUMN_KEYS.createdAt)) {
    return SYSTEM_COLUMN_KEYS.createdAt;
  }

  if (raw === "updated_at" && hasColumn(SYSTEM_COLUMN_KEYS.updatedAt)) {
    return SYSTEM_COLUMN_KEYS.updatedAt;
  }

  if (raw === "created_by" && hasColumn(SYSTEM_COLUMN_KEYS.createdBy)) {
    return SYSTEM_COLUMN_KEYS.createdBy;
  }

  if (raw === "updated_by" && hasColumn(SYSTEM_COLUMN_KEYS.updatedBy)) {
    return SYSTEM_COLUMN_KEYS.updatedBy;
  }

  if (raw === "record_version" && hasColumn(SYSTEM_COLUMN_KEYS.recordVersion)) {
    return SYSTEM_COLUMN_KEYS.recordVersion;
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
