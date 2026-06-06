import {
  REQUIRED_FIELD_UNMAPPED_CODE,
  REQUIRED_FIELD_UNMAPPED_MESSAGE,
} from "./importReviewConstants.js";

/**
 * @param {Array<{ column?: string, message?: string, code?: string }>} errors
 * @returns {string[]}
 */
export function collectUnmappedRequiredImportFields(errors) {
  const fields = new Set();

  for (const error of Array.isArray(errors) ? errors : []) {
    if (!isRequiredFieldUnmappedError(error)) {
      continue;
    }

    const label = String(error?.column || "").trim();

    if (label) {
      fields.add(label);
    }
  }

  return [...fields];
}

/**
 * @param {{ message?: string, code?: string } | null | undefined} error
 */
export function isRequiredFieldUnmappedError(error) {
  return (
    error?.code === REQUIRED_FIELD_UNMAPPED_CODE ||
    error?.message === REQUIRED_FIELD_UNMAPPED_MESSAGE
  );
}

/**
 * @param {Array<{ column?: string, message?: string, code?: string }>} errors
 */
export function hasUnmappedRequiredImportFields(errors) {
  return collectUnmappedRequiredImportFields(errors).length > 0;
}
