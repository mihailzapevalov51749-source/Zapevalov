import {
  IMPORT_DATA_SOURCE_DEFAULT_VALUE,
  IMPORT_DATA_SOURCE_EXCEL_COLUMN,
} from "./importDefaultValueConstants.js";
import { getRequiredImportableFields } from "./getRequiredImportableFields.js";
import { isFieldMappedToExcelColumn } from "./isFieldMappedToExcelColumn.js";
import { supportsImportDefaultValue } from "./resolveImportDefaultValueEditor.js";

/**
 * @param {Array<Record<string, unknown>>} importableFields
 * @param {Array<{ fieldKey?: string }>} mappings
 */
export function buildImportDefaultValues(importableFields, mappings) {
  return getRequiredImportableFields(importableFields).map((field) => {
    const fieldKey = String(field.key || "").trim();
    const mapped = isFieldMappedToExcelColumn(fieldKey, mappings);

    return {
      fieldKey,
      fieldLabel: String(field.label || fieldKey).trim(),
      source: mapped ? IMPORT_DATA_SOURCE_EXCEL_COLUMN : IMPORT_DATA_SOURCE_DEFAULT_VALUE,
      defaultValue: "",
      supportsDefaultValue: supportsImportDefaultValue(field),
    };
  });
}
