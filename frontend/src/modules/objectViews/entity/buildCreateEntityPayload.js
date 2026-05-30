import { normalizeFieldEditorType } from "../../../shared/fieldEditors/fieldEditorRegistry";

/**
 * @param {Array<{ key: string, rawFieldType?: string, isRequired?: boolean }>} fields
 */
export function buildInitialCreateFormValues(fields = []) {
  /** @type {Record<string, unknown>} */
  const values = {};

  for (const field of fields) {
    const editorType = normalizeFieldEditorType(field.rawFieldType);

    switch (editorType) {
      case "boolean":
        values[field.key] = false;
        break;
      case "multi_choice":
        values[field.key] = [];
        break;
      case "number":
        values[field.key] = "";
        break;
      default:
        values[field.key] = "";
        break;
    }
  }

  return values;
}

function isEmptyValue(editorType, value) {
  if (editorType === "boolean") {
    return false;
  }

  if (editorType === "multi_choice") {
    return !Array.isArray(value) || value.length === 0;
  }

  if (value === null || value === undefined) {
    return true;
  }

  if (typeof value === "string") {
    return value.trim() === "";
  }

  return false;
}

/**
 * @param {Record<string, unknown>} formValues
 * @param {Array<{ key: string, rawFieldType?: string, isRequired?: boolean }>} fields
 * @returns {{ values: Record<string, unknown>, fieldErrors: Record<string, string> }}
 */
export function buildCreateEntityPayload(formValues, fields = []) {
  /** @type {Record<string, unknown>} */
  const values = {};
  /** @type {Record<string, string>} */
  const fieldErrors = {};

  for (const field of fields) {
    const key = String(field.key || "").trim();

    if (!key) {
      continue;
    }

    const editorType = normalizeFieldEditorType(field.rawFieldType);
    const rawValue = formValues[key];
    const empty = isEmptyValue(editorType, rawValue);

    if (empty) {
      if (field.isRequired) {
        fieldErrors[key] = "Обязательное поле";
      }
      continue;
    }

    if (editorType === "number") {
      const num = Number(rawValue);

      if (Number.isNaN(num)) {
        fieldErrors[key] = "Введите число";
        continue;
      }

      values[key] = num;
      continue;
    }

    if (editorType === "multi_choice") {
      values[key] = Array.isArray(rawValue)
        ? rawValue.map((item) => String(item))
        : [];
      continue;
    }

    if (editorType === "boolean") {
      values[key] = Boolean(rawValue);
      continue;
    }

    if (editorType === "text" || editorType === "textarea") {
      values[key] = String(rawValue).trim();
      continue;
    }

    if (editorType === "date" || editorType === "datetime") {
      values[key] = String(rawValue);
      continue;
    }

    if (editorType === "choice") {
      values[key] = String(rawValue);
      continue;
    }

    values[key] = rawValue;
  }

  return { values, fieldErrors };
}
