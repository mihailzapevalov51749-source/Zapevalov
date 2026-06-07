import { resolveEntityTitleFieldKey } from "../../objectEntities/services/resolveEntityDisplayTitle.js";
import { findCatalogObjectType } from "../table/services/adapters/ObjectTypeTableAdapter.js";

/**
 * @param {import('../services/objectViewContract').ObjectViewContract | null | undefined} contract
 * @returns {string | null}
 */
export function resolvePlanTitleFieldKey(contract) {
  return resolveEntityTitleFieldKey({
    projection: contract?.projection,
    catalog: null,
    objectTypeKey: null,
    titleFieldKey: contract?.projection?.titleFieldKey,
  });
}

/**
 * First status-type field in projection.fieldKeys order.
 *
 * @param {Record<string, unknown> | null | undefined} catalog
 * @param {string | null | undefined} objectTypeKey
 * @param {import('../services/objectViewContract').ObjectViewProjection | null | undefined} projection
 * @returns {string | null}
 */
export function resolvePlanStatusFieldKeyFromProjection(
  catalog,
  objectTypeKey,
  projection,
) {
  const fieldKeys = Array.isArray(projection?.fieldKeys)
    ? projection.fieldKeys.map((key) => String(key || "").trim()).filter(Boolean)
    : [];

  if (!fieldKeys.length) {
    return null;
  }

  const objectType = findCatalogObjectType(catalog, objectTypeKey);
  const fields = Array.isArray(objectType?.fields) ? objectType.fields : [];

  for (const key of fieldKeys) {
    const field = fields.find((item) => String(item?.key ?? "").trim() === key);

    if (!field) {
      continue;
    }

    const fieldType = String(field.field_type || field.type || "")
      .trim()
      .toLowerCase();

    if (fieldType === "status") {
      return key;
    }
  }

  for (const key of fieldKeys) {
    if (/status|статус|state|состояние/i.test(key)) {
      return key;
    }
  }

  return null;
}

/**
 * @param {import('../services/objectViewContract').ObjectViewProjection | null | undefined} projection
 * @returns {string[]}
 */
export function resolvePlanInfoFieldKeys(projection) {
  if (projection && Array.isArray(projection.infoFieldKeys)) {
    const fieldKeySet = new Set(
      (projection?.fieldKeys || []).map((key) => String(key || "").trim()).filter(Boolean),
    );

    return projection.infoFieldKeys
      .map((key) => String(key || "").trim())
      .filter((key) => key && fieldKeySet.has(key));
  }

  const titleKey = String(projection?.titleFieldKey || "").trim();
  const fieldKeys = Array.isArray(projection?.fieldKeys)
    ? projection.fieldKeys.map((key) => String(key || "").trim()).filter(Boolean)
    : [];

  return fieldKeys.filter((key) => key && key !== titleKey);
}
