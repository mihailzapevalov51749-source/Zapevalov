/**
 * Canonical runtime system field keys (published catalog + entity values).
 */

export const SYSTEM_ENTITY_FIELD_KEY_PREFIX = "__system_";

export const SYSTEM_ENTITY_FIELD_KEYS = {
  id: `${SYSTEM_ENTITY_FIELD_KEY_PREFIX}id`,
  isSystem: `${SYSTEM_ENTITY_FIELD_KEY_PREFIX}is_system`,
  recordNumber: `${SYSTEM_ENTITY_FIELD_KEY_PREFIX}record_number`,
  createdBy: `${SYSTEM_ENTITY_FIELD_KEY_PREFIX}created_by`,
  createdAt: `${SYSTEM_ENTITY_FIELD_KEY_PREFIX}created_at`,
  updatedBy: `${SYSTEM_ENTITY_FIELD_KEY_PREFIX}updated_by`,
  updatedAt: `${SYSTEM_ENTITY_FIELD_KEY_PREFIX}updated_at`,
  recordVersion: `${SYSTEM_ENTITY_FIELD_KEY_PREFIX}record_version`,
};

/** Order for «Все» base table state — after all user fields. */
export const SYSTEM_ENTITY_FIELD_ORDER = [
  SYSTEM_ENTITY_FIELD_KEYS.recordNumber,
  SYSTEM_ENTITY_FIELD_KEYS.recordVersion,
  SYSTEM_ENTITY_FIELD_KEYS.createdBy,
  SYSTEM_ENTITY_FIELD_KEYS.createdAt,
  SYSTEM_ENTITY_FIELD_KEYS.updatedBy,
  SYSTEM_ENTITY_FIELD_KEYS.updatedAt,
  SYSTEM_ENTITY_FIELD_KEYS.id,
];

/**
 * Permanent record number is rendered by ViewEngineTable prefix column «№».
 * Exclude it from table projection / column settings to avoid duplicate «№ записи».
 */
export const TABLE_DEDICATED_RECORD_NUMBER_FIELD_KEY =
  SYSTEM_ENTITY_FIELD_KEYS.recordNumber;

export const TABLE_PROJECTION_SYSTEM_FIELD_ORDER = SYSTEM_ENTITY_FIELD_ORDER.filter(
  (key) => key !== TABLE_DEDICATED_RECORD_NUMBER_FIELD_KEY,
);

/**
 * @param {string | null | undefined} key
 * @returns {boolean}
 */
export function isTableDedicatedRecordNumberFieldKey(key) {
  const normalized = String(key || "").trim();

  return (
    normalized === TABLE_DEDICATED_RECORD_NUMBER_FIELD_KEY ||
    normalized === "record_number"
  );
}

/**
 * @param {string[]} keys
 * @returns {string[]}
 */
export function excludeTableDedicatedRecordNumberFieldKeys(keys) {
  return (Array.isArray(keys) ? keys : []).filter(
    (key) => !isTableDedicatedRecordNumberFieldKey(key),
  );
}

/**
 * Presentation-only field for Object Table column «№» (not a catalog / API projection field).
 */
export const TABLE_ROW_NUMBER_PRESENTATION_FIELD_KEY = "__table_row_number";

export const TABLE_ROW_NUMBER_PRESENTATION_LABEL = "№";

/**
 * @param {string | null | undefined} key
 * @returns {boolean}
 */
export function isTableRowNumberPresentationFieldKey(key) {
  return String(key || "").trim() === TABLE_ROW_NUMBER_PRESENTATION_FIELD_KEY;
}

/**
 * @param {string[]} keys
 * @returns {{ rowNumberIncluded: boolean, keys: string[] }}
 */
export function peelTableRowNumberPresentationFieldKey(keys) {
  const list = Array.isArray(keys) ? keys : [];
  const rowNumberIncluded = list.some(isTableRowNumberPresentationFieldKey);

  return {
    rowNumberIncluded,
    keys: list.filter((key) => !isTableRowNumberPresentationFieldKey(key)),
  };
}

/**
 * Ensures «№» is registered in view settings (default: first column).
 *
 * @param {string[]} keys
 * @param {{ prependIfMissing?: boolean }} [options]
 * @returns {string[]}
 */
export function ensureTableRowNumberPresentationFieldKey(
  keys,
  options = { prependIfMissing: true },
) {
  const deduped = dedupePresentationFieldKeys(
    excludeTableDedicatedRecordNumberFieldKeys(keys),
  );
  const hasRowNumber = deduped.some(isTableRowNumberPresentationFieldKey);

  if (hasRowNumber) {
    return deduped;
  }

  if (options.prependIfMissing === false) {
    return deduped;
  }

  return [TABLE_ROW_NUMBER_PRESENTATION_FIELD_KEY, ...deduped];
}

/**
 * @param {string[]} keys
 * @returns {string[]}
 */
function dedupePresentationFieldKeys(keys) {
  const seen = new Set();
  const result = [];

  for (const key of keys) {
    const normalized = String(key || "").trim();

    if (!normalized || seen.has(normalized)) {
      continue;
    }

    seen.add(normalized);
    result.push(normalized);
  }

  return result;
}

/**
 * @param {string | null | undefined} key
 */
export function isRuntimeSystemFieldKey(key) {
  const normalized = String(key || "").trim();

  if (!normalized) {
    return false;
  }

  if (normalized.startsWith(SYSTEM_ENTITY_FIELD_KEY_PREFIX)) {
    return true;
  }

  return (
    normalized === "id" ||
    normalized === "created_by" ||
    normalized === "created_at" ||
    normalized === "updated_by" ||
    normalized === "updated_at" ||
    normalized === "version" ||
    normalized === "record_version" ||
    normalized === "record_number"
  );
}

/**
 * @param {Array<Record<string, unknown>> | null | undefined} fields
 */
export function partitionCatalogFields(fields) {
  const userFields = [];
  const systemFields = [];

  for (const field of Array.isArray(fields) ? fields : []) {
    if (!field || typeof field !== "object") {
      continue;
    }

    const key = String(field.key || "").trim();

    if (!key) {
      continue;
    }

    if (field.is_system === true || field.isSystem === true || isRuntimeSystemFieldKey(key)) {
      systemFields.push(field);
      continue;
    }

    userFields.push(field);
  }

  return { userFields, systemFields };
}

/**
 * User fields in catalog order, then canonical system fields for «Все».
 *
 * @param {Array<Record<string, unknown>> | null | undefined} fields
 * @param {string | null | undefined} [titleFieldKey]
 * @returns {string[]}
 */
export function orderUserThenSystemFieldKeys(fields, titleFieldKey = null) {
  const { userFields, systemFields } = partitionCatalogFields(fields);
  const systemByKey = new Map(
    systemFields.map((field) => [String(field.key || "").trim(), field]),
  );

  const orderedSystemKeys = [];

  for (const key of TABLE_PROJECTION_SYSTEM_FIELD_ORDER) {
    if (systemByKey.has(key)) {
      orderedSystemKeys.push(key);
    }
  }

  for (const field of systemFields) {
    const key = String(field.key || "").trim();

    if (
      key &&
      !isTableDedicatedRecordNumberFieldKey(key) &&
      !orderedSystemKeys.includes(key)
    ) {
      orderedSystemKeys.push(key);
    }
  }

  const userKeys = [];
  const seen = new Set();
  const pinnedTitle = String(titleFieldKey || "").trim();

  if (
    pinnedTitle &&
    userFields.some((field) => String(field.key || "").trim() === pinnedTitle)
  ) {
    seen.add(pinnedTitle);
    userKeys.push(pinnedTitle);
  }

  for (const field of userFields) {
    const key = String(field.key || "").trim();

    if (!key || seen.has(key)) {
      continue;
    }

    seen.add(key);
    userKeys.push(key);
  }

  return [...userKeys, ...orderedSystemKeys];
}
