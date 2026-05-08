export const getStableColumnId = (column) => {
  return String(
    column?.system_key ||
      column?.systemKey ||
      column?.id ||
      column?.key ||
      ""
  ).trim();
};

export const normalizeColumnId = (value) => {
  return String(value || "").trim();
};

export const normalizeIds = (value) => {
  if (!Array.isArray(value)) return [];

  return Array.from(
    new Set(
      value
        .map(normalizeColumnId)
        .filter(Boolean)
    )
  );
};

export const normalizeColumn = (column = {}) => {
  const stableId = getStableColumnId(column);

  return {
    ...column,
    id: stableId,
    key: stableId,
    stableId,
    stable_id: stableId,
  };
};

export const normalizeColumns = (columns = []) => {
  return Array.isArray(columns)
    ? columns.map(normalizeColumn).filter((column) => column.id)
    : [];
};

export const getVisibleColumns = ({
  columns = [],
  hiddenColumnIds = [],
}) => {
  const hiddenIds = new Set(normalizeIds(hiddenColumnIds));

  return normalizeColumns(columns).filter(
    (column) => !hiddenIds.has(getStableColumnId(column))
  );
};