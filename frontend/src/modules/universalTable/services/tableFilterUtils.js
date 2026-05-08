import { getOperatorsByColumn } from "./tableFilterOperators";

export function createId(prefix = "condition") {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export function getColumnId(column) {
  return String(column?.id ?? column?.key ?? "");
}

export function getColumnTitle(column) {
  return column?.title || column?.name || "Без названия";
}

export function getColumnOptions(column) {
  const rawOptions =
    column?.options ||
    column?.settings?.options ||
    column?.content?.options ||
    [];

  if (column?.type === "boolean") {
    return [
      { value: "true", label: "Да" },
      { value: "false", label: "Нет" },
    ];
  }

  if (!Array.isArray(rawOptions)) return [];

  return rawOptions.map((option) => {
    if (typeof option === "string") {
      return { value: option, label: option };
    }

    const label =
      option.label ||
      option.title ||
      option.name ||
      option.value ||
      option.id ||
      option.key ||
      "Без названия";

    return {
      value: String(label),
      label,
    };
  });
}

export function createEmptyCondition(columns = []) {
  const firstColumn = columns[0];
  const firstColumnId = getColumnId(firstColumn);
  const operators = getOperatorsByColumn(firstColumn);

  return {
    id: createId("condition"),
    columnId: firstColumnId,
    operator: operators[0]?.key || "contains",
    value: "",
  };
}

export function normalizeInitialConditions(initialConditions = [], columns = []) {
  if (!Array.isArray(initialConditions) || initialConditions.length === 0) {
    return columns.length ? [createEmptyCondition(columns)] : [];
  }

  return initialConditions.map((condition) => ({
    id: condition.id || createId("condition"),
    columnId: condition.columnId ? String(condition.columnId) : "",
    operator: condition.operator || "contains",
    value: condition.value ?? "",
  }));
}

export function normalizeSavedFilter(filter) {
  const id = filter?.id ?? filter?.key ?? createId("quick_filter");
  const key = String(filter?.key ?? id);

  const isDefault = Boolean(
    filter?.isDefault ??
      filter?.is_default ??
      filter?.default ??
      filter?.isDefaultFilter ??
      false
  );

  return {
    ...filter,
    id,
    key,
    label: filter?.label || filter?.name || "Без названия",
    name: filter?.name || filter?.label || "Без названия",
    conditions: Array.isArray(filter?.conditions) ? filter.conditions : [],
    isDefault,
    is_default: isDefault,
  };
}

export function ensureSingleDefaultFilter(filters = []) {
  if (!Array.isArray(filters)) return [];

  let defaultFound = false;

  return filters.map((filter) => {
    const normalized = normalizeSavedFilter(filter);

    if (!normalized.isDefault) {
      return {
        ...normalized,
        isDefault: false,
        is_default: false,
      };
    }

    if (defaultFound) {
      return {
        ...normalized,
        isDefault: false,
        is_default: false,
      };
    }

    defaultFound = true;

    return {
      ...normalized,
      isDefault: true,
      is_default: true,
    };
  });
}

export function isSameSavedFilter(a, b) {
  return (
    String(a?.label || "") === String(b?.label || "") &&
    JSON.stringify(a?.conditions || []) === JSON.stringify(b?.conditions || [])
  );
}

export function getUniqueSavedFilters(filters = []) {
  const uniqueFilters = [];

  if (!Array.isArray(filters)) return [];

  filters.forEach((filter) => {
    const normalized = normalizeSavedFilter(filter);

    const exists = uniqueFilters.some((item) =>
      isSameSavedFilter(item, normalized)
    );

    if (!exists) {
      uniqueFilters.push(normalized);
    }
  });

  return ensureSingleDefaultFilter(uniqueFilters);
}

export function isDateColumn(column) {
  const type = String(column?.type || "").toLowerCase();
  return type === "date" || type === "datetime";
}

export function formatDateOnly(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "";

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function addDays(date, days) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
}

export function getStartOfWeek(date) {
  const nextDate = new Date(date);
  const day = nextDate.getDay();
  const diff = day === 0 ? -6 : 1 - day;

  nextDate.setDate(nextDate.getDate() + diff);
  nextDate.setHours(0, 0, 0, 0);

  return nextDate;
}

export function getRelativeDateRange(operator) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (operator === "today") {
    return {
      operator: "equals",
      value: formatDateOnly(today),
    };
  }

  if (operator === "yesterday") {
    return {
      operator: "equals",
      value: formatDateOnly(addDays(today, -1)),
    };
  }

  if (operator === "tomorrow") {
    return {
      operator: "equals",
      value: formatDateOnly(addDays(today, 1)),
    };
  }

  if (operator === "before_today") {
    return {
      operator: "less",
      value: formatDateOnly(today),
    };
  }

  if (operator === "after_today") {
    return {
      operator: "greater",
      value: formatDateOnly(today),
    };
  }

  const currentWeekStart = getStartOfWeek(today);

  if (operator === "this_week") {
    return {
      operator: "range",
      value: {
        from: formatDateOnly(currentWeekStart),
        to: formatDateOnly(addDays(currentWeekStart, 6)),
      },
    };
  }

  if (operator === "next_week") {
    const nextWeekStart = addDays(currentWeekStart, 7);

    return {
      operator: "range",
      value: {
        from: formatDateOnly(nextWeekStart),
        to: formatDateOnly(addDays(nextWeekStart, 6)),
      },
    };
  }

  if (operator === "last_week") {
    const lastWeekStart = addDays(currentWeekStart, -7);

    return {
      operator: "range",
      value: {
        from: formatDateOnly(lastWeekStart),
        to: formatDateOnly(addDays(lastWeekStart, 6)),
      },
    };
  }

  return null;
}

export function normalizeDateConditionForFilterRows(condition, column) {
  if (!isDateColumn(column)) return condition;

  if (condition.operator === "before") {
    return {
      ...condition,
      operator: "less",
    };
  }

  if (condition.operator === "after") {
    return {
      ...condition,
      operator: "greater",
    };
  }

  const relativeRange = getRelativeDateRange(condition.operator);

  if (!relativeRange) return condition;

  if (relativeRange.operator === "range") {
    return {
      ...condition,
      operator: "between",
      value: relativeRange.value,
    };
  }

  return {
    ...condition,
    operator: relativeRange.operator,
    value: relativeRange.value,
  };
}

export function normalizeConditionsForFiltering(conditions = [], columns = []) {
  if (!Array.isArray(conditions)) return [];

  return conditions.map((condition) => {
    const column = columns.find(
      (item) => getColumnId(item) === String(condition.columnId)
    );

    return normalizeDateConditionForFilterRows(condition, column);
  });
}