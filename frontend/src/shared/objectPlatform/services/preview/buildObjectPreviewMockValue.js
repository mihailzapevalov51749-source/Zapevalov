import { createRelationTableValue } from "../../../../modules/objectViews/services/relationTableValue.js";
import { resolveObjectPreviewMockUser } from "./buildObjectPreviewMockUsers.js";

const DEMO_DATES = ["2026-06-10", "2026-06-11", "2026-06-12"];
const DEMO_NUMBERS = [100, 250, 500, 1000];
const DEMO_LINKS = ["https://example.com", "example.com"];
const DEMO_FILES = ["Пример_документа.pdf", "Пример_файла.docx"];
const DEMO_BOOLEANS = [true, false];

function readFieldOptions(field) {
  const settings =
    field?.settings_json && typeof field.settings_json === "object"
      ? field.settings_json
      : field?.settings && typeof field.settings === "object"
        ? field.settings
        : {};

  return Array.isArray(settings.options) ? settings.options : [];
}

function readOptionLabel(option, fallbackIndex) {
  if (typeof option === "string") {
    return option.trim() || `Вариант ${fallbackIndex}`;
  }

  if (!option || typeof option !== "object") {
    return `Вариант ${fallbackIndex}`;
  }

  return (
    String(option.label || option.title || option.name || option.value || "").trim() ||
    `Вариант ${fallbackIndex}`
  );
}

function readOptionValue(option, label) {
  if (typeof option === "string") {
    return option;
  }

  if (!option || typeof option !== "object") {
    return label;
  }

  return option.value ?? option.id ?? option.key ?? label;
}

function buildChoiceLikeValue(field, rowIndex) {
  const options = readFieldOptions(field);

  if (!options.length) {
    const variantIndex = (rowIndex % 2) + 1;
    return {
      label: `Статус ${variantIndex}`,
      value: `status_${variantIndex}`,
      color: "",
    };
  }

  const option = options[rowIndex % options.length];
  const label = readOptionLabel(option, rowIndex + 1);
  const value = readOptionValue(option, label);

  if (typeof option === "object" && option) {
    return {
      label,
      value,
      color: option.color || option.background || option.backgroundColor || "",
    };
  }

  return { label, value, color: "" };
}

function buildRelationValue(rowIndex) {
  const label = `Пример связи ${(rowIndex % 3) + 1}`;

  return createRelationTableValue({
    items: [
      {
        entity_id: `preview-relation-${rowIndex + 1}`,
        title: label,
        object_type_key: "preview_object",
      },
    ],
    cardinality: "one",
    loading: false,
    error: "",
  });
}

function buildFileValue(rowIndex) {
  const name = DEMO_FILES[rowIndex % DEMO_FILES.length];

  return {
    name,
    filename: name,
    title: name,
  };
}

/**
 * @param {{
 *   field?: Record<string, unknown> | null,
 *   rowIndex?: number,
 *   titleFieldKey?: string | null,
 *   recordLabelPrefix?: string,
 *   forceEmpty?: boolean,
 * }} params
 */
export function buildObjectPreviewMockValue({
  field = null,
  rowIndex = 0,
  titleFieldKey = null,
  recordLabelPrefix = "Пример записи",
  forceEmpty = false,
} = {}) {
  if (forceEmpty) {
    return null;
  }

  const fieldKey = String(field?.key || "").trim();
  const rawType = String(field?.field_type || field?.type || "text")
    .trim()
    .toLowerCase();

  if (fieldKey && fieldKey === String(titleFieldKey || "").trim()) {
    if (String(recordLabelPrefix).includes("подзаписи")) {
      return `${recordLabelPrefix}`;
    }

    return `${recordLabelPrefix} ${rowIndex + 1}`;
  }

  switch (rawType) {
    case "number":
    case "integer":
    case "decimal":
      return DEMO_NUMBERS[rowIndex % DEMO_NUMBERS.length];

    case "date":
      return DEMO_DATES[rowIndex % DEMO_DATES.length];

    case "datetime":
      return `${DEMO_DATES[rowIndex % DEMO_DATES.length]}T10:00:00.000Z`;

    case "status":
    case "choice":
    case "select":
    case "multi_choice":
      return buildChoiceLikeValue(field, rowIndex);

    case "user":
      return resolveObjectPreviewMockUser(rowIndex);

    case "relation":
      return buildRelationValue(rowIndex);

    case "link":
    case "url":
      return DEMO_LINKS[rowIndex % DEMO_LINKS.length];

    case "file":
    case "attachment":
      return buildFileValue(rowIndex);

    case "boolean":
      return DEMO_BOOLEANS[rowIndex % DEMO_BOOLEANS.length];

    case "text":
    case "string":
    case "long_text":
    case "textarea":
    default:
      return `Пример текста ${rowIndex + 1}`;
  }
}
