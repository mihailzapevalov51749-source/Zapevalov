/**
 * @param {Record<string, unknown> | null | undefined} field
 * @returns {"user" | "status" | "choice" | "number" | "date" | "text" | null}
 */
export function resolveImportDefaultValueEditor(field) {
  if (!field || typeof field !== "object") {
    return null;
  }

  const rawFieldType = String(field.rawFieldType || field.field_type || "")
    .trim()
    .toLowerCase();
  const normalizedType = String(field.type || "")
    .trim()
    .toLowerCase();

  if (
    rawFieldType === "user" ||
    rawFieldType === "assignee" ||
    normalizedType === "user"
  ) {
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

  if (rawFieldType === "text" || rawFieldType === "textarea") {
    return "text";
  }

  return null;
}

/**
 * @param {Record<string, unknown> | null | undefined} field
 */
export function supportsImportDefaultValue(field) {
  return resolveImportDefaultValueEditor(field) !== null;
}
