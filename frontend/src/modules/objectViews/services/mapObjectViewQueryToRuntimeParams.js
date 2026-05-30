import { getPrimarySortState } from "./sortRulesUtils";
import {
  getQuickFilterConditions,
  mergeRuntimeFilterConditions,
} from "./savedFilterUtils";

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

  const primarySort = getPrimarySortState(contract?.query?.sort?.rules || []);
  const resolvedSort = primarySort || { field: "created_at", order: "desc" };

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
    sort: resolvedSort.field,
    order: resolvedSort.order,
    limit,
    offset,
    filters,
  };
}

function buildRuntimeFilterParams(conditions) {
  if (!Array.isArray(conditions) || !conditions.length) {
    return {};
  }

  const params = {};

  for (const condition of conditions) {
    const fieldKey = String(
      condition?.fieldKey ?? condition?.field_key ?? "",
    ).trim();

    if (!fieldKey) {
      continue;
    }

    const operator = String(condition?.operator || "eq").toLowerCase();
    const value = condition?.value;

    if (operator === "eq") {
      if (value === undefined || value === null || value === "") {
        continue;
      }
      params[`filter.${fieldKey}`] = String(value);
      continue;
    }

    if (operator === "in") {
      if (Array.isArray(value)) {
        params[`filter.${fieldKey}`] = JSON.stringify(value);
        continue;
      }

      if (typeof value === "string" && value.includes(",")) {
        const parts = value
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean);
        params[`filter.${fieldKey}`] = JSON.stringify(parts);
        continue;
      }

      if (value !== undefined && value !== null && value !== "") {
        params[`filter.${fieldKey}`] = String(value);
        continue;
      }
    }

    if (import.meta.env?.DEV) {
      console.warn(
        `[mapObjectViewQueryToRuntimeParams] Unsupported filter operator "${operator}" for field "${fieldKey}" — skipped.`,
      );
    }
  }

  return params;
}
