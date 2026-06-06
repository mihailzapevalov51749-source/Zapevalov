import { normalizeFieldEditorType } from "../../../fieldEditors/fieldEditorRegistry";
import { isTableRowNumberPresentationFieldKey } from "../../../runtime/systemEntityFields";
import { EXPORT_HIERARCHY_NUMBER_COLUMN_KEY } from "../export/orderExportHierarchyRows.js";

export const IMPORT_SKIP_FIELD_VALUE = "";

export const MVP_IMPORT_FIELD_TYPES = new Set([
  "text",
  "textarea",
  "number",
  "date",
  "datetime",
  "choice",
  "status",
  "select",
  "user",
  "assignee",
  "link",
  "url",
]);

const BLOCKED_HEADER_LABELS = new Set([
  "№",
  "иерархия",
  "иерархический №",
  "иерархический номер",
  "id",
  "дата создания",
  "создал",
  "дата изменения",
  "изменил",
  "версия записи",
  "статус записи",
]);

/**
 * @param {string | null | undefined} label
 */
export function normalizeImportHeaderLabel(label) {
  return String(label ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

/**
 * @param {string | null | undefined} headerLabel
 */
export function isBlockedImportExcelHeader(headerLabel) {
  const normalized = normalizeImportHeaderLabel(headerLabel);

  if (!normalized) {
    return true;
  }

  return BLOCKED_HEADER_LABELS.has(normalized);
}

/**
 * @param {{ rawFieldType?: string, type?: string } | null | undefined} field
 */
export function isImportableFieldDefinition(field) {
  if (!field || typeof field !== "object") {
    return false;
  }

  const rawType = String(field.rawFieldType || field.type || "")
    .trim()
    .toLowerCase();

  if (!rawType || rawType === "relation" || rawType === "multi_choice") {
    return false;
  }

  if (rawType === "boolean" || rawType === "file") {
    return false;
  }

  const editorType = normalizeFieldEditorType(rawType);

  if (editorType === "relation" || editorType === "multi_choice") {
    return false;
  }

  return MVP_IMPORT_FIELD_TYPES.has(rawType) || MVP_IMPORT_FIELD_TYPES.has(editorType);
}

/**
 * @param {string | null | undefined} fieldKey
 */
export function isBlockedImportFieldKey(fieldKey) {
  const key = String(fieldKey || "").trim();

  if (!key) {
    return true;
  }

  if (isTableRowNumberPresentationFieldKey(key)) {
    return true;
  }

  if (key === EXPORT_HIERARCHY_NUMBER_COLUMN_KEY) {
    return true;
  }

  return ["id", "created_at", "updated_at", "created_by", "updated_by", "version"].includes(
    key,
  );
}
