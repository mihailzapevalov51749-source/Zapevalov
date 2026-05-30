/**
 * Case-insensitive text match ranking for search results.
 *
 * Rank buckets:
 *   1 = exact match
 *   2 = starts with query
 *   3 = contains query
 *   999 = no match
 */

export const RANK_EXACT = 1;
export const RANK_STARTS_WITH = 2;
export const RANK_CONTAINS = 3;
export const RANK_NO_MATCH = 999;

export function normalizeSearchText(value) {
  if (value == null) {
    return "";
  }

  return String(value).trim().toLocaleLowerCase("ru-RU");
}

export function getTextMatchRank(title, query) {
  const normalizedTitle = normalizeSearchText(title);
  const normalizedQuery = normalizeSearchText(query);

  if (!normalizedQuery || !normalizedTitle) {
    return RANK_NO_MATCH;
  }

  if (normalizedTitle === normalizedQuery) {
    return RANK_EXACT;
  }

  if (normalizedTitle.startsWith(normalizedQuery)) {
    return RANK_STARTS_WITH;
  }

  if (normalizedTitle.includes(normalizedQuery)) {
    return RANK_CONTAINS;
  }

  return RANK_NO_MATCH;
}

export function sortSearchResults(results, query) {
  const items = Array.isArray(results) ? [...results] : [];

  return items.sort((left, right) => {
    const leftRank =
      typeof left?.rank === "number"
        ? left.rank
        : getTextMatchRank(left?.title, query);
    const rightRank =
      typeof right?.rank === "number"
        ? right.rank
        : getTextMatchRank(right?.title, query);

    if (leftRank !== rightRank) {
      return leftRank - rightRank;
    }

    const leftTitle = normalizeSearchText(left?.title);
    const rightTitle = normalizeSearchText(right?.title);
    if (leftTitle !== rightTitle) {
      return leftTitle.localeCompare(rightTitle, "ru");
    }

    return String(left?.id ?? "").localeCompare(String(right?.id ?? ""), "ru");
  });
}
