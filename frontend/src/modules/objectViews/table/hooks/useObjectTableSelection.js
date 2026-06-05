import { useCallback, useMemo, useState } from "react";

function normalizeEntityId(entityId) {
  return String(entityId ?? "").trim();
}

function normalizeVisibleRowIds(visibleRowIds) {
  const ids = [];

  for (const entityId of Array.isArray(visibleRowIds) ? visibleRowIds : []) {
    const normalized = normalizeEntityId(entityId);

    if (normalized) {
      ids.push(normalized);
    }
  }

  return ids;
}

/**
 * In-memory row selection for Object Table (current visible rows only).
 *
 * @param {Array<string | number>} visibleRowIds
 */
export default function useObjectTableSelection(visibleRowIds = []) {
  const [selectedIds, setSelectedIds] = useState(() => new Set());

  const visibleIds = useMemo(
    () => normalizeVisibleRowIds(visibleRowIds),
    [visibleRowIds],
  );

  const visibleIdSet = useMemo(() => new Set(visibleIds), [visibleIds]);

  const selectedCount = selectedIds.size;

  const visibleSelectedCount = useMemo(() => {
    let count = 0;

    for (const id of visibleIds) {
      if (selectedIds.has(id)) {
        count += 1;
      }
    }

    return count;
  }, [selectedIds, visibleIds]);

  const isAllVisibleSelected =
    visibleIds.length > 0 && visibleSelectedCount === visibleIds.length;

  const isSomeVisibleSelected =
    visibleSelectedCount > 0 && visibleSelectedCount < visibleIds.length;

  const isSelected = useCallback(
    (entityId) => selectedIds.has(normalizeEntityId(entityId)),
    [selectedIds],
  );

  const toggleSelection = useCallback((entityId) => {
    const id = normalizeEntityId(entityId);

    if (!id) {
      return;
    }

    setSelectedIds((current) => {
      const next = new Set(current);

      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }

      return next;
    });
  }, []);

  const selectAllVisible = useCallback(() => {
    setSelectedIds((current) => {
      const next = new Set(current);

      for (const id of visibleIds) {
        next.add(id);
      }

      return next;
    });
  }, [visibleIds]);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const clearVisibleSelection = useCallback(() => {
    setSelectedIds((current) => {
      const next = new Set(current);

      for (const id of visibleIds) {
        next.delete(id);
      }

      return next;
    });
  }, [visibleIds]);

  const toggleAllVisible = useCallback(() => {
    if (isAllVisibleSelected) {
      clearSelection();
      return;
    }

    selectAllVisible();
  }, [clearSelection, isAllVisibleSelected, selectAllVisible]);

  const headerChecked = isAllVisibleSelected;
  const headerIndeterminate = isSomeVisibleSelected;

  return {
    selectedIds,
    selectedCount,
    visibleSelectedCount,
    toggleSelection,
    selectAllVisible,
    clearSelection,
    clearVisibleSelection,
    isSelected,
    isAllVisibleSelected,
    isSomeVisibleSelected,
    toggleAllVisible,
    headerChecked,
    headerIndeterminate,
    visibleIdSet,
  };
}
