import { systemColumnKeyToRuntimeSortField } from "../../../shared/viewEngine/systemColumnKeys";
import { resolveRuntimeListSort } from "./sortRulesUtils";
import {
  getQuickFilterConditions,
  mergeRuntimeFilterConditions,
} from "./savedFilterUtils";
import {
  FILTER_OPERATOR_BOOLEAN_FALSE,
  FILTER_OPERATOR_BOOLEAN_TRUE,
  FILTER_OPERATOR_EQ,
  FILTER_OPERATOR_IN,
  FILTER_OPERATOR_IS_EMPTY,
  FILTER_OPERATOR_IS_NOT_EMPTY,
  FILTER_OPERATOR_NOT_IN,
} from "./tableFilterOperators";

/**
 * Maps Object View effective contract → runtime gateway params.
 */
export function mapObjectViewQueryToRuntimeParams({
  contract = null,
  pagination = {},
  session = {},
}) {
  const limit = Number(pagination.limit) > 0 ? Number(pagination.limit) : 20;
  const offset = Number(pagination.offset) >= 0 ? Number(pagination.offset) : 0;

  const resolvedSort = resolveRuntimeListSort(contract?.query?.sort?.rules || []);

  const baseConditions = contract?.query?.filters?.conditions || [];
  const savedFilters = contract?.query?.filters?.savedFilters || [];
  const quickConditions = getQuickFilterConditions(
    session?.activeQuickFilterId,
    savedFilters,
  );
  const mergedConditions = mergeRuntimeFilterConditions(
    baseConditions,
    quickConditions,
  );

  const filters = buildRuntimeFilterParams(mergedConditions);

  return {
    sort: systemColumnKeyToRuntimeSortField(resolvedSort.field),
    order: resolvedSort.order,
    limit,
    offset,
    filters,
  };
}

function normalizeRuntimeFilterValue(operator, value) {
  if (operator === FILTER_OPERATOR_IN || operator === FILTER_OPERATOR_NOT_IN) {
    if (Array.isArray(value)) {
      return value;
    }

    if (typeof value === "string") {
      const trimmed = value.trim();

      if (!trimmed) {
        return [];
      }

      if (trimmed.startsWith("[")) {
        try {
          const parsed = JSON.parse(trimmed);
          return Array.isArray(parsed) ? parsed : [trimmed];
        } catch {
          return trimmed
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean);
        }
      }

      return trimmed
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
    }
  }

  if (value === undefined || value === null) {
    return null;
  }

  return value;
}

function mapConditionToRuntimeFilter(condition) {
  const fieldKey = String(
    condition?.fieldKey ?? condition?.field_key ?? "",
  ).trim();

  if (!fieldKey) {
    return null;
  }

  let operator = String(condition?.operator || FILTER_OPERATOR_EQ)
    .trim()
    .toLowerCase();
  let value = condition?.value;

  if (operator === FILTER_OPERATOR_BOOLEAN_TRUE) {
    operator = FILTER_OPERATOR_EQ;
    value = true;
  } else if (operator === FILTER_OPERATOR_BOOLEAN_FALSE) {
    operator = FILTER_OPERATOR_EQ;
    value = false;
  }

  if (operator === FILTER_OPERATOR_IS_EMPTY || operator === FILTER_OPERATOR_IS_NOT_EMPTY) {
    return {
      field: fieldKey,
      op: operator,
    };
  }

  const normalizedValue = normalizeRuntimeFilterValue(operator, value);

  if (
    normalizedValue === "" ||
    normalizedValue === null ||
    normalizedValue === undefined ||
    (Array.isArray(normalizedValue) && !normalizedValue.length)
  ) {
    return null;
  }

  return {
    field: fieldKey,
    op: operator,
    value: normalizedValue,
  };
}

export function buildRuntimeFilterParams(conditions) {
  if (!Array.isArray(conditions) || !conditions.length) {
    return {};
  }

  const payload = conditions
    .map(mapConditionToRuntimeFilter)
    .filter(Boolean);

  if (!payload.length) {
    return {};
  }

  return {
    filters: JSON.stringify(payload),
  };
}
