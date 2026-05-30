export {
  DESIGNER_OBJECT_TYPE_TABS,
  DESIGNER_SCOPES,
  RUNTIME_SCOPES,
  SEARCH_MODES,
  SEARCH_SCOPE_DEPTH,
  SEARCH_SCOPE_LABELS,
  getSearchScopeDepth,
  getSearchScopeLabel,
  isDesignerScope,
  isRuntimeScope,
} from "./searchScopes.js";

export {
  SEARCH_CONTEXT_FIXTURES,
  isDesignerPathname,
  resolveSearchContext,
  resolveSearchMode,
} from "./searchContextResolver.js";

export {
  EMPTY_DESIGNER_RESPONSE,
  executeSearch,
} from "./searchExecutionAdapter.js";

export {
  RANK_CONTAINS,
  RANK_EXACT,
  RANK_NO_MATCH,
  RANK_STARTS_WITH,
  getTextMatchRank,
  normalizeSearchText,
  sortSearchResults,
} from "./textMatchRanking.js";

export { useHeaderSearchContext } from "./useHeaderSearchContext.js";
export {
  resolveExecutableScope,
  useHeaderSearchController,
} from "./useHeaderSearchController.js";
export {
  MIN_SEARCH_QUERY_LENGTH,
  SEARCH_DEBOUNCE_MS,
  getFirstNavigableSearchResult,
  isSearchQueryEligible,
  normalizeSearchQuery,
} from "./headerSearchQuery.js";
export { default as SearchResultsOverlay } from "./SearchResultsOverlay.jsx";
