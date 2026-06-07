import { getQuickCreateFields } from "./getQuickCreateFields.js";
import { resolveQuickFormFields } from "./resolveQuickFormFields.js";
import { findCatalogObjectType } from "../table/services/adapters/ObjectTypeTableAdapter.js";

const QUICK_FORM_VIEW_TYPE = "quick_form";
const DEFAULT_QUICK_FORM_VIEW_KEY = "default_quick_form";

function normalizeViewType(view) {
  return String(view?.view_type || view?.viewType || "")
    .trim()
    .toLowerCase();
}

function isActiveView(view) {
  return view && view.is_active !== false && view.isActive !== false;
}

function normalizeFieldKeyList(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => String(item ?? "").trim())
    .filter(Boolean);
}

/**
 * @param {Record<string, unknown> | null | undefined} view
 */
function readQuickFormContractFromView(view) {
  const settings =
    view?.settings_json && typeof view.settings_json === "object"
      ? view.settings_json
      : view?.settingsJson && typeof view.settingsJson === "object"
        ? view.settingsJson
        : null;

  if (!settings) {
    return null;
  }

  const objectView = settings.objectView;

  if (objectView && typeof objectView === "object") {
    const projection = objectView.projection;

    return {
      viewType: String(objectView.viewType || QUICK_FORM_VIEW_TYPE),
      key: String(objectView.key || view?.key || DEFAULT_QUICK_FORM_VIEW_KEY),
      projection: {
        fieldKeys: normalizeFieldKeyList(
          projection?.fieldKeys ?? projection?.field_keys,
        ),
        fieldOrder: normalizeFieldKeyList(
          projection?.fieldOrder ??
            projection?.field_order ??
            projection?.fieldKeys ??
            projection?.field_keys,
        ),
        titleFieldKey:
          String(
            projection?.titleFieldKey ?? projection?.title_field_key ?? "",
          ).trim() || null,
      },
      presentation:
        objectView.presentation && typeof objectView.presentation === "object"
          ? objectView.presentation
          : { quickForm: {} },
    };
  }

  const projection = settings.projection;

  if (!projection || typeof projection !== "object") {
    return null;
  }

  const fieldKeys = normalizeFieldKeyList(
    projection.visible_fields ?? projection.field_keys,
  );

  return {
    viewType: QUICK_FORM_VIEW_TYPE,
    key: String(view?.key || DEFAULT_QUICK_FORM_VIEW_KEY),
    projection: {
      fieldKeys,
      fieldOrder: normalizeFieldKeyList(projection.field_order ?? fieldKeys),
      titleFieldKey:
        String(projection.title_field ?? projection.title_field_key ?? "").trim() ||
        null,
    },
    presentation: { quickForm: {} },
  };
}

/**
 * @typedef {"quick_form" | "legacy" | "none"} QuickFormViewSource
 */

/**
 * @typedef {Object} ActiveQuickFormViewResult
 * @property {QuickFormViewSource} source
 * @property {Record<string, unknown> | null} view
 * @property {Record<string, unknown> | null} contract
 */

/**
 * Resolve published quick_form view for an object type.
 *
 * @param {Record<string, unknown> | null | undefined} catalog
 * @param {string | null | undefined} objectTypeKey
 * @returns {ActiveQuickFormViewResult}
 */
export function resolveActiveQuickFormView(catalog, objectTypeKey) {
  const objectType = findCatalogObjectType(catalog, objectTypeKey);

  if (!objectType) {
    return { source: "none", view: null, contract: null };
  }

  const views = Array.isArray(objectType.views) ? objectType.views : [];
  const quickFormViews = views.filter(
    (view) => normalizeViewType(view) === QUICK_FORM_VIEW_TYPE && isActiveView(view),
  );

  if (!quickFormViews.length) {
    return { source: "legacy", view: null, contract: null };
  }

  const preferredView =
    quickFormViews.find((view) => String(view?.key || "") === DEFAULT_QUICK_FORM_VIEW_KEY) ||
    quickFormViews.find((view) => view?.is_system === true || view?.isSystem === true) ||
    quickFormViews[0];

  const contract = readQuickFormContractFromView(preferredView);

  if (
    !contract ||
    String(contract.viewType || "").toLowerCase() !== QUICK_FORM_VIEW_TYPE ||
    !Array.isArray(contract.projection?.fieldKeys) ||
    contract.projection.fieldKeys.length === 0
  ) {
    return { source: "legacy", view: preferredView, contract: null };
  }

  return {
    source: "quick_form",
    view: preferredView,
    contract,
  };
}

/**
 * Resolve runtime quick-create fields: quick_form projection or legacy quick_create fallback.
 *
 * @param {Record<string, unknown> | null | undefined} catalog
 * @param {string | null | undefined} objectTypeKey
 */
export function resolveRuntimeQuickCreateFields(catalog, objectTypeKey) {
  const active = resolveActiveQuickFormView(catalog, objectTypeKey);

  if (active.source === "quick_form" && active.contract) {
    const fields = resolveQuickFormFields(catalog, objectTypeKey, active.contract);

    if (fields.length > 0) {
      return fields;
    }
  }

  return getQuickCreateFields(catalog, objectTypeKey);
}

export { DEFAULT_QUICK_FORM_VIEW_KEY, QUICK_FORM_VIEW_TYPE };
