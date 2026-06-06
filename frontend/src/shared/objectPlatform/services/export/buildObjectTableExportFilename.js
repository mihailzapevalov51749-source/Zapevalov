/**
 * @param {string} value
 * @returns {string}
 */
export function sanitizeExportFilenamePart(value) {
  return (
    String(value || "")
      .replace(/[<>:"/\\|?*\x00-\x1F]/g, "_")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 80) || "export"
  );
}

/**
 * @param {Date} [date]
 * @returns {string}
 */
export function formatExportDateStamp(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

/**
 * @param {{
 *   objectName?: string,
 *   viewName?: string | null,
 * }} params
 */
export function buildObjectTableExportFilename({
  objectName = "Объект",
  viewName = null,
} = {}) {
  const safeObjectName = sanitizeExportFilenamePart(objectName);
  const safeViewName = sanitizeExportFilenamePart(viewName);
  const dateStamp = formatExportDateStamp();

  if (!safeViewName || safeViewName === "export") {
    return `${safeObjectName}_${dateStamp}.xlsx`;
  }

  return `${safeObjectName}_${safeViewName}_${dateStamp}.xlsx`;
}
