import {
  isHierarchyRelationFieldForTable,
  listHierarchySubtaskRelationKeys,
} from "../../../shared/relation/hierarchyRelationProfile";
import {
  excludeTableDedicatedRecordNumberFieldKeys,
  isRuntimeSystemFieldKey,
  isTableDedicatedRecordNumberFieldKey,
  TABLE_PROJECTION_SYSTEM_FIELD_ORDER,
} from "../../../shared/runtime/systemEntityFields";
import {
  findCatalogObjectType,
  getObjectTypeFields,
} from "../table/services/adapters/ObjectTypeTableAdapter";

/**
 * @param {Record<string, unknown> | null | undefined} catalog
 * @param {string | null | undefined} objectTypeKey
 */
function resolveCatalogRelations(catalog, objectTypeKey) {
  const fromRoot = Array.isArray(catalog?.relations) ? catalog.relations : [];
  const objectType = findCatalogObjectType(catalog, objectTypeKey);
  const fromType = Array.isArray(objectType?.relations) ? objectType.relations : [];

  return [...fromRoot, ...fromType];
}

/**
 * @param {Record<string, unknown> | null | undefined} catalog
 * @param {string | null | undefined} objectTypeKey
 */
function catalogWithRelationsForLookup(catalog, objectTypeKey) {
  if (!catalog || typeof catalog !== "object") {
    return catalog;
  }

  const relations = resolveCatalogRelations(catalog, objectTypeKey);

  if (!relations.length) {
    return catalog;
  }

  return {
    ...catalog,
    relations,
  };
}

/**
 * Published system fields for table projection/settings (excludes hierarchy relations).
 *
 * @param {Record<string, unknown> | null | undefined} catalog
 * @param {string | null | undefined} objectTypeKey
 * @returns {string[]}
 */
export function listCatalogSystemFieldKeysForTable(catalog, objectTypeKey) {
  const objectType = findCatalogObjectType(catalog, objectTypeKey);
  const fields = getObjectTypeFields(objectType);
  const catalogForLookup = catalogWithRelationsForLookup(catalog, objectTypeKey);
  const hierarchyRelationKeys = listHierarchySubtaskRelationKeys(
    resolveCatalogRelations(catalog, objectTypeKey),
    objectTypeKey,
  );
  const discovered = [];

  for (const field of fields) {
    if (!field || typeof field !== "object") {
      continue;
    }

    const key = String(field.key || "").trim();

    if (!key) {
      continue;
    }

    const isSystem =
      field.is_system === true ||
      field.isSystem === true ||
      isRuntimeSystemFieldKey(key);

    if (!isSystem) {
      continue;
    }

    if (isTableDedicatedRecordNumberFieldKey(key)) {
      continue;
    }

    if (hierarchyRelationKeys.has(key)) {
      continue;
    }

    if (isHierarchyRelationFieldForTable(field, catalogForLookup, objectTypeKey)) {
      continue;
    }

    discovered.push(key);
  }

  const discoveredSet = new Set(discovered);
  const ordered = [];

  for (const systemKey of TABLE_PROJECTION_SYSTEM_FIELD_ORDER) {
    if (discoveredSet.has(systemKey)) {
      ordered.push(systemKey);
    }
  }

  for (const key of discovered) {
    if (!ordered.includes(key)) {
      ordered.push(key);
    }
  }

  return ordered;
}

/**
 * Appends missing system keys after user/catalog fields (canonical system order).
 *
 * @param {string[]} fieldKeys
 * @param {string[]} systemFieldKeys
 * @returns {string[]}
 */
export function mergeTableProjectionWithSystemFields(fieldKeys, systemFieldKeys) {
  const base = excludeTableDedicatedRecordNumberFieldKeys(dedupeFieldKeys(fieldKeys));
  const baseSet = new Set(base);
  const systemKeys = excludeTableDedicatedRecordNumberFieldKeys(
    dedupeFieldKeys(systemFieldKeys),
  );
  const toAppend = [];

  for (const key of systemKeys) {
    if (!baseSet.has(key)) {
      toAppend.push(key);
    }
  }

  return [...base, ...toAppend];
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
