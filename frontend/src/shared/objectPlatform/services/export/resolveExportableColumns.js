import { SYSTEM_COLUMN_KEYS } from "../../../viewEngine/systemColumnKeys";

const BLOCKED_EXPORT_COLUMN_KEYS = new Set([
  SYSTEM_COLUMN_KEYS.id,
  "__selection__",
  "__row_actions__",
]);

/**
 * @param {Array<Record<string, unknown>>} columns
 */
export function resolveExportableColumns(columns = []) {
  return (Array.isArray(columns) ? columns : []).filter((column) => {
    const key = String(column?.key || "").trim();

    if (!key || BLOCKED_EXPORT_COLUMN_KEYS.has(key)) {
      return false;
    }

    if (column?.visible === false) {
      return false;
    }

    return true;
  });
}
