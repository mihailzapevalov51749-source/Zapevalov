const normalizeLimit = (value) =>
  Math.max(0, Math.min(6, Number(value) || 0));

const normalizeIds = (value) =>
  Array.isArray(value)
    ? Array.from(
        new Set(
          value
            .map(String)
            .map((item) => item.trim())
            .filter(Boolean)
        )
      )
    : [];

const getColumnId = (column) =>
  String(column?.id ?? column?.key ?? "");

const getColumnTitle = (column) =>
  column?.title ||
  column?.name ||
  column?.label ||
  "Без названия";

const isSystemColumn = (column) =>
  column?.isSystem === true ||
  column?.is_system === true ||
  column?.system === true ||
  String(column?.type || "") === "system_row_number" ||
  getColumnId(column) === "__row_number";

const isLockedVisibilityColumn = (column) =>
  Boolean(
    column?.lock_visibility ||
      column?.lockVisibility ||
      column?.settings?.lock_visibility ||
      column?.settings?.lockVisibility ||
      column?.settings?.is_primary ||
      column?.settings?.isPrimary
  );

const getConditionsCount = (representation) => {
  const conditions =
    representation?.conditions ||
    representation?.activeConditions ||
    representation?.filters ||
    [];

  return Array.isArray(conditions)
    ? conditions.filter(Boolean).length
    : 0;
};

const getRepresentationConditions = (representation) => {
  const conditions =
    representation?.conditions ||
    representation?.activeConditions ||
    representation?.filters ||
    [];

  return Array.isArray(conditions)
    ? conditions.filter(Boolean)
    : [];
};

const getHiddenColumnIds = (
  representation,
  tableViewState = {},
  activeRepresentationId = null
) => {
  const representationId = String(
    representation?.id ||
      representation?.representationId ||
      representation?.key ||
      ""
  );

  const activeId = String(activeRepresentationId || "");

  const representationHiddenIds = normalizeIds(
    representation?.hiddenColumnIds ||
      representation?.hiddenColumns ||
      representation?.hidden_fields ||
      representation?.columnsHidden ||
      []
  );

  if (
    representationId &&
    activeId &&
    representationId === activeId &&
    Array.isArray(tableViewState?.hiddenColumnIds)
  ) {
    return normalizeIds(tableViewState.hiddenColumnIds);
  }

  return representationHiddenIds;
};

const getHiddenColumnsCount = (
  representation,
  tableViewState = {},
  activeRepresentationId = null
) =>
  getHiddenColumnIds(
    representation,
    tableViewState,
    activeRepresentationId
  ).length;

const hasRepresentationSort = (representation) => {
  const activeSort = representation?.activeSort;
  const sortRules = representation?.sortRules;

  if (Array.isArray(sortRules) && sortRules.length > 0) {
    return true;
  }

  return Boolean(activeSort && activeSort !== "none");
};

const getDefaultColumnOrder = (columns = []) =>
  [...(Array.isArray(columns) ? columns : [])]
    .filter(
      (column) =>
        column?.id !== undefined &&
        column?.id !== null
    )
    .sort(
      (a, b) =>
        Number(a.position || 0) -
        Number(b.position || 0)
    )
    .map((column) => String(column.id));

const getRepresentationColumnOrder = (
  representation,
  tableViewState = {},
  activeRepresentationId = null
) => {
  const representationId = String(
    representation?.id ||
      representation?.representationId ||
      representation?.key ||
      ""
  );

  const activeId = String(activeRepresentationId || "");

  const representationOrder = normalizeIds(
    representation?.columnOrder ||
      representation?.columnsOrder ||
      representation?.visibleColumnOrder ||
      representation?.column_order ||
      []
  );

  if (
    representationId &&
    activeId &&
    representationId === activeId &&
    Array.isArray(tableViewState?.columnOrder)
  ) {
    return normalizeIds(tableViewState.columnOrder);
  }

  return representationOrder;
};

const isSameOrder = (left = [], right = []) => {
  if (left.length !== right.length) {
    return false;
  }

  return left.every(
    (item, index) =>
      String(item) === String(right[index])
  );
};

const isColumnOrderChanged = (
  representation,
  columns = []
) => {
  const representationOrder =
    getRepresentationColumnOrder(
      representation,
      {},
      null
    );

  const defaultOrder = getDefaultColumnOrder(columns);

  if (!representationOrder.length) {
    return false;
  }

  if (!defaultOrder.length) {
    return true;
  }

  return !isSameOrder(representationOrder, defaultOrder);
};

const getColumnTitleById = (columns = [], columnId) => {
  const column = columns.find(
    (item) =>
      String(item?.id) === String(columnId)
  );

  return (
    column?.title ||
    column?.name ||
    `Поле ${columnId}`
  );
};

const getSortSummary = (representation, columns = []) => {
  const sortRules = Array.isArray(representation?.sortRules)
    ? representation.sortRules
    : [];

  if (sortRules.length > 0) {
    return sortRules
      .slice(0, 2)
      .map((rule) => {
        const columnId =
          rule?.columnId ||
          rule?.id ||
          rule?.field;

        const direction =
          rule?.direction ||
          rule?.sortDirection ||
          "asc";

        return `${getColumnTitleById(
          columns,
          columnId
        )} ${direction === "desc" ? "↓" : "↑"}`;
      })
      .join(", ");
  }

  const activeSort = representation?.activeSort;

  if (!activeSort || activeSort === "none") {
    return "Без сортировки";
  }

  return `${getColumnTitleById(
    columns,
    activeSort
  )} ${
    representation?.sortDirection === "desc"
      ? "↓"
      : "↑"
  }`;
};

const getRepresentationSettingsSummary = (
  representation,
  columns = [],
  tableViewState = {},
  activeRepresentationId = null
) => {
  const hiddenCount = getHiddenColumnsCount(
    representation,
    tableViewState,
    activeRepresentationId
  );

  const filtersCount = getConditionsCount(representation);

  const sortText = getSortSummary(representation, columns);

  const hasColumnOrder = isColumnOrderChanged(
    representation,
    columns
  );

  return [
    hiddenCount > 0
      ? `${hiddenCount} скрыто`
      : "все поля",

    filtersCount > 0
      ? `фильтры ${filtersCount}`
      : "без фильтра",

    sortText !== "Без сортировки"
      ? sortText
      : "без сортировки",

    hasColumnOrder
      ? "порядок"
      : "стандартный порядок",
  ].join(" · ");
};

const getFilterPreview = (
  representation,
  columns = []
) => {
  const conditions = getRepresentationConditions(
    representation
  );

  if (!conditions.length) {
    return ["Без фильтра"];
  }

  return conditions.slice(0, 3).map((condition) => {
    const columnId =
      condition?.columnId ||
      condition?.field ||
      condition?.id ||
      condition?.column_id;

    const operator =
      condition?.operator ||
      condition?.condition ||
      condition?.type ||
      "=";

    const value =
      condition?.value ??
      condition?.text ??
      condition?.query ??
      condition?.values ??
      "";

    const valueText = Array.isArray(value)
      ? value.join(", ")
      : String(value);

    return `${getColumnTitleById(
      columns,
      columnId
    )} ${operator} ${valueText}`;
  });
};

const getColumnOrderPreview = (
  representation,
  columns = []
) => {
  const order = getRepresentationColumnOrder(
    representation,
    {},
    null
  );

  const effectiveOrder = order.length
    ? order
    : getDefaultColumnOrder(columns);

  if (!effectiveOrder.length) {
    return ["Порядок не задан"];
  }

  return [
    effectiveOrder
      .slice(0, 4)
      .map((columnId) =>
        getColumnTitleById(columns, columnId)
      )
      .join(" → "),
  ];
};

export {
  normalizeLimit,
  normalizeIds,
  getColumnId,
  getColumnTitle,
  isSystemColumn,
  isLockedVisibilityColumn,
  getConditionsCount,
  getRepresentationConditions,
  getHiddenColumnIds,
  getHiddenColumnsCount,
  hasRepresentationSort,
  getDefaultColumnOrder,
  getRepresentationColumnOrder,
  isSameOrder,
  isColumnOrderChanged,
  getColumnTitleById,
  getSortSummary,
  getRepresentationSettingsSummary,
  getFilterPreview,
  getColumnOrderPreview,
};