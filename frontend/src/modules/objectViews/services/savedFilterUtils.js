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
  return buildSavedFilter({
    label,
    conditions,
    existingKeys,
    isQuick: true,
    isDefault: false,
  });
}

/**
 * @param {{
 *   label: string,
 *   conditions: Array<Record<string, unknown>>,
 *   existingKeys?: string[],
 *   isQuick?: boolean,
 *   isDefault?: boolean,
 *   id?: string | null,
 *   key?: string | null,
 * }} params
 */
export function buildSavedFilter({
  label,
  conditions,
  existingKeys = [],
  isQuick = false,
  isDefault = false,
  id = null,
  key = null,
}) {
  const trimmedLabel = String(label || "").trim() || "Новый фильтр";
  const normalizedId = id ? String(id) : createSavedFilterId();
  const normalizedKey =
    key ||
    generateViewKey(trimmedLabel, existingKeys) ||
    normalizedId;

  return {
    id: normalizedId,
    key: normalizedKey,
    label: trimmedLabel,
    conditions: cloneFilterConditions(conditions),
    isQuick: Boolean(isQuick),
    isDefault: Boolean(isQuick && isDefault),
  };
}

/**
 * Ensures only one saved filter is marked default.
 *
 * @param {Array<Record<string, unknown>>} savedFilters
 * @param {string | null | undefined} defaultId
 */
export function ensureSingleDefaultFilter(savedFilters = [], defaultId = null) {
  const normalizedDefaultId =
    defaultId == null || defaultId === "" ? null : String(defaultId);

  return (savedFilters || []).map((item) => ({
    ...item,
    isDefault: normalizedDefaultId
      ? String(item?.id) === normalizedDefaultId
      : false,
  }));
}

function isRuntimeReadyCondition(condition) {
  const fieldKey = String(condition?.fieldKey || "").trim();
  const operator = String(condition?.operator || "eq").trim().toLowerCase();

  if (!fieldKey) {
    return false;
  }

  if (operator === "is_empty" || operator === "is_not_empty") {
    return true;
  }

  if (operator === "true" || operator === "false") {
    return true;
  }

  const value = condition?.value;

  if (value === undefined || value === null) {
    return false;
  }

  if (Array.isArray(value)) {
    return value.length > 0;
  }

  return String(value).trim() !== "";
}

/**
 * @param {Record<string, unknown> | null | undefined} contract
 * @param {string | null | undefined} activeQuickFilterId
 */
export function getMergedActiveFilterConditions(contract, activeQuickFilterId = null) {
  const baseConditions = cloneFilterConditions(
    contract?.query?.filters?.conditions || [],
  );
  const savedFilters = contract?.query?.filters?.savedFilters || [];
  const quickConditions = getQuickFilterConditions(activeQuickFilterId, savedFilters);
  const merged = mergeRuntimeFilterConditions(baseConditions, quickConditions);

  return merged
    .filter(isRuntimeReadyCondition)
    .map((condition, index) => {
      const conditionId = String(condition.id || `merged-${index + 1}`);
      const inBase = baseConditions.some(
        (item) => String(item?.id || "") === conditionId,
      );
      const inQuick = quickConditions.some(
        (item) => String(item?.id || "") === conditionId,
      );

      return {
        ...condition,
        id: conditionId,
        _filterSource: inQuick && !inBase ? "quick" : "base",
        _sourceFilterId: inQuick ? String(activeQuickFilterId || "") : null,
      };
    });
}

/**
 * @param {Record<string, unknown> | null | undefined} contract
 * @param {string | null | undefined} activeQuickFilterId
 */
export function countActiveFilterConditions(contract, activeQuickFilterId = null) {
  return getMergedActiveFilterConditions(contract, activeQuickFilterId).length;
}
