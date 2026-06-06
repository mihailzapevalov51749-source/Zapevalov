import { normalizeFieldEditorType } from "../../../fieldEditors/fieldEditorRegistry";
import { normalizeLinkStorageValue } from "../../../fieldTypes/link/linkUtils";
import {
  buildImportValueMappingsLookup,
  getImportValueMappingResolvedValue,
  isImportValueMappingSkipped,
  lookupImportValueMappingRule,
} from "./valueMapping/applyImportValueMappings.js";
import { resolveChoiceImportKey } from "./resolveChoiceImportKey.js";
import { resolveImportUserId } from "./loadImportUsersIndex.js";

const DATE_PATTERNS = [
  /^(\d{2})\.(\d{2})\.(\d{4})$/,
  /^(\d{2})\.(\d{2})\.(\d{2})$/,
  /^(\d{4})-(\d{2})-(\d{2})$/,
];

function pad2(value) {
  return String(value).padStart(2, "0");
}

function formatIsoDate(date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

function formatIsoDateTime(date) {
  return `${formatIsoDate(date)}T${pad2(date.getHours())}:${pad2(date.getMinutes())}:00`;
}

function parseDateToken(rawValue, includeTime = false) {
  if (rawValue instanceof Date && !Number.isNaN(rawValue.getTime())) {
    return {
      ok: true,
      value: includeTime ? formatIsoDateTime(rawValue) : formatIsoDate(rawValue),
    };
  }

  if (typeof rawValue === "number" && Number.isFinite(rawValue)) {
    const excelEpoch = new Date(Date.UTC(1899, 11, 30));
    const millis = excelEpoch.getTime() + Math.round(rawValue * 86400000);
    const date = new Date(millis);

    if (Number.isNaN(date.getTime())) {
      return { ok: false, error: "Дата не распознана" };
    }

    return {
      ok: true,
      value: includeTime ? formatIsoDateTime(date) : formatIsoDate(date),
    };
  }

  const text = String(rawValue ?? "").trim();

  if (!text) {
    return { ok: false, error: "Пустое значение" };
  }

  for (const pattern of DATE_PATTERNS) {
    const match = text.match(pattern);

    if (!match) {
      continue;
    }

    let year = Number(match[3]);
    const month = Number(match[2]);
    const day = Number(match[1]);

    if (String(match[3]).length === 2) {
      year = year < 70 ? 2000 + year : 1900 + year;
    }

    const date = new Date(year, month - 1, day);

    if (
      Number.isNaN(date.getTime()) ||
      date.getFullYear() !== year ||
      date.getMonth() !== month - 1 ||
      date.getDate() !== day
    ) {
      return { ok: false, error: "Дата не распознана" };
    }

    return {
      ok: true,
      value: includeTime ? `${formatIsoDate(date)}T00:00:00` : formatIsoDate(date),
    };
  }

  const parsed = new Date(text);

  if (!Number.isNaN(parsed.getTime())) {
    return {
      ok: true,
      value: includeTime ? formatIsoDateTime(parsed) : formatIsoDate(parsed),
    };
  }

  return { ok: false, error: "Дата не распознана" };
}

/**
 * @param {unknown} rawValue
 * @param {Record<string, unknown>} field
 * @param {{ byEmail: Map<string, number[]>, byName: Map<string, number[]> } | null} usersIndex
 * @param {Array<Record<string, unknown>> | null} valueMappings
 */
export function normalizeObjectExcelImportValue(
  rawValue,
  field,
  usersIndex = null,
  valueMappings = null,
) {
  const fieldKey = String(field?.key || "").trim();
  const mappingLookup = buildImportValueMappingsLookup(valueMappings);
  const mappedRule = lookupImportValueMappingRule(
    mappingLookup,
    fieldKey,
    rawValue,
  );

  if (mappedRule) {
    if (isImportValueMappingSkipped(mappedRule)) {
      return { ok: true, value: null, skipped: true };
    }

    const mappedValue = getImportValueMappingResolvedValue(mappedRule);

    if (mappedValue !== null && mappedValue !== undefined && mappedValue !== "") {
      return { ok: true, value: mappedValue };
    }
  }

  const rawFieldType = String(field?.rawFieldType || field?.type || "text")
    .trim()
    .toLowerCase();
  const editorType = normalizeFieldEditorType(rawFieldType);
  const text = String(rawValue ?? "").trim();

  if (editorType === "number") {
    if (text === "") {
      return { ok: false, error: "Пустое значение" };
    }

    const normalized = Number(String(rawValue).replace(",", ".").trim());

    if (!Number.isFinite(normalized)) {
      return { ok: false, error: "Ожидается число" };
    }

    return { ok: true, value: normalized };
  }

  if (editorType === "date") {
    return parseDateToken(rawValue, false);
  }

  if (editorType === "datetime") {
    return parseDateToken(rawValue, true);
  }

  if (
    editorType === "choice" ||
    rawFieldType === "status" ||
    rawFieldType === "select"
  ) {
    return resolveChoiceImportKey(rawValue, field);
  }

  if (editorType === "user") {
    if (!usersIndex) {
      return { ok: false, error: "Список пользователей недоступен" };
    }

    return resolveImportUserId(rawValue, usersIndex);
  }

  if (editorType === "link") {
    if (!text) {
      return { ok: false, error: "Пустое значение" };
    }

    const storage = normalizeLinkStorageValue(text);

    if (!storage) {
      return { ok: false, error: "Некорректная ссылка" };
    }

    return { ok: true, value: storage };
  }

  if (!text) {
    return { ok: false, error: "Пустое значение" };
  }

  return { ok: true, value: text };
}
