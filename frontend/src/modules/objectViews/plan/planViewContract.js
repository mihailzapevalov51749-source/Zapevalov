import { normalizePlanLayoutSettings } from "./planLayoutSettings.js";

/** @typedef {Record<string, number>} PlanStatusMapping */

export const PLAN_PROGRESS_MODE_STATUS_BASED = "status_based";

export const DEFAULT_PLAN_STATUS_PROGRESS_MAP = {
  done: 100,
  completed: 100,
  ready: 100,
  in_progress: 50,
  progress: 50,
  review: 50,
  planned: 0,
  new: 0,
  not_started: 0,
  deferred: 0,
  postponed: 0,
};

/** @deprecated Use DEFAULT_PLAN_STATUS_PROGRESS_MAP */
export const DEFAULT_PLAN_STATUS_MAPPING = DEFAULT_PLAN_STATUS_PROGRESS_MAP;

/**
 * @typedef {Object} PlanViewPresentation
 * @property {string | null} hierarchyRelationKey
 * @property {string | null} titleFieldKey @deprecated Will be removed after migration cutoff. Use roleMapping.nodeTitle.
 * @property {string | null} statusFieldKey @deprecated Will be removed after migration cutoff. Use roleMapping.nodeStatus.
 * @property {string | null} descriptionFieldKey @deprecated Will be removed after migration cutoff. Use roleMapping.nodeDescription.
 * @property {string | null} nextStepsFieldKey @deprecated Will be removed after migration cutoff. Use roleMapping.nextSteps.
 * @property {boolean} [usesLegacyPlanFields] Publish diagnostic only; not read by runtime.
 * @property {string | null} issuesRelationKey
 * @property {string} progressMode
 * @property {PlanStatusMapping} statusProgressMap
 * @property {PlanStatusMapping} statusMapping
 * @property {import('./planLayoutSettings.js').ReturnType<typeof normalizePlanLayoutSettings>} [planLayout]
 */

export const DEFAULT_PLAN_PRESENTATION = {
  hierarchyRelationKey: null,
  titleFieldKey: null,
  statusFieldKey: null,
  descriptionFieldKey: null,
  nextStepsFieldKey: null,
  issuesRelationKey: null,
  progressMode: PLAN_PROGRESS_MODE_STATUS_BASED,
  statusProgressMap: { ...DEFAULT_PLAN_STATUS_PROGRESS_MAP },
  statusMapping: { ...DEFAULT_PLAN_STATUS_PROGRESS_MAP },
};

function readStatusProgressMap(raw) {
  const fromProgressMap =
    raw.statusProgressMap && typeof raw.statusProgressMap === "object"
      ? raw.statusProgressMap
      : null;
  const fromLegacyMapping =
    raw.statusMapping && typeof raw.statusMapping === "object"
      ? raw.statusMapping
      : null;

  return {
    ...DEFAULT_PLAN_STATUS_PROGRESS_MAP,
    ...(fromLegacyMapping || {}),
    ...(fromProgressMap || {}),
  };
}

/**
 * @param {unknown} source
 * @returns {PlanViewPresentation}
 */
export function normalizePlanPresentation(source) {
  const raw = source && typeof source === "object" ? source : {};
  const statusProgressMap = readStatusProgressMap(raw);
  const progressMode =
    String(raw.progressMode || PLAN_PROGRESS_MODE_STATUS_BASED).trim() ||
    PLAN_PROGRESS_MODE_STATUS_BASED;

  return {
    hierarchyRelationKey: String(raw.hierarchyRelationKey || "").trim() || null,
    // @deprecated Will be removed after migration cutoff.
    titleFieldKey: String(raw.titleFieldKey || "").trim() || null,
    // @deprecated Will be removed after migration cutoff.
    statusFieldKey: String(raw.statusFieldKey || "").trim() || null,
    // @deprecated Will be removed after migration cutoff.
    descriptionFieldKey: String(raw.descriptionFieldKey || "").trim() || null,
    // @deprecated Will be removed after migration cutoff.
    nextStepsFieldKey: String(raw.nextStepsFieldKey || "").trim() || null,
    usesLegacyPlanFields:
      typeof raw.usesLegacyPlanFields === "boolean" ? raw.usesLegacyPlanFields : undefined,
    issuesRelationKey: String(raw.issuesRelationKey || "").trim() || null,
    progressMode,
    statusProgressMap,
    statusMapping: statusProgressMap,
    planLayout: normalizePlanLayoutSettings(raw.planLayout),
  };
}

/**
 * @param {import('../services/objectViewContract').ObjectViewContract | null | undefined} contract
 * @returns {PlanViewPresentation}
 */
export function resolvePlanPresentationFromContract(contract) {
  const plan = contract?.presentation?.plan;
  const projectionTitle = contract?.projection?.titleFieldKey || null;

  const normalized = normalizePlanPresentation(plan);

  if (!normalized.titleFieldKey && projectionTitle) {
    normalized.titleFieldKey = projectionTitle;
  }

  return normalized;
}
