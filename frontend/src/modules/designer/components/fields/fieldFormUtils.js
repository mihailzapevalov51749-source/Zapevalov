import { generateViewKey } from "../../../objectViews/services/generateViewKey";
import { getDefaultChoiceOptionColor } from "../../../../shared/navigation/menuColors";

/** Autogenerate field key from label (same rules as object type / view keys). */
export function generateFieldKey(name, reservedKeys = []) {
  return generateViewKey(name, reservedKeys);
}

export function isChoiceFieldType(fieldType) {
  return fieldType === "choice" || fieldType === "multi_choice";
}

function collectUsedOptionKeys(options = []) {
  return options
    .map((option) => String(option?.key || "").trim())
    .filter(Boolean);
}

function normalizeChoiceOption(option, index, usedKeys) {
  if (typeof option === "string") {
    const label = option.trim();
    const key = generateFieldKey(label || `option_${index + 1}`, usedKeys);
    usedKeys.push(key);

    return {
      key,
      label: label || key,
      color: getDefaultChoiceOptionColor(index),
    };
  }

  if (!option || typeof option !== "object") {
    const key = generateFieldKey(`option_${index + 1}`, usedKeys);
    usedKeys.push(key);

    return {
      key,
      label: "Новый вариант",
      color: getDefaultChoiceOptionColor(index),
    };
  }

  const existingKey = String(option.key || "").trim();
  const label = String(
    option.label ?? option.name ?? option.title ?? existingKey ?? "",
  ).trim();

  let key = existingKey;

  if (!key) {
    key = generateFieldKey(label || `option_${index + 1}`, usedKeys);
  }

  if (!usedKeys.includes(key)) {
    usedKeys.push(key);
  }

  const color =
    option.color ||
    option.background ||
    option.backgroundColor ||
    option.background_color ||
    getDefaultChoiceOptionColor(index);

  return {
    key,
    label: label || key,
    color,
  };
}

/**
 * @param {Record<string, unknown> | null | undefined} settingsJson
 * @param {string[]} reservedKeys field keys reserved in object type (not option keys)
 */
export function normalizeChoiceOptionsFromSettings(
  settingsJson,
  reservedKeys = [],
) {
  const settings =
    settingsJson && typeof settingsJson === "object" ? settingsJson : {};

  const usedKeys = [...reservedKeys];
  let rawOptions = settings.options;

  if (
    (!Array.isArray(rawOptions) || rawOptions.length === 0) &&
    typeof settings.optionsText === "string"
  ) {
    rawOptions = buildChoiceOptionsFromText(settings.optionsText, usedKeys);
  }

  if (!Array.isArray(rawOptions)) {
    rawOptions = [];
  }

  const options = rawOptions.map((option, index) =>
    normalizeChoiceOption(option, index, usedKeys),
  );

  return {
    options,
    multiple: Boolean(settings.multiple),
  };
}

export function buildChoiceOptionsFromText(text, reservedKeys = []) {
  const lines = String(text || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const usedKeys = [...reservedKeys];
  const options = [];

  lines.forEach((label, index) => {
    const key = generateFieldKey(label, usedKeys);
    usedKeys.push(key);
    options.push({
      key,
      label,
      color: getDefaultChoiceOptionColor(index),
    });
  });

  return options;
}

/** @deprecated Use normalizeChoiceOptionsFromSettings — kept for legacy call sites. */
export function formatChoiceOptionsToText(settingsJson) {
  const { options } = normalizeChoiceOptionsFromSettings(settingsJson);

  if (!options.length) {
    return "";
  }

  return options.map((option) => option.label).join("\n");
}

export function createEmptyChoiceOption(existingOptions = [], reservedKeys = []) {
  const usedKeys = [
    ...reservedKeys,
    ...collectUsedOptionKeys(existingOptions),
  ];
  const index = existingOptions.length;
  const key = generateFieldKey(`option_${Date.now()}`, usedKeys);

  return {
    key,
    label: "Новый вариант",
    color: getDefaultChoiceOptionColor(index),
  };
}

export function buildChoiceSettingsPayload(options = [], multiple = false) {
  return {
    options: options.map((option, index) => ({
      key: String(option.key || "").trim(),
      label: String(option.label || option.key || "").trim(),
      color: option.color || getDefaultChoiceOptionColor(index),
    })),
    multiple: Boolean(multiple),
  };
}

export function resolveChoiceFieldTypeForSave(currentFieldType, multiple) {
  if (!isChoiceFieldType(currentFieldType)) {
    return currentFieldType;
  }

  return multiple ? "multi_choice" : "choice";
}

export function isChoiceMultipleFromField(fieldType, settingsJson) {
  if (fieldType === "multi_choice") {
    return true;
  }

  return Boolean(
    settingsJson &&
      typeof settingsJson === "object" &&
      settingsJson.multiple,
  );
}

export function moveChoiceOption(options, index, direction) {
  const targetIndex = index + direction;

  if (targetIndex < 0 || targetIndex >= options.length) {
    return options;
  }

  const next = [...options];
  const temp = next[index];
  next[index] = next[targetIndex];
  next[targetIndex] = temp;

  return next;
}

export function getFieldTypeLabel(fieldType, options = []) {
  const normalized = String(fieldType || "").trim();
  const match = options.find((item) => item.value === normalized);
  return match?.label || normalized || "—";
}
