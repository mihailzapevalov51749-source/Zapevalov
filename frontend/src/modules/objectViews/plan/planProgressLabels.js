export const PLAN_PROGRESS_COLUMN_LABEL = "Прогресс";

const LEGACY_PLAN_PROGRESS_LABELS = new Set(["Готовность", "готовность"]);

/**
 * Display label for plan progress column/section (key stays `progress`).
 *
 * @param {string | null | undefined} label
 */
export function resolvePlanProgressDisplayLabel(label) {
  const normalized = String(label || "").trim();

  if (!normalized || LEGACY_PLAN_PROGRESS_LABELS.has(normalized)) {
    return PLAN_PROGRESS_COLUMN_LABEL;
  }

  return normalized;
}
