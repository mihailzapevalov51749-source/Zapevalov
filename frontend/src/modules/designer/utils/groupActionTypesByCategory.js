/**
 * Groups Action Types under Action Categories for Studio catalog display.
 *
 * @param {Array<{ key?: string, sort_order?: number }>} categories
 * @param {Array<{ key?: string, category_key?: string }>} actionTypes
 */
export function groupActionTypesByCategory(categories = [], actionTypes = []) {
  const typesByCategory = new Map();

  for (const actionType of actionTypes) {
    const categoryKey = String(actionType?.category_key || "").trim();

    if (!categoryKey) {
      continue;
    }

    if (!typesByCategory.has(categoryKey)) {
      typesByCategory.set(categoryKey, []);
    }

    typesByCategory.get(categoryKey).push(actionType);
  }

  const sortedCategories = [...categories].sort((left, right) => {
    const leftOrder = Number(left?.sort_order ?? 0);
    const rightOrder = Number(right?.sort_order ?? 0);

    if (leftOrder !== rightOrder) {
      return leftOrder - rightOrder;
    }

    return String(left?.key || "").localeCompare(String(right?.key || ""), "ru");
  });

  return sortedCategories.map((category) => {
    const categoryKey = String(category?.key || "").trim();
    const types = [...(typesByCategory.get(categoryKey) || [])].sort((left, right) =>
      String(left?.name || left?.key || "").localeCompare(
        String(right?.name || right?.key || ""),
        "ru",
      ),
    );

    return {
      category,
      actionTypes: types,
    };
  });
}
