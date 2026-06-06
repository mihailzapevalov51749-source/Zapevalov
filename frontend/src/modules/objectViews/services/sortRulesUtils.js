/**
 * Single-column sort rules for Object View contract (`query.sort.rules`).
 */

import {
  columnMatchesSortField,
  systemColumnKeyToRuntimeSortField,
} from "../../../shared/viewEngine/systemColumnKeys.js";

/** Default list order: oldest first, new records at the bottom (matches column «№»). */
export const DEFAULT_RUNTIME_LIST_SORT = {
  field: "created_at",
  order: "asc",
};

function sortRuleIdentityKey(field) {
  return systemColumnKeyToRuntimeSortField(field) || String(field || "").trim();
}

function findSortRuleIndex(rules, columnOrFieldKey) {
  const normalizedKey = String(columnOrFieldKey || "").trim();

  if (!normalizedKey) {
    return -1;
  }

  return rules.findIndex((rule) =>
    columnMatchesSortField(normalizedKey, rule?.field),
  );
}

function normalizeSortRule(rule) {
  if (!rule || typeof rule !== "object") {
    return null;
  }

  const field = String(
    rule.field ?? rule.columnId ?? rule.column_id ?? "",
  ).trim();

  if (!field) {
    return null;
  }

  const orderRaw = rule.order ?? rule.direction ?? "asc";

  return {
    field,
    order: orderRaw === "desc" ? "desc" : "asc",
  };
}

/**
 * Normalizes sort rules array from contract or legacy payloads.
 * MVP: at most one active user sort rule.
 *
 * @param {unknown} rules
 * @returns {import('./objectViewContract').ObjectViewSortRule[]}
 */
export function normalizeSortRulesArray(rules) {
  if (!Array.isArray(rules)) {
    return [];
  }

  const normalized = rules.map(normalizeSortRule).filter(Boolean);
  const seen = new Set();
  const deduped = [];

  for (const rule of normalized) {
    const identity = sortRuleIdentityKey(rule.field);

    if (!identity || seen.has(identity)) {
      continue;
    }

    seen.add(identity);
    deduped.push(rule);
  }

  return deduped.slice(0, 1);
}

/**
 * Migrates legacy sort shapes to `rules[]` in memory.
 *
 * @param {unknown} sortQuery
 * @returns {import('./objectViewContract').ObjectViewSortRule[]}
 */
export function migrateLegacySortQuery(sortQuery) {
  if (!sortQuery || typeof sortQuery !== "object") {
    return [];
  }

  if (Array.isArray(sortQuery.rules)) {
    return normalizeSortRulesArray(sortQuery.rules);
  }

  if (Array.isArray(sortQuery.sorts)) {
    return normalizeSortRulesArray(sortQuery.sorts);
  }

  if (typeof sortQuery.field === "string" && sortQuery.field.trim()) {
    return normalizeSortRulesArray([
      {
        field: sortQuery.field,
        order: sortQuery.order ?? sortQuery.direction ?? "asc",
      },
    ]);
  }

  return [];
}

/**
 * Single-column sort: none → asc → desc → none; other column replaces current sort.
 *
 * @param {import('./objectViewContract').ObjectViewSortRule[]} currentRules
 * @param {string} columnKey
 * @returns {import('./objectViewContract').ObjectViewSortRule[]}
 */
export function getNextSortRules(currentRules = [], columnKey) {
  const normalizedKey = String(columnKey || "").trim();

  if (!normalizedKey) {
    return normalizeSortRulesArray(currentRules);
  }

  const primary = normalizeSortRulesArray(currentRules)[0] ?? null;
  const matchesPrimary =
    primary && findSortRuleIndex([primary], normalizedKey) >= 0;

  if (!matchesPrimary) {
    return [{ field: normalizedKey, order: "asc" }];
  }

  if (primary.order === "asc") {
    return [{ field: normalizedKey, order: "desc" }];
  }

  return [];
}

/**
 * @param {import('./objectViewContract').ObjectViewSortRule[]} currentRules
 * @param {string} columnKey
 */
export function resolveNextSortRules(currentRules = [], columnKey) {
  return getNextSortRules(currentRules, columnKey);
}

/**
 * @param {import('./objectViewContract').ObjectViewSortRule[]} rules
 * @param {string} columnKey
 * @returns {{ direction: 'asc' | 'desc' | null, order: number | null }}
 */
export function getSortStateForColumn(rules = [], columnKey) {
  const normalizedKey = String(columnKey || "").trim();
  const primary = normalizeSortRulesArray(rules)[0] ?? null;

  if (!primary || !columnMatchesSortField(normalizedKey, primary.field)) {
    return { direction: null, order: null };
  }

  return {
    direction: primary.order === "desc" ? "desc" : "asc",
    order: null,
  };
}

/**
 * @param {import('./objectViewContract').ObjectViewSortRule[]} rules
 * @returns {{ field: string, order: 'asc' | 'desc' } | null}
 */
export function getPrimarySortState(rules = []) {
  const primary = normalizeSortRulesArray(rules)[0] ?? null;

  if (!primary?.field) {
    return null;
  }

  return {
    field: String(primary.field),
    order: primary.order === "asc" ? "asc" : "desc",
  };
}

/** Runtime list sort when contract has no active user sort rules. */
export function resolveRuntimeListSort(rules = []) {
  return getPrimarySortState(rules) || { ...DEFAULT_RUNTIME_LIST_SORT };
}

/**
 * @param {import('./objectViewContract').ObjectViewSortRule[]} rules
 * @returns {import('./objectViewContract').ObjectViewSortRule[]}
 */
export function resolveRuntimeListSorts(rules = []) {
  const primary = getPrimarySortState(rules);
  return primary ? [primary] : [{ ...DEFAULT_RUNTIME_LIST_SORT }];
}

export function removeSortRule(rules = [], fieldKey) {
  const normalizedKey = String(fieldKey || "").trim();
  const primary = normalizeSortRulesArray(rules)[0] ?? null;

  if (!primary || !columnMatchesSortField(normalizedKey, primary.field)) {
    return normalizeSortRulesArray(rules);
  }

  return [];
}

export function toggleSortRuleDirection(rules = [], fieldKey) {
  const normalizedKey = String(fieldKey || "").trim();
  const primary = normalizeSortRulesArray(rules)[0] ?? null;

  if (!primary || !columnMatchesSortField(normalizedKey, primary.field)) {
    return normalizeSortRulesArray(rules);
  }

  return [
    {
      ...primary,
      order: primary.order === "asc" ? "desc" : "asc",
    },
  ];
}
