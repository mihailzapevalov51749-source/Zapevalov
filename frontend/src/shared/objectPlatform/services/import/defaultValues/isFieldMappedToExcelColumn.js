/**
 * @param {string | null | undefined} fieldKey
 * @param {Array<{ fieldKey?: string }>} mappings
 */
export function isFieldMappedToExcelColumn(fieldKey, mappings) {
  const normalizedFieldKey = String(fieldKey || "").trim();

  if (!normalizedFieldKey) {
    return false;
  }

  return (Array.isArray(mappings) ? mappings : []).some((mapping) => {
    const mappedKey = String(mapping?.fieldKey || "").trim();

    return mappedKey && mappedKey === normalizedFieldKey;
  });
}

/**
 * @param {string | null | undefined} fieldKey
 * @param {Array<{ fieldKey?: string, excelHeader?: string }>} mappings
 */
export function resolveMappedExcelColumnLabel(fieldKey, mappings) {
  const normalizedFieldKey = String(fieldKey || "").trim();
  const mapping = (Array.isArray(mappings) ? mappings : []).find((item) => {
    const mappedKey = String(item?.fieldKey || "").trim();

    return mappedKey && mappedKey === normalizedFieldKey;
  });

  return String(mapping?.excelHeader || "").trim();
}
