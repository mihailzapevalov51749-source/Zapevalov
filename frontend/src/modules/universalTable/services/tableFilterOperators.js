export const TEXT_OPERATORS = [
  { key: "contains", label: "содержит", valueType: "text" },
  { key: "equals", label: "равно", valueType: "text" },
  { key: "not_equals", label: "не равно", valueType: "text" },
  { key: "empty", label: "пусто", valueType: "none" },
  { key: "not_empty", label: "не пусто", valueType: "none" },
];

export const NUMBER_OPERATORS = [
  { key: "equals", label: "равно", valueType: "number" },
  { key: "not_equals", label: "не равно", valueType: "number" },
  { key: "greater", label: "больше", valueType: "number" },
  { key: "less", label: "меньше", valueType: "number" },
  { key: "empty", label: "пусто", valueType: "none" },
  { key: "not_empty", label: "не пусто", valueType: "none" },
];

export const DATE_OPERATORS = [
  { key: "equals", label: "равно дате", valueType: "date" },
  { key: "not_equals", label: "не равно дате", valueType: "date" },
  { key: "before", label: "до даты", valueType: "date" },
  { key: "after", label: "после даты", valueType: "date" },
  { key: "today", label: "сегодня", valueType: "none" },
  { key: "yesterday", label: "вчера", valueType: "none" },
  { key: "tomorrow", label: "завтра", valueType: "none" },
  { key: "before_today", label: "до сегодня", valueType: "none" },
  { key: "after_today", label: "после сегодня", valueType: "none" },
  { key: "this_week", label: "на этой неделе", valueType: "none" },
  { key: "next_week", label: "на следующей неделе", valueType: "none" },
  { key: "last_week", label: "на прошлой неделе", valueType: "none" },
  { key: "empty", label: "пусто", valueType: "none" },
  { key: "not_empty", label: "не пусто", valueType: "none" },
];

export const USER_OPERATORS = [
  { key: "equals", label: "равно", valueType: "user" },
  { key: "not_equals", label: "не равно", valueType: "user" },
  { key: "empty", label: "пусто", valueType: "none" },
  { key: "not_empty", label: "не пусто", valueType: "none" },
];

export const SELECT_TYPES = ["choice", "select", "status", "boolean"];

export function getOperatorsByColumn(column) {
  const type = column?.type;

  if (type === "number") return NUMBER_OPERATORS;
  if (type === "date" || type === "datetime") return DATE_OPERATORS;
  if (type === "user") return USER_OPERATORS;

  return TEXT_OPERATORS;
}

export function getOperatorByKey(column, operatorKey) {
  const operators = getOperatorsByColumn(column);
  return operators.find((operator) => operator.key === operatorKey);
}

export function isOperatorValueDisabled(column, operatorKey) {
  const operator = getOperatorByKey(column, operatorKey);
  return operator?.valueType === "none";
}