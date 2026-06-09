import { readObjectTabSettings } from "../../objectViews/services/objectTabSettings.js";
import { readRoleMappingFromSettings } from "./syncViewSettingsRoleMapping.js";
import { readPlanSettingsFromView } from "./syncPlanViewSettings.js";
import { computeStudioViewDraftDirty } from "./computeStudioViewDraftDirty.js";

/**
 * @param {Record<string, unknown> | null | undefined} view
 * @param {(settingsJson: Record<string, unknown>) => Record<string, unknown>} normalizeProjection
 */
export function buildPlanViewDraftFromView(view, normalizeProjection) {
  if (!view) {
    return null;
  }

  const settingsJson =
    view.settings_json && typeof view.settings_json === "object"
      ? view.settings_json
      : {};

  return {
    name: view.name,
    key: view.key,
    view_type: view.view_type,
    is_active: view.is_active,
    description: view.description || "",
    settings_json: settingsJson,
    projection: normalizeProjection(settingsJson),
    roleMapping: readRoleMappingFromSettings(settingsJson),
    tabSettings: readObjectTabSettings(settingsJson),
  };
}

/**
 * @param {Record<string, unknown> | null | undefined} planSettings
 */
export function readPlanHierarchyRelationKey(planSettings) {
  return String(planSettings?.hierarchyRelationKey || "").trim() || null;
}

/**
 * @param {{
 *   view?: Record<string, unknown> | null;
 *   draft?: Record<string, unknown> | null;
 *   planSettings?: Record<string, unknown> | null;
 *   fieldOptions?: Array<{ key: string }>;
 *   normalizeProjection?: (settingsJson: Record<string, unknown>) => Record<string, unknown>;
 * }} params
 */
export function hasPendingPlanViewChanges({
  view = null,
  draft = null,
  planSettings = null,
  fieldOptions = [],
  normalizeProjection = (settingsJson) => settingsJson,
} = {}) {
  if (!view || view.view_type !== "plan") {
    return false;
  }

  const effectiveDraft = draft ?? buildPlanViewDraftFromView(view, normalizeProjection);

  if (!effectiveDraft) {
    return false;
  }

  const effectivePlanSettings =
    planSettings ?? readPlanSettingsFromView(effectiveDraft.settings_json);

  return computeStudioViewDraftDirty({
    view,
    draft: effectiveDraft,
    planSettings: effectivePlanSettings,
    fieldOptions,
  });
}
