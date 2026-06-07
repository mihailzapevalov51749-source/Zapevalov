import { OBJECT_VIEW_CONTRACT_SCHEMA_VERSION } from "../../objectViews/services/objectViewContract.js";
import { normalizePlanPresentation } from "../../objectViews/plan/planViewContract.js";
import { DEFAULT_PLAN_PRESENTATION } from "../../objectViews/plan/planViewContract.js";

/**
 * Initial settings_json scaffold for any Studio object tab.
 *
 * @param {string} viewKey
 * @param {string} viewType
 */
export function buildViewInitialSettingsJson(viewKey, viewType = "table") {
  const key = String(viewKey || "").trim();
  const normalizedType = String(viewType || "table").trim().toLowerCase() || "table";

  const objectView = {
    schemaVersion: OBJECT_VIEW_CONTRACT_SCHEMA_VERSION,
    key,
    viewType: normalizedType,
    projection: {
      fieldKeys: [],
      fieldOrder: [],
      titleFieldKey: null,
    },
    roleMapping: {},
    query: {
      filters: {
        conditions: [],
        savedFilters: [],
        quickFilters: [],
        defaultQuickFilterId: null,
      },
      sort: { rules: [] },
      pagination: { defaultPageSize: 20 },
    },
    presentation: {},
  };

  if (normalizedType === "plan") {
    objectView.presentation = {
      plan: normalizePlanPresentation(DEFAULT_PLAN_PRESENTATION),
    };
  }

  if (normalizedType === "quick_form") {
    objectView.presentation = {
      quickForm: {},
    };
  }

  return { objectView };
}
