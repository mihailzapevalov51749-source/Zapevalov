import { platformApiClient } from "../modules/designer/api/platformApiClient.js";

/**
 * @param {{
 *   tenantId: number | string,
 *   query: string,
 *   scope: string,
 *   currentMode?: "runtime" | "designer",
 *   params?: Record<string, unknown>,
 *   requestedDomains?: Array<"runtime" | "designer">,
 *   limit?: number,
 * }} args
 */
export async function searchPlatform({
  tenantId,
  query,
  scope,
  currentMode = "runtime",
  params = {},
  requestedDomains = ["runtime"],
  limit = 20,
}) {
  const normalizedTenantId = Number(tenantId);
  if (!Number.isFinite(normalizedTenantId) || normalizedTenantId < 1) {
    throw new Error("platformSearchApi: tenantId is required");
  }

  const normalizedQuery = String(query ?? "").trim();
  if (!normalizedQuery) {
    throw new Error("platformSearchApi: query is required");
  }

  const response = await platformApiClient.post(
    `/platform/search/tenants/${normalizedTenantId}`,
    {
      query: normalizedQuery,
      scope,
      currentMode,
      params,
      requestedDomains,
      limit,
    },
  );

  return response.data;
}
