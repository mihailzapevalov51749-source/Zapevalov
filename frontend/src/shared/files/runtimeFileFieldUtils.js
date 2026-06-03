/**
 * Normalizes POST /files/upload response for runtime FILE field values.
 *
 * @param {Record<string, unknown> | null | undefined} uploaded
 * @returns {Record<string, unknown> | null}
 */
export function normalizeUploadedFileRecord(uploaded) {
  if (!uploaded || typeof uploaded !== "object") {
    return null;
  }

  const fileId =
    uploaded.file_id ||
    uploaded.fileId ||
    uploaded.id ||
    uploaded.stored_file_name ||
    uploaded.storedFileName;

  if (!fileId) {
    return null;
  }

  const fileUrl = uploaded.file_url || uploaded.fileUrl || "";
  const fileName = uploaded.file_name || uploaded.fileName || "Файл";
  const mimeType =
    uploaded.mime_type ||
    uploaded.mimeType ||
    uploaded.file_type ||
    uploaded.fileType ||
    "";
  const size =
    uploaded.size ?? uploaded.file_size ?? uploaded.fileSize ?? null;

  return {
    file_id: String(fileId),
    file_name: String(fileName),
    mime_type: mimeType ? String(mimeType) : "",
    size: size == null ? null : Number(size),
    file_url: fileUrl ? String(fileUrl) : "",
    id: String(fileId),
    file_type: mimeType ? String(mimeType) : "",
    file_size: size == null ? null : Number(size),
    stored_file_name:
      uploaded.stored_file_name || uploaded.storedFileName || String(fileId),
  };
}

/**
 * @param {Record<string, unknown> | null | undefined} field
 */
export function isFileFieldMultiple(field) {
  const settings = field?.settings_json || field?.settingsJson;

  if (settings && typeof settings === "object" && "multiple" in settings) {
    return Boolean(settings.multiple);
  }

  return true;
}
