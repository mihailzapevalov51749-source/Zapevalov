import { isFileFieldType } from "../../../shared/files/attachments/utils/attachmentFileTypes.js";
import { isCreatableFieldType } from "../../../shared/fieldEditors/fieldEditorRegistry.js";
import { findCatalogObjectType } from "../table/services/adapters/ObjectTypeTableAdapter.js";
import { mapFieldForCreateForm } from "./mapFieldForCreateForm.js";
import { resolveTitleFieldKey } from "./resolveTitleFieldKey.js";

function normalizeKey(value) {
  return String(value ?? "").trim();
}

function normalizeFieldKeyList(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => normalizeKey(item))
    .filter(Boolean);
}

function readProjectionFromContract(quickFormContract) {
  const projection = quickFormContract?.projection;

  if (!projection || typeof projection !== "object") {
    return {
      fieldKeys: [],
      fieldOrder: [],
      titleFieldKey: null,
    };
  }

  const fieldKeys = normalizeFieldKeyList(
    projection.fieldKeys ?? projection.field_keys,
  );
  const fieldOrder = normalizeFieldKeyList(
    projection.fieldOrder ?? projection.field_order ?? fieldKeys,
  );
  const titleFieldKey =
    normalizeKey(projection.titleFieldKey ?? projection.title_field_key) || null;

  return {
    fieldKeys,
    fieldOrder,
    titleFieldKey,
  };
}

function isEligibleCatalogField(field) {
  if (!field || typeof field !== "object") {
    return false;
  }

  if (field.is_system === true || field.isSystem === true) {
    return false;
  }

  const key = normalizeKey(field.key);

  if (!key) {
    return false;
  }

  const rawType = String(field.field_type || field.type || "").trim().toLowerCase();

  if (isFileFieldType(rawType)) {
    return false;
  }

  return isCreatableFieldType(rawType);
}

/**
 * Resolve runtime create-form fields from quick_form Object View projection.
 *
 * Order is always taken from projection.fieldOrder (filtered by projection.fieldKeys).
 *
 * @param {Record<string, unknown> | null | undefined} catalog
 * @param {string | null | undefined} objectTypeKey
 * @param {Record<string, unknown> | null | undefined} quickFormContract
 */
export function resolveQuickFormFields(catalog, objectTypeKey, quickFormContract) {
  const objectType = findCatalogObjectType(catalog, objectTypeKey);

  if (!objectType || !quickFormContract) {
    return [];
  }

  const { fieldKeys, fieldOrder, titleFieldKey: projectionTitleFieldKey } =
    readProjectionFromContract(quickFormContract);

  if (!fieldKeys.length) {
    return [];
  }

  const fieldKeySet = new Set(fieldKeys);
  const resolvedTitleFieldKey =
    projectionTitleFieldKey || resolveTitleFieldKey(catalog, objectTypeKey);
  const catalogFields = Array.isArray(objectType.fields) ? objectType.fields : [];
  const catalogFieldByKey = new Map();

  for (const field of catalogFields) {
    const key = normalizeKey(field?.key);

    if (key) {
      catalogFieldByKey.set(key, field);
    }
  }

  const orderedKeys = fieldOrder.length
    ? fieldOrder.filter((key) => fieldKeySet.has(key))
    : fieldKeys;

  const seen = new Set();
  const result = [];

  for (const key of orderedKeys) {
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);

    const field = catalogFieldByKey.get(key);

    if (!field || !isEligibleCatalogField(field)) {
      continue;
    }

    const isTitleField = Boolean(resolvedTitleFieldKey && key === resolvedTitleFieldKey);
    const mappedField = mapFieldForCreateForm(field, {
      isRequired: isTitleField
        ? true
        : Boolean(field.is_required ?? field.isRequired),
      isTitleField,
    });

    if (!mappedField) {
      continue;
    }

    result.push(mappedField);
  }

  return result;
}
