import { useCallback, useEffect, useRef, useState } from "react";

import {
  MIN_SEARCH_QUERY_LENGTH,
  SEARCH_DEBOUNCE_MS,
  getFirstNavigableSearchResult,
  isSearchQueryEligible,
  normalizeSearchQuery,
} from "./headerSearchQuery.js";
import { executeSearch as defaultExecuteSearch } from "./searchExecutionAdapter.js";
import { RUNTIME_SCOPES } from "./searchScopes.js";

export {
  MIN_SEARCH_QUERY_LENGTH,
  SEARCH_DEBOUNCE_MS,
  getFirstNavigableSearchResult,
  isSearchQueryEligible,
  normalizeSearchQuery,
} from "./headerSearchQuery.js";

const SUPPORTED_RUNTIME_SCOPES = new Set([
  RUNTIME_SCOPES.COMPANY,
  RUNTIME_SCOPES.OBJECT_TYPE,
  RUNTIME_SCOPES.DOCUMENT_LIBRARY,
  RUNTIME_SCOPES.DOCUMENT_FOLDER,
]);

const SUPPORTED_DESIGNER_SCOPES = new Set([
  "designer.workspace",
  "designer.object_type",
  "designer.fields",
  "designer.views",
  "designer.relations",
]);

export function resolveExecutableScope(searchContext) {
  const scope = searchContext?.scope ?? searchContext?.searchScope;
  if (SUPPORTED_RUNTIME_SCOPES.has(scope) || SUPPORTED_DESIGNER_SCOPES.has(scope)) {
    return scope;
  }

  if (scope === RUNTIME_SCOPES.SECTION) {
    return RUNTIME_SCOPES.COMPANY;
  }

  return scope;
}

/**
 * @param {string} query
 * @param {object} searchContext
 * @param {number} requestId
 * @param {typeof defaultExecuteSearch} executeSearchFn
 * @param {number} limit
 */
async function executeHeaderSearchRequest({
  query,
  searchContext,
  requestId,
  requestIdRef,
  executeSearchFn,
  limit,
  user,
}) {
  const context = searchContext;
  if (!context?.scope) {
    return {
      kind: "error",
      message: "Не удалось определить область поиска",
    };
  }

  const executableScope = resolveExecutableScope(context);

  try {
    const response = await executeSearchFn({
      query,
      searchContext: {
        ...context,
        scope: executableScope,
        searchScope: executableScope,
      },
      user,
      limit,
    });

    if (requestIdRef.current !== requestId) {
      return { kind: "stale" };
    }

    return {
      kind: "success",
      results: Array.isArray(response?.results) ? response.results : [],
    };
  } catch (searchError) {
    if (requestIdRef.current !== requestId) {
      return { kind: "stale" };
    }

    const message =
      searchError?.response?.data?.detail ||
      searchError?.message ||
      "Ошибка поиска";

    return {
      kind: "error",
      message: typeof message === "string" ? message : "Ошибка поиска",
    };
  }
}

/**
 * @param {{
 *   searchContext: object,
 *   enabled?: boolean,
 *   user?: object,
 *   executeSearchFn?: typeof defaultExecuteSearch,
 *   limit?: number,
 *   debounceMs?: number,
 * }} options
 */
export function useHeaderSearchController({
  searchContext,
  enabled = true,
  user = null,
  executeSearchFn = defaultExecuteSearch,
  limit = 20,
  debounceMs = SEARCH_DEBOUNCE_MS,
}) {
  const [searchQuery, setSearchQueryState] = useState("");
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [isOverlayOpen, setIsOverlayOpen] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const requestIdRef = useRef(0);
  const debounceTimerRef = useRef(null);
  const searchContextRef = useRef(searchContext);
  searchContextRef.current = searchContext;
  const userRef = useRef(user);
  userRef.current = user;

  const cancelDebouncedSearch = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
  }, []);

  const resetSearchState = useCallback(() => {
    requestIdRef.current += 1;
    cancelDebouncedSearch();
    setResults([]);
    setError("");
    setIsLoading(false);
    setHasSearched(false);
    setIsOverlayOpen(false);
  }, [cancelDebouncedSearch]);

  const runSearch = useCallback(
    async (rawQuery) => {
      const query = normalizeSearchQuery(rawQuery);
      if (!enabled || !isSearchQueryEligible(query)) {
        return;
      }

      const context = searchContextRef.current;
      const requestId = requestIdRef.current + 1;
      requestIdRef.current = requestId;

      setIsOverlayOpen(true);
      setIsLoading(true);
      setError("");
      setHasSearched(true);

      const outcome = await executeHeaderSearchRequest({
        query,
        searchContext: context,
        requestId,
        requestIdRef,
        executeSearchFn,
        limit,
        user: userRef.current,
      });

      if (outcome.kind === "stale") {
        return;
      }

      if (outcome.kind === "error") {
        setError(outcome.message);
        setResults([]);
        setIsLoading(false);
        return;
      }

      setResults(outcome.results);
      setIsLoading(false);
    },
    [enabled, executeSearchFn, limit],
  );

  const onQueryChange = useCallback(
    (nextQuery) => {
      const value = String(nextQuery ?? "");
      setSearchQueryState(value);

      const trimmed = normalizeSearchQuery(value);
      if (!isSearchQueryEligible(trimmed)) {
        resetSearchState();
        return;
      }

      cancelDebouncedSearch();
      debounceTimerRef.current = setTimeout(() => {
        debounceTimerRef.current = null;
        runSearch(trimmed);
      }, debounceMs);
    },
    [cancelDebouncedSearch, debounceMs, resetSearchState, runSearch],
  );

  const setSearchQuery = useCallback(
    (nextValue) => {
      onQueryChange(nextValue);
    },
    [onQueryChange],
  );

  const closeResults = useCallback(() => {
    setIsOverlayOpen(false);
  }, []);

  const clearResults = useCallback(() => {
    setSearchQueryState("");
    resetSearchState();
  }, [resetSearchState]);

  const submitSearch = useCallback(async () => {
    const query = normalizeSearchQuery(searchQuery);
    if (!enabled || !isSearchQueryEligible(query)) {
      return;
    }

    cancelDebouncedSearch();
    await runSearch(query);
  }, [cancelDebouncedSearch, enabled, runSearch, searchQuery]);

  const openFirstResult = useCallback(() => {
    const first = getFirstNavigableSearchResult(results);
    return first?.path ?? null;
  }, [results]);

  useEffect(
    () => () => {
      cancelDebouncedSearch();
    },
    [cancelDebouncedSearch],
  );

  const trimmedQueryLength = normalizeSearchQuery(searchQuery).length;
  const isOverlayVisible =
    trimmedQueryLength >= MIN_SEARCH_QUERY_LENGTH &&
    isOverlayOpen &&
    (isLoading || hasSearched);

  return {
    searchQuery,
    setSearchQuery,
    onQueryChange,
    results,
    isLoading,
    error,
    hasSearched,
    isOverlayOpen,
    isOverlayVisible,
    submitSearch,
    openFirstResult,
    clearResults,
    closeResults,
  };
}
