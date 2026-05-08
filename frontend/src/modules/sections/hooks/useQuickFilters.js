function createId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return `filter_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function normalizeDefaultFlag(filter) {
  return Boolean(
    filter?.isDefault ??
      filter?.is_default ??
      filter?.default ??
      filter?.isDefaultFilter ??
      false
  );
}

function normalizeQuickFlag(filter) {
  return Boolean(
    filter?.isQuick ??
      filter?.isQuickFilter ??
      filter?.is_quick ??
      filter?.quick ??
      false
  );
}

export function normalizeQuickFilter(filter, fallbackConditions = []) {
  const filterId = String(filter?.key ?? filter?.id ?? createId());
  const isDefault = normalizeDefaultFlag(filter);
  const isQuick = normalizeQuickFlag(filter);

  return {
    ...filter,
    key: filterId,
    id: filter?.id ?? filterId,
    label: filter?.label || filter?.name || "Новый фильтр",
    name: filter?.name || filter?.label || "Новый фильтр",
    conditions: Array.isArray(filter?.conditions)
      ? filter.conditions
      : fallbackConditions,

    isQuick,
    isQuickFilter: isQuick,
    is_quick: isQuick,

    isDefault: isQuick ? isDefault : false,
    is_default: isQuick ? isDefault : false,
  };
}

export function ensureSingleDefaultFilter(filters = []) {
  if (!Array.isArray(filters)) return [];

  let defaultWasFound = false;

  return filters
    .map((filter) => normalizeQuickFilter(filter))
    .filter((filter) => filter.isQuick)
    .map((filter) => {
      if (!filter.isDefault) {
        return {
          ...filter,
          isDefault: false,
          is_default: false,
        };
      }

      if (defaultWasFound) {
        return {
          ...filter,
          isDefault: false,
          is_default: false,
        };
      }

      defaultWasFound = true;

      return {
        ...filter,
        isDefault: true,
        is_default: true,
      };
    });
}