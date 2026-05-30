/**
 * View Engine contracts for hosted read-only tables (Object Type runtime).
 *
 * Data flow:
 *   catalog field definitions + projection + runtime entities
 *     → ViewEngineTableModel
 *     → (future) ViewEngineTable UI + FieldValueRenderer
 *
 * @module shared/viewEngine/contracts
 */

/**
 * Field definition shape for display renderers (FieldValueRenderer / choiceUtils).
 * Options and colors come from Studio `settings_json`, never from Universal Table columns.
 *
 * @typedef {Object} ViewEngineFieldDef
 * @property {string} key
 * @property {string} type - normalized field type (text, choice, date, …)
 * @property {string} label
 * @property {Record<string, unknown>} settings - Studio settings_json
 * @property {Array<unknown>} [options] - alias for settings.options (renderer compat)
 * @property {string} [align]
 * @property {boolean} [multiple]
 * @property {boolean} [isRequired]
 * @property {boolean} [isSystem]
 */

/**
 * @typedef {'field' | 'system'} ViewEngineColumnSource
 */

/**
 * @typedef {Object} ViewEngineColumn
 * @property {string} key
 * @property {string} label
 * @property {string} type - renderer type; system columns use text/date/etc.
 * @property {ViewEngineFieldDef | null} fieldDef - null for system columns
 * @property {ViewEngineColumnSource} source
 * @property {boolean} visible
 * @property {boolean} sortable
 * @property {boolean} isSystem
 * @property {boolean} isTitle
 * @property {number} [width]
 */

/**
 * @typedef {Object} ViewEngineCell
 * @property {string} fieldKey
 * @property {unknown} value
 * @property {ViewEngineFieldDef | null} [fieldDef]
 */

/**
 * @typedef {Object} ViewEngineRow
 * @property {string} id
 * @property {string | null} [status]
 * @property {string | null} [createdAt]
 * @property {string | null} [updatedAt]
 * @property {ViewEngineCell[]} cells - aligned with table columns order
 */

/**
 * @typedef {Object} ViewEnginePagination
 * @property {number} limit
 * @property {number} offset
 * @property {number} total
 * @property {boolean} hasMore
 */

/**
 * @typedef {'asc' | 'desc'} ViewEngineSortOrder
 */

/**
 * @typedef {Object} ViewEngineSortState
 * @property {string} field - field key or system key (created_at, status, …)
 * @property {ViewEngineSortOrder} order
 */

/**
 * Context passed into field renderers from the table layer.
 *
 * @typedef {Object} ViewEngineRendererContext
 * @property {ViewEngineFieldDef} fieldDef
 * @property {unknown} value
 * @property {ViewEngineRow} row
 * @property {ViewEngineColumn} column
 * @property {boolean} [compact]
 * @property {boolean} [multiline]
 * @property {string} [emptyValue]
 * @property {(userId: string) => Promise<unknown> | unknown} [resolveUser]
 * @property {(params: object) => Promise<unknown> | unknown} [resolveLookup]
 */

/**
 * Published catalog projection fragment (view settings_json.projection).
 *
 * @typedef {Object} ViewEngineProjection
 * @property {string[]} [visible_fields]
 * @property {string[]} [field_order]
 * @property {string | null} [title_field]
 * @property {{ field?: string, order?: ViewEngineSortOrder }} [default_sort]
 */

/**
 * @typedef {Object} ViewEngineTableModel
 * @property {string} objectTypeKey
 * @property {string | null} viewKey
 * @property {string | null} titleFieldKey
 * @property {ViewEngineColumn[]} columns
 * @property {ViewEngineRow[]} rows
 * @property {ViewEnginePagination} pagination
 * @property {ViewEngineSortState} sort
 * @property {number | null} catalogVersion
 * @property {number | null} schemaVersion
 * @property {string[]} [warnings]
 */

export const VIEW_ENGINE_SORT_ORDERS = ["asc", "desc"];

export const VIEW_ENGINE_SYSTEM_COLUMN_KEYS = [
  "id",
  "status",
  "created_at",
];
