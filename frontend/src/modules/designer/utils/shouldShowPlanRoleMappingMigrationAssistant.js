import { normalizeRoleMapping } from "../../objectViews/services/objectViewRoleMapping.js";

/**
 * @param {Record<string, string> | null | undefined} roleMapping
 * @param {Record<string, unknown> | null | undefined} legacyPlanSettings
 */
export function shouldShowPlanRoleMappingMigrationAssistant(
  roleMapping,
  legacyPlanSettings,
) {
  const mapping = normalizeRoleMapping(roleMapping);
  if (Object.keys(mapping).length > 0) {
    return false;
  }

  const legacy = legacyPlanSettings && typeof legacyPlanSettings === "object"
    ? legacyPlanSettings
    : {};

  return Boolean(
    String(legacy.titleFieldKey || "").trim() ||
      String(legacy.statusFieldKey || "").trim() ||
      String(legacy.descriptionFieldKey || "").trim() ||
      String(legacy.nextStepsFieldKey || "").trim(),
  );
}
