/**
 * @param {Array<Record<string, unknown>>} rules
 * @param {string} fieldKey
 * @param {Record<string, unknown>} patch
 */
export function updateImportDefaultValueRule(rules, fieldKey, patch) {
  const normalizedFieldKey = String(fieldKey || "").trim();

  return (Array.isArray(rules) ? rules : []).map((rule) => {
    if (String(rule?.fieldKey || "").trim() !== normalizedFieldKey) {
      return rule;
    }

    return {
      ...rule,
      ...patch,
    };
  });
}
