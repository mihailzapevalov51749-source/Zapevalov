import { isHierarchyRelationField } from "../../../shared/relation/hierarchyRelationProfile.js";
import {
  findCatalogObjectType,
  getObjectTypeFields,
} from "../table/services/adapters/ObjectTypeTableAdapter.js";

/**
 * @param {Record<string, unknown> | null | undefined} catalog
 * @param {string | null | undefined} objectTypeKey
 * @param {string | null | undefined} fieldKey
 */
export function findCatalogFieldByKey(catalog, objectTypeKey, fieldKey) {
  const normalizedKey = String(fieldKey || "").trim();

  if (!normalizedKey) {
    return null;
  }

  const objectType = findCatalogObjectType(catalog, objectTypeKey);
  const fields = getObjectTypeFields(objectType);

  return (
    fields.find((field) => String(field?.key || "").trim() === normalizedKey) ||
    null
  );
}

/**
 * @param {string | null | undefined} fieldKey
 * @param {Record<string, unknown> | null | undefined} catalog
 * @param {string | null | undefined} objectTypeKey
 */
export function isHierarchyRelationFieldKey(fieldKey, catalog, objectTypeKey) {
  const field = findCatalogFieldByKey(catalog, objectTypeKey, fieldKey);

  if (!field) {
    return false;
  }

  return isHierarchyRelationField(field, catalog, objectTypeKey);
}

/**
 * Removes hierarchy relation field keys from projection/column order (saved views included).
 *
 * @param {string[]} fieldKeys
 * @param {Record<string, unknown> | null | undefined} catalog
 * @param {string | null | undefined} objectTypeKey
 */
export function excludeHierarchyRelationFieldKeys(
  fieldKeys = [],
  catalog = null,
  objectTypeKey = null,
) {
  return (Array.isArray(fieldKeys) ? fieldKeys : []).filter((key) => {
    const normalized = String(key || "").trim();

    if (!normalized) {
      return false;
    }

    return !isHierarchyRelationFieldKey(normalized, catalog, objectTypeKey);
  });
}

/**
 * @param {Array<Record<string, unknown>> | null | undefined} fields
 * @param {Record<string, unknown> | null | undefined} catalog
 * @param {string | null | undefined} objectTypeKey
 */
export function excludeHierarchyRelationFields(
  fields = [],
  catalog = null,
  objectTypeKey = null,
) {
  return (Array.isArray(fields) ? fields : []).filter(
    (field) => !isHierarchyRelationField(field, catalog, objectTypeKey),
  );
}
