import { searchPlatform } from "../../api/platformSearchApi.js";
import { SEARCH_MODES } from "./searchScopes.js";
import { resolveRequestedSearchDomains, getCachedCurrentUser } from "./searchRoleUtils.js";
import { sortSearchResults } from "./textMatchRanking.js";

/**
 * @param {object | null | undefined} user
 * @param {string | undefined} mode
 */
export function resolveSearchExecutionDomains(user, mode) {
  return resolveRequestedSearchDomains(mode, user);
}

/**
 * @param {{
 *   query: string,
 *   searchContext: {
 *     mode?: string,
 *     scope?: string,
 *     params?: Record<string, unknown>,
 *   },
 *   user?: object,
 *   limit?: number,
 * }} args
 */
export async function executeSearch({ query, searchContext, user, limit = 20 }) {
  const normalizedQuery = String(query ?? "").trim();
  const context = searchContext ?? {};
  const mode = context.mode ?? context.searchMode ?? SEARCH_MODES.RUNTIME;

  if (!normalizedQuery) {
    throw new Error("executeSearch: query is required");
  }

  if (!context.scope && !context.searchScope) {
    throw new Error("executeSearch: searchContext.scope is required");
  }

  const scope = context.scope ?? context.searchScope;
  const params = context.params ?? {};

  const tenantId =
    params.tenantId ??
    params.tenant_id ??
    context.params?.tenantId ??
    context.params?.tenant_id;

  if (tenantId == null) {
    throw new Error("executeSearch: tenantId is required for platform search");
  }

  const requestedDomains = resolveRequestedSearchDomains(mode, user ?? getCachedCurrentUser());

  const response = await searchPlatform({
    tenantId,
    query: normalizedQuery,
    scope,
    currentMode: mode === SEARCH_MODES.DESIGNER ? "designer" : "runtime",
    params,
    requestedDomains,
    limit,
  });

  const results = sortSearchResults(response?.results ?? [], normalizedQuery);

  return {
    ...response,
    results,
  };
}
