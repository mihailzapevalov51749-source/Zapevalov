import { useEffect, useMemo, useState } from "react";

export const SYSTEM_ROW_NUMBER_COLUMN_ID = "__row_number";

export const SYSTEM_COLUMN_IDS = {
  ROW_NUMBER: SYSTEM_ROW_NUMBER_COLUMN_ID,
  CREATED_BY: "created_by",
  UPDATED_BY: "updated_by",
  CREATED_AT: "created_at",
  UPDATED_AT: "updated_at",
};

const getSystemColumnSettings = (table, key) => {
  return table?.settings?.system_columns?.[key] || {};
};

const normalizeSystemLookup = (lookup) => ({
  showAvatar: lookup?.showAvatar !== false,
});

const createBaseSystemColumn = ({
  id,
  title,
  type,
  width,
  align = "left",
  settings = {},
}) => ({
  id,
  key: id,

  system_key: id,
  systemKey: id,

  title: settings.title || title,
  name: settings.title || title,

  type,
  width: Number(settings.width || width),
  required: false,

  system: true,
  isSystem: true,
  is_system: true,

  readonly: true,
  is_readonly: true,

  editable: true,
  is_editable: true,

  allow_title_edit: true,
  allow_width_edit: true,
  allow_align_edit: true,

  allow_type_edit: false,
  allow_required_edit: false,
  allow_options_edit: false,
  allow_lookup_edit: type === "user",
  allow_delete: false,

  align: settings.align || align,

  lookup: normalizeSystemLookup(settings.lookup),
});

export const createSystemRowNumberColumn = (settings = {}) =>
  createBaseSystemColumn({
    id: SYSTEM_COLUMN_IDS.ROW_NUMBER,
    title: "№",
    type: "system_row_number",
    width: 72,
    align: "center",
    settings,
  });

export const createSystemCreatedByColumn = (settings = {}) =>
  createBaseSystemColumn({
    id: SYSTEM_COLUMN_IDS.CREATED_BY,
    title: "Создатель",
    type: "user",
    width: 180,
    settings,
  });

export const createSystemUpdatedByColumn = (settings = {}) =>
  createBaseSystemColumn({
    id: SYSTEM_COLUMN_IDS.UPDATED_BY,
    title: "Изменил",
    type: "user",
    width: 180,
    settings,
  });

export const createSystemCreatedAtColumn = (settings = {}) =>
  createBaseSystemColumn({
    id: SYSTEM_COLUMN_IDS.CREATED_AT,
    title: "Дата создания",
    type: "datetime",
    width: 170,
    settings,
  });

export const createSystemUpdatedAtColumn = (settings = {}) =>
  createBaseSystemColumn({
    id: SYSTEM_COLUMN_IDS.UPDATED_AT,
    title: "Дата изменения",
    type: "datetime",
    width: 170,
    settings,
  });

export const createDefaultSystemColumns = (table) => [
  createSystemRowNumberColumn(
    getSystemColumnSettings(table, SYSTEM_COLUMN_IDS.ROW_NUMBER)
  ),
  createSystemCreatedByColumn(
    getSystemColumnSettings(table, SYSTEM_COLUMN_IDS.CREATED_BY)
  ),
  createSystemUpdatedByColumn(
    getSystemColumnSettings(table, SYSTEM_COLUMN_IDS.UPDATED_BY)
  ),
  createSystemCreatedAtColumn(
    getSystemColumnSettings(table, SYSTEM_COLUMN_IDS.CREATED_AT)
  ),
  createSystemUpdatedAtColumn(
    getSystemColumnSettings(table, SYSTEM_COLUMN_IDS.UPDATED_AT)
  ),
];

export const getColumnId = (column) =>
  String(column?.id ?? column?.key ?? "").trim();

export const getColumnSystemKey = (column) =>
  String(column?.system_key ?? column?.systemKey ?? "").trim();

export const isSystemColumn = (column) => {
  const columnId = getColumnId(column);
  const systemKey = getColumnSystemKey(column);

  return Boolean(
    systemKey ||
      column?.system ||
      column?.isSystem ||
      column?.is_system ||
      String(column?.type || "") === "system_row_number" ||
      Object.values(SYSTEM_COLUMN_IDS).includes(columnId)
  );
};

export const isRowNumberColumn = (column) => {
  return (
    getColumnSystemKey(column) === SYSTEM_COLUMN_IDS.ROW_NUMBER ||
    getColumnId(column) === SYSTEM_COLUMN_IDS.ROW_NUMBER ||
    String(column?.type || "") === "system_row_number"
  );
};

export const isExplicitPrimaryColumn = (column) => {
  return Boolean(
    getColumnSystemKey(column) === "title" ||
      column?.is_primary ||
      column?.isPrimary ||
      column?.settings?.is_primary ||
      column?.settings?.isPrimary
  );
};

export const getBusinessColumns = (columns = []) => {
  return columns.filter((column) => !isSystemColumn(column));
};

export const getPrimaryColumnId = (columns = []) => {
  const explicitPrimary = columns.find((column) =>
    isExplicitPrimaryColumn(column)
  );

  if (explicitPrimary) return getColumnId(explicitPrimary);

  const titlePrimary = columns.find(
    (column) =>
      !isSystemColumn(column) &&
      String(column?.title || column?.name || "")
        .trim()
        .toLowerCase() === "название"
  );

  if (titlePrimary) return getColumnId(titlePrimary);

  const fallback = columns.find((column) => !isSystemColumn(column));

  return fallback ? getColumnId(fallback) : "";
};

export const isColumnVisibilityLocked = (column, columns = []) => {
  const columnId = getColumnId(column);
  const primaryColumnId = getPrimaryColumnId(columns);

  if (!columnId) return true;
  if (columnId === primaryColumnId) return true;

  return Boolean(
    column?.lock_visibility ||
      column?.lockVisibility ||
      column?.settings?.lock_visibility ||
      column?.settings?.lockVisibility
  );
};

export const normalizeIds = (value) => {
  if (!Array.isArray(value)) return [];

  return Array.from(
    new Set(
      value
        .map((item) => String(item || "").trim())
        .filter(Boolean)
    )
  );
};

export const normalizeHiddenColumnIds = normalizeIds;
export const normalizeColumnOrder = normalizeIds;

export const areArraysEqual = (left = [], right = []) => {
  if (left.length !== right.length) return false;

  return left.every((item, index) => String(item) === String(right[index]));
};

export const getUniqueColumnsById = (columns = []) => {
  if (!Array.isArray(columns)) return [];

  const seen = new Set();

  return columns.filter((column) => {
    const columnId = getColumnId(column);

    if (!columnId || seen.has(columnId)) return false;

    seen.add(columnId);

    return true;
  });
};

export const buildBaseColumnsWithSystem = (columns = [], table = null) => {
  const safeColumns = Array.isArray(columns) ? columns : [];
  const systemColumns = createDefaultSystemColumns(table);

  const systemColumnByKey = new Map(
    systemColumns.map((column) => [getColumnSystemKey(column), column])
  );

  const patchedColumns = safeColumns.map((column) => {
    const systemKey = getColumnSystemKey(column);

    if (!systemKey) return column;

    const preparedSystemColumn = systemColumnByKey.get(systemKey);

    if (!preparedSystemColumn) return column;

    const originalColumnId = getColumnId(column);

    return {
      ...column,
      ...preparedSystemColumn,

      id: originalColumnId || preparedSystemColumn.id,
      key: originalColumnId || preparedSystemColumn.key,

      system_key: systemKey || preparedSystemColumn.system_key,
      systemKey: systemKey || preparedSystemColumn.systemKey,
    };
  });

  const existingSystemKeys = new Set(
    patchedColumns
      .map((column) => getColumnSystemKey(column))
      .filter(Boolean)
  );

  const missingSystemColumns = systemColumns.filter(
    (systemColumn) => !existingSystemKeys.has(getColumnSystemKey(systemColumn))
  );

  const allColumns = getUniqueColumnsById([
    ...patchedColumns,
    ...missingSystemColumns,
  ]);

  const rowNumberColumn = allColumns.find((column) => isRowNumberColumn(column));

  const businessColumns = allColumns.filter(
    (column) => !isSystemColumn(column) && !isRowNumberColumn(column)
  );

  const otherSystemColumns = allColumns.filter(
    (column) => isSystemColumn(column) && !isRowNumberColumn(column)
  );

  return getUniqueColumnsById([
    ...(rowNumberColumn ? [rowNumberColumn] : []),
    ...businessColumns,
    ...otherSystemColumns,
  ]);
};

export const enforceColumnOrderRules = (columns = []) => {
  const safeColumns = getUniqueColumnsById(columns);

  if (!safeColumns.length) return [];

  const rowNumberColumn = safeColumns.find((column) =>
    isRowNumberColumn(column)
  );

  const rowNumberColumnId = rowNumberColumn ? getColumnId(rowNumberColumn) : "";

  const primaryColumnId = getPrimaryColumnId(safeColumns);

  const withoutRowNumber = safeColumns.filter(
    (column) => getColumnId(column) !== rowNumberColumnId
  );

  const primaryIndex = withoutRowNumber.findIndex(
    (column) => getColumnId(column) === primaryColumnId
  );

  if (!primaryColumnId || primaryIndex <= 0) {
    return getUniqueColumnsById([
      ...(rowNumberColumn ? [rowNumberColumn] : []),
      ...withoutRowNumber,
    ]);
  }

  const columnsBeforePrimary = withoutRowNumber.slice(0, primaryIndex);
  const primaryColumn = withoutRowNumber[primaryIndex];
  const columnsAfterPrimary = withoutRowNumber.slice(primaryIndex + 1);

  return getUniqueColumnsById([
    ...(rowNumberColumn ? [rowNumberColumn] : []),
    primaryColumn,
    ...columnsBeforePrimary,
    ...columnsAfterPrimary,
  ]);
};

export const applyColumnOrder = (columns = [], columnOrder = []) => {
  const safeColumns = getUniqueColumnsById(columns);

  if (!safeColumns.length) return [];

  const normalizedOrder = normalizeColumnOrder(columnOrder);

  if (!normalizedOrder.length) {
    return enforceColumnOrderRules(safeColumns);
  }

  const columnById = new Map();

  safeColumns.forEach((column) => {
    columnById.set(getColumnId(column), column);
  });

  const orderedColumns = [];

  normalizedOrder.forEach((columnId) => {
    const column = columnById.get(String(columnId));

    if (column) {
      orderedColumns.push(column);
      columnById.delete(String(columnId));
    }
  });

  return enforceColumnOrderRules([
    ...orderedColumns,
    ...Array.from(columnById.values()),
  ]);
};

export const cleanColumnOrderByExistingColumns = ({
  columnOrder = [],
  currentColumnIds = [],
}) => {
  const normalizedCurrentOrder = normalizeColumnOrder(columnOrder);
  const existingIds = new Set(currentColumnIds.map(String));

  const cleanedOrder = normalizedCurrentOrder.filter((columnId) =>
    existingIds.has(String(columnId))
  );

  const missingIds = currentColumnIds.filter(
    (columnId) => !cleanedOrder.includes(String(columnId))
  );

  return normalizeColumnOrder([...cleanedOrder, ...missingIds]);
};

export default function useTableColumnVisibility({
  table = null,
  columns = [],
  tableViewState = null,
  onSortRulesChange,

  syncTableViewState,
  markCurrentViewDirty,
}) {
  const [localColumnOrder, setLocalColumnOrderState] = useState([]);
  const [hiddenColumnIdsState, setHiddenColumnIdsState] = useState([]);
  const [visibleColumnIdsState, setVisibleColumnIdsState] = useState([]);

  const baseColumnsWithSystem = useMemo(() => {
    return buildBaseColumnsWithSystem(columns, table);
  }, [columns, table]);

  const currentColumnIds = useMemo(() => {
    return baseColumnsWithSystem.map((column) => getColumnId(column));
  }, [baseColumnsWithSystem]);

  const effectiveColumnOrder = useMemo(() => {
    return cleanColumnOrderByExistingColumns({
      columnOrder: localColumnOrder,
      currentColumnIds,
    });
  }, [localColumnOrder, currentColumnIds]);

  const columnsWithSystem = useMemo(() => {
    return applyColumnOrder(baseColumnsWithSystem, effectiveColumnOrder);
  }, [baseColumnsWithSystem, effectiveColumnOrder]);

  const getVisibleIdsFromHiddenIds = (nextHiddenIds) => {
    const hiddenIdsSet = new Set(normalizeHiddenColumnIds(nextHiddenIds));

    return columnsWithSystem
      .map((column) => getColumnId(column))
      .filter((columnId) => {
        const column = columnsWithSystem.find(
          (item) => getColumnId(item) === columnId
        );

        if (!column) return false;

        if (isColumnVisibilityLocked(column, columnsWithSystem)) {
          return true;
        }

        return !hiddenIdsSet.has(columnId);
      });
  };

  const syncVisibilityState = ({
    hiddenColumnIds,
    columnOrder = effectiveColumnOrder,
  }) => {
    const normalizedHiddenIds = normalizeHiddenColumnIds(hiddenColumnIds);
    const normalizedColumnOrder = normalizeColumnOrder(columnOrder);
    const nextVisibleColumnIds = getVisibleIdsFromHiddenIds(normalizedHiddenIds);

    setVisibleColumnIdsState(nextVisibleColumnIds);

    const nextState = {
      hiddenColumnIds: normalizedHiddenIds,
      hiddenColumns: normalizedHiddenIds,
      hidden_fields: normalizedHiddenIds,
      columnsHidden: normalizedHiddenIds,

      visibleColumnIds: nextVisibleColumnIds,

      columnOrder: normalizedColumnOrder,
      columnsOrder: normalizedColumnOrder,
      visibleColumnOrder: normalizedColumnOrder,
      column_order: normalizedColumnOrder,
    };

    syncTableViewState?.(nextState);
    markCurrentViewDirty?.();

    return nextState;
  };

  const setHiddenColumnIds = (nextValue) => {
    setHiddenColumnIdsState((currentIds) => {
      const resolvedValue =
        typeof nextValue === "function"
          ? nextValue(normalizeHiddenColumnIds(currentIds))
          : nextValue;

      const nextHiddenIds = normalizeHiddenColumnIds(resolvedValue);

      syncVisibilityState({
        hiddenColumnIds: nextHiddenIds,
        columnOrder: effectiveColumnOrder,
      });

      return nextHiddenIds;
    });
  };

  const setVisibleColumnIds = (nextValue) => {
    const normalizedValue =
      typeof nextValue === "function"
        ? normalizeIds(nextValue(visibleColumnIdsState))
        : normalizeIds(nextValue);

    setVisibleColumnIdsState(normalizedValue);
  };

  const setLocalColumnOrder = (nextOrder) => {
    const normalizedOrder = normalizeColumnOrder(nextOrder);

    setLocalColumnOrderState(normalizedOrder);

    syncVisibilityState({
      hiddenColumnIds: hiddenColumnIdsState,
      columnOrder: normalizedOrder,
    });
  };

  const setColumnOrder = (nextOrder) => {
    setLocalColumnOrder(nextOrder);
  };

  const visibleColumnsWithSystem = useMemo(() => {
    const hiddenIds = new Set(hiddenColumnIdsState.map(String));

    return columnsWithSystem.filter((column) => {
      const columnId = getColumnId(column);

      if (isColumnVisibilityLocked(column, columnsWithSystem)) {
        return true;
      }

      return !hiddenIds.has(columnId);
    });
  }, [columnsWithSystem, hiddenColumnIdsState]);

  const effectiveVisibleColumnIds = useMemo(() => {
    return visibleColumnsWithSystem.map((column) => getColumnId(column));
  }, [visibleColumnsWithSystem]);

  const handleToggleColumnVisibility = (payload) => {
    const payloadIsObject =
      payload && typeof payload === "object" && !Array.isArray(payload);

    const normalizedColumnId = String(
      payloadIsObject
        ? payload.columnId || payload.id || payload.key || ""
        : payload || ""
    ).trim();

    const nextHiddenValue =
      payloadIsObject && typeof payload.hidden === "boolean"
        ? payload.hidden
        : null;

    if (!normalizedColumnId) return;

    const column = columnsWithSystem.find(
      (item) => getColumnId(item) === normalizedColumnId
    );

    if (!column) return;

    if (isColumnVisibilityLocked(column, columnsWithSystem)) {
      return;
    }

    setHiddenColumnIdsState((currentIds) => {
      let nextHiddenIds = normalizeHiddenColumnIds(currentIds);

      if (nextHiddenValue === true) {
        nextHiddenIds = normalizeHiddenColumnIds([
          ...nextHiddenIds,
          normalizedColumnId,
        ]);
      } else if (nextHiddenValue === false) {
        nextHiddenIds = nextHiddenIds.filter(
          (id) => String(id) !== normalizedColumnId
        );
      } else if (nextHiddenIds.includes(normalizedColumnId)) {
        nextHiddenIds = nextHiddenIds.filter(
          (id) => String(id) !== normalizedColumnId
        );
      } else {
        nextHiddenIds = normalizeHiddenColumnIds([
          ...nextHiddenIds,
          normalizedColumnId,
        ]);
      }

      syncVisibilityState({
        hiddenColumnIds: nextHiddenIds,
        columnOrder: effectiveColumnOrder,
      });

      return nextHiddenIds;
    });

    if (nextHiddenValue !== false) {
      onSortRulesChange?.((currentRules = []) =>
        currentRules.filter(
          (rule) => String(rule?.columnId) !== normalizedColumnId
        )
      );
    }
  };

  useEffect(() => {
    const nextHiddenIds = normalizeHiddenColumnIds(
      tableViewState?.hiddenColumnIds ||
        tableViewState?.hiddenColumns ||
        tableViewState?.hidden_fields ||
        tableViewState?.columnsHidden ||
        []
    );

    const nextColumnOrder = normalizeColumnOrder(
      tableViewState?.columnOrder ||
        tableViewState?.columnsOrder ||
        tableViewState?.visibleColumnOrder ||
        tableViewState?.column_order ||
        []
    );

    setHiddenColumnIdsState((currentIds) => {
      if (areArraysEqual(currentIds, nextHiddenIds)) {
        return currentIds;
      }

      return nextHiddenIds;
    });

    setLocalColumnOrderState((currentOrder) => {
      if (areArraysEqual(currentOrder, nextColumnOrder)) {
        return currentOrder;
      }

      return nextColumnOrder;
    });
  }, [tableViewState]);

  useEffect(() => {
    if (!currentColumnIds.length) return;

    setLocalColumnOrderState((currentOrder) => {
      const nextOrder = cleanColumnOrderByExistingColumns({
        columnOrder: currentOrder,
        currentColumnIds,
      });

      if (areArraysEqual(nextOrder, normalizeColumnOrder(currentOrder))) {
        return currentOrder;
      }

      return nextOrder;
    });
  }, [currentColumnIds]);

  useEffect(() => {
    const existingColumnIds = new Set(currentColumnIds.map(String));

    setHiddenColumnIdsState((currentIds) => {
      const normalizedCurrentIds = normalizeHiddenColumnIds(currentIds);

      const nextIds = normalizedCurrentIds.filter((columnId) =>
        existingColumnIds.has(String(columnId))
      );

      if (areArraysEqual(nextIds, normalizedCurrentIds)) {
        return currentIds;
      }

      return nextIds;
    });
  }, [currentColumnIds]);

  useEffect(() => {
    setVisibleColumnIdsState(effectiveVisibleColumnIds);
  }, [effectiveVisibleColumnIds]);

  return {
    SYSTEM_ROW_NUMBER_COLUMN_ID,

    baseColumnsWithSystem,
    columnsWithSystem,
    visibleColumnsWithSystem,

    localColumnOrder,
    setLocalColumnOrder,

    hiddenColumnIds: hiddenColumnIdsState,
    setHiddenColumnIds,

    visibleColumnIds: visibleColumnIdsState,
    setVisibleColumnIds,

    columnOrder: effectiveColumnOrder,
    setColumnOrder,

    handleToggleColumnVisibility,

    getColumnId,
    getColumnSystemKey,

    isSystemColumn,
    getBusinessColumns,
    getPrimaryColumnId,
    isColumnVisibilityLocked,
  };
}