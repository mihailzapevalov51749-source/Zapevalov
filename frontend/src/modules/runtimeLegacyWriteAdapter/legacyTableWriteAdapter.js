import { updateTable, updateTableRow } from "../universalTable/services/tableApi";

/**
 * Transitional adapter for legacy Universal Table write operations.
 * Not part of runtimeReadGateway (read-only boundary).
 *
 * TODO: migrate to platform runtime write API when available.
 */
export async function updateLegacyTable(tableId, data) {
  return updateTable(tableId, data);
}

export async function updateLegacyTableRow(rowId, data) {
  return updateTableRow(rowId, data);
}
