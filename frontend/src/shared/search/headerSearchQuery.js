export const MIN_SEARCH_QUERY_LENGTH = 2;
export const SEARCH_DEBOUNCE_MS = 400;

export function normalizeSearchQuery(query) {
  return String(query ?? "").trim();
}

export function isSearchQueryEligible(
  query,
  minLength = MIN_SEARCH_QUERY_LENGTH,
) {
  return normalizeSearchQuery(query).length >= minLength;
}

export function getFirstNavigableSearchResult(results) {
  if (!Array.isArray(results)) {
    return null;
  }

  for (const result of results) {
    if (result && typeof result === "object" && typeof result.path === "string") {
      const path = result.path.trim();
      if (path) {
        return result;
      }
    }
  }

  return null;
}
