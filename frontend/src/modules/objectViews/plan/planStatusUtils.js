export const PLAN_STATUS_CATEGORY = {
  OVERDUE: "overdue",
  IN_PROGRESS: "in_progress",
  PAUSED: "paused",
  NOT_STARTED: "not_started",
  COMPLETED: "completed",
};

export const PLAN_STATUS_ROLLUP_PRIORITY = [
  PLAN_STATUS_CATEGORY.OVERDUE,
  PLAN_STATUS_CATEGORY.IN_PROGRESS,
  PLAN_STATUS_CATEGORY.PAUSED,
  PLAN_STATUS_CATEGORY.NOT_STARTED,
  PLAN_STATUS_CATEGORY.COMPLETED,
];

export const PLAN_STATUS_DISPLAY = {
  [PLAN_STATUS_CATEGORY.OVERDUE]: {
    label: "Просрочено",
    color: "#EF4444",
  },
  [PLAN_STATUS_CATEGORY.IN_PROGRESS]: {
    label: "В работе",
    color: "#EAB308",
  },
  [PLAN_STATUS_CATEGORY.PAUSED]: {
    label: "Приостановлено",
    color: "#3B82F6",
  },
  [PLAN_STATUS_CATEGORY.NOT_STARTED]: {
    label: "Не начато",
    color: "#94A3B8",
  },
  [PLAN_STATUS_CATEGORY.COMPLETED]: {
    label: "Завершено",
    color: "#22C55E",
  },
};

function normalizeToken(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
}

/**
 * @param {unknown} statusValue
 * @returns {string}
 */
export function resolvePlanStatusCategory(statusValue) {
  const token = normalizeToken(statusValue);

  if (!token) {
    return PLAN_STATUS_CATEGORY.NOT_STARTED;
  }

  if (/просроч|overdue|late|expired/.test(token)) {
    return PLAN_STATUS_CATEGORY.OVERDUE;
  }

  if (/приостан|paused|suspend|hold|blocked/.test(token)) {
    return PLAN_STATUS_CATEGORY.PAUSED;
  }

  if (/заверш|готов|done|complete|closed|finished/.test(token)) {
    return PLAN_STATUS_CATEGORY.COMPLETED;
  }

  if (/работ|progress|review|active|doing/.test(token)) {
    return PLAN_STATUS_CATEGORY.IN_PROGRESS;
  }

  if (/не_?нач|planned|new|open|todo|draft/.test(token)) {
    return PLAN_STATUS_CATEGORY.NOT_STARTED;
  }

  return PLAN_STATUS_CATEGORY.NOT_STARTED;
}

/**
 * @param {Array<{ statusCategory?: string, statusLabel?: string }>} children
 * @returns {string | null}
 */
export function rollupPlanStatusCategoryFromChildren(children) {
  if (!Array.isArray(children) || !children.length) {
    return null;
  }

  const categories = children.map(
    (child) =>
      child?.statusCategory ||
      resolvePlanStatusCategory(child?.statusLabel),
  );

  for (const priority of PLAN_STATUS_ROLLUP_PRIORITY) {
    if (categories.includes(priority)) {
      return priority;
    }
  }

  return PLAN_STATUS_CATEGORY.NOT_STARTED;
}

/**
 * @param {string | null | undefined} statusCategory
 */
export function resolvePlanStatusDisplay(statusCategory) {
  const key = String(statusCategory || PLAN_STATUS_CATEGORY.NOT_STARTED);
  return (
    PLAN_STATUS_DISPLAY[key] ||
    PLAN_STATUS_DISPLAY[PLAN_STATUS_CATEGORY.NOT_STARTED]
  );
}
