export function getRowParentId(row) {
  return row?.parent_id ?? row?.parentId ?? row?.parent_row_id ?? null;
}

export function getRowStableId(row) {
  return row?.id ?? row?.rowId ?? row?.key ?? null;
}

/**
 * Computes dynamic display positions for visible rows (flat or tree).
 *
 * @param {object} [params]
 * @param {Array<object>} [params.rows]
 * @param {"tree" | "flat" | "none"} [params.mode]
 * @param {string} [params.separator]
 * @param {(row: object) => string | number | null | undefined} [params.getParentId]
 * @param {(row: object) => string | number | null | undefined} [params.getRowId]
 */
export function buildRowNumbers({
  rows = [],
  mode = "tree",
  separator = ".",
  getParentId = getRowParentId,
  getRowId = getRowStableId,
} = {}) {
  if (!Array.isArray(rows) || rows.length === 0) return {};

  const rowNumbers = {};

  if (mode === "none") {
    return rowNumbers;
  }

  if (mode === "flat") {
    rows.forEach((row, index) => {
      const rowId = getRowId(row);
      if (!rowId) return;

      rowNumbers[String(rowId)] = String(index + 1);
    });

    return rowNumbers;
  }

  const rowsById = new Map();
  const childrenByParentId = new Map();
  const rootRows = [];

  rows.forEach((row) => {
    const rowId = getRowId(row);
    if (!rowId) return;

    rowsById.set(String(rowId), row);
  });

  rows.forEach((row) => {
    const rowId = getRowId(row);
    if (!rowId) return;

    const parentId = getParentId(row);
    const normalizedParentId =
      parentId === null || parentId === undefined || parentId === ""
        ? null
        : String(parentId);

    if (!normalizedParentId || !rowsById.has(normalizedParentId)) {
      rootRows.push(row);
      return;
    }

    if (!childrenByParentId.has(normalizedParentId)) {
      childrenByParentId.set(normalizedParentId, []);
    }

    childrenByParentId.get(normalizedParentId).push(row);
  });

  const walkRows = (currentRows, prefix = "") => {
    currentRows.forEach((row, index) => {
      const rowId = getRowId(row);
      if (!rowId) return;

      const currentNumber = prefix
        ? `${prefix}${separator}${index + 1}`
        : String(index + 1);

      rowNumbers[String(rowId)] = currentNumber;

      const childRows = childrenByParentId.get(String(rowId)) || [];

      if (childRows.length > 0) {
        walkRows(childRows, currentNumber);
      }
    });
  };

  walkRows(rootRows);

  return rowNumbers;
}

export function getRowPositionNumber(row, rowNumbers = "") {
  const rowId = getRowStableId(row);
  if (!rowId) return "";

  return rowNumbers[String(rowId)] || "";
}

export function formatPersistentRowNumber(number, { prefix = "", pad = 5 } = {}) {
  if (number === null || number === undefined || number === "") return "";

  return `${prefix}${String(number).padStart(pad, "0")}`;
}
