import {
  IMPORT_SKIP_FIELD_VALUE,
  isBlockedImportExcelHeader,
  normalizeImportHeaderLabel,
} from "./importFieldTypeSupport.js";

/**
 * @typedef {Object} ObjectExcelColumnMapping
 * @property {number} columnIndex
 * @property {string} excelHeader
 * @property {string | null} sampleValue
 * @property {string} fieldKey
 */

/**
 * @param {Array<{ index: number, label: string }>} headers
 * @param {Array<{ rowNumber: number, values: Record<number, unknown> }>} rows
 * @param {Array<Record<string, unknown>>} importableFields
 */
export function buildObjectExcelColumnMappings(headers, rows, importableFields) {
  const fields = Array.isArray(importableFields) ? importableFields : [];
  const fieldsByLabel = new Map();

  for (const field of fields) {
    const label = normalizeImportHeaderLabel(field.label || field.key);

    if (label && !fieldsByLabel.has(label)) {
      fieldsByLabel.set(label, String(field.key || "").trim());
    }
  }

  return (Array.isArray(headers) ? headers : []).map((header) => {
    const excelHeader = String(header.label || "").trim();
    const sampleValue = findSampleValue(rows, header.index);
    let fieldKey = IMPORT_SKIP_FIELD_VALUE;

    if (!isBlockedImportExcelHeader(excelHeader)) {
      const normalizedHeader = normalizeImportHeaderLabel(excelHeader);
      const matchedKey = fieldsByLabel.get(normalizedHeader);

      if (matchedKey) {
        fieldKey = matchedKey;
      }
    }

    return {
      columnIndex: header.index,
      excelHeader,
      sampleValue,
      fieldKey,
    };
  });
}

function findSampleValue(rows, columnIndex) {
  for (const row of Array.isArray(rows) ? rows : []) {
    const raw = row?.values?.[columnIndex];

    if (raw === null || raw === undefined) {
      continue;
    }

    const text = String(raw).trim();

    if (text) {
      return text;
    }
  }

  return "";
}

/**
 * @param {ObjectExcelColumnMapping[]} mappings
 * @param {string} columnIndex
 * @param {string} nextFieldKey
 */
export function updateObjectExcelColumnMapping(mappings, columnIndex, nextFieldKey) {
  const normalizedColumnIndex = Number(columnIndex);
  const normalizedFieldKey = String(nextFieldKey ?? IMPORT_SKIP_FIELD_VALUE).trim();

  return (Array.isArray(mappings) ? mappings : []).map((mapping) => {
    if (mapping.columnIndex !== normalizedColumnIndex) {
      if (normalizedFieldKey && mapping.fieldKey === normalizedFieldKey) {
        return { ...mapping, fieldKey: IMPORT_SKIP_FIELD_VALUE };
      }

      return mapping;
    }

    return {
      ...mapping,
      fieldKey: normalizedFieldKey || IMPORT_SKIP_FIELD_VALUE,
    };
  });
}
