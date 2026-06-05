import { isFileFieldType } from "../../../shared/files/attachments/utils/attachmentFileTypes";
import { FIELD_EDITOR_TYPE_RELATION } from "../../../shared/fieldEditors/fieldEditorRegistry";
import { isHierarchyRelationField } from "../../../shared/relation/hierarchyRelationProfile";
import { isRelationFieldType } from "../../designer/components/fields/relationFieldFormUtils";
import { catalogFieldToFieldDef } from "../table/services/adapters/catalogFieldToFieldDef";
import { findCatalogObjectType } from "../table/services/adapters/ObjectTypeTableAdapter";
import { getCreatableFields } from "./getCreatableFields";

/**
 * Published catalog fields shown in object entity card layout (scalar + relation).
 *
 * @param {Record<string, unknown> | null | undefined} catalog
 * @param {string | null | undefined} objectTypeKey
 */
export function getEntityCardLayoutFields(catalog, objectTypeKey) {
  const creatableFields = getCreatableFields(catalog, objectTypeKey);
  const objectType = findCatalogObjectType(catalog, objectTypeKey);

  if (!objectType) {
    return creatableFields;
  }

  const fields = Array.isArray(objectType.fields) ? objectType.fields : [];
  const creatableKeys = new Set(creatableFields.map((field) => String(field.key)));

  const relationFields = fields
    .filter((field) => {
      if (!field || typeof field !== "object") {
        return false;
      }

      if (field.is_system === true || field.isSystem === true) {
        return false;
      }

      const rawType = String(field.field_type || field.type || "")
        .trim()
        .toLowerCase();

      if (isFileFieldType(rawType) || !isRelationFieldType(rawType)) {
        return false;
      }

      if (isHierarchyRelationField(field, catalog, objectTypeKey)) {
        return false;
      }

      const key = String(field.key || "").trim();

      return Boolean(key) && !creatableKeys.has(key);
    })
    .map((field) => {
      const fieldDef = catalogFieldToFieldDef(field);

      if (!fieldDef) {
        return null;
      }

      const settings =
        field.settings_json && typeof field.settings_json === "object"
          ? field.settings_json
          : field.settings && typeof field.settings === "object"
            ? field.settings
            : {};

      return {
        ...fieldDef,
        rawFieldType: FIELD_EDITOR_TYPE_RELATION,
        type: FIELD_EDITOR_TYPE_RELATION,
        settings,
        multiple: false,
      };
    })
    .filter(Boolean);

  return [...creatableFields, ...relationFields];
}
