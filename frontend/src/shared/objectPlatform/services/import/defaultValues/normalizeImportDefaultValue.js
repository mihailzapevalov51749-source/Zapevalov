import { resolveImportDefaultUserId } from "./resolveImportDefaultUserId.js";

const DATE_INPUT_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

function pad2(value) {
  return String(value).padStart(2, "0");
}

function formatIsoDate(year, month, day) {
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

/**
 * @param {unknown} rawValue
 * @param {Record<string, unknown>} field
 * @param {{ currentUserId?: number | null }} [context]
 */
export function normalizeImportDefaultValue(rawValue, field, context = {}) {
  const editorKind = resolveEditorKind(field);

  if (editorKind === "user") {
    return resolveImportDefaultUserId(rawValue, context);
  }

  if (editorKind === "status" || editorKind === "choice") {
    const value = String(rawValue ?? "").trim();

    if (!value) {
      return { ok: false, error: "Вариант не выбран" };
    }

    return { ok: true, value };
  }

  if (editorKind === "number") {
    if (rawValue === null || rawValue === undefined || rawValue === "") {
      return { ok: false, error: "Число не задано" };
    }

    const normalized = Number(String(rawValue).replace(",", ".").trim());

    if (!Number.isFinite(normalized)) {
      return { ok: false, error: "Ожидается число" };
    }

    return { ok: true, value: normalized };
  }

  if (editorKind === "date") {
    const text = String(rawValue ?? "").trim();

    if (!text) {
      return { ok: false, error: "Дата не задана" };
    }

    const match = text.match(DATE_INPUT_PATTERN);

    if (!match) {
      return { ok: false, error: "Дата не распознана" };
    }

    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const date = new Date(year, month - 1, day);

    if (
      Number.isNaN(date.getTime()) ||
      date.getFullYear() !== year ||
      date.getMonth() !== month - 1 ||
      date.getDate() !== day
    ) {
      return { ok: false, error: "Дата не распознана" };
    }

    const rawFieldType = String(field?.rawFieldType || field?.type || "")
      .trim()
      .toLowerCase();

    return {
      ok: true,
      value:
        rawFieldType === "datetime"
          ? `${formatIsoDate(year, month, day)}T00:00:00`
          : formatIsoDate(year, month, day),
    };
  }

  const text = String(rawValue ?? "").trim();

  if (!text) {
    return { ok: false, error: "Значение не задано" };
  }

  return { ok: true, value: text };
}

/**
 * @param {Record<string, unknown>} field
 */
function resolveEditorKind(field) {
  const rawFieldType = String(field?.rawFieldType || field?.type || "")
    .trim()
    .toLowerCase();

  if (rawFieldType === "user" || rawFieldType === "assignee") {
    return "user";
  }

  if (rawFieldType === "status") {
    return "status";
  }

  if (rawFieldType === "select" || rawFieldType === "choice") {
    return "choice";
  }

  if (rawFieldType === "number") {
    return "number";
  }

  if (rawFieldType === "date" || rawFieldType === "datetime") {
    return "date";
  }

  return "text";
}
