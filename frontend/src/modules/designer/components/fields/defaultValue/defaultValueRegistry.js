export const DEFAULT_VALUE_NONE = "none";
export const DEFAULT_VALUE_CONSTANT = "constant";
export const DEFAULT_VALUE_OPTION = "option";
export const DEFAULT_VALUE_CURRENT_USER = "current_user";
export const DEFAULT_VALUE_SPECIFIC_USER = "specific_user";
export const DEFAULT_VALUE_TODAY = "today";
export const DEFAULT_VALUE_TODAY_PLUS_DAYS = "today_plus_days";
export const DEFAULT_VALUE_SPECIFIC_DATE = "specific_date";
export const DEFAULT_VALUE_NOW = "now";
export const DEFAULT_VALUE_NOW_PLUS_HOURS = "now_plus_hours";
export const DEFAULT_VALUE_SPECIFIC_DATETIME = "specific_datetime";
export const DEFAULT_VALUE_TRUE = "true";
export const DEFAULT_VALUE_FALSE = "false";
export const DEFAULT_VALUE_SPECIFIC_RECORD = "specific_record";

const NO_DEFAULT_FIELD_TYPES = new Set(["file", "formula"]);

const TYPE_OPTIONS_BY_FIELD = {
  text: [
    { value: DEFAULT_VALUE_NONE, label: "Нет" },
    { value: DEFAULT_VALUE_CONSTANT, label: "Константа" },
  ],
  textarea: [
    { value: DEFAULT_VALUE_NONE, label: "Нет" },
    { value: DEFAULT_VALUE_CONSTANT, label: "Константа" },
  ],
  uuid: [
    { value: DEFAULT_VALUE_NONE, label: "Нет" },
    { value: DEFAULT_VALUE_CONSTANT, label: "Константа" },
  ],
  number: [
    { value: DEFAULT_VALUE_NONE, label: "Нет" },
    { value: DEFAULT_VALUE_CONSTANT, label: "Константа" },
  ],
  choice: [
    { value: DEFAULT_VALUE_NONE, label: "Нет" },
    { value: DEFAULT_VALUE_OPTION, label: "Вариант списка" },
  ],
  multi_choice: [
    { value: DEFAULT_VALUE_NONE, label: "Нет" },
    { value: DEFAULT_VALUE_OPTION, label: "Вариант списка" },
  ],
  user: [
    { value: DEFAULT_VALUE_NONE, label: "Нет" },
    { value: DEFAULT_VALUE_CURRENT_USER, label: "Текущий пользователь" },
    { value: DEFAULT_VALUE_SPECIFIC_USER, label: "Конкретный пользователь" },
  ],
  date: [
    { value: DEFAULT_VALUE_NONE, label: "Нет" },
    { value: DEFAULT_VALUE_TODAY, label: "Сегодня" },
    { value: DEFAULT_VALUE_TODAY_PLUS_DAYS, label: "Сегодня + N дней" },
    { value: DEFAULT_VALUE_SPECIFIC_DATE, label: "Конкретная дата" },
  ],
  datetime: [
    { value: DEFAULT_VALUE_NONE, label: "Нет" },
    { value: DEFAULT_VALUE_NOW, label: "Сейчас" },
    { value: DEFAULT_VALUE_NOW_PLUS_HOURS, label: "Сейчас + N часов" },
    { value: DEFAULT_VALUE_SPECIFIC_DATETIME, label: "Конкретная дата и время" },
  ],
  relation: [
    { value: DEFAULT_VALUE_NONE, label: "Нет" },
    { value: DEFAULT_VALUE_SPECIFIC_RECORD, label: "Конкретный объект" },
  ],
};

const VALUE_REQUIRED_TYPES = new Set([
  DEFAULT_VALUE_CONSTANT,
  DEFAULT_VALUE_OPTION,
  DEFAULT_VALUE_SPECIFIC_USER,
  DEFAULT_VALUE_TODAY_PLUS_DAYS,
  DEFAULT_VALUE_SPECIFIC_DATE,
  DEFAULT_VALUE_NOW_PLUS_HOURS,
  DEFAULT_VALUE_SPECIFIC_DATETIME,
  DEFAULT_VALUE_SPECIFIC_RECORD,
]);

export function isDefaultValueSupported(fieldType) {
  const normalized = String(fieldType || "").trim().toLowerCase();
  return !NO_DEFAULT_FIELD_TYPES.has(normalized);
}

export function getDefaultValueTypeOptions(fieldType, { choiceOptions = [] } = {}) {
  const normalized = String(fieldType || "").trim().toLowerCase();

  if (!isDefaultValueSupported(normalized)) {
    return [];
  }

  if (normalized === "boolean") {
    return [];
  }

  if (normalized === "choice" || normalized === "multi_choice") {
    if (!Array.isArray(choiceOptions) || choiceOptions.length === 0) {
      return [{ value: DEFAULT_VALUE_NONE, label: "Нет" }];
    }
  }

  return TYPE_OPTIONS_BY_FIELD[normalized] || [
    { value: DEFAULT_VALUE_NONE, label: "Нет" },
  ];
}

export function isDefaultValueEditorVisible(fieldType) {
  return isDefaultValueSupported(fieldType);
}

export function defaultValueRequiresValueInput(type) {
  return VALUE_REQUIRED_TYPES.has(String(type || "").trim());
}
