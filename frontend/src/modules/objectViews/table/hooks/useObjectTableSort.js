import { useCallback } from "react";

import { getNextSortRules } from "../../services/sortRulesUtils";

/**
 * Single-column sort toggling via object view session.
 */
export default function useObjectTableSort({ effectiveContract, patchSession }) {
  const patchSortRules = useCallback(
    (nextRules) => {
      if (typeof patchSession !== "function") {
        return;
      }

      patchSession({ sortRules: nextRules });
    },
    [patchSession],
  );

  const toggleColumnSort = useCallback(
    (columnKey) => {
      const normalizedKey = String(columnKey || "").trim();

      if (!normalizedKey) {
        return;
      }

      const currentRules = effectiveContract?.query?.sort?.rules || [];
      patchSortRules(getNextSortRules(currentRules, normalizedKey));
    },
    [effectiveContract, patchSortRules],
  );

  return {
    toggleColumnSort,
  };
}
