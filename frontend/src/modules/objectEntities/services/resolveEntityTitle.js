/**
 * @param {Record<string, unknown> | null | undefined} entityValues
 * @param {string | null | undefined} titleFieldKey
 */
export function resolveEntityTitle(entityValues, titleFieldKey) {
  const values =
    entityValues && typeof entityValues === "object" ? entityValues : {};

  const key = String(titleFieldKey || "").trim();

  if (key && values[key] != null && values[key] !== "") {
    return String(values[key]);
  }

  return "";
}
