import { formatExportCellValue } from "./formatExportCellValue";
import { EXPORT_HIERARCHY_NUMBER_COLUMN_KEY } from "./orderExportHierarchyRows";

/**
 * @param {{
 *   columns: Array<Record<string, unknown>>,
 *   rows: import("../../../viewEngine/contracts").ViewEngineRow[],
 *   usersMap?: Map<string, string>,
 * }} params
 */
export async function buildExportWorkbook({
  columns,
  rows,
  usersMap = new Map(),
}) {
  const XLSX = await import("xlsx");

  const headerRow = columns.map((column) =>
    String(column?.label || column?.key || "").trim(),
  );

  const dataRows = rows.map((row) => {
    const cellByKey = new Map(
      (row?.cells || []).map((cell) => [String(cell?.fieldKey || ""), cell]),
    );

    return columns.map((column) => {
      const key = String(column?.key || "").trim();

      if (key === EXPORT_HIERARCHY_NUMBER_COLUMN_KEY) {
        return String(row?.hierarchy?.hierarchyNumber ?? "").trim();
      }

      const cell = cellByKey.get(key);
      let formatted = formatExportCellValue(cell?.value, column, usersMap);

      if (column?.isTitle && row?.hierarchy?.level > 0) {
        const indent = "    ".repeat(Number(row.hierarchy.level) || 0);
        formatted = {
          ...formatted,
          text: `${indent}${formatted.text || ""}`,
        };
      }

      if (formatted.hyperlink) {
        return {
          v: formatted.text,
          t: "s",
          l: { Target: formatted.hyperlink },
        };
      }

      return formatted.text;
    });
  });

  const worksheet = XLSX.utils.aoa_to_sheet([headerRow, ...dataRows]);
  const workbook = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(workbook, worksheet, "Данные");

  return { workbook, XLSX };
}

/**
 * @param {import("xlsx").WorkBook} workbook
 * @param {typeof import("xlsx")} XLSX
 * @param {string} filename
 */
export function downloadExportWorkbook(workbook, XLSX, filename) {
  XLSX.writeFile(workbook, filename);
}
