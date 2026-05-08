const EMPTY_LOOKUP_VALUE = "__EMPTY_LOOKUP__";

const isSameDay = (dateA, dateB) => {
  if (!dateA || !dateB) return false;

  return (
    dateA.getFullYear() === dateB.getFullYear() &&
    dateA.getMonth() === dateB.getMonth() &&
    dateA.getDate() === dateB.getDate()
  );
};

const getStartOfDay = (date) => {
  const nextDate = new Date(date);
  nextDate.setHours(0, 0, 0, 0);
  return nextDate;
};

const getRawCellValue = (row, columnId) => {
  if (!row || !columnId) return "";

  return (
    row.values?.[columnId] ??
    row.values?.[String(columnId)] ??
    row[columnId] ??
    row[String(columnId)] ??
    ""
  );
};

const isEmptyValue = (value) => {
  if (value === null || value === undefined || value === "") return true;
  if (Array.isArray(value)) return value.length === 0;

  if (typeof value === "object") {
    const possibleValue =
      value.id ??
      value.value ??
      value.rowId ??
      value.row_id ??
      value.lookupId ??
      value.lookup_id ??
      "";

    return (
      possibleValue === null ||
      possibleValue === undefined ||
      possibleValue === ""
    );
  }

  return false;
};

const normalizeCellValue = (value) => {
  if (value === null || value === undefined) return "";

  if (value instanceof Date) return value;

  if (Array.isArray(value)) {
    return value
      .map((item) => normalizeCellValue(item))
      .filter(Boolean)
      .join(", ");
  }

  if (typeof value === "object") {
    return String(
      value.label ||
        value.displayValue ||
        value.display_value ||
        value.title ||
        value.name ||
        value.full_name ||
        value.fullName ||
        value.email ||
        value.value ||
        value.id ||
        ""
    );
  }

  return value;
};

const getComparableCellValue = (row, columnId) => {
  return normalizeCellValue(getRawCellValue(row, columnId));
};

const extractComparableValues = (value) => {
  if (value === null || value === undefined || value === "") return [];

  if (value instanceof Date) {
    return [
      value.toISOString().slice(0, 10).toLowerCase().trim(),
      value.toISOString().toLowerCase().trim(),
    ];
  }

  if (Array.isArray(value)) {
    return value.flatMap((item) => extractComparableValues(item));
  }

  if (typeof value === "object") {
    return [
      value.id,
      value.value,
      value.rowId,
      value.row_id,
      value.lookupId,
      value.lookup_id,
      value.key,
      value.label,
      value.displayValue,
      value.display_value,
      value.title,
      value.name,
      value.full_name,
      value.fullName,
      value.email,
      value.user_id,
      value.userId,
    ]
      .filter((item) => item !== null && item !== undefined && item !== "")
      .map((item) => String(item).toLowerCase().trim());
  }

  return [String(value).toLowerCase().trim()];
};

const extractUserComparableValues = (value) => {
  if (value === null || value === undefined || value === "") return [];

  if (Array.isArray(value)) {
    return value.flatMap((item) => extractUserComparableValues(item));
  }

  if (typeof value === "object") {
    return [
      value.id,
      value.user_id,
      value.userId,
      value.key,
      value.value,
      value.label,
      value.title,
      value.name,
      value.full_name,
      value.fullName,
      value.email,
    ]
      .filter((item) => item !== null && item !== undefined && item !== "")
      .map((item) => String(item).toLowerCase().trim());
  }

  return [String(value).toLowerCase().trim()];
};

const parseDateValue = (value) => {
  if (!value) return null;

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    return getStartOfDay(value);
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return null;

  return getStartOfDay(date);
};

const parseNumberValue = (value) => {
  if (value === null || value === undefined || value === "") return null;

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  const normalizedValue = String(value).replace(",", ".").trim();
  const parsedValue = Number(normalizedValue);

  return Number.isFinite(parsedValue) ? parsedValue : null;
};

const getDateValueFromRow = (row, columns = []) => {
  if (!row?.values) return null;

  const dueColumn = columns.find((column) => {
    const title = String(column?.title || "").toLowerCase();

    return (
      column?.type === "date" ||
      column?.type === "datetime" ||
      title.includes("срок") ||
      title.includes("дата") ||
      title.includes("due")
    );
  });

  const rawValue = dueColumn
    ? row.values?.[dueColumn.id] ?? row.values?.[String(dueColumn.id)]
    : row.values?.due_date || row.values?.dueDate || row.due_date || row.dueDate;

  return parseDateValue(rawValue);
};

const getTextValueFromRow = (row, columns = []) => {
  const titleColumn =
    columns.find((column) => {
      const title = String(column?.title || "").toLowerCase();

      return (
        title.includes("задача") ||
        title.includes("название") ||
        title.includes("title") ||
        title.includes("name")
      );
    }) || columns[0];

  const rawValue = titleColumn
    ? row?.values?.[titleColumn.id]
    : row?.title || row?.name || "";

  return String(normalizeCellValue(rawValue));
};

const getStatusValueFromRow = (row, columns = []) => {
  const statusColumn = columns.find((column) => {
    const title = String(column?.title || "").toLowerCase();

    return (
      column?.type === "status" ||
      title.includes("статус") ||
      title.includes("status")
    );
  });

  const rawValue = statusColumn
    ? row?.values?.[statusColumn.id]
    : row?.values?.status || row?.status || "";

  return String(normalizeCellValue(rawValue));
};

const normalizeColumnType = (type) => {
  const normalizedType = String(type || "text").toLowerCase();

  if (["number", "numeric", "integer", "float"].includes(normalizedType)) {
    return "number";
  }

  if (["date", "datetime"].includes(normalizedType)) {
    return "date";
  }

  if (["boolean", "bool", "checkbox"].includes(normalizedType)) {
    return "boolean";
  }

  if (
    [
      "choice",
      "multi_choice",
      "status",
      "select",
      "option",
      "user",
      "users",
      "relation",
      "relations",
      "lookup",
      "file",
      "files",
      "system_row_number",
    ].includes(normalizedType)
  ) {
    return normalizedType;
  }

  return "text";
};

const getColumnById = (columns = [], columnId) => {
  return columns.find(
    (column) =>
      String(column?.id ?? column?.key ?? "") === String(columnId ?? "")
  );
};

const getSortComparableValue = (row, column, columns = []) => {
  const columnId = String(column?.id ?? column?.key ?? "");
  const columnType = normalizeColumnType(column?.type);

  if (columnId === "date") return getDateValueFromRow(row, columns);
  if (columnId === "status") return getStatusValueFromRow(row, columns);
  if (columnId === "title") return getTextValueFromRow(row, columns);

  const rawValue = getRawCellValue(row, columnId);

  if (columnType === "date" || columnType === "datetime") {
    return parseDateValue(rawValue);
  }

  if (columnType === "number" || columnType === "system_row_number") {
    return parseNumberValue(rawValue);
  }

  if (columnType === "boolean") {
    if (rawValue === null || rawValue === undefined || rawValue === "") {
      return null;
    }

    return rawValue === true || rawValue === "true" || rawValue === 1 ? 1 : 0;
  }

  return normalizeCellValue(rawValue);
};

const compareValues = (left, right, direction = "asc") => {
  const multiplier = direction === "desc" ? -1 : 1;

  const isLeftEmpty = left === null || left === undefined || left === "";
  const isRightEmpty = right === null || right === undefined || right === "";

  if (isLeftEmpty && isRightEmpty) return 0;
  if (isLeftEmpty) return 1;
  if (isRightEmpty) return -1;

  if (left instanceof Date && right instanceof Date) {
    return (left.getTime() - right.getTime()) * multiplier;
  }

  if (typeof left === "number" && typeof right === "number") {
    return (left - right) * multiplier;
  }

  return (
    String(left).localeCompare(String(right), "ru", {
      numeric: true,
      sensitivity: "base",
    }) * multiplier
  );
};

const normalizeSortRules = (sortRules = []) => {
  if (!Array.isArray(sortRules)) return [];

  return sortRules
    .map((rule) => ({
      columnId: String(rule?.columnId ?? rule?.id ?? rule?.key ?? ""),
      direction: rule?.direction === "desc" ? "desc" : "asc",
    }))
    .filter((rule) => Boolean(rule.columnId));
};

const isDateOperator = (operator) => {
  return [
    "before",
    "after",
    "before_today",
    "after_today",
    "today",
    "yesterday",
    "tomorrow",
    "this_week",
    "next_week",
    "last_week",
    "between",
  ].includes(operator);
};

const addDays = (date, days) => {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return getStartOfDay(nextDate);
};

const getStartOfWeek = (date) => {
  const nextDate = getStartOfDay(date);
  const day = nextDate.getDay();
  const diff = day === 0 ? -6 : 1 - day;

  nextDate.setDate(nextDate.getDate() + diff);
  return getStartOfDay(nextDate);
};

const getRowParentId = (row) => {
  return row?.parent_id ?? row?.parentId ?? row?.parent_row_id ?? null;
};

const getRowStableId = (row) => {
  return row?.id ?? row?.rowId ?? row?.key ?? null;
};

const checkDateCondition = (rowDate, condition) => {
  const cellDate = parseDateValue(rowDate);

  if (condition.operator === "empty") return !cellDate;
  if (condition.operator === "not_empty") return Boolean(cellDate);

  if (!cellDate) return false;

  const today = getStartOfDay(new Date());
  const yesterday = addDays(today, -1);
  const tomorrow = addDays(today, 1);
  const currentWeekStart = getStartOfWeek(today);
  const currentWeekEnd = addDays(currentWeekStart, 6);
  const nextWeekStart = addDays(currentWeekStart, 7);
  const nextWeekEnd = addDays(nextWeekStart, 6);
  const lastWeekStart = addDays(currentWeekStart, -7);
  const lastWeekEnd = addDays(lastWeekStart, 6);

  if (condition.operator === "today") return isSameDay(cellDate, today);
  if (condition.operator === "yesterday") return isSameDay(cellDate, yesterday);
  if (condition.operator === "tomorrow") return isSameDay(cellDate, tomorrow);
  if (condition.operator === "before_today") return cellDate < today;
  if (condition.operator === "after_today") return cellDate > today;

  if (condition.operator === "this_week") {
    return cellDate >= currentWeekStart && cellDate <= currentWeekEnd;
  }

  if (condition.operator === "next_week") {
    return cellDate >= nextWeekStart && cellDate <= nextWeekEnd;
  }

  if (condition.operator === "last_week") {
    return cellDate >= lastWeekStart && cellDate <= lastWeekEnd;
  }

  if (condition.operator === "between") {
    const fromDate = parseDateValue(condition.value?.from);
    const toDate = parseDateValue(condition.value?.to);

    if (fromDate && toDate) return cellDate >= fromDate && cellDate <= toDate;
    if (fromDate) return cellDate >= fromDate;
    if (toDate) return cellDate <= toDate;

    return true;
  }

  const filterDate = parseDateValue(condition.value);

  if (!filterDate) return true;

  if (condition.operator === "equals") return isSameDay(cellDate, filterDate);
  if (condition.operator === "not_equals") {
    return !isSameDay(cellDate, filterDate);
  }

  if (condition.operator === "before" || condition.operator === "less") {
    return cellDate < filterDate;
  }

  if (condition.operator === "after" || condition.operator === "greater") {
    return cellDate > filterDate;
  }

  return true;
};

const checkUserCondition = (rawValue, condition) => {
  const cellValues = extractUserComparableValues(rawValue);
  const filterValues = extractUserComparableValues(condition.value);

  if (condition.operator === "empty") {
    return cellValues.length === 0 || cellValues.every((value) => !value);
  }

  if (condition.operator === "not_empty") {
    return cellValues.some((value) => Boolean(value));
  }

  if (!filterValues.length) return true;

  if (condition.operator === "equals") {
    return filterValues.some((filterValue) =>
      cellValues.some((cellValue) => cellValue === filterValue)
    );
  }

  if (condition.operator === "not_equals") {
    return filterValues.every((filterValue) =>
      cellValues.every((cellValue) => cellValue !== filterValue)
    );
  }

  if (condition.operator === "contains") {
    return filterValues.some((filterValue) =>
      cellValues.some((cellValue) => cellValue.includes(filterValue))
    );
  }

  return true;
};

const isUserFilterValue = (value) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;

  return Boolean(
    value.id ||
      value.user_id ||
      value.userId ||
      value.email ||
      value.full_name ||
      value.fullName
  );
};

const checkCondition = (row, condition) => {
  if (!condition?.columnId || !condition?.operator) return true;

  const rawValue = getRawCellValue(row, condition.columnId);

  if (condition.value === EMPTY_LOOKUP_VALUE) {
    if (condition.operator === "not_equals") {
      return !isEmptyValue(rawValue);
    }

    return isEmptyValue(rawValue);
  }

  if (isUserFilterValue(condition.value)) {
    return checkUserCondition(rawValue, condition);
  }

  if (isDateOperator(condition.operator)) {
    return checkDateCondition(rawValue, condition);
  }

  const comparableValues = extractComparableValues(rawValue);
  const filterValues = extractComparableValues(condition.value);
  const hasFilterValues = filterValues.length > 0;

  if (condition.operator === "contains") {
    if (!hasFilterValues) return true;

    return filterValues.some((filterValue) =>
      comparableValues.some((cellValue) => cellValue.includes(filterValue))
    );
  }

  if (condition.operator === "not_contains") {
    if (!hasFilterValues) return true;

    return filterValues.every((filterValue) =>
      comparableValues.every((cellValue) => !cellValue.includes(filterValue))
    );
  }

  if (condition.operator === "starts_with") {
    if (!hasFilterValues) return true;

    return filterValues.some((filterValue) =>
      comparableValues.some((cellValue) => cellValue.startsWith(filterValue))
    );
  }

  if (condition.operator === "ends_with") {
    if (!hasFilterValues) return true;

    return filterValues.some((filterValue) =>
      comparableValues.some((cellValue) => cellValue.endsWith(filterValue))
    );
  }

  if (condition.operator === "equals") {
    const cellDate = parseDateValue(rawValue);
    const filterDate = parseDateValue(condition.value);

    if (cellDate && filterDate) return isSameDay(cellDate, filterDate);
    if (!hasFilterValues) return true;

    return filterValues.some((filterValue) =>
      comparableValues.some((cellValue) => cellValue === filterValue)
    );
  }

  if (condition.operator === "not_equals") {
    const cellDate = parseDateValue(rawValue);
    const filterDate = parseDateValue(condition.value);

    if (cellDate && filterDate) return !isSameDay(cellDate, filterDate);
    if (!hasFilterValues) return true;

    return filterValues.every((filterValue) =>
      comparableValues.every((cellValue) => cellValue !== filterValue)
    );
  }

  if (condition.operator === "empty") {
    return (
      comparableValues.length === 0 || comparableValues.every((value) => !value)
    );
  }

  if (condition.operator === "not_empty") {
    return comparableValues.some((value) => Boolean(value));
  }

  if (condition.operator === "greater") {
    const cellDate = parseDateValue(rawValue);
    const filterDate = parseDateValue(condition.value);

    if (cellDate && filterDate) return cellDate > filterDate;
    if (!hasFilterValues) return true;

    return Number(comparableValues[0]) > Number(filterValues[0]);
  }

  if (condition.operator === "less") {
    const cellDate = parseDateValue(rawValue);
    const filterDate = parseDateValue(condition.value);

    if (cellDate && filterDate) return cellDate < filterDate;
    if (!hasFilterValues) return true;

    return Number(comparableValues[0]) < Number(filterValues[0]);
  }

  return true;
};

export function filterRows({
  rows = [],
  columns = [],
  activeFilter = "all",
  activeConditions = [],
}) {
  if (!Array.isArray(rows) || rows.length === 0) return [];

  if (Array.isArray(activeConditions) && activeConditions.length > 0) {
    return rows.filter((row) =>
      activeConditions.every((condition) => checkCondition(row, condition))
    );
  }

  if (!activeFilter || activeFilter === "all" || activeFilter === "custom") {
    return rows;
  }

  const today = getStartOfDay(new Date());
  const weekEnd = addDays(today, 7);

  return rows.filter((row) => {
    const dueDate = getDateValueFromRow(row, columns);

    if (activeFilter === "no_date") return !dueDate;
    if (!dueDate) return false;

    const dueDay = getStartOfDay(dueDate);

    if (activeFilter === "overdue") return dueDay < today;
    if (activeFilter === "today") return isSameDay(dueDay, today);
    if (activeFilter === "week") return dueDay >= today && dueDay <= weekEnd;

    return true;
  });
}

export function sortRows({
  rows = [],
  columns = [],
  activeSort = "none",
  sortDirection = "asc",
  sortRules = [],
}) {
  if (!Array.isArray(rows) || rows.length === 0) return [];

  const effectiveSortRules = normalizeSortRules(sortRules);

  if (effectiveSortRules.length > 0) {
    return sortRowsAdvanced({
      rows,
      columns,
      sortRules: effectiveSortRules,
    });
  }

  if (!activeSort || activeSort === "none") {
    return rows;
  }

  return [...rows].sort((leftRow, rightRow) => {
    if (activeSort === "date") {
      return compareValues(
        getDateValueFromRow(leftRow, columns),
        getDateValueFromRow(rightRow, columns),
        sortDirection
      );
    }

    if (activeSort === "status") {
      return compareValues(
        getStatusValueFromRow(leftRow, columns),
        getStatusValueFromRow(rightRow, columns),
        sortDirection
      );
    }

    if (activeSort === "title") {
      return compareValues(
        getTextValueFromRow(leftRow, columns),
        getTextValueFromRow(rightRow, columns),
        sortDirection
      );
    }

    return compareValues(
      getComparableCellValue(leftRow, activeSort),
      getComparableCellValue(rightRow, activeSort),
      sortDirection
    );
  });
}

export function sortRowsAdvanced({ rows = [], columns = [], sortRules = [] }) {
  if (!Array.isArray(rows) || rows.length === 0) return [];

  const effectiveSortRules = normalizeSortRules(sortRules);

  if (effectiveSortRules.length === 0) {
    return rows;
  }

  return rows
    .map((row, index) => ({
      row,
      index,
    }))
    .sort((leftItem, rightItem) => {
      for (const rule of effectiveSortRules) {
        const column = getColumnById(columns, rule.columnId) || {
          id: rule.columnId,
          type: "text",
        };

        const result = compareValues(
          getSortComparableValue(leftItem.row, column, columns),
          getSortComparableValue(rightItem.row, column, columns),
          rule.direction
        );

        if (result !== 0) return result;
      }

      return leftItem.index - rightItem.index;
    })
    .map((item) => item.row);
}

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