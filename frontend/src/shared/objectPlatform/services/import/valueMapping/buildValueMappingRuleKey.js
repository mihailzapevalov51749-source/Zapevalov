export function normalizeValueMappingToken(value) {
  return String(value ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

/**
 * @param {string} fieldKey
 * @param {unknown} excelValue
 */
export function buildValueMappingRuleKey(fieldKey, excelValue) {
  const key = String(fieldKey || "").trim();
  const token = normalizeValueMappingToken(excelValue);

  return `${key}::${token}`;
}
