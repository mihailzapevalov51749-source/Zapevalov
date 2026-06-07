import { OBJECT_VIEW_CONTRACT_SCHEMA_VERSION } from "./objectViewContract";

function buildViewColumnsSettings(contract) {
  const table = contract.presentation?.table || {};
  const projectionKeys = contract.projection?.fieldKeys || [];
  const hidden = new Set(
    Array.isArray(table.hiddenFieldKeys) ? table.hiddenFieldKeys : [],
  );
  const orderSource =
    Array.isArray(table.columnOrder) && table.columnOrder.length
      ? table.columnOrder
      : contract.projection?.fieldOrder || projectionKeys;

  return orderSource.map((fieldKey) => ({
    fieldKey: String(fieldKey),
    visible: !hidden.has(String(fieldKey)),
    width:
      table.columnWidths && table.columnWidths[fieldKey] != null
        ? Number(table.columnWidths[fieldKey])
        : null,
  }));
}

function buildSettingsJson(contract) {
  const table = contract.presentation?.table || {};
  const columnOrder =
    Array.isArray(table.columnOrder) && table.columnOrder.length
      ? [...table.columnOrder]
      : [...(contract.projection?.fieldOrder || contract.projection?.fieldKeys || [])];

  return {
    columns: buildViewColumnsSettings(contract),
    objectView: {
      schemaVersion: OBJECT_VIEW_CONTRACT_SCHEMA_VERSION,
      viewType: contract.viewType,
      key: contract.key,
      name: contract.name,
      projection: contract.projection,
      roleMapping: contract.roleMapping || {},
      query: contract.query,
      presentation: contract.presentation,
      capabilities: contract.capabilities,
      meta: {
        isSystem: contract.meta.isSystem,
        isDefault: contract.meta.isDefault,
      },
    },
    projection: {
      visible_fields: [...(contract.projection.fieldKeys || [])],
      field_order: columnOrder,
      title_field: contract.projection.titleFieldKey,
      default_sort: contract.query.sort.rules[0]
        ? {
            field: contract.query.sort.rules[0].field,
            order: contract.query.sort.rules[0].order,
          }
        : null,
    },
  };
}

function buildFiltersJson(contract) {
  return {
    objectView: {
      schemaVersion: OBJECT_VIEW_CONTRACT_SCHEMA_VERSION,
      filters: {
        conditions: contract.query.filters.conditions,
        savedFilters: contract.query.filters.savedFilters,
        quickFilters: contract.query.filters.quickFilters,
        defaultQuickFilterId: contract.query.filters.defaultQuickFilterId,
      },
    },
  };
}

/**
 * @param {import('./objectViewContract').ObjectViewContract} contract
 * @param {{
 *   mode?: 'create' | 'update',
 *   overrides?: Partial<import('./objectViewContract').ObjectViewContract>,
 * }} [options]
 */
export function buildObjectViewPayload(contract, options = {}) {
  const { mode = "update", overrides = {}, columnWidthsBaseline = undefined } = options;

  const tableColumnOrder =
    overrides.presentation?.table?.columnOrder ??
    contract.presentation?.table?.columnOrder;
  const hasColumnOrder = Array.isArray(tableColumnOrder) && tableColumnOrder.length > 0;

  const merged = {
    ...contract,
    ...overrides,
    key: String(overrides.key || contract.key),
    name: String(overrides.name || contract.name),
    viewType: overrides.viewType || contract.viewType || "table",
    projection: {
      ...contract.projection,
      ...(overrides.projection || {}),
      ...(hasColumnOrder
        ? {
            fieldOrder: [...tableColumnOrder],
          }
        : {}),
    },
    query: {
      ...contract.query,
      ...(overrides.query || {}),
      filters: {
        ...contract.query.filters,
        ...(overrides.query?.filters || {}),
      },
      sort: {
        rules: overrides.query?.sort?.rules || contract.query.sort.rules,
      },
    },
    presentation: {
      table: {
        ...contract.presentation.table,
        ...(overrides.presentation?.table || {}),
      },
      card:
        overrides.presentation?.card !== undefined
          ? overrides.presentation.card
          : contract.presentation?.card ?? null,
      plan:
        overrides.presentation?.plan !== undefined
          ? overrides.presentation.plan
          : contract.presentation?.plan ?? null,
    },
    meta: {
      ...contract.meta,
      ...(overrides.meta || {}),
    },
  };

  if (columnWidthsBaseline !== undefined) {
    merged.presentation.table.columnWidths = {
      ...(columnWidthsBaseline && typeof columnWidthsBaseline === "object"
        ? columnWidthsBaseline
        : {}),
    };
  }

  const settings_json = buildSettingsJson(merged);
  const filters_json = buildFiltersJson(merged);

  if (mode === "create") {
    return {
      key: merged.key,
      name: merged.name,
      view_type: merged.viewType || "table",
      description: null,
      is_default: Boolean(merged.meta.isDefault),
      is_active: true,
      sort_order: 0,
      settings_json,
      layout_json: {},
      filters_json,
      visibility_json: {},
    };
  }

  const payload = {
    settings_json,
    filters_json,
  };

  if (merged.meta.draftRevision != null) {
    payload.draft_revision = merged.meta.draftRevision;
  }

  if (merged.name) {
    payload.name = merged.name;
  }

  if (merged.meta.isDefault === true) {
    payload.is_default = true;
  }

  return payload;
}
