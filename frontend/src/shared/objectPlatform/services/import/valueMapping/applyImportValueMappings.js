import {
  buildValueMappingRuleKey,
  normalizeValueMappingToken,
} from "./buildValueMappingRuleKey.js";
import { IMPORT_VALUE_SKIP_OPTION } from "./importValueMappingConstants.js";

/**
 * @typedef {Object} ImportValueMappingRule
 * @property {string} id
 * @property {string} fieldKey
 * @property {string} fieldLabel
 * @property {string} excelValue
 * @property {"status" | "list" | "user"} section
 * @property {string | number | null} [resolvedValue]
 * @property {boolean} [skip]
 */

/**
 * @param {ImportValueMappingRule[] | null | undefined} rules
 */
export function buildImportValueMappingsLookup(rules) {
  const lookup = new Map();

  for (const rule of Array.isArray(rules) ? rules : []) {
    const fieldKey = String(rule?.fieldKey || "").trim();
    const excelValue = String(rule?.excelValue || "").trim();

    if (!fieldKey || !excelValue) {
      continue;
    }

    lookup.set(buildValueMappingRuleKey(fieldKey, excelValue), rule);
  }

  return lookup;
}

/**
 * @param {Map<string, ImportValueMappingRule>} lookup
 * @param {string} fieldKey
 * @param {unknown} rawValue
 */
export function lookupImportValueMappingRule(lookup, fieldKey, rawValue) {
  if (!(lookup instanceof Map)) {
    return null;
  }

  const key = String(fieldKey || "").trim();
  const excelValue = String(rawValue ?? "").trim();

  if (!key || !excelValue) {
    return null;
  }

  return lookup.get(buildValueMappingRuleKey(key, excelValue)) || null;
}

/**
 * @param {ImportValueMappingRule | null | undefined} rule
 */
export function isImportValueMappingSkipped(rule) {
  return Boolean(rule?.skip || rule?.resolvedValue === IMPORT_VALUE_SKIP_OPTION);
}

/**
 * @param {ImportValueMappingRule | null | undefined} rule
 */
export function getImportValueMappingResolvedValue(rule) {
  if (!rule || isImportValueMappingSkipped(rule)) {
    return null;
  }

  const value = rule.resolvedValue;

  if (value === null || value === undefined || value === "") {
    return null;
  }

  return value;
}

/**
 * @param {ImportValueMappingRule[]} rules
 */
export function mergeImportValueMappingRules(rules) {
  const merged = new Map();

  for (const rule of Array.isArray(rules) ? rules : []) {
    const id = String(rule?.id || "").trim();

    if (!id) {
      continue;
    }

    merged.set(id, rule);
  }

  return Array.from(merged.values());
}

/**
 * @param {ImportValueMappingRule[]} rules
 */
export function importValueMappingsNeedUserInput(rules) {
  return (Array.isArray(rules) ? rules : []).some(
    (rule) =>
      !rule?.skip &&
      (rule?.resolvedValue === null ||
        rule?.resolvedValue === undefined ||
        rule?.resolvedValue === ""),
  );
}

/**
 * @param {ImportValueMappingRule[]} rules
 * @param {string} ruleId
 * @param {string | number | null} nextValue
 */
export function updateImportValueMappingRule(rules, ruleId, nextValue) {
  const normalizedId = String(ruleId || "").trim();
  const isSkip = nextValue === IMPORT_VALUE_SKIP_OPTION;

  return (Array.isArray(rules) ? rules : []).map((rule) => {
    if (String(rule?.id || "").trim() !== normalizedId) {
      return rule;
    }

    if (isSkip) {
      return {
        ...rule,
        skip: true,
        resolvedValue: null,
      };
    }

    return {
      ...rule,
      skip: false,
      resolvedValue: nextValue,
    };
  });
}

export { normalizeValueMappingToken };
