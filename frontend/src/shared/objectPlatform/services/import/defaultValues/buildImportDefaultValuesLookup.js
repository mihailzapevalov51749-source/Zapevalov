import { IMPORT_DATA_SOURCE_DEFAULT_VALUE } from "./importDefaultValueConstants.js";

/**
 * @param {Array<Record<string, unknown>>} defaultValueRules
 */
export function buildImportDefaultValuesLookup(defaultValueRules) {
  const lookup = new Map();

  for (const rule of Array.isArray(defaultValueRules) ? defaultValueRules : []) {
    const fieldKey = String(rule?.fieldKey || "").trim();

    if (!fieldKey) {
      continue;
    }

    lookup.set(fieldKey, rule);
  }

  return lookup;
}

/**
 * @param {Array<Record<string, unknown>>} defaultValueRules
 */
export function getDefaultValueFieldKeys(defaultValueRules) {
  return new Set(
    (Array.isArray(defaultValueRules) ? defaultValueRules : [])
      .filter((rule) => rule?.source === IMPORT_DATA_SOURCE_DEFAULT_VALUE)
      .map((rule) => String(rule.fieldKey || "").trim())
      .filter(Boolean),
  );
}
