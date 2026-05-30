import { DEFAULT_TABLE_PRESENTATION } from "./objectViewContract";
import { VIEW_ENGINE_SYSTEM_COLUMN_KEYS } from "../../../shared/viewEngine/contracts";

export const OBJECT_VIEW_SYSTEM_FIELD_KEYS = new Set(
  VIEW_ENGINE_SYSTEM_COLUMN_KEYS,
);

/**
 * @param {string} fieldKey
 * @param {Set<string>} projectionKeys
 */
function isPresentationFieldKey(fieldKey, projectionKeys) {
  const normalized = String(fieldKey || "").trim();

  if (!normalized) {
    return false;
  }

  if (OBJECT_VIEW_SYSTEM_FIELD_KEYS.has(normalized)) {
    return false;
  }

  if (projectionKeys.size === 0) {
    return true;
  }

  return projectionKeys.has(normalized);
}

/**
 * Sanitizes presentation.table — only real projection field keys.
 *
 * @param {Record<string, unknown> | null | undefined} table
 * @param {string[]} [projectionFieldKeys]
 */
export function normalizePresentationTable(
  table = null,
  projectionFieldKeys = [],
) {
  const projectionKeys = new Set(
    (projectionFieldKeys || []).map((key) => String(key || "").trim()).filter(Boolean),
  );

  const source =
    table && typeof table === "object" ? table : DEFAULT_TABLE_PRESENTATION;

  const hiddenFieldKeys = (
    Array.isArray(source.hiddenFieldKeys) ? source.hiddenFieldKeys : []
  )
    .map((key) => String(key || "").trim())
    .filter((key) => isPresentationFieldKey(key, projectionKeys));

  const columnOrder = (Array.isArray(source.columnOrder) ? source.columnOrder : [])
    .map((key) => String(key || "").trim())
    .filter((key) => isPresentationFieldKey(key, projectionKeys));

  const columnWidths = {};
  const rawWidths =
    source.columnWidths && typeof source.columnWidths === "object"
      ? source.columnWidths
      : {};

  for (const [key, value] of Object.entries(rawWidths)) {
    if (!isPresentationFieldKey(key, projectionKeys)) {
      continue;
    }

    const width = Number(value);

    if (Number.isFinite(width) && width > 0) {
      columnWidths[key] = width;
    }
  }

  const density = source.density === "comfortable" ? "comfortable" : "compact";

  return {
    hiddenFieldKeys,
    columnOrder,
    columnWidths,
    density,
  };
}

/**
 * @param {import('./objectViewContract').ObjectViewContract} contract
 * @returns {import('./objectViewContract').ObjectViewContract}
 */
/**
 * Light sanitization for persisted card layout (full normalize in Object Entity Card).
 *
 * @param {unknown} card
 */
export function normalizePresentationCard(card) {
  if (!card || typeof card !== "object") {
    return null;
  }

  return {
    sections: Array.isArray(card.sections)
      ? card.sections.map((section, index) => ({
          id: String(section?.id || `section-${index + 1}`),
          type: section?.type ? String(section.type).trim() : undefined,
          title: String(section?.title || "").trim(),
          fieldKeys: Array.isArray(section?.fieldKeys)
            ? section.fieldKeys.map((key) => String(key || "").trim()).filter(Boolean)
            : [],
          tabIds: Array.isArray(section?.tabIds)
            ? section.tabIds.map((id) => String(id || "").trim()).filter(Boolean)
            : [],
          visible: section?.visible === false ? false : true,
          order: typeof section?.order === "number" ? section.order : index,
        }))
      : [],
    tabs: Array.isArray(card.tabs)
      ? card.tabs.map((tab, index) => ({
          id: String(tab?.id || "").trim(),
          visible: tab?.visible === false ? false : true,
          order: typeof tab?.order === "number" ? tab.order : index,
        }))
      : [],
    hiddenFieldKeys: Array.isArray(card.hiddenFieldKeys)
      ? card.hiddenFieldKeys.map((key) => String(key || "").trim()).filter(Boolean)
      : [],
  };
}

export function applyContractGuards(contract) {
  if (!contract) {
    return contract;
  }

  const projectionFieldKeys = contract.projection?.fieldKeys || [];
  const savedFilters = Array.isArray(contract.query?.filters?.savedFilters)
    ? contract.query.filters.savedFilters
    : [];
  const quickFilters = Array.isArray(contract.query?.filters?.quickFilters)
    ? contract.query.filters.quickFilters
    : savedFilters.filter((item) => item?.isQuick === true);

  return {
    ...contract,
    schemaVersion: contract.schemaVersion ?? 1,
    viewType: String(contract.viewType || "table"),
    query: {
      ...contract.query,
      filters: {
        ...contract.query.filters,
        conditions: Array.isArray(contract.query.filters?.conditions)
          ? contract.query.filters.conditions
          : [],
        savedFilters,
        quickFilters,
        defaultQuickFilterId:
          contract.query.filters?.defaultQuickFilterId ?? null,
      },
      sort: {
        rules: Array.isArray(contract.query.sort?.rules)
          ? contract.query.sort.rules
          : [],
      },
    },
    presentation: {
      table: normalizePresentationTable(
        contract.presentation?.table,
        projectionFieldKeys,
      ),
      card: normalizePresentationCard(contract.presentation?.card),
    },
  };
}
