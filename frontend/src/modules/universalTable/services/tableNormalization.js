export const normalizeId = (value) => String(value ?? "").trim();

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

export const getColumnId = (column) =>
  String(column?.id ?? column?.key ?? "").trim();

export const normalizeColumn = (column = {}) => {
  const normalizedId = getColumnId(column);

  return {
    ...column,
    id: normalizedId,
    key: normalizedId,
  };
};

export const normalizeColumns = (columns = []) => {
  return Array.isArray(columns) ? columns.map(normalizeColumn) : [];
};

export const getPersistentRowNumber = (row) => {
  return (
    row?.number ??
    row?.system_number ??
    row?.systemNumber ??
    row?.row_number ??
    row?.rowNumber ??
    row?.id ??
    ""
  );
};

export const isQuickFilter = (filter) => {
  return Boolean(
    filter?.isQuick ??
      filter?.isQuickFilter ??
      filter?.is_quick ??
      filter?.quick ??
      false
  );
};