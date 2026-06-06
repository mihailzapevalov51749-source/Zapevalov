/**
 * @param {number | null | undefined} bytes
 */
export function formatImportFileSize(bytes) {
  const value = Number(bytes);

  if (!Number.isFinite(value) || value <= 0) {
    return "";
  }

  if (value < 1024) {
    return `${value} Б`;
  }

  if (value < 1024 * 1024) {
    return `${Math.round(value / 1024)} КБ`;
  }

  return `${(value / (1024 * 1024)).toFixed(1)} МБ`;
}
