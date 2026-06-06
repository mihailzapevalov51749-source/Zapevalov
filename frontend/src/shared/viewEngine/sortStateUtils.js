import { columnMatchesSortField } from "./systemColumnKeys.js";

function getPrimarySortRule(rules) {
  if (!Array.isArray(rules) || !rules.length) {
    return null;
  }

  const rule = rules[0];

  if (!rule?.field) {
    return null;
  }

  return {
    field: String(rule.field),
    order: rule.order === "desc" ? "desc" : "asc",
  };
}

/**
 * @param {Array<{ field?: string, order?: string }>} rules
 * @param {string} columnKey
 * @returns {{ direction: 'asc' | 'desc' | null, order: number | null }}
 */
export function getColumnSortState(rules = [], columnKey) {
  const normalizedKey = String(columnKey || "").trim();
  const primary = getPrimarySortRule(rules);

  if (!primary || !columnMatchesSortField(normalizedKey, primary.field)) {
    return { direction: null, order: null };
  }

  return {
    direction: primary.order,
    order: null,
  };
}
