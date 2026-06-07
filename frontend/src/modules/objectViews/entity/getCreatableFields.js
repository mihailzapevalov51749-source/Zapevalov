import { isFileFieldType } from "../../../shared/files/attachments/utils/attachmentFileTypes";
import { isCreatableFieldType } from "../../../shared/fieldEditors/fieldEditorRegistry";
import { findCatalogObjectType } from "../table/services/adapters/ObjectTypeTableAdapter";
import { mapFieldForCreateForm } from "./mapFieldForCreateForm";

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

      const rawType = String(field.field_type || field.type || "").trim().toLowerCase();

      if (isFileFieldType(rawType)) {
        return false;
      }

      return isCreatableFieldType(rawType);
    })
    .map((field) => mapFieldForCreateForm(field))
    .filter(Boolean);
}
