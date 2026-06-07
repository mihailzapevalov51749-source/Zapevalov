/**
 * Role Mapping — maps view-specific roles to projection field keys.
 * Stage 1 contract only; runtime dual-read is prepared separately.
 */

/** @typedef {Record<string, string>} ObjectViewRoleFieldMapping */
/** @typedef {Record<string, string>} ObjectViewRoleLabels */
/** @typedef {ObjectViewRoleFieldMapping & { labels?: ObjectViewRoleLabels }} ObjectViewRoleMapping */

export const PLAN_ROLE_KEYS = {
  NODE_TITLE: "nodeTitle",
  NODE_STATUS: "nodeStatus",
  NODE_DESCRIPTION: "nodeDescription",
  NEXT_STEPS: "nextSteps",
};

export const ROLE_MAPPING_LABELS_KEY = "labels";

export const DEFAULT_ROLE_MAPPING = {};

const PLAN_ROLE_KEY_SET = new Set(Object.values(PLAN_ROLE_KEYS));

/**
 * @param {unknown} source
 * @returns {ObjectViewRoleFieldMapping}
 */
export function normalizeRoleMapping(source) {
  if (!source || typeof source !== "object" || Array.isArray(source)) {
    return {};
  }

  const result = {};

  for (const [role, fieldKey] of Object.entries(source)) {
    const normalizedRole = String(role || "").trim();

    if (!normalizedRole || normalizedRole === ROLE_MAPPING_LABELS_KEY) {
      continue;
    }

    if (typeof fieldKey !== "string") {
      continue;
    }

    const normalizedFieldKey = String(fieldKey || "").trim();

    if (!normalizedFieldKey) {
      continue;
    }

    result[normalizedRole] = normalizedFieldKey;
  }

  return result;
}

/**
 * @param {unknown} source
 * @returns {ObjectViewRoleLabels}
 */
export function normalizeRoleLabels(source) {
  const labelsRaw =
    source && typeof source === "object" && !Array.isArray(source)
      ? source.labels ?? source
      : {};

  if (!labelsRaw || typeof labelsRaw !== "object" || Array.isArray(labelsRaw)) {
    return {};
  }

  const result = {};

  for (const [roleKey, label] of Object.entries(labelsRaw)) {
    const normalizedRole = String(roleKey || "").trim();
    const normalizedLabel = String(label || "").trim();

    if (!normalizedRole || !normalizedLabel || !PLAN_ROLE_KEY_SET.has(normalizedRole)) {
      continue;
    }

    result[normalizedRole] = normalizedLabel;
  }

  return result;
}

/**
 * @param {string} roleKey
 * @param {ObjectViewRoleMapping | null | undefined} roleMapping
 * @param {string} [defaultLabel]
 */
export function resolveRoleDisplayLabel(roleKey, roleMapping, defaultLabel = "") {
  const labels = normalizeRoleLabels(roleMapping);
  const customLabel = String(labels[roleKey] || "").trim();

  return customLabel || String(defaultLabel || "").trim() || roleKey;
}

/**
 * @param {ObjectViewRoleFieldMapping} fieldMappings
 * @param {ObjectViewRoleLabels} labels
 * @returns {ObjectViewRoleMapping}
 */
export function buildRoleMappingPayload(fieldMappings, labels = {}) {
  const normalizedFields = normalizeRoleMapping(fieldMappings);
  const normalizedLabels = normalizeRoleLabels(labels);

  if (!Object.keys(normalizedLabels).length) {
    return normalizedFields;
  }

  return {
    ...normalizedFields,
    [ROLE_MAPPING_LABELS_KEY]: normalizedLabels,
  };
}

/**
 * Keeps only role entries whose field keys exist in projection.fieldKeys.
 *
 * @param {ObjectViewRoleMapping | null | undefined} roleMapping
 * @param {string[]} projectionFieldKeys
 * @returns {ObjectViewRoleMapping}
 */
export function sanitizeRoleMapping(roleMapping, projectionFieldKeys = []) {
  const normalized = normalizeRoleMapping(roleMapping);
  const labels = normalizeRoleLabels(roleMapping);
  const allowedKeys = new Set(
    (projectionFieldKeys || [])
      .map((key) => String(key || "").trim())
      .filter(Boolean),
  );

  const result = {};

  for (const [role, fieldKey] of Object.entries(normalized)) {
    if (allowedKeys.size === 0 || allowedKeys.has(fieldKey)) {
      result[role] = fieldKey;
    }
  }

  if (Object.keys(labels).length) {
    result[ROLE_MAPPING_LABELS_KEY] = labels;
  }

  return result;
}

/**
 * @param {ObjectViewRoleMapping | null | undefined} roleMapping
 * @param {string[]} projectionFieldKeys
 * @returns {Array<{ code: string, message: string }>}
 */
export function validateRoleMappingAgainstProjection(
  roleMapping,
  projectionFieldKeys = [],
) {
  const normalized = normalizeRoleMapping(roleMapping);

  if (!Object.keys(normalized).length) {
    return [];
  }

  const allowedKeys = new Set(
    (projectionFieldKeys || [])
      .map((key) => String(key || "").trim())
      .filter(Boolean),
  );

  const issues = [];

  for (const [role, fieldKey] of Object.entries(normalized)) {
    if (!allowedKeys.has(fieldKey)) {
      issues.push({
        code: "object_view_role_mapping_field_not_in_projection",
        message:
          `roleMapping.${role} ссылается на поле '${fieldKey}', ` +
          "которое отсутствует в projection.fieldKeys",
      });
    }
  }

  return issues;
}
