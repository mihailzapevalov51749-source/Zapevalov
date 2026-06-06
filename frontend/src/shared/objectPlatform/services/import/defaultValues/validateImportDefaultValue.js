import {
  IMPORT_DATA_SOURCE_DEFAULT_VALUE,
  IMPORT_DEFAULT_VALUE_NOT_SET_ERROR,
} from "./importDefaultValueConstants.js";
import { normalizeImportDefaultValue } from "./normalizeImportDefaultValue.js";

function hasDefaultValueInput(rule) {
  const value = rule?.defaultValue;

  return value !== null && value !== undefined && value !== "";
}

/**
 * @param {Record<string, unknown>} rule
 * @param {Record<string, unknown>} field
 * @param {{ currentUserId?: number | null }} [context]
 */
export function validateImportDefaultValue(rule, field, context = {}) {
  if (rule?.source !== IMPORT_DATA_SOURCE_DEFAULT_VALUE) {
    return { ok: true, value: null };
  }

  if (!hasDefaultValueInput(rule)) {
    return { ok: false, error: IMPORT_DEFAULT_VALUE_NOT_SET_ERROR };
  }

  return normalizeImportDefaultValue(rule.defaultValue, field, context);
}
