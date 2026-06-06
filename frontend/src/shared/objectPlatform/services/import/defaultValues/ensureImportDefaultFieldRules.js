import { buildImportDefaultValues } from "./buildImportDefaultValues.js";
import { mergeImportDefaultValues } from "./mergeImportDefaultValues.js";
import { syncImportDefaultValuesWithMappings } from "./syncImportDefaultValuesWithMappings.js";

/**
 * @param {Array<Record<string, unknown>> | null | undefined} rules
 * @param {Array<Record<string, unknown>>} importableFields
 * @param {Array<{ fieldKey?: string }>} mappings
 */
export function ensureImportDefaultFieldRules(rules, importableFields, mappings) {
  const built = buildImportDefaultValues(importableFields, mappings);

  if (!Array.isArray(rules) || !rules.length) {
    return built;
  }

  return syncImportDefaultValuesWithMappings(
    mergeImportDefaultValues(rules, built),
    mappings,
  );
}
