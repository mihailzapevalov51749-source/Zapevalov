import { IMPORT_DATA_SOURCE_DEFAULT_VALUE } from "./importDefaultValueConstants.js";
import { validateImportDefaultValue } from "./validateImportDefaultValue.js";

/**
 * @param {Record<string, unknown>} values
 * @param {Array<Record<string, unknown>>} defaultValueRules
 * @param {Map<string, Record<string, unknown>>} fieldByKey
 * @param {{ currentUserId?: number | null }} [context]
 */
export function applyImportDefaultValues(values, defaultValueRules, fieldByKey, context = {}) {
  for (const rule of Array.isArray(defaultValueRules) ? defaultValueRules : []) {
    if (rule?.source !== IMPORT_DATA_SOURCE_DEFAULT_VALUE) {
      continue;
    }

    const fieldKey = String(rule.fieldKey || "").trim();
    const field = fieldByKey.get(fieldKey);

    if (!field) {
      continue;
    }

    const normalized = validateImportDefaultValue(rule, field, context);

    if (normalized.ok && normalized.value !== null && normalized.value !== undefined && normalized.value !== "") {
      values[fieldKey] = normalized.value;
    }
  }

  return values;
}
