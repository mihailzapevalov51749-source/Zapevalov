import { catalogFieldToFieldDef } from "../../../../modules/objectViews/table/services/adapters/catalogFieldToFieldDef";
import { findCatalogObjectType } from "../../../../modules/objectViews/table/services/adapters/ObjectTypeTableAdapter";
import {
  isBlockedImportFieldKey,
  isImportableFieldDefinition,
} from "./importFieldTypeSupport.js";

/**
 * @param {Record<string, unknown> | null | undefined} catalog
 * @param {string | null | undefined} objectTypeKey
 */
export function resolveImportableFields(catalog, objectTypeKey) {
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

      if (field.is_system === true || field.isSystem === true) {
        return false;
      }

      const key = String(field.key || "").trim();

      if (isBlockedImportFieldKey(key)) {
        return false;
      }

      const rawFieldType = String(field.field_type || field.type || "").trim().toLowerCase();
      const fieldDef = catalogFieldToFieldDef(field);

      if (!fieldDef) {
        return false;
      }

      return isImportableFieldDefinition({
        rawFieldType,
        type: fieldDef.type,
      });
    })
    .map((field) => {
      const rawFieldType = String(field.field_type || field.type || "").trim().toLowerCase();
      const fieldDef = catalogFieldToFieldDef(field);

      if (!fieldDef) {
        return null;
      }

      return {
        ...fieldDef,
        rawFieldType,
        type:
          rawFieldType === "status" || rawFieldType === "select"
            ? "choice"
            : fieldDef.type,
      };
    })
    .filter(Boolean);
}
