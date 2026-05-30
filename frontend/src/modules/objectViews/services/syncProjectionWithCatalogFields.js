import {
  OBJECT_VIEW_SYSTEM_FIELD_KEYS,
  normalizePresentationTable,
} from "./contractGuards";
import {
  findCatalogObjectType,
  getObjectTypeFields,
} from "../table/services/adapters/ObjectTypeTableAdapter";

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
 * @param {Record<string, unknown> | null | undefined} field
 */
export function isCatalogFieldEligibleForProjection(field) {
  if (!field || typeof field !== "object") {
    return false;
  }

  const key = String(field.key || "").trim();

  if (!key) {
    return false;
  }

  if (field.is_system === true || field.isSystem === true) {
    return false;
  }

  if (OBJECT_VIEW_SYSTEM_FIELD_KEYS.has(key)) {
    return false;
  }

  if (
    field.readonly === true ||
    field.is_readonly === true ||
    field.isReadonly === true
  ) {
    return false;
  }

  if (
    field.computed === true ||
    field.is_computed === true ||
    field.isComputed === true
  ) {
    return false;
  }

  const settings =
    field.settings_json && typeof field.settings_json === "object"
      ? field.settings_json
      : field.settings && typeof field.settings === "object"
        ? field.settings
        : {};

  if (settings.readonly === true || settings.computed === true) {
    return false;
  }

  return true;
}

/**
 * @param {Record<string, unknown> | null | undefined} catalog
 * @param {string | null | undefined} objectTypeKey
 * @returns {Array<Record<string, unknown>>}
 */
export function getCatalogFieldsForProjection(catalog, objectTypeKey) {
  const objectType = findCatalogObjectType(catalog, objectTypeKey);
  return getObjectTypeFields(objectType);
}

/**
 * Merge stored projection with current catalog field definitions.
 * Preserves existing keys/order; appends new catalog fields at the end.
 *
 * @param {{
 *   fieldKeys?: string[],
 *   fieldOrder?: string[],
 *   titleFieldKey?: string | null,
 * }} projection
 * @param {Array<Record<string, unknown>>} catalogFields
 */
export function mergeProjectionWithCatalogFields(projection, catalogFields) {
  const source = projection && typeof projection === "object" ? projection : {};

  const existingOrder = dedupeFieldKeys([
    ...(Array.isArray(source.fieldOrder) ? source.fieldOrder : []),
    ...(Array.isArray(source.fieldKeys) ? source.fieldKeys : []),
  ]);

  const existingSet = new Set(existingOrder);

  const catalogKeysInOrder = [];

  for (const field of catalogFields) {
    if (!isCatalogFieldEligibleForProjection(field)) {
      continue;
    }

    const key = String(field.key || "").trim();
    catalogKeysInOrder.push(key);
  }

  const newKeys = catalogKeysInOrder.filter((key) => !existingSet.has(key));
  const fieldKeys = dedupeFieldKeys([...existingOrder, ...newKeys]);
  const fieldOrder = [...fieldKeys];

  let titleFieldKey =
    typeof source.titleFieldKey === "string" && source.titleFieldKey.trim()
      ? source.titleFieldKey.trim()
      : null;

  if (!titleFieldKey || !fieldKeys.includes(titleFieldKey)) {
    titleFieldKey =
      fieldKeys.find((key) => !OBJECT_VIEW_SYSTEM_FIELD_KEYS.has(key)) ||
      fieldKeys[0] ||
      null;
  }

  return {
    fieldKeys,
    fieldOrder,
    titleFieldKey,
  };
}

/**
 * @param {string[]} columnOrder
 * @param {string[]} fieldKeys
 */
function mergeColumnOrderWithNewKeys(columnOrder, fieldKeys) {
  const order = Array.isArray(columnOrder) ? [...columnOrder] : [];
  const seen = new Set(order.map((key) => String(key || "").trim()).filter(Boolean));

  for (const key of fieldKeys) {
    const normalized = String(key || "").trim();

    if (!normalized || seen.has(normalized)) {
      continue;
    }

    seen.add(normalized);
    order.push(normalized);
  }

  return order;
}

/**
 * Runtime guard: align ObjectViewContract projection with published catalog fields.
 *
 * @param {import('./objectViewContract').ObjectViewContract | null | undefined} contract
 * @param {Record<string, unknown> | null | undefined} catalog
 * @param {string | null | undefined} objectTypeKey
 */
export function syncObjectViewContractWithCatalog(
  contract,
  catalog,
  objectTypeKey,
) {
  if (!contract) {
    return contract;
  }

  const catalogFields = getCatalogFieldsForProjection(catalog, objectTypeKey);

  if (!catalogFields.length) {
    return contract;
  }

  const syncedProjection = mergeProjectionWithCatalogFields(
    contract.projection,
    catalogFields,
  );

  const previousKeys = contract.projection?.fieldKeys || [];
  const nextKeys = syncedProjection.fieldKeys || [];

  const keysUnchanged =
    previousKeys.length === nextKeys.length &&
    previousKeys.every((key, index) => key === nextKeys[index]);

  if (keysUnchanged) {
    return contract;
  }

  const table = contract.presentation?.table || {};

  const presentationTable = normalizePresentationTable(
    {
      ...table,
      columnOrder: mergeColumnOrderWithNewKeys(
        table.columnOrder,
        syncedProjection.fieldKeys,
      ),
    },
    syncedProjection.fieldKeys,
  );

  return {
    ...contract,
    projection: syncedProjection,
    presentation: {
      ...contract.presentation,
      table: presentationTable,
      card: contract.presentation?.card ?? null,
    },
  };
}
