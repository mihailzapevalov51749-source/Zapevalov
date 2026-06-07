import {
  normalizeRoleMapping,
  sanitizeRoleMapping,
} from "../../objectViews/services/objectViewRoleMapping.js";

/**
 * @param {Record<string, unknown> | null | undefined} settingsJson
 */
export function readRoleMappingFromSettings(settingsJson) {
  return normalizeRoleMapping(settingsJson?.objectView?.roleMapping);
}

/**
 * Persists roleMapping into settings_json.objectView on Studio save.
 * Must run after syncViewSettingsFromDraftProjection.
 *
 * @param {Record<string, unknown> | null | undefined} settingsJson
 * @param {Record<string, string> | null | undefined} roleMapping
 */
export function syncViewSettingsRoleMapping(settingsJson, roleMapping) {
  const settings =
    settingsJson && typeof settingsJson === "object" ? { ...settingsJson } : {};

  const objectView = settings.objectView;
  if (!objectView || typeof objectView !== "object") {
    return settings;
  }

  const projectionKeys = Array.isArray(objectView.projection?.fieldKeys)
    ? objectView.projection.fieldKeys.map((key) => String(key || "").trim()).filter(Boolean)
    : [];

  return {
    ...settings,
    objectView: {
      ...objectView,
      roleMapping: sanitizeRoleMapping(roleMapping, projectionKeys),
    },
  };
}
