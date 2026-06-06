import { buildObjectTableExportFilename } from "./buildObjectTableExportFilename";
import {
  buildExportWorkbook,
  downloadExportWorkbook,
} from "./buildExportWorkbook";
import { fetchExportTableRows } from "./fetchExportTableRows";
import { loadExportUsersMap } from "./loadExportUsersMap";
import {
  buildExportColumnsWithHierarchy,
  prepareExportTableRows,
} from "./prepareExportTableRows";
import { resolveExportableColumns } from "./resolveExportableColumns";

/** Export scope identifiers for future scenarios. */
export const OBJECT_TABLE_EXPORT_SCOPES = {
  CURRENT_VIEW: "current_view",
  ALL_RECORDS: "all_records",
  SELECTED_ROWS: "selected_rows",
};

/**
 * @typedef {Object} ObjectTableExportSnapshot
 * @property {number | null} [tenantId]
 * @property {string | null} [objectTypeKey]
 * @property {string | null} [viewKey]
 * @property {string} [objectName]
 * @property {string | null} [viewName]
 * @property {Record<string, unknown> | null} [contract]
 * @property {Record<string, unknown>} [session]
 * @property {Array<Record<string, unknown>>} [columns]
 * @property {Array<Record<string, unknown>>} [relationColumns]
 * @property {Record<string, unknown> | null} [catalog]
 */

/**
 * MVP: export current table view (filters, sort, visible columns).
 *
 * @param {ObjectTableExportSnapshot} snapshot
 * @param {{ scope?: string }} [options]
 */
export async function exportObjectTableToExcel(
  snapshot,
  options = {},
) {
  const scope = String(options.scope || OBJECT_TABLE_EXPORT_SCOPES.CURRENT_VIEW).trim();
  void scope;

  const tenantId = Number(snapshot?.tenantId);
  const objectTypeKey = String(snapshot?.objectTypeKey || "").trim();

  if (!tenantId || !objectTypeKey) {
    throw new Error("export context is incomplete");
  }

  const exportColumns = resolveExportableColumns(snapshot?.columns || []);

  if (!exportColumns.length) {
    throw new Error("no exportable columns");
  }

  const [flatRows, usersMap] = await Promise.all([
    fetchExportTableRows({
      tenantId,
      objectTypeKey,
      viewKey: snapshot?.viewKey ?? null,
      contract: snapshot?.contract ?? null,
      session: snapshot?.session ?? {},
      columns: exportColumns,
      relationColumns: snapshot?.relationColumns || [],
    }),
    loadExportUsersMap(),
  ]);

  const { rows, treeEnabled } = await prepareExportTableRows({
    tenantId,
    objectTypeKey,
    catalog: snapshot?.catalog ?? null,
    flatRows,
  });

  const columnsForExport = buildExportColumnsWithHierarchy(
    exportColumns,
    treeEnabled,
  );

  const filename = buildObjectTableExportFilename({
    objectName: snapshot?.objectName || "Объект",
    viewName: snapshot?.viewName ?? null,
  });

  const { workbook, XLSX } = await buildExportWorkbook({
    columns: columnsForExport,
    rows,
    usersMap,
  });

  downloadExportWorkbook(workbook, XLSX, filename);
}
