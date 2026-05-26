import { createObjectListResult } from "../contracts/runtimeReadContracts";

function normalizeLegacyRows(tablePayload) {
  const rows =
    tablePayload?.rows ||
    tablePayload?.data?.rows ||
    tablePayload?.items ||
    tablePayload?.data?.items ||
    [];

  if (!Array.isArray(rows)) {
    return [];
  }

  return rows.map((row, index) => {
    const rowId = row?.id ?? row?.row_id ?? `legacy-row-${index}`;
    const values = row?.values && typeof row.values === "object" ? row.values : {};

    return {
      id: rowId,
      status: row?.status || "active",
      values,
      created_at: row?.created_at || row?.createdAt || new Date(0).toISOString(),
      updated_at: row?.updated_at || row?.updatedAt || row?.created_at || null,
    };
  });
}

export function mapLegacyTableToObjectList({
  tenantId,
  objectTypeKey,
  viewKey,
  tablePayload,
  limit = 20,
  offset = 0,
  warnings = [],
}) {
  const allRows = normalizeLegacyRows(tablePayload);
  const pageRows = allRows.slice(offset, offset + limit);

  return createObjectListResult({
    source: "legacy_table",
    tenantId,
    objectTypeKey,
    viewKey,
    items: pageRows,
    pagination: {
      limit,
      offset,
      total: allRows.length,
      has_more: offset + limit < allRows.length,
    },
    projection: null,
    warnings,
  });
}
