import {
  DEFAULT_VALUE_CONSTANT,
  DEFAULT_VALUE_CURRENT_USER,
  DEFAULT_VALUE_FALSE,
  DEFAULT_VALUE_NONE,
  DEFAULT_VALUE_NOW,
  DEFAULT_VALUE_NOW_PLUS_HOURS,
  DEFAULT_VALUE_OPTION,
  DEFAULT_VALUE_SPECIFIC_DATE,
  DEFAULT_VALUE_SPECIFIC_DATETIME,
  DEFAULT_VALUE_SPECIFIC_RECORD,
  DEFAULT_VALUE_SPECIFIC_USER,
  DEFAULT_VALUE_TODAY,
  DEFAULT_VALUE_TODAY_PLUS_DAYS,
  DEFAULT_VALUE_TRUE,
} from "./defaultValueRegistry";

export function emptyDefaultValue(fieldType) {
  const normalized = String(fieldType || "").trim().toLowerCase();

  if (normalized === "boolean") {
    return { type: DEFAULT_VALUE_FALSE, value: null };
  }

  return { type: DEFAULT_VALUE_NONE, value: null };
}

function isStructuredDefault(raw) {
  return raw && typeof raw === "object" && "type" in raw;
}

export function normalizeDefaultValueFromField(raw, fieldType) {
  const normalizedType = String(fieldType || "").trim().toLowerCase();

  if (raw == null) {
    return emptyDefaultValue(normalizedType);
  }

  if (isStructuredDefault(raw)) {
    return {
      type: String(raw.type || DEFAULT_VALUE_NONE),
      value: raw.value ?? null,
    };
  }

  if (normalizedType === "boolean" && typeof raw === "boolean") {
    return { type: raw ? DEFAULT_VALUE_TRUE : DEFAULT_VALUE_FALSE, value: null };
  }

  if (
    (normalizedType === "date" || normalizedType === "datetime") &&
    typeof raw === "string"
  ) {
    return {
      type:
        normalizedType === "datetime"
          ? DEFAULT_VALUE_SPECIFIC_DATETIME
          : DEFAULT_VALUE_SPECIFIC_DATE,
      value: raw,
    };
  }

  if (normalizedType === "user" && (typeof raw === "number" || typeof raw === "string")) {
    return { type: DEFAULT_VALUE_SPECIFIC_USER, value: Number(raw) };
  }

  if (
    (normalizedType === "text" ||
      normalizedType === "textarea" ||
      normalizedType === "uuid" ||
      normalizedType === "link") &&
    typeof raw === "string"
  ) {
    return { type: DEFAULT_VALUE_CONSTANT, value: raw };
  }

  if (normalizedType === "number" && typeof raw === "number") {
    return { type: DEFAULT_VALUE_CONSTANT, value: raw };
  }

  if (
    (normalizedType === "choice" || normalizedType === "multi_choice") &&
    typeof raw === "string"
  ) {
    return { type: DEFAULT_VALUE_OPTION, value: raw };
  }

  return emptyDefaultValue(normalizedType);
}

export function buildDefaultValuePayload(draftDefaultValue, fieldType) {
  const normalizedType = String(fieldType || "").trim().toLowerCase();

  if (normalizedType === "file") {
    return null;
  }

  const source = draftDefaultValue || emptyDefaultValue(normalizedType);
  const type = String(source.type || DEFAULT_VALUE_NONE);
  let value = source.value ?? null;

  if (type === DEFAULT_VALUE_CURRENT_USER) {
    value = null;
  }

  if (type === DEFAULT_VALUE_NONE) {
    value = null;
  }

  if (
    type === DEFAULT_VALUE_TODAY ||
    type === DEFAULT_VALUE_NOW ||
    type === DEFAULT_VALUE_TRUE ||
    type === DEFAULT_VALUE_FALSE
  ) {
    value = null;
  }

  if (type === DEFAULT_VALUE_TODAY_PLUS_DAYS || type === DEFAULT_VALUE_NOW_PLUS_HOURS) {
    const parsed = Number(value);

    if (!Number.isFinite(parsed) || parsed < 0) {
      return { error: "Укажите неотрицательное число" };
    }

    value = Math.trunc(parsed);
  }

  if (normalizedType === "number" && type === DEFAULT_VALUE_CONSTANT) {
    const parsed = Number(value);

    if (!Number.isFinite(parsed)) {
      return { error: "Укажите число" };
    }

    value = parsed;
  }

  if (
    (normalizedType === "text" ||
      normalizedType === "textarea" ||
      normalizedType === "link") &&
    type === DEFAULT_VALUE_CONSTANT
  ) {
    if (typeof value !== "string") {
      return { error: "Укажите текстовое значение" };
    }
  }

  if (normalizedType === "choice" || normalizedType === "multi_choice") {
    if (type === DEFAULT_VALUE_OPTION && !value) {
      return { error: "Выберите вариант списка" };
    }
  }

  if (normalizedType === "user" && type === DEFAULT_VALUE_SPECIFIC_USER && !value) {
    return { error: "Выберите пользователя" };
  }

  if (normalizedType === "relation" && type === DEFAULT_VALUE_SPECIFIC_RECORD && !value) {
    return { error: "Выберите объект" };
  }

  return {
    payload: {
      type,
      value,
    },
  };
}

export function validateDefaultValueDraft(draftDefaultValue, fieldType, { choiceOptions = [] } = {}) {
  const built = buildDefaultValuePayload(draftDefaultValue, fieldType);

  if (built.error) {
    return built.error;
  }

  const type = built.payload.type;
  const value = built.payload.value;
  const normalizedType = String(fieldType || "").trim().toLowerCase();

  if (
    (normalizedType === "choice" || normalizedType === "multi_choice") &&
    type === DEFAULT_VALUE_OPTION
  ) {
    const keys = new Set(
      (Array.isArray(choiceOptions) ? choiceOptions : []).map((item) =>
        String(item?.key || "").trim(),
      ),
    );

    if (!keys.has(String(value))) {
      return "Выберите вариант из списка поля";
    }
  }

  return "";
}
