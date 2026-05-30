export const FILE_FIELD_TYPES = ["file", "files", "attachment", "attachments"];

export function isFileFieldType(rawType) {
  const normalized = String(rawType || "").toLowerCase();
  return FILE_FIELD_TYPES.includes(normalized);
}
