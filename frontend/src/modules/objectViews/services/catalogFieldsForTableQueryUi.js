import { isRelationFieldType } from "../../designer/components/fields/relationFieldFormUtils";

/**
 * Catalog fields eligible for table filter/sort UI (relation excluded on table stage).
 *
 * @param {Array<Record<string, unknown>>} fields
 */
export function filterCatalogFieldsForTableQueryUi(fields = []) {
  return (Array.isArray(fields) ? fields : []).filter((field) => {
    const rawType = String(field?.field_type || field?.type || "")
      .trim()
      .toLowerCase();

    return !isRelationFieldType(rawType);
  });
}

/**
 * @param {Record<string, unknown> | null | undefined} catalog
 * @param {string | null | undefined} objectTypeKey
 * @param {import("../table/services/adapters/ObjectTypeTableAdapter").findCatalogObjectType} findObjectType
 * @param {Function} getFields
 */
export function buildTableQueryFieldOptions({
  catalog,
  objectTypeKey,
  projectionFieldKeys = [],
  findObjectType,
  getFields,
}) {
  const objectType = findObjectType(catalog, objectTypeKey);
  const fields = filterCatalogFieldsForTableQueryUi(getFields(objectType));
  const byKey = new Map();

  for (const field of fields) {
    const key = String(field?.key || "").trim();

    if (!key) {
      continue;
    }

    byKey.set(key, {
      key,
      label: String(field?.name || field?.label || key),
    });
  }

  const catalogFieldsByKey = new Map(
    (Array.isArray(getFields(objectType)) ? getFields(objectType) : []).map((field) => [
      String(field?.key || "").trim(),
      field,
    ]),
  );

  for (const key of projectionFieldKeys) {
    const normalized = String(key || "").trim();

    if (!normalized || byKey.has(normalized)) {
      continue;
    }

    const catalogField = catalogFieldsByKey.get(normalized);
    const rawType = String(
      catalogField?.field_type || catalogField?.type || "",
    )
      .trim()
      .toLowerCase();

    if (isRelationFieldType(rawType)) {
      continue;
    }

    byKey.set(normalized, { key: normalized, label: normalized });
  }

  return Array.from(byKey.values()).sort((a, b) =>
    a.label.localeCompare(b.label, "ru"),
  );
}
