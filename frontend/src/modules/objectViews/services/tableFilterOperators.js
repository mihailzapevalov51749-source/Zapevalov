/**
 * Object Table filter operators (canonical runtime keys).
 */

export const FILTER_OPERATOR_EQ = "eq";
export const FILTER_OPERATOR_NEQ = "neq";
export const FILTER_OPERATOR_CONTAINS = "contains";
export const FILTER_OPERATOR_NOT_CONTAINS = "not_contains";
export const FILTER_OPERATOR_STARTS_WITH = "starts_with";
export const FILTER_OPERATOR_ENDS_WITH = "ends_with";
export const FILTER_OPERATOR_GT = "gt";
export const FILTER_OPERATOR_GTE = "gte";
export const FILTER_OPERATOR_LT = "lt";
export const FILTER_OPERATOR_LTE = "lte";
export const FILTER_OPERATOR_BEFORE = "before";
export const FILTER_OPERATOR_AFTER = "after";
export const FILTER_OPERATOR_IN = "in";
export const FILTER_OPERATOR_NOT_IN = "not_in";
export const FILTER_OPERATOR_IS_EMPTY = "is_empty";
export const FILTER_OPERATOR_IS_NOT_EMPTY = "is_not_empty";

export const FILTER_OPERATOR_BOOLEAN_TRUE = "true";
export const FILTER_OPERATOR_BOOLEAN_FALSE = "false";

const VALUE_LESS_OPERATORS = new Set([
  FILTER_OPERATOR_IS_EMPTY,
  FILTER_OPERATOR_IS_NOT_EMPTY,
  FILTER_OPERATOR_BOOLEAN_TRUE,
  FILTER_OPERATOR_BOOLEAN_FALSE,
]);

const TEXT_OPERATORS = [
  { value: FILTER_OPERATOR_EQ, label: "Равно" },
  { value: FILTER_OPERATOR_NEQ, label: "Не равно" },
  { value: FILTER_OPERATOR_CONTAINS, label: "Содержит" },
  { value: FILTER_OPERATOR_NOT_CONTAINS, label: "Не содержит" },
  { value: FILTER_OPERATOR_STARTS_WITH, label: "Начинается с" },
  { value: FILTER_OPERATOR_ENDS_WITH, label: "Заканчивается на" },
  { value: FILTER_OPERATOR_IS_EMPTY, label: "Пусто" },
  { value: FILTER_OPERATOR_IS_NOT_EMPTY, label: "Не пусто" },
];

const NUMBER_OPERATORS = [
  { value: FILTER_OPERATOR_EQ, label: "Равно" },
  { value: FILTER_OPERATOR_NEQ, label: "Не равно" },
  { value: FILTER_OPERATOR_GT, label: "Больше" },
  { value: FILTER_OPERATOR_GTE, label: "Больше или равно" },
  { value: FILTER_OPERATOR_LT, label: "Меньше" },
  { value: FILTER_OPERATOR_LTE, label: "Меньше или равно" },
  { value: FILTER_OPERATOR_IS_EMPTY, label: "Пусто" },
  { value: FILTER_OPERATOR_IS_NOT_EMPTY, label: "Не пусто" },
];

const DATE_OPERATORS = [
  { value: FILTER_OPERATOR_EQ, label: "Равно" },
  { value: FILTER_OPERATOR_BEFORE, label: "До" },
  { value: FILTER_OPERATOR_AFTER, label: "После" },
  { value: FILTER_OPERATOR_IS_EMPTY, label: "Пусто" },
  { value: FILTER_OPERATOR_IS_NOT_EMPTY, label: "Не пусто" },
];

const USER_OPERATORS = [
  { value: FILTER_OPERATOR_EQ, label: "Равно" },
  { value: FILTER_OPERATOR_NEQ, label: "Не равно" },
  { value: FILTER_OPERATOR_IS_EMPTY, label: "Пусто" },
  { value: FILTER_OPERATOR_IS_NOT_EMPTY, label: "Не пусто" },
];

const CHOICE_OPERATORS = [
  { value: FILTER_OPERATOR_EQ, label: "Равно" },
  { value: FILTER_OPERATOR_NEQ, label: "Не равно" },
  { value: FILTER_OPERATOR_IN, label: "В списке" },
  { value: FILTER_OPERATOR_NOT_IN, label: "Не в списке" },
  { value: FILTER_OPERATOR_IS_EMPTY, label: "Пусто" },
  { value: FILTER_OPERATOR_IS_NOT_EMPTY, label: "Не пусто" },
];

const BOOLEAN_OPERATORS = [
  { value: FILTER_OPERATOR_BOOLEAN_TRUE, label: "Да" },
  { value: FILTER_OPERATOR_BOOLEAN_FALSE, label: "Нет" },
];

function normalizeFilterFieldType(fieldType, rawFieldType) {
  const normalized = String(fieldType || rawFieldType || "text").trim().toLowerCase();
  const raw = String(rawFieldType || "").trim().toLowerCase();

  if (normalized === "boolean" || raw === "boolean") {
    return "boolean";
  }

  if (
    normalized === "choice" ||
    ["choice", "select", "status", "option", "multi_choice"].includes(raw)
  ) {
    return "choice";
  }

  if (normalized === "number" || raw === "number") {
    return "number";
  }

  if (normalized === "datetime" || raw === "datetime") {
    return "datetime";
  }

  if (normalized === "date" || raw === "date") {
    return "date";
  }

  if (normalized === "user" || raw === "user") {
    return "user";
  }

  return "text";
}

/**
 * @param {{ fieldType?: string, rawFieldType?: string } | null | undefined} fieldOption
 */
export function getOperatorsForFieldOption(fieldOption) {
  const normalizedType = normalizeFilterFieldType(
    fieldOption?.fieldType,
    fieldOption?.rawFieldType,
  );

  switch (normalizedType) {
    case "number":
      return NUMBER_OPERATORS;
    case "date":
    case "datetime":
      return DATE_OPERATORS;
    case "user":
      return USER_OPERATORS;
    case "choice":
      return CHOICE_OPERATORS;
    case "boolean":
      return BOOLEAN_OPERATORS;
    default:
      return TEXT_OPERATORS;
  }
}

/**
 * @param {{ fieldType?: string, rawFieldType?: string } | null | undefined} fieldOption
 */
export function getDefaultOperatorForFieldOption(fieldOption) {
  return getOperatorsForFieldOption(fieldOption)[0]?.value || FILTER_OPERATOR_EQ;
}

/**
 * @param {string | null | undefined} operator
 * @param {{ fieldType?: string, rawFieldType?: string } | null | undefined} [fieldOption]
 */
export function operatorRequiresValue(operator, fieldOption = null) {
  const normalized = String(operator || "").trim().toLowerCase();

  if (VALUE_LESS_OPERATORS.has(normalized)) {
    return false;
  }

  if (normalizeFilterFieldType(fieldOption?.fieldType, fieldOption?.rawFieldType) === "boolean") {
    return false;
  }

  return true;
}

/**
 * @param {string | null | undefined} operator
 * @param {{ fieldType?: string, rawFieldType?: string } | null | undefined} fieldOption
 */
export function normalizeOperatorForFieldOption(operator, fieldOption) {
  const operators = getOperatorsForFieldOption(fieldOption);
  const normalized = String(operator || "").trim().toLowerCase();

  if (operators.some((item) => item.value === normalized)) {
    return normalized;
  }

  const legacyMap = {
    equals: FILTER_OPERATOR_EQ,
    not_equals: FILTER_OPERATOR_NEQ,
    greater: FILTER_OPERATOR_GT,
    less: FILTER_OPERATOR_LT,
    empty: FILTER_OPERATOR_IS_EMPTY,
    not_empty: FILTER_OPERATOR_IS_NOT_EMPTY,
  };

  if (legacyMap[normalized] && operators.some((item) => item.value === legacyMap[normalized])) {
    return legacyMap[normalized];
  }

  return getDefaultOperatorForFieldOption(fieldOption);
}
