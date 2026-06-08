import { DEFAULT_PLAN_STATUS_MAPPING } from "./planViewContract.js";

function normalizeToken(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
}

/**
 * @param {unknown} statusValue
 * @param {Record<string, number>} [statusMapping]
 */
export function resolveStatusReadinessPercent(statusValue, statusMapping = DEFAULT_PLAN_STATUS_MAPPING) {
  const raw = String(statusValue ?? "").trim();
  if (!raw) {
    return 0;
  }

  const token = normalizeToken(raw);

  if (Object.prototype.hasOwnProperty.call(statusMapping, token)) {
    return Number(statusMapping[token]) || 0;
  }

  for (const [key, percent] of Object.entries(statusMapping)) {
    if (token.includes(key) || key.includes(token)) {
      return Number(percent) || 0;
    }
  }

  if (/готово|заверш|done|complete/.test(token)) {
    return 100;
  }

  if (/работ|progress|review|в\s*работ/.test(token)) {
    return 50;
  }

  if (/нов|не\s*нач|planned|todo|open/.test(token)) {
    return 0;
  }

  return 0;
}

/**
 * @param {Array<{ readiness?: number }>} children
 */
export function rollupReadinessFromChildren(children) {
  if (!Array.isArray(children) || !children.length) {
    return null;
  }

  const values = children
    .map((child) => Number(child?.readiness))
    .filter((value) => Number.isFinite(value));

  if (!values.length) {
    return 0;
  }

  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

/**
 * @param {{
 *   statusValue?: unknown,
 *   children?: Array<{ readiness?: number }>,
 *   statusMapping?: Record<string, number>,
 * }} params
 */
export function computePlanNodeReadiness({
  statusValue,
  progressValue,
  children = [],
  statusMapping = DEFAULT_PLAN_STATUS_MAPPING,
}) {
  const childRollup = rollupReadinessFromChildren(children);
  if (childRollup != null) {
    return childRollup;
  }

  if (progressValue != null && progressValue !== "") {
    const numeric = Number(progressValue);

    if (Number.isFinite(numeric)) {
      return Math.max(0, Math.min(100, Math.round(numeric)));
    }
  }

  return resolveStatusReadinessPercent(statusValue, statusMapping);
}
