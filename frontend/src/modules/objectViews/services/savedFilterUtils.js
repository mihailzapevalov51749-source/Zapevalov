import { generateViewKey } from "./generateViewKey";

/**
 * @param {unknown} value
 * @returns {Array<Record<string, unknown>>}
 */
export function cloneFilterConditions(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((item) => ({ ...item }));
}

/**
 * @param {Array<Record<string, unknown>>} savedFilters
 * @returns {Array<Record<string, unknown>>}
 */
export function getQuickFilters(savedFilters = []) {
  return (savedFilters || []).filter((item) => item?.isQuick === true);
}

/**
 * @param {string | null | undefined} filterId
 * @param {Array<Record<string, unknown>>} savedFilters
 * @returns {Array<Record<string, unknown>>}
 */
export function getQuickFilterConditions(filterId, savedFilters = []) {
  if (!filterId) {
    return [];
  }

  const match = (savedFilters || []).find(
    (item) => String(item?.id) === String(filterId),
  );

  if (!match || !Array.isArray(match.conditions)) {
    return [];
  }

  return cloneFilterConditions(match.conditions);
}

/**
 * Combines base filter conditions with active quick filter (AND).
 *
 * @param {Array<Record<string, unknown>>} baseConditions
 * @param {Array<Record<string, unknown>>} quickConditions
 */
export function mergeRuntimeFilterConditions(baseConditions, quickConditions) {
  const base = cloneFilterConditions(baseConditions);
  const quick = cloneFilterConditions(quickConditions);

  if (!quick.length) {
    return base;
  }

  if (!base.length) {
    return quick;
  }

  return [...base, ...quick];
}

export function createSavedFilterId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `sf_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`;
}

/**
 * @param {{
 *   label: string,
 *   conditions: Array<Record<string, unknown>>,
 *   existingKeys?: string[],
 * }} params
 */
export function buildQuickSavedFilter({ label, conditions, existingKeys = [] }) {
  const trimmedLabel = String(label || "").trim();
  const key = generateViewKey(trimmedLabel, existingKeys);

  return {
    id: createSavedFilterId(),
    key,
    label: trimmedLabel,
    conditions: cloneFilterConditions(conditions),
    isQuick: true,
    isDefault: false,
  };
}
