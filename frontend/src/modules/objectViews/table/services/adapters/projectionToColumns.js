import {
  SYSTEM_COLUMN_KEYS,
  VIEW_ENGINE_SYSTEM_COLUMN_KEYS,
} from "../../../../../shared/viewEngine/systemColumnKeys";

import { normalizeTableDisplayFieldKeys } from "../../../services/tableColumnOrder";

import { catalogFieldToFieldDef } from "./catalogFieldToFieldDef";

/** @type {import("../../../../../shared/viewEngine/contracts").ViewEngineColumn[]} */
const DEFAULT_SYSTEM_COLUMNS = [
  {
    key: SYSTEM_COLUMN_KEYS.id,
    label: "ID",
    type: "text",
    fieldDef: null,
    source: "system",
    visible: true,
    sortable: false,
    isSystem: true,
    isTitle: false,
    width: 280,
  },
  {
    key: SYSTEM_COLUMN_KEYS.status,
    label: "Статус записи",
    type: "text",
    fieldDef: null,
    source: "system",
    visible: false,
    sortable: false,
    isSystem: true,
    isTitle: false,
    width: 140,
  },
  {
    key: SYSTEM_COLUMN_KEYS.createdAt,
    label: "Дата создания",
    type: "datetime",
    fieldDef: null,
    source: "system",
    visible: true,
    sortable: true,
    isSystem: true,
    isTitle: false,
    width: 180,
  },
];

/**
 * @param {import("../../../../../shared/viewEngine/contracts").ViewEngineProjection | null | undefined} projection
 * @param {string[]} fallbackFieldKeys
 * @returns {string[]}
 */
export function resolveProjectionFieldKeys(projection, fallbackFieldKeys = []) {
  const fieldOrder = projection?.field_order;
  const visibleFields = projection?.visible_fields;

  if (Array.isArray(fieldOrder) && fieldOrder.length) {
    return dedupeFieldKeys(fieldOrder);
  }

  if (Array.isArray(visibleFields) && visibleFields.length) {
    return dedupeFieldKeys(visibleFields);
  }

  return dedupeFieldKeys(fallbackFieldKeys);
}

/**
 * @param {string[]} keys
 * @returns {string[]}
 */
function dedupeFieldKeys(keys) {
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
 * @param {{
 *   projection?: import("../../../../../shared/viewEngine/contracts").ViewEngineProjection | null,
 *   fields?: Array<Record<string, unknown>>,
 *   options?: {
 *     includeSystemColumns?: boolean,
 *     systemColumnKeys?: string[],
 *     titleFieldKey?: string | null,
 *     isAllMode?: boolean,
 *   },
 * }} params
 */
export function projectionToColumns({
  projection = null,
  fields = [],
  options = {},
}) {
  const {
    includeSystemColumns = false,
    systemColumnKeys = VIEW_ENGINE_SYSTEM_COLUMN_KEYS,
    titleFieldKey: titleFieldOverride = undefined,
    isAllMode = false,
  } = options;

  const fieldList = Array.isArray(fields) ? fields : [];
  const fieldByKey = new Map();

  for (const field of fieldList) {
    const key = String(field?.key || "").trim();

    if (key) {
      fieldByKey.set(key, field);
    }
  }

  const fallbackKeys = fieldList
    .map((field) => String(field?.key || "").trim())
    .filter(Boolean);

  const titleFieldKey =
    titleFieldOverride !== undefined
      ? titleFieldOverride
      : typeof projection?.title_field === "string"
        ? projection.title_field
        : null;

  const orderedKeys = normalizeTableDisplayFieldKeys(
    resolveProjectionFieldKeys(projection, fallbackKeys),
    {
      titleFieldKey,
      isAllMode,
    },
  );

  const resolvedTitleFieldKey =
    titleFieldKey ||
    (typeof projection?.title_field === "string" ? projection.title_field : null) ||
    orderedKeys.find((key) => !key.startsWith("__system_")) ||
    orderedKeys[0] ||
    null;

  /** @type {import("../../../../../shared/viewEngine/contracts").ViewEngineColumn[]} */
  const columns = [];

  if (includeSystemColumns) {
    const allowedSystemKeys = new Set(
      (systemColumnKeys || VIEW_ENGINE_SYSTEM_COLUMN_KEYS).map(String),
    );

    for (const systemColumn of DEFAULT_SYSTEM_COLUMNS) {
      if (allowedSystemKeys.has(systemColumn.key)) {
        columns.push({ ...systemColumn });
      }
    }
  }

  for (const fieldKey of orderedKeys) {
    const catalogField = fieldByKey.get(fieldKey);
    const fieldDef = catalogFieldToFieldDef(catalogField);

    if (!fieldDef) {
      continue;
    }

    columns.push({
      key: fieldDef.key,
      label: fieldDef.label,
      type: fieldDef.type,
      fieldDef,
      source: fieldDef.isSystem ? "system" : "field",
      visible: true,
      sortable:
        fieldDef.key === SYSTEM_COLUMN_KEYS.id ? false : true,
      isSystem: Boolean(fieldDef.isSystem),
      isTitle: resolvedTitleFieldKey === fieldDef.key,
      width: fieldDef.isSystem && fieldDef.key === SYSTEM_COLUMN_KEYS.id ? 280 : undefined,
    });
  }

  return columns;
}
