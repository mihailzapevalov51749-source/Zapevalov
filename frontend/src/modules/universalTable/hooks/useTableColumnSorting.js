import { useState } from "react";

const getNextSortRules = (currentRules = [], columnId) => {
  const normalizedColumnId = String(columnId || "");
  if (!normalizedColumnId) return currentRules;

  const currentIndex = currentRules.findIndex(
    (rule) => String(rule?.columnId) === normalizedColumnId
  );

  if (currentIndex < 0) {
    return [...currentRules, { columnId: normalizedColumnId, direction: "asc" }];
  }

  const currentRule = currentRules[currentIndex];

  if (currentRule.direction === "asc") {
    return currentRules.map((rule, index) =>
      index === currentIndex ? { ...rule, direction: "desc" } : rule
    );
  }

  return currentRules.filter((_, index) => index !== currentIndex);
};

export default function useTableColumnSorting() {
  const [activeSort, setActiveSort] = useState("none");
  const [sortDirection, setSortDirection] = useState("asc");
  const [sortRules, setSortRules] = useState([]);

  const handleToggleColumnSort = (columnId) => {
    setActiveSort("none");
    setSortDirection("asc");
    setSortRules((currentRules) => getNextSortRules(currentRules, columnId));
  };

  const removeSortRuleByColumnId = (columnId) => {
    const normalizedColumnId = String(columnId || "");

    if (!normalizedColumnId) return;

    setSortRules((currentRules) =>
      currentRules.filter(
        (rule) => String(rule?.columnId) !== normalizedColumnId
      )
    );
  };

  const resetSort = () => {
    setActiveSort("none");
    setSortDirection("asc");
    setSortRules([]);
  };

  return {
    activeSort,
    setActiveSort,

    sortDirection,
    setSortDirection,

    sortRules,
    setSortRules,

    handleToggleColumnSort,
    removeSortRuleByColumnId,
    resetSort,
  };
}