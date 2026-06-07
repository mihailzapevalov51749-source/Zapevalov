import { isRelationFieldType } from "../../designer/components/fields/relationFieldFormUtils.js";

/**
 * Normalizes pending relation selection to unique non-empty entity ids.
 *
 * @param {unknown} value
 * @returns {string[]}
 */
export function normalizeRelationFormValue(value) {
  if (Array.isArray(value)) {
    return [
      ...new Set(
        value
          .map((item) => String(item ?? "").trim())
          .filter(Boolean),
      ),
    ];
  }

  const normalized = String(value ?? "").trim();

  if (!normalized) {
    return [];
  }

  return [normalized];
}

/**
 * @param {unknown} value
 * @returns {boolean}
 */
export function isRelationFormValueEmpty(value) {
  return normalizeRelationFormValue(value).length === 0;
}

/**
 * @param {{ label?: string, key?: string, isRequired?: boolean, rawFieldType?: string, type?: string }} field
 * @param {unknown} value
 * @returns {string | null}
 */
export function validateRequiredRelationFormValue(field, value) {
  const rawFieldType = String(field?.rawFieldType || field?.type || "").trim();

  if (!isRelationFieldType(rawFieldType)) {
    return null;
  }

  if (!field?.isRequired) {
    return null;
  }

  if (!isRelationFormValueEmpty(value)) {
    return null;
  }

  const label = String(field?.label || field?.key || "Поле").trim();

  return `Поле «${label}» обязательно для заполнения.`;
}

/**
 * @param {Array<Record<string, unknown>>} fields
 * @returns {Array<Record<string, unknown>>}
 */
export function filterRelationCreateFields(fields = []) {
  return fields.filter((field) =>
    isRelationFieldType(field?.rawFieldType || field?.type),
  );
}
