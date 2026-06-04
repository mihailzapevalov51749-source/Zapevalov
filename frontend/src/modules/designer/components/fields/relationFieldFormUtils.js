export const RELATION_FIELD_TYPE = "relation";

export const RELATION_ROLE_OPTIONS = [
  { value: "source", label: "Источник" },
  { value: "target", label: "Получатель" },
];

export const RELATION_CARDINALITY_OPTIONS = [
  { value: "one", label: "Одна связь" },
  { value: "many", label: "Несколько связей" },
];

export function isRelationFieldType(fieldType) {
  return String(fieldType || "").trim().toLowerCase() === RELATION_FIELD_TYPE;
}

/**
 * @param {Record<string, unknown> | null | undefined} settingsJson
 */
export function normalizeRelationSettingsFromField(settingsJson) {
  const settings =
    settingsJson && typeof settingsJson === "object" ? settingsJson : {};

  return {
    relation_key: String(settings.relation_key || "").trim(),
    role: String(settings.role || "").trim(),
    cardinality: String(settings.cardinality || "").trim(),
  };
}

export function buildRelationSettingsPayload({
  relation_key,
  role,
  cardinality,
}) {
  return {
    relation_key: String(relation_key || "").trim(),
    role: String(role || "").trim(),
    cardinality: String(cardinality || "").trim(),
  };
}

/**
 * @param {string} objectTypeId
 * @param {{ source_object_type_id?: string, target_object_type_id?: string } | null | undefined} relationDef
 */
export function suggestRelationRoleForObjectType(objectTypeId, relationDef) {
  if (!relationDef || !objectTypeId) {
    return "";
  }

  const currentId = String(objectTypeId);
  const sourceId = String(relationDef.source_object_type_id || "");
  const targetId = String(relationDef.target_object_type_id || "");

  if (sourceId && sourceId === currentId) {
    return "source";
  }

  if (targetId && targetId === currentId) {
    return "target";
  }

  return "";
}

/**
 * @param {Array<{ key: string, name?: string, is_active?: boolean }>} relations
 */
export function listActiveRelationDefinitions(relations = []) {
  return (Array.isArray(relations) ? relations : []).filter(
    (item) => item && item.is_active !== false,
  );
}

/**
 * @param {Array<{ is_active?: boolean }>} relations
 */
export function listInactiveRelationDefinitions(relations = []) {
  return (Array.isArray(relations) ? relations : []).filter(
    (item) => item && item.is_active === false,
  );
}

/**
 * @param {Array<{ is_active?: boolean }>} relations
 */
export function resolveRelationDefinitionsAvailability(relations = []) {
  const all = Array.isArray(relations) ? relations : [];
  const active = listActiveRelationDefinitions(all);
  const inactive = listInactiveRelationDefinitions(all);

  return {
    active,
    inactive,
    hasActive: active.length > 0,
    hasInactiveOnly: all.length > 0 && active.length === 0,
    isEmpty: all.length === 0,
  };
}

export function formatRelationDefinitionLabel(relation) {
  if (!relation) {
    return "";
  }

  const name = String(relation.name || "").trim();
  const key = String(relation.key || "").trim();

  if (name && key) {
    return `${name} (${key})`;
  }

  return name || key || "—";
}

/**
 * @param {{
 *   relation_key?: string,
 *   role?: string,
 *   cardinality?: string,
 * }} draft
 */
export function validateRelationFieldDraft(draft) {
  const errors = {};
  const relationKey = String(draft?.relation_key || "").trim();
  const role = String(draft?.role || "").trim();
  const cardinality = String(draft?.cardinality || "").trim();

  if (!relationKey) {
    errors.relation_key = "Выберите связь";
  }

  if (!role) {
    errors.role = "Выберите роль";
  } else if (!RELATION_ROLE_OPTIONS.some((item) => item.value === role)) {
    errors.role = "Недопустимая роль";
  }

  if (!cardinality) {
    errors.cardinality = "Выберите кардинальность";
  } else if (!RELATION_CARDINALITY_OPTIONS.some((item) => item.value === cardinality)) {
    errors.cardinality = "Недопустимая кардинальность";
  }

  return errors;
}
