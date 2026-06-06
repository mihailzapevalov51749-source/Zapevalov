import {
  IMPORT_DATA_SOURCE_DEFAULT_VALUE,
  IMPORT_DATA_SOURCE_EXCEL_COLUMN,
} from "./importDefaultValueConstants.js";
import { isFieldMappedToExcelColumn } from "./isFieldMappedToExcelColumn.js";

function hasDefaultValueInput(rule) {
  const value = rule?.defaultValue;

  return value !== null && value !== undefined && value !== "";
}

/**
 * @param {Array<Record<string, unknown>>} rules
 * @param {Array<{ fieldKey?: string }>} mappings
 */
export function syncImportDefaultValuesWithMappings(rules, mappings) {
  return (Array.isArray(rules) ? rules : []).map((rule) => {
    const fieldKey = String(rule?.fieldKey || "").trim();
    const mapped = isFieldMappedToExcelColumn(fieldKey, mappings);

    if (!rule.supportsDefaultValue) {
      return {
        ...rule,
        source: IMPORT_DATA_SOURCE_EXCEL_COLUMN,
      };
    }

    if (
      mapped &&
      rule.source === IMPORT_DATA_SOURCE_DEFAULT_VALUE &&
      !hasDefaultValueInput(rule)
    ) {
      return {
        ...rule,
        source: IMPORT_DATA_SOURCE_EXCEL_COLUMN,
        defaultValue: "",
      };
    }

    if (
      !mapped &&
      rule.source === IMPORT_DATA_SOURCE_EXCEL_COLUMN &&
      !hasDefaultValueInput(rule)
    ) {
      return {
        ...rule,
        source: IMPORT_DATA_SOURCE_DEFAULT_VALUE,
      };
    }

    return rule;
  });
}
