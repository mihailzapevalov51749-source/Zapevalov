import {
  PLAN_ROLE_KEYS,
  normalizeRoleMapping,
  sanitizeRoleMapping,
} from "../../objectViews/services/objectViewRoleMapping.js";

/** @deprecated Legacy presentation.plan keys → roleMapping roles. */
export const PLAN_LEGACY_TO_ROLE_KEY = {
  titleFieldKey: PLAN_ROLE_KEYS.NODE_TITLE,
  statusFieldKey: PLAN_ROLE_KEYS.NODE_STATUS,
  descriptionFieldKey: PLAN_ROLE_KEYS.NODE_DESCRIPTION,
  nextStepsFieldKey: PLAN_ROLE_KEYS.NEXT_STEPS,
};

/**
 * When legacy *FieldKey is empty, infer required roles from projection field names.
 * Migration Assistant only — does not remove legacy keys.
 */
export const PLAN_REQUIRED_ROLE_INFERENCE = {
  [PLAN_ROLE_KEYS.NODE_TITLE]: ["title", "name"],
  [PLAN_ROLE_KEYS.NODE_STATUS]: ["status"],
  [PLAN_ROLE_KEYS.NODE_DESCRIPTION]: ["description"],
};

/**
 * @param {Record<string, unknown> | null | undefined} planSettings
 * @param {string[]} projectionFieldKeys
 * @param {Record<string, string>} [existingRoleMapping]
 * @param {{ inferRequiredRoles?: boolean }} [options]
 * @returns {Record<string, string>}
 */
export function generatePlanRoleMappingFromLegacy(
  planSettings,
  projectionFieldKeys = [],
  existingRoleMapping = {},
  options = {},
) {
  const inferRequiredRoles = options.inferRequiredRoles !== false;
  const projectionSet = new Set(
    (projectionFieldKeys || [])
      .map((key) => String(key || "").trim())
      .filter(Boolean),
  );

  const result = { ...normalizeRoleMapping(existingRoleMapping) };
  const legacy =
    planSettings && typeof planSettings === "object" ? planSettings : {};

  for (const [legacyKey, roleKey] of Object.entries(PLAN_LEGACY_TO_ROLE_KEY)) {
    const fieldKey = String(legacy[legacyKey] || "").trim();
    if (!fieldKey || !projectionSet.has(fieldKey)) {
      continue;
    }
    result[roleKey] = fieldKey;
  }

  if (inferRequiredRoles) {
    for (const [roleKey, candidates] of Object.entries(PLAN_REQUIRED_ROLE_INFERENCE)) {
      if (result[roleKey]) {
        continue;
      }
      for (const candidate of candidates) {
        if (projectionSet.has(candidate)) {
          result[roleKey] = candidate;
          break;
        }
      }
    }
  }

  return sanitizeRoleMapping(result, projectionFieldKeys);
}
