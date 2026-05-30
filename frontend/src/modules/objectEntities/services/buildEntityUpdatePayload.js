import { normalizeFieldEditorType } from "../../../shared/fieldEditors/fieldEditorRegistry";

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
 * Runtime entity PATCH payload. Cleared optional fields → null.
 *
 * @param {Record<string, unknown>} formValues
 * @param {Array<{ key: string, rawFieldType?: string, isRequired?: boolean }>} fields
 * @returns {{ values: Record<string, unknown>, fieldErrors: Record<string, string> }}
 */
export function buildEntityUpdatePayload(formValues, fields = []) {
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
        continue;
      }

      values[key] = null;
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

/**
 * @param {Record<string, unknown>} entity
 * @param {Array<{ key: string, rawFieldType?: string }>} editableFields
 */
export function buildInitialFormValuesFromEntity(entity, editableFields = []) {
  const entityValues =
    entity?.values && typeof entity.values === "object" ? entity.values : {};

  /** @type {Record<string, unknown>} */
  const formValues = {};

  for (const field of editableFields) {
    const key = String(field.key || "").trim();

    if (!key) {
      continue;
    }

    const editorType = normalizeFieldEditorType(field.rawFieldType);
    const rawValue = entityValues[key];

    if (rawValue === null || rawValue === undefined) {
      if (editorType === "boolean") {
        formValues[key] = false;
      } else if (editorType === "multi_choice") {
        formValues[key] = [];
      } else if (editorType === "number") {
        formValues[key] = "";
      } else {
        formValues[key] = "";
      }
      continue;
    }

    if (editorType === "multi_choice") {
      formValues[key] = Array.isArray(rawValue)
        ? rawValue.map((item) => String(item))
        : [];
      continue;
    }

    if (editorType === "boolean") {
      formValues[key] = Boolean(rawValue);
      continue;
    }

    if (editorType === "number") {
      formValues[key] = rawValue;
      continue;
    }

    formValues[key] = rawValue;
  }

  return formValues;
}
