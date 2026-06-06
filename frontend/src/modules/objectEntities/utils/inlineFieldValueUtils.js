import { normalizeFieldEditorType } from "../../../shared/fieldEditors/fieldEditorRegistry";
import { normalizeUserFieldId } from "../../../shared/fieldEditors/userFieldValueUtils";

function isEmptyValue(value) {
  return value === null || value === undefined || value === "";
}

function normalizeDateKey(value) {
  if (isEmptyValue(value)) {
    return "";
  }

  const stringValue = String(value).trim();

  if (/^\d{4}-\d{2}-\d{2}/.test(stringValue)) {
    return stringValue.slice(0, 10);
  }

  const date = new Date(stringValue);

  if (Number.isNaN(date.getTime())) {
    return stringValue;
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function normalizeMultiChoice(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((item) => String(item)).sort();
}

/**
 * Compares field values for inline-edit commit (no PATCH when equal).
 *
 * @param {*} current
 * @param {*} next
 * @param {string | null | undefined} editorType
 */
export function isSameFieldValue(current, next, editorType) {
  const type = normalizeFieldEditorType(editorType);

  if (type === "multi_choice") {
    const left = normalizeMultiChoice(current);
    const right = normalizeMultiChoice(next);

    if (left.length !== right.length) {
      return false;
    }

    return left.every((item, index) => item === right[index]);
  }

  if (type === "number") {
    if (isEmptyValue(current) && isEmptyValue(next)) {
      return true;
    }

    const left = Number(current);
    const right = Number(next);

    if (Number.isNaN(left) || Number.isNaN(right)) {
      return String(current) === String(next);
    }

    return left === right;
  }

  if (type === "date" || type === "datetime") {
    return normalizeDateKey(current) === normalizeDateKey(next);
  }

  if (type === "user") {
    const leftId = normalizeUserFieldId(current);
    const rightId = normalizeUserFieldId(next);

    if (leftId == null && rightId == null) {
      return true;
    }

    return String(leftId) === String(rightId);
  }

  if (type === "boolean") {
    return Boolean(current) === Boolean(next);
  }

  if (type === "link") {
    const left = isEmptyValue(current) ? "" : String(current).trim();
    const right = isEmptyValue(next) ? "" : String(next).trim();
    return left === right;
  }

  if (isEmptyValue(current) && isEmptyValue(next)) {
    return true;
  }

  return String(current) === String(next);
}
