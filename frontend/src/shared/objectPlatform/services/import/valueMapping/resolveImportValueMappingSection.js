import { normalizeFieldEditorType } from "../../../../fieldEditors/fieldEditorRegistry";

/**
 * @param {Record<string, unknown> | null | undefined} field
 * @returns {"status" | "list" | "user" | null}
 */
export function resolveImportValueMappingSection(field) {
  if (!field || typeof field !== "object") {
    return null;
  }

  const rawFieldType = String(field.rawFieldType || field.type || "")
    .trim()
    .toLowerCase();
  const editorType = normalizeFieldEditorType(rawFieldType);

  if (rawFieldType === "status") {
    return "status";
  }

  if (rawFieldType === "select") {
    return "list";
  }

  if (editorType === "user" || rawFieldType === "assignee") {
    return "user";
  }

  if (editorType === "choice" && rawFieldType !== "status" && rawFieldType !== "select") {
    return "list";
  }

  return null;
}
