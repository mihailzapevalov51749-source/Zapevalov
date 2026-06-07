import { syncViewSettingsFromDraftProjection } from "./syncViewSettingsProjection";
import { syncViewSettingsRoleMapping } from "./syncViewSettingsRoleMapping";
import { syncPlanSettingsToObjectView } from "./syncPlanViewSettings";

/**
 * Builds settings_json for Studio Plan preview from draft + plan layout settings.
 *
 * @param {Record<string, unknown> | null | undefined} draft
 * @param {Record<string, unknown> | null | undefined} planSettings
 */
export function buildStudioPlanViewDraftSettings(draft, planSettings) {
  if (!draft || draft.view_type !== "plan") {
    return null;
  }

  let nextSettings = syncViewSettingsFromDraftProjection(
    draft.settings_json,
    draft.projection,
  );

  nextSettings = syncViewSettingsRoleMapping(nextSettings, draft.roleMapping);
  nextSettings = syncPlanSettingsToObjectView(nextSettings, planSettings, {
    viewKey: draft.key,
    viewType: draft.view_type,
  });

  return nextSettings;
}
