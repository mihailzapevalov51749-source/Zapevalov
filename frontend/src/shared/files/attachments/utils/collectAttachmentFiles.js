import { normalizeFiles } from "../../../fieldTypes/file/fileUtils";

/**
 * @param {Record<string, unknown>} values
 * @param {Array<{ key: string }>} fileFields
 * @param {unknown} [fallbackAttachments]
 */
export function collectAttachmentFiles(values = {}, fileFields = [], fallbackAttachments = null) {
  const files = [];

  for (const field of fileFields) {
    const fieldKey = String(field?.key || "").trim();

    if (!fieldKey) {
      continue;
    }

    const normalized = normalizeFiles(values[fieldKey]);

    normalized.forEach((file) => {
      files.push({
        ...file,
        __fieldKey: fieldKey,
      });
    });
  }

  if (files.length) {
    return files;
  }

  return normalizeFiles(fallbackAttachments).map((file, index) => ({
    ...file,
    __fieldKey: file?.__fieldKey || `fallback-${index}`,
  }));
}
