import { useCallback } from "react";

import { getNextSortRules } from "../../services/sortRulesUtils";

/**
 * Sort toggling via object view session (single rule MVP).
 */
export default function useObjectTableSort({ effectiveContract, patchSession }) {
  const toggleColumnSort = useCallback(
    (columnKey) => {
      const normalizedKey = String(columnKey || "").trim();

      if (!normalizedKey || typeof patchSession !== "function") {
        return;
      }

      const currentRules = effectiveContract?.query?.sort?.rules || [];
      const nextRules = getNextSortRules(currentRules, normalizedKey);

      patchSession({ sortRules: nextRules });
    },
    [effectiveContract, patchSession],
  );

  return {
    toggleColumnSort,
  };
}
