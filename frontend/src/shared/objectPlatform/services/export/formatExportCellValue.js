import { normalizeChoiceValue } from "../../../fieldTypes/choice/choiceUtils";
import {
  formatDateTimeRu,
  normalizeDateValue,
} from "../../../fieldTypes/date/dateUtils";
import {
  getLinkDisplayLabel,
  normalizeLinkValue,
  resolveLinkHref,
} from "../../../fieldTypes/link/linkUtils";
import {
  formatRelationTableDisplayLabel,
  isRelationTableValue,
} from "../../../../modules/objectViews/services/relationTableValue";
import { formatSystemRowNumber } from "../../../entity-ui/entityValueUtils";
import {
  isTableRowNumberPresentationFieldKey,
} from "../../../runtime/systemEntityFields";
import {
  isViewEngineSystemColumn,
  normalizeSystemColumnKey,
  SYSTEM_COLUMN_KEYS,
} from "../../../viewEngine/systemColumnKeys";
import { resolveExportUserLabel } from "./loadExportUsersMap";

const EMPTY_DISPLAY = "—";

/**
 * @typedef {Object} ExportCellValue
 * @property {string} text
 * @property {string} [hyperlink]
 */

/**
 * @param {string} value
 * @returns {string}
 */
function stripEmptyDisplay(value) {
  const normalized = String(value ?? "").trim();

  if (!normalized || normalized === EMPTY_DISPLAY) {
    return "";
  }

  return normalized;
}

/**
 * @param {unknown} value
 * @param {Record<string, unknown>} column
 * @param {Map<string, string>} usersMap
 * @returns {ExportCellValue}
 */
export function formatExportCellValue(value, column, usersMap = new Map()) {
  const fieldDef = column?.fieldDef && typeof column.fieldDef === "object"
    ? column.fieldDef
    : {};
  const rawType = String(
    fieldDef?.rawFieldType || fieldDef?.type || column?.type || "text",
  ).toLowerCase();

  if (value === null || value === undefined || value === "") {
    return { text: "" };
  }

  if (isTableRowNumberPresentationFieldKey(column?.key)) {
    return { text: stripEmptyDisplay(formatSystemRowNumber(value)) };
  }

  if (
    isViewEngineSystemColumn(column) &&
    normalizeSystemColumnKey(column?.key) === SYSTEM_COLUMN_KEYS.recordNumber
  ) {
    return { text: stripEmptyDisplay(formatSystemRowNumber(value)) };
  }

  if (isRelationTableValue(value)) {
    const items = Array.isArray(value?.items) ? value.items : [];
    const formatted = formatRelationTableDisplayLabel(items, {
      maxInlineLinks: items.length,
    });

    const text = formatted.items
      .map((item) => String(item?.title || "").trim())
      .filter(Boolean)
      .join(", ");

    return { text };
  }

  if (rawType === "user" || rawType === "assignee") {
    return { text: stripEmptyDisplay(resolveExportUserLabel(value, usersMap)) };
  }

  if (rawType === "link" || rawType === "url") {
    const normalized = normalizeLinkValue(value, "");
    const href = resolveLinkHref(normalized.url);
    const text = stripEmptyDisplay(getLinkDisplayLabel(value, ""));

    if (!text) {
      return { text: "" };
    }

    return href ? { text, hyperlink: href } : { text };
  }

  if (rawType === "date") {
    return { text: stripEmptyDisplay(normalizeDateValue(value, "")) };
  }

  if (rawType === "datetime" || rawType === "timestamp") {
    return { text: stripEmptyDisplay(formatDateTimeRu(value, "")) };
  }

  if (
    rawType === "choice" ||
    rawType === "status" ||
    rawType === "select" ||
    rawType === "enum" ||
    (isViewEngineSystemColumn(column) &&
      normalizeSystemColumnKey(column?.key) === SYSTEM_COLUMN_KEYS.status)
  ) {
    const choice = normalizeChoiceValue(value, column);
    return { text: stripEmptyDisplay(choice.label) };
  }

  if (rawType === "boolean" || typeof value === "boolean") {
    return { text: value === true ? "Да" : value === false ? "Нет" : "" };
  }

  if (rawType === "number" || typeof value === "number") {
    return { text: String(value) };
  }

  if (Array.isArray(value)) {
    return {
      text: value
        .map((item) => formatExportCellValue(item, column, usersMap).text)
        .filter(Boolean)
        .join(", "),
    };
  }

  if (typeof value === "object") {
    const objectText = String(
      value.label ||
        value.title ||
        value.name ||
        value.displayName ||
        value.display_name ||
        value.full_name ||
        value.fullName ||
        value.value ||
        "",
    ).trim();

    return { text: objectText };
  }

  return { text: String(value) };
}
