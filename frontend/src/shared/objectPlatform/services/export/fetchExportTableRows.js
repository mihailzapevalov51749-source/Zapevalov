import { mapEntitiesToRows } from "../../../../modules/objectViews/table/services/adapters/mapEntityToRow";
import { enrichTableRowsWithRelationFields } from "../../../../modules/objectViews/services/enrichTableRowsWithRelationFields";
import { preloadRelationFieldStatesForPage } from "../../../../modules/objectViews/services/preloadRelationFieldStatesForPage";
import {
  buildExportRuntimeListParams,
  fetchExportRuntimeListPage,
  RUNTIME_QUERY_MAX_LIMIT,
} from "./exportRuntimeQuery";

export const EXPORT_PAGE_SIZE = RUNTIME_QUERY_MAX_LIMIT;
export const EXPORT_MAX_ROWS = 10_000;
const RELATION_PRELOAD_CHUNK_SIZE = 100;

/**
 * @param {string[]} entityIds
 * @param {number} chunkSize
 */
function chunkEntityIds(entityIds, chunkSize) {
  const chunks = [];

  for (let index = 0; index < entityIds.length; index += chunkSize) {
    chunks.push(entityIds.slice(index, index + chunkSize));
  }

  return chunks;
}

/**
 * @param {{
 *   tenantId: number | null,
 *   objectTypeKey: string,
 *   viewKey?: string | null,
 *   contract?: Record<string, unknown> | null,
 *   session?: Record<string, unknown>,
 *   columns?: Array<Record<string, unknown>>,
 *   relationColumns?: Array<Record<string, unknown>>,
 * }} params
 * @returns {Promise<import("../../../../shared/viewEngine/contracts").ViewEngineRow[]>}
 */
export async function fetchExportTableRows({
  tenantId,
  objectTypeKey,
  viewKey = null,
  contract = null,
  session = {},
  columns = [],
  relationColumns = [],
}) {
  const normalizedTenantId = Number(tenantId);
  const normalizedObjectTypeKey = String(objectTypeKey || "").trim();

  if (!normalizedTenantId || !normalizedObjectTypeKey) {
    return [];
  }

  const relationFieldKeys = new Set(
    relationColumns
      .map((column) => String(column?.key || "").trim())
      .filter(Boolean),
  );

  /** @type {import("../../../../shared/viewEngine/contracts").ViewEngineRow[]} */
  const allRows = [];
  let offset = 0;
  let total = Number.POSITIVE_INFINITY;
  let sortRejected = false;

  while (offset < total && allRows.length < EXPORT_MAX_ROWS) {
    const limit = Math.min(EXPORT_PAGE_SIZE, EXPORT_MAX_ROWS - allRows.length);

    const runtimeParams = buildExportRuntimeListParams({
      contract,
      pagination: { limit, offset },
      session,
    });

    const pageResult = await fetchExportRuntimeListPage({
      tenantId: normalizedTenantId,
      objectTypeKey: normalizedObjectTypeKey,
      viewKey,
      runtimeParams,
      sortRejected,
    });

    sortRejected = pageResult.sortRejected;
    const response = pageResult.response;

    const items = Array.isArray(response?.items) ? response.items : [];
    total = Number(response?.total ?? items.length);

    if (!items.length) {
      break;
    }

    let pageRows = mapEntitiesToRows(items, columns);

    if (relationColumns.length) {
      const entityIds = pageRows
        .map((row) => String(row?.id ?? "").trim())
        .filter(Boolean);

      const relationStateByKey = new Map();

      for (const chunk of chunkEntityIds(entityIds, RELATION_PRELOAD_CHUNK_SIZE)) {
        const chunkMap = await preloadRelationFieldStatesForPage({
          tenantId: normalizedTenantId,
          entityIds: chunk,
          relationColumns,
        });

        for (const [key, value] of chunkMap.entries()) {
          relationStateByKey.set(key, value);
        }
      }

      pageRows = enrichTableRowsWithRelationFields(
        pageRows,
        columns,
        relationStateByKey,
        relationFieldKeys,
      );
    }

    allRows.push(...pageRows);
    offset += items.length;

    if (items.length < limit) {
      break;
    }
  }

  return allRows;
}
