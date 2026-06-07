import { normalizePlanPresentation } from "../../objectViews/plan/planViewContract.js";
import { OBJECT_VIEW_CONTRACT_SCHEMA_VERSION } from "../../objectViews/services/objectViewContract.js";
import { buildViewInitialSettingsJson } from "./buildViewInitialSettingsJson.js";

/**
 * Initial settings_json scaffold for a newly created Plan object tab.
 *
 * @param {string} viewKey
 */
export function buildPlanViewInitialSettingsJson(viewKey) {
  return buildViewInitialSettingsJson(viewKey, "plan");
}

/**
 * Keeps plan settings inside settings_json.objectView.presentation.plan on Studio save.
 *
 * @param {Record<string, unknown>} settingsJson
 * @param {Record<string, unknown> | null | undefined} planSettings
 * @param {{ viewKey?: string, viewType?: string }} [options]
 */
export function syncPlanSettingsToObjectView(settingsJson, planSettings, options = {}) {
  const settings =
    settingsJson && typeof settingsJson === "object" ? { ...settingsJson } : {};

  const viewKey = String(options.viewKey || "").trim();
  const viewType = String(options.viewType || "plan").trim() || "plan";

  const objectView =
    settings.objectView && typeof settings.objectView === "object"
      ? { ...settings.objectView }
      : { schemaVersion: OBJECT_VIEW_CONTRACT_SCHEMA_VERSION };

  objectView.schemaVersion = OBJECT_VIEW_CONTRACT_SCHEMA_VERSION;
  if (viewKey) {
    objectView.key = viewKey;
  }
  objectView.viewType = viewType;

  const existingPlan = readPlanSettingsFromView(settings);
  const mergedPlanInput =
    planSettings && typeof planSettings === "object"
      ? { ...existingPlan, ...planSettings }
      : existingPlan;

  const presentation =
    objectView.presentation && typeof objectView.presentation === "object"
      ? { ...objectView.presentation }
      : {};

  presentation.plan = normalizePlanPresentation(mergedPlanInput);

  objectView.presentation = presentation;
  settings.objectView = objectView;
  if (presentation.plan.titleFieldKey) {
    const projection =
      settings.projection && typeof settings.projection === "object"
        ? { ...settings.projection }
        : {};
    projection.title_field = presentation.plan.titleFieldKey;
    settings.projection = projection;

    objectView.projection = {
      ...(objectView.projection && typeof objectView.projection === "object"
        ? objectView.projection
        : {}),
      titleFieldKey: presentation.plan.titleFieldKey,
    };
  }

  return settings;
}

/**
 * @param {Record<string, unknown> | null | undefined} settingsJson
 */
export function readPlanSettingsFromView(settingsJson) {
  const objectView =
    settingsJson?.objectView && typeof settingsJson.objectView === "object"
      ? settingsJson.objectView
      : null;

  return normalizePlanPresentation(objectView?.presentation?.plan);
}
