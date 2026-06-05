import { isRelationFieldType } from "../../designer/components/fields/relationFieldFormUtils";
import { normalizeFieldEditorType } from "../../../shared/fieldEditors/fieldEditorRegistry";
import {
  isTableDedicatedRecordNumberFieldKey,
  isTableRowNumberPresentationFieldKey,
  peelTableRowNumberPresentationFieldKey,
  SYSTEM_ENTITY_FIELD_KEYS,
} from "../../../shared/runtime/systemEntityFields";
import { catalogFieldToFieldDef } from "../table/services/adapters/catalogFieldToFieldDef";

const RECORD_NUMBER_FILTER_LABEL = "№ записи";

/**
 * Maps presentation-only row number key to runtime/catalog filter key.
 *
 * @param {string | null | undefined} fieldKey
 * @returns {string}
 */
export function normalizeTableFilterFieldKey(fieldKey) {
  const normalized = String(fieldKey || "").trim();

  if (isTableRowNumberPresentationFieldKey(normalized)) {
    return SYSTEM_ENTITY_FIELD_KEYS.recordNumber;
  }

  return normalized;
}

/**
 * @param {Record<string, unknown> | null | undefined} field
 * @returns {{ key: string, label: string, fieldType: string, rawFieldType?: string, options?: Array<{ key: string, label: string }>, multiple?: boolean } | null}
 */
export function buildTableFilterFieldOption(field) {
  const key = String(field?.key || "").trim();

  if (!key || isTableRowNumberPresentationFieldKey(key)) {
    return null;
  }

  const fieldDef = catalogFieldToFieldDef(field);
  const rawType = String(field?.field_type || field?.type || "")
    .trim()
    .toLowerCase();

  return {
    key,
    label: String(field?.name || field?.label || key),
    fieldType: fieldDef?.type || normalizeFieldEditorType(rawType),
    rawFieldType: rawType,
    options: Array.isArray(fieldDef?.options) ? fieldDef.options : [],
    multiple: Boolean(fieldDef?.multiple),
  };
}

/**
 * @param {Array<Record<string, unknown>>} catalogFields
 * @returns {{ key: string, label: string, fieldType: string, rawFieldType?: string, options?: Array<{ key: string, label: string }>, multiple?: boolean }}
 */
function buildRecordNumberFilterOption(catalogFields = []) {
  const catalogField = (Array.isArray(catalogFields) ? catalogFields : []).find((field) =>
    isTableDedicatedRecordNumberFieldKey(String(field?.key || "").trim()),
  );

  if (catalogField) {
    const option = buildTableFilterFieldOption(catalogField);

    if (option) {
      return {
        ...option,
        label: RECORD_NUMBER_FILTER_LABEL,
        fieldType: "number",
      };
    }
  }

  return {
    key: SYSTEM_ENTITY_FIELD_KEYS.recordNumber,
    label: RECORD_NUMBER_FILTER_LABEL,
    fieldType: "number",
    rawFieldType: "number",
    options: [],
    multiple: false,
  };
}

/**
 * Catalog fields eligible for table filter/sort UI (relation excluded on table stage).
 *
 * @param {Array<Record<string, unknown>>} fields
 */
export function filterCatalogFieldsForTableQueryUi(fields = []) {
  return (Array.isArray(fields) ? fields : []).filter((field) => {
    const key = String(field?.key || "").trim();

    if (!key || isTableRowNumberPresentationFieldKey(key)) {
      return false;
    }

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
  const catalogFields = getFields(objectType);
  const fields = filterCatalogFieldsForTableQueryUi(catalogFields);
  const byKey = new Map();

  for (const field of fields) {
    const option = buildTableFilterFieldOption(field);

    if (!option) {
      continue;
    }

    byKey.set(option.key, option);
  }

  const catalogFieldsByKey = new Map(
    (Array.isArray(catalogFields) ? catalogFields : []).map((field) => [
      String(field?.key || "").trim(),
      field,
    ]),
  );

  const peeledProjection = peelTableRowNumberPresentationFieldKey(
    (Array.isArray(projectionFieldKeys) ? projectionFieldKeys : [])
      .map((key) => String(key || "").trim())
      .filter(Boolean),
  );

  if (peeledProjection.rowNumberIncluded) {
    const recordNumberOption = buildRecordNumberFilterOption(catalogFields);
    byKey.set(recordNumberOption.key, recordNumberOption);
  }

  for (const key of peeledProjection.keys) {
    const normalized = String(key || "").trim();

    if (!normalized || byKey.has(normalized) || isTableRowNumberPresentationFieldKey(normalized)) {
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

    if (catalogField) {
      const option = buildTableFilterFieldOption(catalogField);

      if (option) {
        byKey.set(option.key, option);
        continue;
      }
    }

    byKey.set(normalized, {
      key: normalized,
      label: normalized,
      fieldType: "text",
      rawFieldType: "text",
      options: [],
      multiple: false,
    });
  }

  return Array.from(byKey.values()).sort((a, b) =>
    a.label.localeCompare(b.label, "ru"),
  );
}
