import { readRoleMappingFromSettings } from "./syncViewSettingsRoleMapping";
import { readPlanSettingsFromView } from "./syncPlanViewSettings";
import { readObjectTabSettings } from "../../objectViews/services/objectTabSettings";
import { resolveStudioDraftProjection } from "./resolveStudioDraftProjection";

/**
 * Returns true when Studio view draft differs from the saved ViewDefinition record.
 *
 * @param {{
 *   view?: { name?: string; view_type?: string; is_active?: boolean; description?: string; settings_json?: Record<string, unknown> } | null;
 *   draft?: Record<string, unknown> | null;
 *   planSettings?: Record<string, unknown> | null;
 *   fieldOptions?: Array<{ key: string }>;
 * }} params
 */
export function computeStudioViewDraftDirty({
  view = null,
  draft = null,
  planSettings = null,
  fieldOptions = [],
} = {}) {
  if (!view || !draft) {
    return false;
  }

  const savedSettings = view.settings_json || {};
  const savedPlan = readPlanSettingsFromView(savedSettings);
  const currentPlan = planSettings || savedPlan;

  if (JSON.stringify(savedPlan) !== JSON.stringify(currentPlan)) {
    return true;
  }

  if (draft.name !== view.name) return true;
  if (draft.view_type !== view.view_type) return true;
  if (draft.is_active !== view.is_active) return true;
  if ((draft.description || "") !== (view.description || "")) return true;

  const savedTabSettings = readObjectTabSettings(savedSettings);
  const currentTabSettings =
    draft.tabSettings != null
      ? draft.tabSettings
      : readObjectTabSettings(draft.settings_json || savedSettings);

  if (JSON.stringify(currentTabSettings) !== JSON.stringify(savedTabSettings)) {
    return true;
  }

  const savedProjection = resolveStudioDraftProjection(savedSettings, fieldOptions);
  const currentProjection = draft.projection;

  if (JSON.stringify(currentProjection) !== JSON.stringify(savedProjection)) {
    return true;
  }

  const savedRoleMapping = readRoleMappingFromSettings(savedSettings);
  return JSON.stringify(draft.roleMapping || {}) !== JSON.stringify(savedRoleMapping);
}
