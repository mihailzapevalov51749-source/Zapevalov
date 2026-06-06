import { applyImportDefaultValues } from "./defaultValues/applyImportDefaultValues.js";
import {
  buildImportDefaultValuesLookup,
  getDefaultValueFieldKeys,
} from "./defaultValues/buildImportDefaultValuesLookup.js";
import {
  IMPORT_DATA_SOURCE_DEFAULT_VALUE,
  IMPORT_DEFAULT_VALUE_NOT_SET_ERROR,
} from "./defaultValues/importDefaultValueConstants.js";
import { validateImportDefaultValue } from "./defaultValues/validateImportDefaultValue.js";
import { IMPORT_SKIP_FIELD_VALUE } from "./importFieldTypeSupport.js";
import { REQUIRED_FIELD_UNMAPPED_CODE, REQUIRED_FIELD_UNMAPPED_MESSAGE } from "./importReviewConstants.js";
import { normalizeObjectExcelImportValue } from "./normalizeObjectExcelImportValue.js";

/**
 * @param {Array<{ rowNumber: number, values: Record<number, unknown> }>} rows
 * @param {Array<{ columnIndex: number, excelHeader: string, fieldKey: string }>} mappings
 * @param {Array<Record<string, unknown>>} importableFields
 * @param {{ byEmail: Map<string, number[]>, byName: Map<string, number[]> } | null} usersIndex
 * @param {Array<Record<string, unknown>> | null} valueMappings
 * @param {Array<Record<string, unknown>> | null} defaultValueRules
 * @param {{ currentUserId?: number | null }} [importContext]
 */
export function validateObjectExcelImportRows(
  rows,
  mappings,
  importableFields,
  usersIndex = null,
  valueMappings = null,
  defaultValueRules = null,
  importContext = null,
) {
  const context = importContext && typeof importContext === "object" ? importContext : {};
  const fieldByKey = new Map(
    (Array.isArray(importableFields) ? importableFields : []).map((field) => [
      String(field.key || "").trim(),
      field,
    ]),
  );

  const defaultValueLookup = buildImportDefaultValuesLookup(defaultValueRules);
  const defaultValueFieldKeys = getDefaultValueFieldKeys(defaultValueRules);

  const activeMappings = (Array.isArray(mappings) ? mappings : []).filter(
    (mapping) => {
      const fieldKey = String(mapping?.fieldKey || "").trim();

      return (
        fieldKey &&
        mapping.fieldKey !== IMPORT_SKIP_FIELD_VALUE &&
        !defaultValueFieldKeys.has(fieldKey)
      );
    },
  );

  /** @type {Array<{ rowNumber: number, values: Record<string, unknown> }>} */
  const validRows = [];
  /** @type {Array<{ rowNumber: number, column: string, message: string, value: string }>} */
  const errors = [];

  for (const row of Array.isArray(rows) ? rows : []) {
    /** @type {Record<string, unknown>} */
    const values = {};
    let rowHasError = false;

    for (const mapping of activeMappings) {
      const field = fieldByKey.get(String(mapping.fieldKey || "").trim());

      if (!field) {
        continue;
      }

      const rawValue = row.values?.[mapping.columnIndex];
      const normalized = normalizeObjectExcelImportValue(
        rawValue,
        field,
        usersIndex,
        valueMappings,
      );

      if (normalized.skipped) {
        continue;
      }

      if (!normalized.ok) {
        rowHasError = true;
        errors.push({
          rowNumber: row.rowNumber,
          column: mapping.excelHeader,
          message: normalized.error || "Ошибка значения",
          value: String(rawValue ?? "").trim(),
        });
        continue;
      }

      if (field.isRequired && (normalized.value === null || normalized.value === "")) {
        rowHasError = true;
        errors.push({
          rowNumber: row.rowNumber,
          column: mapping.excelHeader,
          message: "Обязательное поле",
          value: String(rawValue ?? "").trim(),
        });
        continue;
      }

      values[String(field.key)] = normalized.value;
    }

    applyImportDefaultValues(values, defaultValueRules, fieldByKey, context);

    for (const field of importableFields) {
      if (!field?.isRequired) {
        continue;
      }

      const fieldKey = String(field.key || "").trim();
      const defaultRule = defaultValueLookup.get(fieldKey);

      if (defaultRule?.source === IMPORT_DATA_SOURCE_DEFAULT_VALUE) {
        const validatedDefault = validateImportDefaultValue(defaultRule, field, context);
        const value = values[fieldKey];

        if (!validatedDefault.ok) {
          rowHasError = true;
          errors.push({
            rowNumber: row.rowNumber,
            column: String(field.label || fieldKey),
            message:
              validatedDefault.error === IMPORT_DEFAULT_VALUE_NOT_SET_ERROR
                ? REQUIRED_FIELD_UNMAPPED_MESSAGE
                : validatedDefault.error || REQUIRED_FIELD_UNMAPPED_MESSAGE,
            code:
              validatedDefault.error === IMPORT_DEFAULT_VALUE_NOT_SET_ERROR
                ? REQUIRED_FIELD_UNMAPPED_CODE
                : undefined,
            value: "",
          });
        } else if (value === null || value === undefined || value === "") {
          rowHasError = true;
          errors.push({
            rowNumber: row.rowNumber,
            column: String(field.label || fieldKey),
            message: REQUIRED_FIELD_UNMAPPED_MESSAGE,
            code: REQUIRED_FIELD_UNMAPPED_CODE,
            value: "",
          });
        }

        continue;
      }

      const mapped = activeMappings.some((mapping) => mapping.fieldKey === fieldKey);

      if (!mapped) {
        rowHasError = true;
        errors.push({
          rowNumber: row.rowNumber,
          column: String(field.label || fieldKey),
          message: REQUIRED_FIELD_UNMAPPED_MESSAGE,
          code: REQUIRED_FIELD_UNMAPPED_CODE,
          value: "",
        });
        continue;
      }

      const value = values[fieldKey];

      if (value === null || value === undefined || value === "") {
        rowHasError = true;
        errors.push({
          rowNumber: row.rowNumber,
          column: String(field.label || fieldKey),
          message: "Обязательное поле",
          value: "",
        });
      }
    }

    if (!rowHasError && Object.keys(values).length > 0) {
      validRows.push({
        rowNumber: row.rowNumber,
        values,
      });
    }
  }

  const totalRows = Array.isArray(rows) ? rows.length : 0;

  return {
    totalRows,
    validRows,
    errors,
    skippedEmptyRows: 0,
    importableCount: validRows.length,
    errorCount: new Set(errors.map((item) => item.rowNumber)).size,
  };
}
