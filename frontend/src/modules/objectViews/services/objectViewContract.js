/** @typedef {'asc' | 'desc'} ObjectViewSortOrder */

/**
 * @typedef {Object} ObjectViewSortRule
 * @property {string} field
 * @property {ObjectViewSortOrder} order
 */

/**
 * @typedef {Object} ObjectViewProjection
 * @property {string[]} fieldKeys
 * @property {string[]} fieldOrder
 * @property {string | null} titleFieldKey
 */

/**
 * @typedef {Object} ObjectViewContract
 * @property {number} schemaVersion
 * @property {string} viewType
 * @property {string} key
 * @property {string} name
 * @property {ObjectViewProjection} projection
 * @property {{
 *   filters: {
 *     conditions: Array<Record<string, unknown>>,
 *     savedFilters: Array<Record<string, unknown>>,
 *     quickFilters: Array<Record<string, unknown>>,
 *     defaultQuickFilterId: string | null,
 *   },
 *   sort: { rules: ObjectViewSortRule[] },
 *   pagination: { defaultPageSize: number },
 * }} query
 * @property {{
 *   table: {
 *     hiddenFieldKeys: string[],
 *     columnOrder: string[],
 *     columnWidths: Record<string, number>,
 *     density: string,
 *   },
 *   card?: {
 *     sections: Array<{ id: string, title?: string, fieldKeys: string[], visible?: boolean, order?: number }>,
 *     tabs: Array<{ id: string, visible?: boolean, order?: number }>,
 *     hiddenFieldKeys: string[],
 *   } | null,
 * }} presentation
 * @property {{
 *   canFilter: boolean,
 *   canSort: boolean,
 *   canResizeColumns: boolean,
 *   canHideFields: boolean,
 *   canCreateViews: boolean,
 * }} capabilities
 * @property {{
 *   isSystem: boolean,
 *   isDefault: boolean,
 *   isPublished: boolean,
 *   draftRevision?: number | null,
 *   viewId?: string | null,
 * }} meta
 */

export const OBJECT_VIEW_CONTRACT_SCHEMA_VERSION = 1;

export const DEFAULT_OBJECT_VIEW_CAPABILITIES = {
  canFilter: true,
  canSort: true,
  canResizeColumns: true,
  canHideFields: true,
  canCreateViews: true,
};

export const DEFAULT_TABLE_PRESENTATION = {
  hiddenFieldKeys: [],
  columnOrder: [],
  columnWidths: {},
  density: "compact",
};

export const DEFAULT_OBJECT_VIEW_QUERY = {
  filters: {
    conditions: [],
    savedFilters: [],
    quickFilters: [],
    defaultQuickFilterId: null,
  },
  sort: {
    rules: [{ field: "created_at", order: "desc" }],
  },
  pagination: {
    defaultPageSize: 20,
  },
};

/**
 * @param {Partial<ObjectViewContract>} [overrides]
 * @returns {ObjectViewContract}
 */
export function createEmptyObjectViewContract(overrides = {}) {
  return {
    schemaVersion: OBJECT_VIEW_CONTRACT_SCHEMA_VERSION,
    viewType: "table",
    key: "default_table",
    name: "Таблица",
    projection: {
      fieldKeys: [],
      fieldOrder: [],
      titleFieldKey: null,
    },
    query: {
      ...DEFAULT_OBJECT_VIEW_QUERY,
      filters: { ...DEFAULT_OBJECT_VIEW_QUERY.filters },
      sort: {
        rules: [...DEFAULT_OBJECT_VIEW_QUERY.sort.rules],
      },
      pagination: { ...DEFAULT_OBJECT_VIEW_QUERY.pagination },
    },
    presentation: {
      table: { ...DEFAULT_TABLE_PRESENTATION },
      card: null,
    },
    capabilities: { ...DEFAULT_OBJECT_VIEW_CAPABILITIES },
    meta: {
      isSystem: false,
      isDefault: false,
      isPublished: false,
      draftRevision: null,
      viewId: null,
    },
    ...overrides,
  };
}
