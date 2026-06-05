import {
  normalizePresentationCard,
  normalizePresentationTable,
} from "./contractGuards";
import { isTableBaseStateKey } from "../table/preferences/tableBaseState";

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
  const isUserView = baseline.meta?.isUserView === true;
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
    baseline.projection?.titleFieldKey,
    {
      preserveExactColumnOrder: isUserView,
      isAllMode: isTableBaseStateKey(baseline.key),
    },
  );

  const mergedCard =
    sessionDelta.cardLayout != null
      ? normalizePresentationCard(sessionDelta.cardLayout)
      : normalizePresentationCard(baseline.presentation?.card);

  const mergedFieldOrder =
    sessionDelta.columnOrder != null
      ? [...sessionDelta.columnOrder]
      : [...(baseline.projection.fieldOrder || baseline.projection.fieldKeys || [])];

  return {
    ...baseline,
    projection: {
      ...baseline.projection,
      fieldKeys: [...(baseline.projection.fieldKeys || [])],
      fieldOrder: mergedFieldOrder,
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
    (baselineTable.density || "compact") !== (effectiveTable.density || "compact") ||
    JSON.stringify(baseline.presentation?.card || null) !==
      JSON.stringify(effective.presentation?.card || null)
  );
}

/**
 * Stable fingerprint of resolved contract after catalog/runtime normalization.
 * Used to re-align session baseline when catalog loads (not a user edit).
 */
export function buildObjectViewResolvedFingerprint(contract) {
  if (!contract) {
    return "";
  }

  const table = contract.presentation?.table || {};

  return [
    String(contract.key || ""),
    (contract.projection?.fieldKeys || []).join("\u001f"),
    (table.columnOrder || []).join("\u001f"),
    JSON.stringify(contract.query?.sort?.rules || []),
    JSON.stringify(table.hiddenFieldKeys || []),
    JSON.stringify(table.columnWidths || {}),
  ].join("\u001e");
}

/**
 * Dev/test helper: list contract paths that differ for dirty comparison.
 *
 * @returns {Array<{ path: string, baseline: unknown, current: unknown }>}
 */
export function diffObjectViewDirtyPaths(baseline, effective) {
  if (!baseline || !effective) {
    return [];
  }

  const diffs = [];

  const pushIfDiff = (path, baselineValue, currentValue) => {
    if (JSON.stringify(baselineValue) !== JSON.stringify(currentValue)) {
      diffs.push({ path, baseline: baselineValue, current: currentValue });
    }
  };

  pushIfDiff(
    "query.filters.conditions",
    baseline.query?.filters?.conditions || [],
    effective.query?.filters?.conditions || [],
  );
  pushIfDiff(
    "query.sort.rules",
    baseline.query?.sort?.rules || [],
    effective.query?.sort?.rules || [],
  );

  const baselineTable = baseline.presentation?.table || {};
  const effectiveTable = effective.presentation?.table || {};

  pushIfDiff(
    "presentation.table.hiddenFieldKeys",
    baselineTable.hiddenFieldKeys || [],
    effectiveTable.hiddenFieldKeys || [],
  );
  pushIfDiff(
    "presentation.table.columnOrder",
    baselineTable.columnOrder || [],
    effectiveTable.columnOrder || [],
  );
  pushIfDiff(
    "presentation.table.density",
    baselineTable.density || "compact",
    effectiveTable.density || "compact",
  );
  pushIfDiff(
    "projection.fieldKeys",
    baseline.projection?.fieldKeys || [],
    effective.projection?.fieldKeys || [],
  );

  return diffs;
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
    isPresentationDirty(baseline, effective)
  );
}
