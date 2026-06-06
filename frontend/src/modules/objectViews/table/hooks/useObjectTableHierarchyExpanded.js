import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  buildObjectTableHierarchyExpandedStorageKey,
  readExpandedRowIdsFromStorage,
  writeExpandedRowIdsToStorage,
} from "./objectTableHierarchyExpandedStorage.js";

/**
 * Expanded row state for Object Table hierarchy tree (UX aligned with Universal Table).
 */
export default function useObjectTableHierarchyExpanded({
  tenantId,
  objectTypeKey,
  viewKey,
  rowIds = [],
  enabled = true,
}) {
  const skipNextSaveRef = useRef(false);

  const expandedStorageKey = useMemo(
    () =>
      buildObjectTableHierarchyExpandedStorageKey({
        tenantId,
        objectTypeKey,
        viewKey,
      }),
    [tenantId, objectTypeKey, viewKey],
  );

  const [expandedRowIds, setExpandedRowIds] = useState(() =>
    enabled
      ? readExpandedRowIdsFromStorage(expandedStorageKey)
      : new Set(),
  );

  useEffect(() => {
    if (!enabled) {
      return;
    }

    skipNextSaveRef.current = true;
    setExpandedRowIds(readExpandedRowIdsFromStorage(expandedStorageKey));
  }, [enabled, expandedStorageKey]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    if (skipNextSaveRef.current) {
      skipNextSaveRef.current = false;
      return;
    }

    writeExpandedRowIdsToStorage(expandedStorageKey, expandedRowIds);
  }, [enabled, expandedRowIds, expandedStorageKey]);

  useEffect(() => {
    if (!enabled || !rowIds.length) {
      return;
    }

    const existingIds = new Set(rowIds.map(String));

    setExpandedRowIds((prev) => {
      const next = new Set(
        Array.from(prev).filter((id) => existingIds.has(String(id))),
      );

      return next.size === prev.size ? prev : next;
    });
  }, [enabled, rowIds]);

  const toggleRowExpanded = useCallback((rowId) => {
    if (rowId == null || rowId === "") {
      return;
    }

    setExpandedRowIds((prev) => {
      const next = new Set(prev);
      const id = String(rowId);

      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }

      return next;
    });
  }, []);

  const expandRow = useCallback((rowId) => {
    if (rowId == null || rowId === "") {
      return;
    }

    setExpandedRowIds((prev) => {
      const next = new Set(prev);
      next.add(String(rowId));
      return next;
    });
  }, []);

  const expandAll = useCallback((rowIds = []) => {
    const normalized = Array.isArray(rowIds)
      ? rowIds.map(String).filter((id) => id.trim() !== "")
      : [];

    if (!normalized.length) {
      return;
    }

    setExpandedRowIds(new Set(normalized));
  }, []);

  const collapseAll = useCallback(() => {
    setExpandedRowIds(new Set());
  }, []);

  return {
    expandedRowIds,
    toggleRowExpanded,
    expandRow,
    expandAll,
    collapseAll,
  };
}
