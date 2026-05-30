import {
  normalizePresentationCard,
  normalizePresentationTable,
} from "./contractGuards";

/**
 * Merges persisted contract (baseline) with session deltas.
 *
 * @param {import('./objectViewContract').ObjectViewContract} baseline
 * @param {{
 *   filterConditions?: Array<Record<string, unknown>> | null,
 *   sortRules?: import('./objectViewContract').ObjectViewSortRule[] | null,
 *   savedFilters?: Array<Record<string, unknown>> | null,
 *   defaultQuickFilterId?: string | null,
 *   hiddenFieldKeys?: string[] | null,
 *   columnOrder?: string[] | null,
 *   columnWidths?: Record<string, number> | null,
 *   density?: string | null,
 *   cardLayout?: Record<string, unknown> | null,
 * }} sessionDelta
 * @returns {import('./objectViewContract').ObjectViewContract}
 */
export function mergeEffectiveContract(baseline, sessionDelta = {}) {
  const filterConditions =
    sessionDelta.filterConditions != null
      ? sessionDelta.filterConditions
      : baseline.query.filters.conditions;

  const sortRules =
    sessionDelta.sortRules != null
      ? sessionDelta.sortRules
      : baseline.query.sort.rules;

  const savedFilters =
    sessionDelta.savedFilters != null
      ? sessionDelta.savedFilters.map((item) => ({ ...item }))
      : (baseline.query.filters.savedFilters || []).map((item) => ({ ...item }));

  const defaultQuickFilterId =
    sessionDelta.defaultQuickFilterId !== undefined
      ? sessionDelta.defaultQuickFilterId
      : baseline.query.filters.defaultQuickFilterId;

  const quickFilters = savedFilters.filter((item) => item?.isQuick === true);

  const projectionFieldKeys = baseline.projection?.fieldKeys || [];
  const baselineTable = baseline.presentation?.table || {};
  const mergedPresentation = normalizePresentationTable(
    {
      hiddenFieldKeys:
        sessionDelta.hiddenFieldKeys != null
          ? sessionDelta.hiddenFieldKeys
          : baselineTable.hiddenFieldKeys,
      columnOrder:
        sessionDelta.columnOrder != null
          ? sessionDelta.columnOrder
          : baselineTable.columnOrder,
      columnWidths:
        sessionDelta.columnWidths != null
          ? sessionDelta.columnWidths
          : baselineTable.columnWidths,
      density:
        sessionDelta.density !== undefined
          ? sessionDelta.density
          : baselineTable.density,
    },
    projectionFieldKeys,
  );

  const mergedCard =
    sessionDelta.cardLayout != null
      ? normalizePresentationCard(sessionDelta.cardLayout)
      : normalizePresentationCard(baseline.presentation?.card);

  return {
    ...baseline,
    projection: {
      ...baseline.projection,
      fieldKeys: [...(baseline.projection.fieldKeys || [])],
      fieldOrder: [...(baseline.projection.fieldOrder || [])],
    },
    query: {
      ...baseline.query,
      filters: {
        ...baseline.query.filters,
        conditions: Array.isArray(filterConditions)
          ? filterConditions.map((item) => ({ ...item }))
          : [],
        savedFilters,
        quickFilters,
        defaultQuickFilterId,
      },
      sort: {
        rules: Array.isArray(sortRules)
          ? sortRules.map((rule) => ({ ...rule }))
          : [...baseline.query.sort.rules],
      },
      pagination: { ...baseline.query.pagination },
    },
    presentation: {
      table: mergedPresentation,
      card: mergedCard,
    },
  };
}

function isPresentationDirty(baseline, effective) {
  const baselineTable = baseline.presentation?.table || {};
  const effectiveTable = effective.presentation?.table || {};

  return (
    JSON.stringify(baselineTable.hiddenFieldKeys || []) !==
      JSON.stringify(effectiveTable.hiddenFieldKeys || []) ||
    JSON.stringify(baselineTable.columnOrder || []) !==
      JSON.stringify(effectiveTable.columnOrder || []) ||
    JSON.stringify(baselineTable.columnWidths || {}) !==
      JSON.stringify(effectiveTable.columnWidths || {}) ||
    (baselineTable.density || "compact") !== (effectiveTable.density || "compact") ||
    JSON.stringify(baseline.presentation?.card || null) !==
      JSON.stringify(effective.presentation?.card || null)
  );
}

/**
 * @param {import('./objectViewContract').ObjectViewContract} baseline
 * @param {import('./objectViewContract').ObjectViewContract} effective
 */
export function isObjectViewQueryDirty(baseline, effective) {
  return (
    JSON.stringify(baseline.query.filters.conditions || []) !==
      JSON.stringify(effective.query.filters.conditions || []) ||
    JSON.stringify(baseline.query.sort.rules || []) !==
      JSON.stringify(effective.query.sort.rules || []) ||
    JSON.stringify(baseline.query.filters.savedFilters || []) !==
      JSON.stringify(effective.query.filters.savedFilters || []) ||
    JSON.stringify(baseline.query.filters.defaultQuickFilterId ?? null) !==
      JSON.stringify(effective.query.filters.defaultQuickFilterId ?? null) ||
    isPresentationDirty(baseline, effective)
  );
}
