export const RELATION_TABLE_VALUE_MARKER = "__relationTableValue";

/**
 * @typedef {Object} RelationTableLinkedItem
 * @property {string} entity_id
 * @property {string} title
 * @property {string} [relation_instance_id]
 * @property {string} [object_type_key]
 */

/**
 * @param {{
 *   items?: RelationTableLinkedItem[],
 *   cardinality?: string,
 *   loading?: boolean,
 *   error?: string,
 * }} params
 */
export function createRelationTableValue({
  items = [],
  cardinality = "one",
  loading = false,
  error = "",
} = {}) {
  return {
    [RELATION_TABLE_VALUE_MARKER]: true,
    items: Array.isArray(items) ? items : [],
    cardinality: String(cardinality || "one"),
    loading: Boolean(loading),
    error: String(error || ""),
  };
}

/**
 * @param {unknown} value
 */
export function isRelationTableValue(value) {
  return Boolean(
    value &&
      typeof value === "object" &&
      value[RELATION_TABLE_VALUE_MARKER] === true,
  );
}

/**
 * @param {RelationTableLinkedItem[]} items
 * @param {{ maxInlineLinks?: number }} [options]
 */
export function formatRelationTableDisplayLabel(items, options = {}) {
  const maxInlineLinks = Number(options.maxInlineLinks) > 0 ? options.maxInlineLinks : 2;
  const normalized = (Array.isArray(items) ? items : [])
    .map((item) => ({
      entity_id: String(item?.entity_id ?? "").trim(),
      title: String(item?.title || item?.entity_id || "").trim() || "Запись",
      object_type_key: String(item?.object_type_key ?? "").trim() || null,
    }))
    .filter((item) => item.entity_id);

  if (!normalized.length) {
    return { mode: "empty", items: [], overflowCount: 0 };
  }

  if (normalized.length === 1) {
    return { mode: "one", items: normalized, overflowCount: 0 };
  }

  if (normalized.length <= maxInlineLinks) {
    return { mode: "many_inline", items: normalized, overflowCount: 0 };
  }

  return {
    mode: "many_compact",
    items: [normalized[0]],
    overflowCount: normalized.length - 1,
  };
}
