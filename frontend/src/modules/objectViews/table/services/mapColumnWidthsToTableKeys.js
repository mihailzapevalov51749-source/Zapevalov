import { getColumnPresentationKey } from "../../services/columnPresentationUtils";

/**
 * Maps fieldKey widths to ViewEngine column.key entries for resize rendering.
 *
 * @param {Array<{ key?: string }>} columns
 * @param {Record<string, number>} widthsByFieldKey
 */
export function mapColumnWidthsToTableKeys(columns, widthsByFieldKey = {}) {
  const source =
    widthsByFieldKey && typeof widthsByFieldKey === "object" ? widthsByFieldKey : {};
  const result = { ...source };

  for (const column of Array.isArray(columns) ? columns : []) {
    const columnKey = String(column?.key || "").trim();
    const fieldKey = getColumnPresentationKey(column);

    if (!columnKey || !fieldKey || source[fieldKey] == null) {
      continue;
    }

    result[columnKey] = source[fieldKey];
  }

  return result;
}
