import { isFileFieldType } from "../../../shared/files/attachments/utils/attachmentFileTypes.js";
import { isCreatableFieldType } from "../../../shared/fieldEditors/fieldEditorRegistry.js";
import { catalogFieldToFieldDef } from "../table/services/adapters/catalogFieldToFieldDef.js";
import { findCatalogObjectType } from "../table/services/adapters/ObjectTypeTableAdapter.js";
import { resolveTitleFieldKey } from "./resolveTitleFieldKey.js";

function normalizeKey(value) {
  return String(value ?? "").trim();
}

/**
 * Fields for Platform Quick Create Form (title field always included).
 *
 * @param {Record<string, unknown> | null | undefined} catalog
 * @param {string | null | undefined} objectTypeKey
 */
export function getQuickCreateFields(catalog, objectTypeKey) {
  const objectType = findCatalogObjectType(catalog, objectTypeKey);

  if (!objectType) {
    return [];
  }

  const titleFieldKey = resolveTitleFieldKey(catalog, objectTypeKey);
  const fields = Array.isArray(objectType.fields) ? objectType.fields : [];
  const selected = new Map();

  for (const field of fields) {
    if (!field || typeof field !== "object") {
      continue;
    }

    if (field.is_system === true || field.isSystem === true) {
      continue;
    }

    const key = normalizeKey(field.key);

    if (!key) {
      continue;
    }

    const rawType = String(field.field_type || field.type || "").trim().toLowerCase();

    if (isFileFieldType(rawType) || rawType === "relation") {
      continue;
    }

    if (!isCreatableFieldType(rawType)) {
      continue;
    }

    const includeTitle = Boolean(titleFieldKey && key === titleFieldKey);
    const includeQuick = Boolean(field.quick_create ?? field.quickCreate);

    if (!includeTitle && !includeQuick) {
      continue;
    }

    const fieldDef = catalogFieldToFieldDef(field);

    if (!fieldDef) {
      continue;
    }

    selected.set(key, {
      ...fieldDef,
      rawFieldType: rawType,
      type:
        rawType === "multi_choice" ? "choice" : fieldDef.type,
      multiple: rawType === "multi_choice" || fieldDef.multiple,
      isRequired: includeTitle ? true : fieldDef.isRequired,
      isTitleField: includeTitle,
    });
  }

  const ordered = [...selected.values()];

  return ordered.sort((left, right) => {
    if (left.isTitleField && !right.isTitleField) {
      return -1;
    }

    if (!left.isTitleField && right.isTitleField) {
      return 1;
    }

    return String(left.label || left.key).localeCompare(
      String(right.label || right.key),
      "ru",
    );
  });
}
