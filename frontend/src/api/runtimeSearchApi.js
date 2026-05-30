import { platformApiClient } from "../modules/designer/api/platformApiClient.js";

/**
 * @param {{
 *   tenantId: number | string,
 *   query: string,
 *   scope: string,
 *   params?: Record<string, unknown>,
 *   limit?: number,
 * }} args
 */
export async function searchRuntime({
  tenantId,
  query,
  scope,
  params = {},
  limit = 20,
}) {
  const normalizedTenantId = Number(tenantId);
  if (!Number.isFinite(normalizedTenantId) || normalizedTenantId < 1) {
    throw new Error("runtimeSearchApi: tenantId is required");
  }

  const normalizedQuery = String(query ?? "").trim();
  if (!normalizedQuery) {
    throw new Error("runtimeSearchApi: query is required");
  }

  const response = await platformApiClient.post(
    `/runtime/search/tenants/${normalizedTenantId}`,
    {
      query: normalizedQuery,
      scope,
      params,
      limit,
    },
  );

  return response.data;
}
