import * as designerApi from "../api/designerApi";
import { syncViewSettingsFromDraftProjection } from "./syncViewSettingsProjection";
import {
  syncViewSettingsRoleMapping,
} from "./syncViewSettingsRoleMapping";
import { resolveStudioProjectionFieldKeys } from "./resolveStudioProjectionFieldKeys";
import { validateRoleMappingAgainstProjection } from "../../objectViews/services/objectViewRoleMapping.js";
import {
  syncPlanSettingsToObjectView,
} from "./syncPlanViewSettings";
import {
  mergeObjectTabSettingsIntoViewSettings,
  readObjectTabSettings,
} from "../../objectViews/services/objectTabSettings";

/**
 * Persists Studio view draft (projection, plan layout, role mapping) to ViewDefinition.
 *
 * @param {{
 *   tenantId: string;
 *   view: { id: string | number; key?: string; view_type?: string };
 *   draft: Record<string, unknown>;
 *   planSettings?: Record<string, unknown> | null;
 * }} params
 * @returns {Promise<Record<string, unknown>>}
 */
export async function saveStudioViewDraft({
  tenantId,
  view,
  draft,
  planSettings = null,
}) {
  if (!tenantId || !view?.id || !draft) {
    throw new Error("saveStudioViewDraft: missing tenantId, view, or draft");
  }

  const projectionFieldKeys = resolveStudioProjectionFieldKeys(draft.projection);

  if (draft.view_type !== "plan") {
    const roleMappingIssues = validateRoleMappingAgainstProjection(
      draft.roleMapping,
      projectionFieldKeys,
    );

    if (roleMappingIssues.length) {
      throw new Error(roleMappingIssues.map((issue) => issue.message).join("\n"));
    }
  }

  let nextSettings = syncViewSettingsFromDraftProjection(
    draft.settings_json,
    draft.projection,
  );

  nextSettings = syncViewSettingsRoleMapping(nextSettings, draft.roleMapping);

  if (draft.view_type === "plan") {
    nextSettings = syncPlanSettingsToObjectView(nextSettings, planSettings, {
      viewKey: draft.key,
      viewType: draft.view_type,
    });
  }

  nextSettings = mergeObjectTabSettingsIntoViewSettings(
    nextSettings,
    draft.tabSettings || readObjectTabSettings(draft.settings_json),
  );

  return designerApi.updateView(tenantId, view.id, {
    name: draft.name,
    view_type: draft.view_type,
    is_active: draft.is_active,
    description: draft.description,
    settings_json: nextSettings,
  });
}
