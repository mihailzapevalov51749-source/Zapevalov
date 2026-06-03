import { generateViewKey } from "../../../objectViews/services/generateViewKey";

export function isChoiceFieldType(fieldType) {
  return fieldType === "choice" || fieldType === "multi_choice";
}

export function buildChoiceOptionsFromText(text, reservedKeys = []) {
  const lines = String(text || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const usedKeys = [...reservedKeys];
  const options = [];

  for (const label of lines) {
    const key = generateViewKey(label, usedKeys);
    usedKeys.push(key);
    options.push({ key, label });
  }

  return options;
}

export function formatChoiceOptionsToText(settingsJson) {
  const options = settingsJson?.options;

  if (!Array.isArray(options) || options.length === 0) {
    return "";
  }

  return options
    .map((option) => {
      if (typeof option === "string") {
        return option;
      }
      return String(option?.label ?? option?.key ?? "").trim();
    })
    .filter(Boolean)
    .join("\n");
}

export function getFieldTypeLabel(fieldType, options = []) {
  const normalized = String(fieldType || "").trim();
  const match = options.find((item) => item.value === normalized);
  return match?.label || normalized || "—";
}
