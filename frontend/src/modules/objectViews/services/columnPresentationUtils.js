import {
  normalizeTableDisplayFieldKeys,
  resolveTableDisplayContext,
} from "./tableColumnOrder";
import { isTableBaseStateKey } from "../table/preferences/tableBaseState";

/**
 * @param {import('./objectViewContract').ObjectViewContract | null | undefined} contract
 * @returns {string[]}
 */
export function getProjectionFieldKeys(contract) {
  return [...(contract?.projection?.fieldKeys || [])].filter(Boolean);
}
/**
 * Full column order for panel (all projection fields).
 *
 * @param {import('./objectViewContract').ObjectViewContract | null | undefined} contract
 */
export function resolvePanelColumnOrder(contract, runtimeProjection = null, options = {}) {
  const projectionKeys = getProjectionFieldKeys(contract);
  const { titleFieldKey, isAllMode } = resolveTableDisplayContext(
    contract,
    runtimeProjection,
    options,
  );

  if (isTableBaseStateKey(contract?.key)) {
    return normalizeTableDisplayFieldKeys(projectionKeys, {
      titleFieldKey,
      isAllMode: true,
    });
  }

  const presentationOrder = contract?.presentation?.table?.columnOrder || [];
  const fieldOrder = contract?.projection?.fieldOrder || projectionKeys;

  const orderSource =
    Array.isArray(presentationOrder) && presentationOrder.length
      ? presentationOrder
      : fieldOrder;

  const seen = new Set();
  const result = [];

  for (const key of orderSource) {
    const normalized = String(key || "").trim();

    if (!normalized || !projectionKeys.includes(normalized) || seen.has(normalized)) {
      continue;
    }

    seen.add(normalized);
    result.push(normalized);
  }

  for (const key of projectionKeys) {
    if (!seen.has(key)) {
      result.push(key);
    }
  }

  return normalizeTableDisplayFieldKeys(result, {
    titleFieldKey,
    isAllMode: false,
  });
}

/**
 * Visible field keys in display order (excludes hidden, excludes system columns).
 *
 * @param {import('./objectViewContract').ObjectViewContract | null | undefined} contract
 */
export function resolveVisibleFieldKeys(contract, runtimeProjection = null, options = {}) {
  const projectionKeys = getProjectionFieldKeys(contract);
  const hidden = new Set(contract?.presentation?.table?.hiddenFieldKeys || []);
  const { titleFieldKey, isAllMode } = resolveTableDisplayContext(
    contract,
    runtimeProjection,
    options,
  );

  const panelOrder = resolvePanelColumnOrder(contract, runtimeProjection, options);
  const visible = panelOrder.filter((key) => !hidden.has(key));

  return normalizeTableDisplayFieldKeys(visible, {
    titleFieldKey,
    isAllMode,
  });
}

/**
 * @param {{ key?: string, isSystem?: boolean, source?: string } | null | undefined} column
 */
export function getColumnPresentationKey(column) {
  if (!column || column.isSystem || column.source === "system") {
    return null;
  }

  return String(column.key || "").trim() || null;
}

/**
 * @param {import('./objectViewContract').ObjectViewContract | null | undefined} contract
 * @param {Record<string, unknown> | null | undefined} [runtimeProjection]
 */
export function contractToDisplayProjection(
  contract,
  runtimeProjection = null,
  options = {},
) {
  if (!contract) {
    return runtimeProjection;
  }

  const { titleFieldKey: titleField, isAllMode } = resolveTableDisplayContext(
    contract,
    runtimeProjection,
    options,
  );

  const visibleKeys = resolveVisibleFieldKeys(contract, runtimeProjection, options);

  const defaultSort = contract.query?.sort?.rules?.[0]
    ? {
        field: contract.query.sort.rules[0].field,
        order: contract.query.sort.rules[0].order,
      }
    : runtimeProjection?.default_sort || { field: "created_at", order: "desc" };

  if (runtimeProjection && typeof runtimeProjection === "object") {
    return {
      ...runtimeProjection,
      visible_fields: visibleKeys,
      field_order: visibleKeys,
      title_field: titleField,
      default_sort: defaultSort,
    };
  }

  return {
    visible_fields: visibleKeys,
    field_order: visibleKeys,
    title_field: titleField,
    default_sort: defaultSort,
  };
}

/**
 * @param {Array<Record<string, unknown>>} columns
 * @param {Record<string, number>} columnWidths
 */
export function applyColumnWidths(columns, columnWidths = {}) {
  if (!columns.length || !columnWidths || typeof columnWidths !== "object") {
    return columns;
  }

  return columns.map((column) => {
    const key = getColumnPresentationKey(column);

    if (!key || columnWidths[key] == null) {
      return column;
    }

    const width = Number(columnWidths[key]);

    if (!Number.isFinite(width) || width <= 0) {
      return column;
    }

    return {
      ...column,
      width,
    };
  });
}

