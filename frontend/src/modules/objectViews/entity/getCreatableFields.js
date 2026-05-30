import {
  isCreatableFieldType,
  normalizeFieldEditorType,
} from "../../../shared/fieldEditors/fieldEditorRegistry";
import { catalogFieldToFieldDef } from "../table/services/adapters/catalogFieldToFieldDef";
import { findCatalogObjectType } from "../table/services/adapters/ObjectTypeTableAdapter";

/**
 * Published catalog fields eligible for runtime entity create form.
 *
 * @param {Record<string, unknown> | null | undefined} catalog
 * @param {string | null | undefined} objectTypeKey
 * @returns {Array<import("../../../shared/viewEngine/contracts").ViewEngineFieldDef & { rawFieldType: string }>}
 */
export function getCreatableFields(catalog, objectTypeKey) {
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

      const rawType = String(field.field_type || field.type || "").trim();

      return isCreatableFieldType(rawType);
    })
    .map((field) => {
      const rawFieldType = normalizeFieldEditorType(
        field.field_type || field.type,
      );
      const fieldDef = catalogFieldToFieldDef(field);

      if (!fieldDef) {
        return null;
      }

      return {
        ...fieldDef,
        rawFieldType,
        type:
          rawFieldType === "multi_choice"
            ? "choice"
            : fieldDef.type,
        multiple: rawFieldType === "multi_choice" || fieldDef.multiple,
      };
    })
    .filter(Boolean);
}
