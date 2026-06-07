const STORAGE_PREFIX = "yasnopro.plan.treePanelWidth";
export const PLAN_TREE_PANEL_MIN_WIDTH = 280;
export const PLAN_TREE_PANEL_MAX_WIDTH = 600;
export const PLAN_TREE_PANEL_DEFAULT_WIDTH = 360;

function buildStorageKey(scopeKey = "default") {
  return `${STORAGE_PREFIX}:${String(scopeKey || "default").trim() || "default"}`;
}

/**
 * @param {string} [scopeKey]
 */
export function readPlanTreePanelWidth(scopeKey) {
  if (typeof window === "undefined") {
    return PLAN_TREE_PANEL_DEFAULT_WIDTH;
  }

  try {
    const raw = window.localStorage.getItem(buildStorageKey(scopeKey));
    const parsed = Number(raw);

    if (!Number.isFinite(parsed)) {
      return PLAN_TREE_PANEL_DEFAULT_WIDTH;
    }

    return Math.min(
      PLAN_TREE_PANEL_MAX_WIDTH,
      Math.max(PLAN_TREE_PANEL_MIN_WIDTH, Math.round(parsed)),
    );
  } catch {
    return PLAN_TREE_PANEL_DEFAULT_WIDTH;
  }
}

/**
 * @param {number} width
 * @param {string} [scopeKey]
 */
export function writePlanTreePanelWidth(width, scopeKey) {
  if (typeof window === "undefined") {
    return;
  }

  const normalized = Math.min(
    PLAN_TREE_PANEL_MAX_WIDTH,
    Math.max(PLAN_TREE_PANEL_MIN_WIDTH, Math.round(Number(width) || PLAN_TREE_PANEL_DEFAULT_WIDTH)),
  );

  try {
    window.localStorage.setItem(buildStorageKey(scopeKey), String(normalized));
  } catch {
    // localStorage may be unavailable
  }
}
