/**
 * @param {Record<string, unknown> | null | undefined} entity
 * @param {string | null | undefined} fieldKey
 */
export function getPlanEntityFieldValue(entity, fieldKey) {
  const key = String(fieldKey || "").trim();
  if (!entity || !key) {
    return null;
  }

  const values =
    entity.values && typeof entity.values === "object" ? entity.values : entity;

  if (values && typeof values === "object" && key in values) {
    return values[key];
  }

  if (key in entity) {
    return entity[key];
  }

  return null;
}

/**
 * @param {Record<string, unknown> | null | undefined} entity
 * @param {string | null | undefined} titleFieldKey
 * @param {'roleMapping' | 'missing'} [roleSource]
 */
export function resolvePlanEntityTitleFromRole(entity, titleFieldKey, roleSource = "missing") {
  const key = String(titleFieldKey || "").trim();
  const fromField = key ? getPlanEntityFieldValue(entity, key) : null;

  if (fromField != null && String(fromField).trim()) {
    return String(fromField).trim();
  }

  const id = entity?.id ?? entity?.entity_id;
  return id ? String(id) : "—";
}

/**
 * @param {unknown} raw
 * @returns {string[]}
 */
export function parseNextStepsLines(raw) {
  if (raw == null) {
    return [];
  }

  if (Array.isArray(raw)) {
    return raw.map((line) => String(line ?? "").trim()).filter(Boolean);
  }

  return String(raw)
    .split(/\r?\n/)
    .map((line) => line.replace(/^[-•*]\s*/, "").trim())
    .filter(Boolean);
}
