/**
 * @param {Array<Record<string, unknown>>} importableFields
 */
export function getRequiredImportableFields(importableFields) {
  return (Array.isArray(importableFields) ? importableFields : []).filter((field) =>
    Boolean(field?.isRequired),
  );
}
