import { isFileFieldType } from "../../../shared/files/attachments/utils/attachmentFileTypes";
import { findCatalogObjectType } from "../../objectViews/table/services/adapters/ObjectTypeTableAdapter";

/**
 * Published catalog file fields for runtime entity attachments.
 */
export function getFileFieldsFromCatalog(catalog, objectTypeKey) {
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

      return isFileFieldType(rawType);
    })
    .map((field) => ({
      key: String(field.key || field.field_key || "").trim(),
      label: String(field.name || field.title || field.key || "Файл"),
      rawFieldType: String(field.field_type || field.type || "file"),
    }))
    .filter((field) => field.key);
}
