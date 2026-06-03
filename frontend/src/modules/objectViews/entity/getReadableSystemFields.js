import { catalogFieldToFieldDef } from "../table/services/adapters/catalogFieldToFieldDef";
import { findCatalogObjectType } from "../table/services/adapters/ObjectTypeTableAdapter";
import { isRuntimeSystemFieldKey } from "../../../shared/runtime/systemEntityFields";

/**
 * Published system fields for read-only display (card, details).
 *
 * @param {Record<string, unknown> | null | undefined} catalog
 * @param {string | null | undefined} objectTypeKey
 */
export function getReadableSystemFields(catalog, objectTypeKey) {
  const objectType = findCatalogObjectType(catalog, objectTypeKey);

  if (!objectType) {
    return [];
  }

  const fields = Array.isArray(objectType.fields) ? objectType.fields : [];

  return fields
    .filter((field) => {
      if (!field || typeof field !== "object") {
        return false;
      }

      return (
        field.is_system === true ||
        field.isSystem === true ||
        isRuntimeSystemFieldKey(field.key)
      );
    })
    .map((field) => {
      const fieldDef = catalogFieldToFieldDef(field);

      if (!fieldDef) {
        return null;
      }

      return {
        ...fieldDef,
        rawFieldType: String(field.field_type || field.type || fieldDef.type),
        readOnly: true,
      };
    })
    .filter(Boolean);
}
