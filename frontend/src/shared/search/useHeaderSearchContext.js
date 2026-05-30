import { useMemo } from "react";

import { resolveSearchContext } from "./searchContextResolver.js";

/**
 * Memoized wrapper around resolveSearchContext for header search.
 * Caller must pass a memoized `input` object (useMemo in page layout).
 *
 * @param {object | null | undefined} input
 * @returns {ReturnType<typeof resolveSearchContext>}
 */
export function useHeaderSearchContext(input) {
  return useMemo(() => resolveSearchContext(input ?? {}), [input]);
}
