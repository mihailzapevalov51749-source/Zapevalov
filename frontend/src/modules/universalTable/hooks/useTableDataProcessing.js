import { useEffect, useMemo } from "react";

import { normalizeConditionsForFiltering } from "../services/tableFilterUtils";
import { filterRows, sortRows } from "../services/tableViewUtils";

const getRowId = (row) => String(row?.id ?? "");

const getParentRowId = (row) => {
  return String(
    row?.parent_id ??
      row?.parentId ??
      row?.parent_row_id ??
      row?.parentRowId ??
      row?.values?.parent_id ??
      row?.values?.parentId ??
      ""
  );
};

const buildChildrenMap = (rows = []) => {
  const map = new Map();

  rows.forEach((row) => {
    const parentId = getParentRowId(row);
    if (!parentId) return;

    if (!map.has(parentId)) {
      map.set(parentId, []);
    }

    map.get(parentId).push(row);
  });

  return map;
};

const addDescendants = ({ sourceRows = [], baseRows = [] }) => {
  const resultMap = new Map();

  sourceRows.forEach((row) => {
    resultMap.set(getRowId(row), row);
  });

  const childrenMap = buildChildrenMap(baseRows);
  const queue = [...sourceRows];

  while (queue.length > 0) {
    const currentRow = queue.shift();
    const currentRowId = getRowId(currentRow);

    const children = childrenMap.get(currentRowId) || [];

    children.forEach((childRow) => {
      const childRowId = getRowId(childRow);

      if (resultMap.has(childRowId)) return;

      resultMap.set(childRowId, childRow);
      queue.push(childRow);
    });
  }

  return Array.from(resultMap.values());
};

export default function useTableDataProcessing({
  rows = [],
  columns = [],

  activeFilter = "all",
  activeConditions = [],

  baseConditions = null,
  quickFilterConditions = [],

  activeSort = "none",
  sortDirection = "asc",
  sortRules = [],

  forcedVisibleRowIds = new Set(),
  setForcedVisibleRowIds,
}) {
  const mergedConditions = useMemo(() => {
    const normalizedBaseConditions = Array.isArray(baseConditions)
      ? baseConditions
      : Array.isArray(activeConditions)
        ? activeConditions
        : [];

    const normalizedQuickFilterConditions = Array.isArray(quickFilterConditions)
      ? quickFilterConditions
      : [];

    return [...normalizedBaseConditions, ...normalizedQuickFilterConditions];
  }, [baseConditions, activeConditions, quickFilterConditions]);

  const effectiveActiveConditions = useMemo(() => {
    return normalizeConditionsForFiltering(mergedConditions, columns);
  }, [mergedConditions, columns]);

  const filteredRows = useMemo(() => {
    return filterRows({
      rows,
      columns,
      activeFilter,
      activeConditions: effectiveActiveConditions,
    });
  }, [rows, columns, activeFilter, effectiveActiveConditions]);

  const filteredRowsWithDescendants = useMemo(() => {
    return addDescendants({
      sourceRows: filteredRows,
      baseRows: rows,
    });
  }, [filteredRows, rows]);

  const filteredRowIds = useMemo(() => {
    return new Set(filteredRowsWithDescendants.map((row) => String(row.id)));
  }, [filteredRowsWithDescendants]);

  useEffect(() => {
    if (!setForcedVisibleRowIds) return;
    if (!forcedVisibleRowIds || forcedVisibleRowIds.size === 0) return;

    setForcedVisibleRowIds((prev) => {
      if (!prev || prev.size === 0) return prev;

      let changed = false;
      const next = new Set();

      prev.forEach((rowId) => {
        const normalizedRowId = String(rowId);

        if (filteredRowIds.has(normalizedRowId)) {
          changed = true;
          return;
        }

        next.add(normalizedRowId);
      });

      return changed ? next : prev;
    });
  }, [filteredRowIds, forcedVisibleRowIds, setForcedVisibleRowIds]);

  const mergedRows = useMemo(() => {
    if (!forcedVisibleRowIds || forcedVisibleRowIds.size === 0) {
      return filteredRowsWithDescendants;
    }

    const map = new Map();

    filteredRowsWithDescendants.forEach((row) => {
      map.set(String(row.id), row);
    });

    rows.forEach((row) => {
      const rowId = String(row.id);

      if (forcedVisibleRowIds.has(rowId)) {
        map.set(rowId, row);
      }
    });

    return Array.from(map.values());
  }, [filteredRowsWithDescendants, rows, forcedVisibleRowIds]);

  const visibleRows = useMemo(() => {
    return sortRows({
      rows: mergedRows,
      columns,
      activeSort,
      sortDirection,
      sortRules,
    });
  }, [mergedRows, columns, activeSort, sortDirection, sortRules]);

  return {
    effectiveActiveConditions,
    filteredRows,
    visibleRows,
  };
}