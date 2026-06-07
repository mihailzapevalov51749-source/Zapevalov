export const RELATION_FIELD_TYPE = "relation";

export const RELATION_ROLE_OPTIONS = [
  { value: "source", label: "Источник" },
  { value: "target", label: "Получатель" },
];

export const RELATION_CARDINALITY_OPTIONS = [
  { value: "one", label: "Одна связь" },
  { value: "many", label: "Несколько связей" },
];

export function normalizeObjectTypeId(value) {
  const normalized = String(value ?? "").trim().toLowerCase();
  return normalized || "";
}

export function findRelationDefinitionByKey(relations = [], relationKey) {
  const key = String(relationKey || "").trim();
  if (!key) {
    return null;
  }

  return (
    (Array.isArray(relations) ? relations : []).find(
      (item) => String(item?.key || "").trim() === key,
    ) || null
  );
}

export function isRelationDefinitionForObjectType(objectTypeId, relationDef) {
  if (!relationDef || !objectTypeId) {
    return false;
  }

  const currentId = normalizeObjectTypeId(objectTypeId);
  const sourceId = normalizeObjectTypeId(relationDef.source_object_type_id);
  const targetId = normalizeObjectTypeId(relationDef.target_object_type_id);

  return currentId === sourceId || currentId === targetId;
}

/**
 * @param {Array<Record<string, unknown>>} relations
 * @param {string} objectTypeId
 */
export function filterRelationDefinitionsForObjectType(relations = [], objectTypeId) {
  return listActiveRelationDefinitions(relations).filter((item) =>
    isRelationDefinitionForObjectType(objectTypeId, item),
  );
}

export function getRelationRoleLabel(role) {
  return RELATION_ROLE_OPTIONS.find((item) => item.value === role)?.label || "—";
}

export function getRelationCardinalityLabel(cardinality) {
  return RELATION_CARDINALITY_OPTIONS.find((item) => item.value === cardinality)?.label || "—";
}

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

  const currentId = normalizeObjectTypeId(objectTypeId);
  const sourceId = normalizeObjectTypeId(relationDef.source_object_type_id);
  const targetId = normalizeObjectTypeId(relationDef.target_object_type_id);

  if (sourceId && sourceId === currentId) {
    return "source";
  }

  if (targetId && targetId === currentId) {
    return "target";
  }

  return "";
}

/**
 * Field cardinality aligned with relation definition type and object role.
 *
 * @param {{ relation_type?: string } | null | undefined} relationDef
 * @param {string} role
 */
export function suggestRelationFieldCardinality(relationDef, role) {
  const relationType = String(relationDef?.relation_type || "").trim();
  const normalizedRole = String(role || "").trim();

  if (relationType === "many_to_many") {
    return "many";
  }

  if (relationType === "one_to_one") {
    return "one";
  }

  if (relationType === "one_to_many") {
    if (normalizedRole === "source") {
      return "one";
    }

    if (normalizedRole === "target") {
      return "many";
    }
  }

  return "one";
}

/**
 * @param {string} objectTypeId
 * @param {{ key?: string, source_object_type_id?: string, target_object_type_id?: string, relation_type?: string } | null | undefined} relationDef
 */
export function resolveRelationFieldBinding(objectTypeId, relationDef) {
  const role = suggestRelationRoleForObjectType(objectTypeId, relationDef);

  if (!role) {
    return null;
  }

  return {
    role,
    cardinality: suggestRelationFieldCardinality(relationDef, role),
  };
}

/**
 * @param {{
 *   objectTypeId: string,
 *   relationDefinitions?: Array<Record<string, unknown>>,
 *   relation_key?: string,
 * }} params
 */
export function resolveRelationFieldSettingsPayload({
  objectTypeId,
  relationDefinitions = [],
  relation_key,
}) {
  const relationDef = findRelationDefinitionByKey(relationDefinitions, relation_key);
  const binding = resolveRelationFieldBinding(objectTypeId, relationDef);

  if (!binding) {
    return null;
  }

  return buildRelationSettingsPayload({
    relation_key,
    role: binding.role,
    cardinality: binding.cardinality,
  });
}

/**
 * @param {string} objectTypeId
 * @param {{ key?: string } | null | undefined} relationDef
 * @param {string} [relationKey]
 */
export function buildRelationFieldSelectionPatch(objectTypeId, relationDef, relationKey) {
  const binding = resolveRelationFieldBinding(objectTypeId, relationDef);

  return {
    relation_key: String(relationKey ?? relationDef?.key ?? "").trim(),
    role: binding?.role || "",
    cardinality: binding?.cardinality || "",
  };
}

export function formatRelationFieldApiError(message) {
  const text = String(message || "").trim();

  if (!text) {
    return "Не удалось сохранить поле связи.";
  }

  if (
    /settings_json\.role=/i.test(text) ||
    /relation definition/i.test(text) ||
    /Unknown relation definition/i.test(text)
  ) {
    return "Выбранная связь не соответствует текущему объекту. Проверьте настройки связи.";
  }

  return text;
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
 * @param {{
 *   objectTypeId?: string,
 *   relationDefinitions?: Array<Record<string, unknown>>,
 * }} [context]
 */
export function validateRelationFieldDraft(draft, context = {}) {
  const errors = {};
  const relationKey = String(draft?.relation_key || "").trim();
  const role = String(draft?.role || "").trim();
  const cardinality = String(draft?.cardinality || "").trim();
  const objectTypeId = context.objectTypeId;
  const relationDefinitions = context.relationDefinitions || [];

  if (!relationKey) {
    errors.relation_key = "Выберите связь";
    return errors;
  }

  const relationDef = findRelationDefinitionByKey(relationDefinitions, relationKey);

  if (!relationDef) {
    errors.relation_key = "Выберите связь";
    return errors;
  }

  if (relationDef.is_active === false) {
    errors.relation_key = "Выбранная связь неактивна";
    return errors;
  }

  const expectedBinding = resolveRelationFieldBinding(objectTypeId, relationDef);

  if (!expectedBinding) {
    errors.relation_key =
      "Выбранная связь не соответствует текущему объекту. Проверьте настройки связи.";
    return errors;
  }

  if (!role) {
    errors.role = "Роль определяется автоматически после выбора связи";
  } else if (role !== expectedBinding.role) {
    errors.relation_key =
      "Выбранная связь не соответствует текущему объекту. Проверьте настройки связи.";
  }

  if (!cardinality) {
    errors.cardinality = "Кардинальность определяется автоматически после выбора связи";
  } else if (cardinality !== expectedBinding.cardinality) {
    errors.cardinality = "Кардинальность не соответствует выбранной связи";
  }

  return errors;
}
