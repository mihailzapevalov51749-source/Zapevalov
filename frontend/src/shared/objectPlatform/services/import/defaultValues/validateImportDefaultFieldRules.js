import {
  IMPORT_DATA_SOURCE_DEFAULT_VALUE,
  IMPORT_DATA_SOURCE_EXCEL_COLUMN,
} from "./importDefaultValueConstants.js";
import { isFieldMappedToExcelColumn } from "./isFieldMappedToExcelColumn.js";
import { validateImportDefaultValue } from "./validateImportDefaultValue.js";

function hasDefaultValueInput(rule) {
  const value = rule?.defaultValue;

  return value !== null && value !== undefined && value !== "";
}

/**
 * @param {Array<Record<string, unknown>>} rules
 * @param {Array<{ fieldKey?: string }>} mappings
 * @param {Array<Record<string, unknown>>} importableFields
 * @param {{ currentUserId?: number | null }} [context]
 */
export function validateImportDefaultFieldRules(
  rules,
  mappings,
  importableFields,
  context = {},
) {
  const fieldByKey = new Map(
    (Array.isArray(importableFields) ? importableFields : []).map((field) => [
      String(field.key || "").trim(),
      field,
    ]),
  );

  /** @type {string[]} */
  const warnings = [];

  for (const rule of Array.isArray(rules) ? rules : []) {
    const fieldKey = String(rule?.fieldKey || "").trim();
    const fieldLabel = String(rule?.fieldLabel || fieldKey).trim();
    const field = fieldByKey.get(fieldKey);
    const source = String(rule?.source || IMPORT_DATA_SOURCE_EXCEL_COLUMN);

    if (source === IMPORT_DATA_SOURCE_EXCEL_COLUMN) {
      if (!isFieldMappedToExcelColumn(fieldKey, mappings)) {
        warnings.push(`Необходимо указать источник для обязательного поля: ${fieldLabel}`);
      }

      continue;
    }

    if (source === IMPORT_DATA_SOURCE_DEFAULT_VALUE) {
      if (!field) {
        continue;
      }

      if (!hasDefaultValueInput(rule)) {
        warnings.push(`Необходимо указать значение по умолчанию для поля: ${fieldLabel}`);
        continue;
      }

      const validated = validateImportDefaultValue(rule, field, context);

      if (!validated.ok) {
        warnings.push(`${fieldLabel}: ${validated.error || "Некорректное значение по умолчанию"}`);
      }
    }
  }

  return warnings;
}
