import { IMPORT_SKIP_FIELD_VALUE } from "../importFieldTypeSupport.js";

/**
 * @param {Array<{ columnIndex: number, excelHeader: string, fieldKey: string }>} mappings
 * @param {string} fieldKey
 * @param {number | string} columnIndex
 */
export function assignRequiredFieldToExcelColumn(mappings, fieldKey, columnIndex) {
  const normalizedFieldKey = String(fieldKey || "").trim();
  const normalizedColumnIndex = Number(columnIndex);

  if (!normalizedFieldKey || !Number.isFinite(normalizedColumnIndex)) {
    return Array.isArray(mappings) ? mappings : [];
  }

  return (Array.isArray(mappings) ? mappings : []).map((mapping) => {
    if (mapping.columnIndex === normalizedColumnIndex) {
      return {
        ...mapping,
        fieldKey: normalizedFieldKey,
      };
    }

    if (String(mapping.fieldKey || "").trim() === normalizedFieldKey) {
      return {
        ...mapping,
        fieldKey: IMPORT_SKIP_FIELD_VALUE,
      };
    }

    return mapping;
  });
}
