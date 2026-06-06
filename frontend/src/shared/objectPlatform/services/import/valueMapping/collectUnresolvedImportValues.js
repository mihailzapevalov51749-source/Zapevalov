import { getDefaultValueFieldKeys } from "../defaultValues/buildImportDefaultValuesLookup.js";
import { IMPORT_SKIP_FIELD_VALUE } from "../importFieldTypeSupport.js";
import { normalizeObjectExcelImportValue } from "../normalizeObjectExcelImportValue.js";
import {
  buildImportValueMappingsLookup,
  lookupImportValueMappingRule,
} from "./applyImportValueMappings.js";
import {
  buildValueMappingRuleKey,
  normalizeValueMappingToken,
} from "./buildValueMappingRuleKey.js";
import { VALUE_MAPPING_CANDIDATE_ERRORS } from "./importValueMappingConstants.js";
import { resolveImportValueMappingSection } from "./resolveImportValueMappingSection.js";

/**
 * @param {string | null | undefined} message
 */
function isValueMappingCandidateError(message) {
  return VALUE_MAPPING_CANDIDATE_ERRORS.has(String(message || "").trim());
}

/**
 * @param {Array<{ rowNumber: number, values: Record<number, unknown> }>} rows
 * @param {Array<{ columnIndex: number, excelHeader: string, fieldKey: string }>} mappings
 * @param {Array<Record<string, unknown>>} importableFields
 * @param {{ byEmail: Map<string, number[]>, byName: Map<string, number[]> } | null} usersIndex
 * @param {Array<Record<string, unknown>>} [existingRules]
 * @param {Array<Record<string, unknown>> | null} [defaultValueRules]
 */
export function collectUnresolvedImportValues(
  rows,
  mappings,
  importableFields,
  usersIndex = null,
  existingRules = [],
  defaultValueRules = null,
) {
  const fieldByKey = new Map(
    (Array.isArray(importableFields) ? importableFields : []).map((field) => [
      String(field.key || "").trim(),
      field,
    ]),
  );

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

  const existingLookup = buildImportValueMappingsLookup(existingRules);
  const seenRuleKeys = new Set();
  /** @type {Array<Record<string, unknown>>} */
  const rules = [];

  for (const mapping of activeMappings) {
    const fieldKey = String(mapping.fieldKey || "").trim();
    const field = fieldByKey.get(fieldKey);
    const section = resolveImportValueMappingSection(field);

    if (!field || !section) {
      continue;
    }

    const uniqueValues = new Map();

    for (const row of Array.isArray(rows) ? rows : []) {
      const rawValue = row.values?.[mapping.columnIndex];
      const excelValue = String(rawValue ?? "").trim();

      if (!excelValue) {
        continue;
      }

      const token = normalizeValueMappingToken(excelValue);

      if (!uniqueValues.has(token)) {
        uniqueValues.set(token, excelValue);
      }
    }

    for (const excelValue of uniqueValues.values()) {
      const ruleKey = buildValueMappingRuleKey(fieldKey, excelValue);

      if (seenRuleKeys.has(ruleKey)) {
        continue;
      }

      seenRuleKeys.add(ruleKey);

      const existingRule = lookupImportValueMappingRule(
        existingLookup,
        fieldKey,
        excelValue,
      );

      if (existingRule) {
        rules.push(existingRule);
        continue;
      }

      const normalized = normalizeObjectExcelImportValue(
        excelValue,
        field,
        usersIndex,
        existingRules,
      );

      if (normalized.ok) {
        rules.push({
          id: ruleKey,
          fieldKey,
          fieldLabel: String(field.label || fieldKey).trim(),
          excelValue,
          section,
          resolvedValue: normalized.value,
          skip: false,
        });
        continue;
      }

      if (!isValueMappingCandidateError(normalized.error)) {
        continue;
      }

      rules.push({
        id: ruleKey,
        fieldKey,
        fieldLabel: String(field.label || fieldKey).trim(),
        excelValue,
        section,
        resolvedValue: null,
        skip: false,
      });
    }
  }

  const unresolvedRules = rules.filter(
    (rule) =>
      !rule.skip &&
      (rule.resolvedValue === null ||
        rule.resolvedValue === undefined ||
        rule.resolvedValue === ""),
  );

  return {
    rules,
    needsUserMapping: unresolvedRules.length > 0,
    unresolvedRules,
    sections: {
      status: unresolvedRules.filter((rule) => rule.section === "status"),
      list: unresolvedRules.filter((rule) => rule.section === "list"),
      user: unresolvedRules.filter((rule) => rule.section === "user"),
    },
  };
}
