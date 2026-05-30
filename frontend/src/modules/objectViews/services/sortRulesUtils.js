/**
 * Single-column sort cycle: none → asc → desc → none.
 *
 * @param {import('./objectViewContract').ObjectViewSortRule[]} currentRules
 * @param {string} columnKey
 * @returns {import('./objectViewContract').ObjectViewSortRule[]}
 */
export function getNextSortRules(currentRules = [], columnKey) {
  const normalizedKey = String(columnKey || "").trim();

  if (!normalizedKey) {
    return [];
  }

  const rules = Array.isArray(currentRules) ? [...currentRules] : [];
  const index = rules.findIndex((rule) => String(rule?.field) === normalizedKey);

  if (index < 0) {
    return [{ field: normalizedKey, order: "asc" }];
  }

  const current = rules[index];

  if (current.order === "asc") {
    return [{ field: normalizedKey, order: "desc" }];
  }

  return [];
}

/**
 * @param {import('./objectViewContract').ObjectViewSortRule[]} rules
 * @returns {{ field: string, order: 'asc' | 'desc' } | null}
 */
export function getPrimarySortState(rules = []) {
  const primary = Array.isArray(rules) && rules.length ? rules[0] : null;

  if (!primary?.field) {
    return null;
  }

  return {
    field: String(primary.field),
    order: primary.order === "asc" ? "asc" : "desc",
  };
}
