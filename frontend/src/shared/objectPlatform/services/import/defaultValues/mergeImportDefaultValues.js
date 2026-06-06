/**
 * @param {Array<Record<string, unknown>>} current
 * @param {Array<Record<string, unknown>>} built
 */
export function mergeImportDefaultValues(current, built) {
  const currentByKey = new Map(
    (Array.isArray(current) ? current : []).map((rule) => [
      String(rule?.fieldKey || "").trim(),
      rule,
    ]),
  );

  return (Array.isArray(built) ? built : []).map((builtRule) => {
    const fieldKey = String(builtRule?.fieldKey || "").trim();
    const existing = currentByKey.get(fieldKey);

    if (!existing) {
      return builtRule;
    }

    return {
      ...builtRule,
      source: existing.source ?? builtRule.source,
      defaultValue:
        existing.defaultValue !== undefined && existing.defaultValue !== null && existing.defaultValue !== ""
          ? existing.defaultValue
          : builtRule.defaultValue,
    };
  });
}
