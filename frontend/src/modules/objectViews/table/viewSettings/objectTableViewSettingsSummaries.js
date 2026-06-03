import {
  findCatalogObjectType,
  getObjectTypeFields,
} from "../services/tableModelAdapter";

function normalizeFieldOrder(contract) {
  const projectionKeys = contract?.projection?.fieldKeys || [];
  const columnOrder = contract?.presentation?.table?.columnOrder;

  if (Array.isArray(columnOrder) && columnOrder.length > 0) {
    return columnOrder.map(String);
  }

  return [...projectionKeys];
}

function buildFieldLabelMap(catalog, objectTypeKey, contract) {
  const labels = new Map();
  const objectType = findCatalogObjectType(catalog, objectTypeKey);

  for (const field of getObjectTypeFields(objectType)) {
    const key = String(field?.key || "").trim();

    if (!key) {
      continue;
    }

    labels.set(key, String(field?.name || field?.label || key));
  }

  for (const key of contract?.projection?.fieldKeys || []) {
    if (!labels.has(key)) {
      labels.set(key, String(key));
    }
  }

  return labels;
}

function formatSortLabel(rules, fieldLabels) {
  const primary = Array.isArray(rules) && rules.length ? rules[0] : null;

  if (!primary?.field) {
    return "Без сортировки";
  }

  const label = fieldLabels.get(primary.field) || primary.field;
  const direction = primary.order === "desc" ? "↓" : "↑";

  return `${label} ${direction}`;
}

/**
 * @param {object} params
 */
export function buildObjectTableViewSummaries({
  effectiveContract,
  catalog,
  objectTypeKey,
}) {
  const contract = effectiveContract || {};
  const fieldLabels = buildFieldLabelMap(catalog, objectTypeKey, contract);
  const projectionKeys = contract?.projection?.fieldKeys || [];
  const hiddenKeys = new Set(contract?.presentation?.table?.hiddenFieldKeys || []);
  const hiddenCount = projectionKeys.filter((key) => hiddenKeys.has(key)).length;

  const conditions = contract?.query?.filters?.conditions || [];
  const sortRules = contract?.query?.sort?.rules || [];

  const projectionOrder = [...projectionKeys];
  const columnOrder = normalizeFieldOrder(contract);
  const orderChanged =
    projectionOrder.length > 0 &&
    (columnOrder.length !== projectionOrder.length ||
      columnOrder.some((key, index) => key !== projectionOrder[index]));

  const fieldsSummary =
    hiddenCount > 0 ? `Скрыто: ${hiddenCount}` : "Все поля";
  const filtersSummary =
    conditions.length > 0 ? `Условий: ${conditions.length}` : "Без фильтра";
  const sortSummary = formatSortLabel(sortRules, fieldLabels);
  const columnsSummary = orderChanged
    ? "Порядок изменён"
    : "Стандартный порядок";

  const summaryLine = buildObjectTableRepresentationSummaryLine({
    hiddenCount,
    conditionsCount: conditions.length,
    sortSummary,
    orderChanged,
  });

  const cardSummaryLine = buildObjectTableViewCardSummary({
    hiddenCount,
    conditionsCount: conditions.length,
    sortSummary,
  });

  return {
    fieldsSummary,
    filtersSummary,
    sortSummary,
    columnsSummary,
    summaryLine,
    cardSummaryLine,
    fieldLabels,
  };
}

/**
 * Строка под заголовком панели — как ViewSettingsCard (3 части, •).
 */
export function buildObjectTableViewCardSummary({
  hiddenCount = 0,
  conditionsCount = 0,
  sortSummary = "Без сортировки",
} = {}) {
  return [
    hiddenCount > 0 ? `${hiddenCount} скрытых полей` : "все поля",
    conditionsCount > 0 ? `${conditionsCount} фильтра` : "без фильтра",
    sortSummary || "без сортировки",
  ].join(" • ");
}

/**
 * Краткое состояние представления — формат как в Universal Tables.
 */
export function buildObjectTableRepresentationSummaryLine({
  hiddenCount = 0,
  conditionsCount = 0,
  sortSummary = "Без сортировки",
  orderChanged = false,
} = {}) {
  const sortPart =
    sortSummary && sortSummary !== "Без сортировки"
      ? String(sortSummary).toLowerCase()
      : "без сортировки";

  return [
    hiddenCount > 0 ? `${hiddenCount} скрыто` : "все поля",
    conditionsCount > 0 ? `фильтры ${conditionsCount}` : "без фильтра",
    sortPart,
    orderChanged ? "порядок" : "стандартный порядок",
  ].join(" · ");
}
