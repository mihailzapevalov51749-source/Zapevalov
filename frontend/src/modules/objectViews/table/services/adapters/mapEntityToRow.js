import {
  SYSTEM_COLUMN_KEYS,
  isViewEngineSystemColumn,
  normalizeSystemColumnKey,
} from "../../../../../shared/viewEngine/systemColumnKeys";

/**
 * @param {Record<string, unknown>} entity
 * @param {string} systemKey
 * @returns {unknown}
 */
function resolveSystemEntityValue(entity, systemKey) {
  switch (systemKey) {
    case SYSTEM_COLUMN_KEYS.id:
      return entity.id ?? entity.entity_id ?? null;
    case SYSTEM_COLUMN_KEYS.status:
      return entity.status ?? null;
    case SYSTEM_COLUMN_KEYS.created_at:
      return entity.created_at ?? entity.createdAt ?? null;
    case SYSTEM_COLUMN_KEYS.updated_at:
      return entity.updated_at ?? entity.updatedAt ?? null;
    default:
      return null;
  }
}

/**
 * @param {Record<string, unknown>} entity
 * @param {import("../../../../../shared/viewEngine/contracts").ViewEngineColumn} column
 * @returns {unknown}
 */
export function resolveEntityCellValue(entity, column) {
  if (!entity || !column) {
    return null;
  }

  if (isViewEngineSystemColumn(column)) {
    return resolveSystemEntityValue(
      entity,
      normalizeSystemColumnKey(column.key),
    );
  }

  const values =
    entity.values && typeof entity.values === "object" ? entity.values : {};

  return values[column.key] ?? null;
}

/**
 * @param {Record<string, unknown>} entity
 * @param {import("../../../../../shared/viewEngine/contracts").ViewEngineColumn[]} columns
 * @returns {import("../../../../../shared/viewEngine/contracts").ViewEngineRow}
 */
export function mapEntityToRow(entity, columns) {
  const safeEntity = entity && typeof entity === "object" ? entity : {};
  const id = String(safeEntity.id ?? safeEntity.entity_id ?? "");

  /** @type {import("../../../../../shared/viewEngine/contracts").ViewEngineCell[]} */
  const cells = (Array.isArray(columns) ? columns : []).map((column) => ({
    fieldKey: column.key,
    value: resolveEntityCellValue(safeEntity, column),
    fieldDef: column.fieldDef ?? null,
  }));

  return {
    id,
    status:
      typeof safeEntity.status === "string" ? safeEntity.status : null,
    createdAt: normalizeIsoTimestamp(
      safeEntity.created_at ?? safeEntity.createdAt,
    ),
    updatedAt: normalizeIsoTimestamp(
      safeEntity.updated_at ?? safeEntity.updatedAt,
    ),
    cells,
  };
}

/**
 * @param {Array<Record<string, unknown>> | null | undefined} entities
 * @param {import("../../../../../shared/viewEngine/contracts").ViewEngineColumn[]} columns
 * @returns {import("../../../../../shared/viewEngine/contracts").ViewEngineRow[]}
 */
export function mapEntitiesToRows(entities, columns) {
  if (!Array.isArray(entities)) {
    return [];
  }

  return entities.map((entity) => mapEntityToRow(entity, columns));
}

/**
 * @param {unknown} value
 * @returns {string | null}
 */
function normalizeIsoTimestamp(value) {
  if (value == null || value === "") {
    return null;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  return String(value);
}
