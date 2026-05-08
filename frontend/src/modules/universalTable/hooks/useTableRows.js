import { useEffect, useMemo, useRef, useState } from "react";

const getRowParentId = (row) => {
  return row?.parent_id ?? row?.parentId ?? row?.parent_row_id ?? null;
};

const getRowsWithChildrenIds = (rows = []) => {
  const parentIds = new Set();

  rows.forEach((row) => {
    const parentId = getRowParentId(row);

    if (parentId !== null && parentId !== undefined && parentId !== "") {
      parentIds.add(String(parentId));
    }
  });

  return parentIds;
};

const readExpandedRowIdsFromStorage = (storageKey) => {
  try {
    const saved = localStorage.getItem(storageKey);
    if (!saved) return new Set();

    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed)) return new Set();

    return new Set(parsed.map(String));
  } catch {
    return new Set();
  }
};

export default function useTableRows({
  rows = [],
  tableId,
  blockId,
  tableInternalId,
  isLoading,
  onAfterChange,
}) {
  const skipNextExpandedSaveRef = useRef(false);

  const expandedStorageKey = useMemo(() => {
    const stableId = tableInternalId || tableId || blockId || "unknown";
    return `universal-table-expanded-${stableId}`;
  }, [tableInternalId, tableId, blockId]);

  const [expandedRowIds, setExpandedRowIds] = useState(() =>
    readExpandedRowIdsFromStorage(expandedStorageKey)
  );

  const rowsWithChildrenIds = useMemo(() => {
    return getRowsWithChildrenIds(rows);
  }, [rows]);

  const allTreeRowsExpanded = useMemo(() => {
    if (!rowsWithChildrenIds.size) return false;

    return Array.from(rowsWithChildrenIds).every((rowId) =>
      expandedRowIds.has(rowId)
    );
  }, [rowsWithChildrenIds, expandedRowIds]);

  useEffect(() => {
    skipNextExpandedSaveRef.current = true;
    setExpandedRowIds(readExpandedRowIdsFromStorage(expandedStorageKey));
  }, [expandedStorageKey]);

  useEffect(() => {
    if (skipNextExpandedSaveRef.current) {
      skipNextExpandedSaveRef.current = false;
      return;
    }

    try {
      localStorage.setItem(
        expandedStorageKey,
        JSON.stringify(Array.from(expandedRowIds))
      );
    } catch {
      // localStorage может быть недоступен
    }
  }, [expandedRowIds, expandedStorageKey]);

  useEffect(() => {
    if (isLoading) return;
    if (!rows.length) return;

    const existingIds = new Set(rows.map((row) => String(row.id)));

    setExpandedRowIds((prev) => {
      const next = new Set(
        Array.from(prev).filter((id) => existingIds.has(String(id)))
      );

      if (next.size === prev.size) return prev;

      return next;
    });
  }, [rows, isLoading]);

  const handleToggleExpandAll = (event) => {
    event?.preventDefault?.();
    event?.stopPropagation?.();

    setExpandedRowIds(() => {
      if (rowsWithChildrenIds.size && allTreeRowsExpanded) {
        return new Set();
      }

      return new Set(rowsWithChildrenIds);
    });

    requestAnimationFrame(() => {
      onAfterChange?.();
    });
  };

  const handleToggleRowExpanded = (rowId) => {
    if (rowId === null || rowId === undefined) return;

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

    requestAnimationFrame(() => {
      onAfterChange?.();
    });
  };

  const expandRow = (rowId) => {
    if (rowId === null || rowId === undefined) return;

    setExpandedRowIds((prev) => {
      const next = new Set(prev);
      next.add(String(rowId));
      return next;
    });

    requestAnimationFrame(() => {
      onAfterChange?.();
    });
  };

  return {
    expandedRowIds,
    setExpandedRowIds,
    rowsWithChildrenIds,
    allTreeRowsExpanded,
    handleToggleExpandAll,
    handleToggleRowExpanded,
    expandRow,
  };
}