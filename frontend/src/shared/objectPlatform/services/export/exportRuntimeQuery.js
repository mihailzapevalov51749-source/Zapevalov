import { runtimeReadGateway } from "../../../../modules/runtimeReadGateway";
import { mapObjectViewQueryToRuntimeParams } from "../../../../modules/objectViews/services/mapObjectViewQueryToRuntimeParams";

/** Runtime query API allows limit in 1..200 (see backend validators.validate_limit). */
export const RUNTIME_QUERY_MAX_LIMIT = 200;

export const EXPORT_SORT_FALLBACK_WARN_MESSAGE =
  "Excel export fallback: runtime sort rejected";

/**
 * @param {unknown} error
 */
export function isRuntimeQueryValidationError(error) {
  return Number(error?.response?.status) === 422;
}

/**
 * @param {Record<string, unknown>} params
 */
export function omitRuntimeSortParams(params = {}) {
  const next = { ...params };
  delete next.sort;
  delete next.order;
  delete next.sorts;
  return next;
}

/**
 * Same mapper as Object Table, with export-safe page size cap.
 *
 * @param {{
 *   contract?: Record<string, unknown> | null,
 *   pagination?: { limit?: number, offset?: number },
 *   session?: Record<string, unknown>,
 * }} params
 */
export function buildExportRuntimeListParams({
  contract = null,
  pagination = {},
  session = {},
} = {}) {
  const requestedLimit = Number(pagination.limit) > 0 ? Number(pagination.limit) : 20;
  const safeLimit = Math.min(requestedLimit, RUNTIME_QUERY_MAX_LIMIT);

  const runtimeParams = mapObjectViewQueryToRuntimeParams({
    contract,
    pagination: {
      ...pagination,
      limit: safeLimit,
    },
    session,
  });

  return {
    ...runtimeParams,
    limit: safeLimit,
  };
}

/**
 * @param {Record<string, unknown>} runtimeParams
 */
export function hasRuntimeSortParams(runtimeParams = {}) {
  if (runtimeParams.sorts) {
    return true;
  }

  return Boolean(String(runtimeParams.sort || "").trim());
}

/**
 * @param {{
 *   tenantId: number,
 *   objectTypeKey: string,
 *   viewKey?: string | null,
 *   runtimeParams: Record<string, unknown>,
 *   sortRejected?: boolean,
 * }} params
 */
/**
 * @returns {Promise<{ response: Awaited<ReturnType<typeof runtimeReadGateway.getObjectList>>, sortRejected: boolean }>}
 */
export async function fetchExportRuntimeListPage({
  tenantId,
  objectTypeKey,
  viewKey = null,
  runtimeParams,
  sortRejected = false,
}) {
  const requestParams = sortRejected
    ? omitRuntimeSortParams(runtimeParams)
    : runtimeParams;

  try {
    const response = await runtimeReadGateway.getObjectList({
      tenantId,
      objectTypeKey,
      viewKey,
      ...requestParams,
    });

    return {
      response,
      sortRejected,
    };
  } catch (error) {
    if (
      !sortRejected &&
      isRuntimeQueryValidationError(error) &&
      hasRuntimeSortParams(runtimeParams)
    ) {
      console.warn(EXPORT_SORT_FALLBACK_WARN_MESSAGE);
      return fetchExportRuntimeListPage({
        tenantId,
        objectTypeKey,
        viewKey,
        runtimeParams,
        sortRejected: true,
      });
    }

    throw error;
  }
}
