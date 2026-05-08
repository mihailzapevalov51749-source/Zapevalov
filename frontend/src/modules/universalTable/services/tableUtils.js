import { DEFAULT_OPTION_COLOR } from "./tableConstants";

export const DEFAULT_AVATAR_SETTINGS = {
  x: 0,
  y: 0,
  scale: 1,
};

export const normalizeAlign = (align) => {
  if (["left", "center", "right"].includes(align)) return align;
  return "left";
};

export const normalizeOptions = (options) => {
  if (!Array.isArray(options)) return [];

  return options.map((option, index) => {
    if (typeof option === "string") {
      return {
        id: `option-${index}-${option}`,
        label: option,
        color: DEFAULT_OPTION_COLOR,
      };
    }

    return {
      id: option?.id || `option-${index}`,
      label: option?.label || "",
      color: option?.color || DEFAULT_OPTION_COLOR,
    };
  });
};

export const normalizeAvatarSettings = (settings) => {
  if (!settings) return DEFAULT_AVATAR_SETTINGS;

  if (typeof settings === "string") {
    try {
      return {
        ...DEFAULT_AVATAR_SETTINGS,
        ...JSON.parse(settings),
      };
    } catch {
      return DEFAULT_AVATAR_SETTINGS;
    }
  }

  if (typeof settings === "object") {
    return {
      ...DEFAULT_AVATAR_SETTINGS,
      ...settings,
    };
  }

  return DEFAULT_AVATAR_SETTINGS;
};

export const normalizeUserValue = (value) => {
  if (!value) return null;

  if (typeof value === "object") {
    const userId = value.userId ?? value.user_id ?? value.id ?? null;

    return {
      userId: userId !== null && userId !== "" ? Number(userId) : null,
      full_name: value.full_name ?? value.fullName ?? value.name ?? "",
      email: value.email ?? "",
      avatar_url: value.avatar_url ?? value.avatarUrl ?? "",
      avatar_settings: normalizeAvatarSettings(
        value.avatar_settings ?? value.avatarSettings
      ),
    };
  }

  return {
    userId: value !== null && value !== "" ? Number(value) : null,
    full_name: "",
    email: "",
    avatar_url: "",
    avatar_settings: DEFAULT_AVATAR_SETTINGS,
  };
};

export const normalizeLookup = (lookup) => {
  if (!lookup || typeof lookup !== "object") return {};

  const sourceTableId =
    lookup.sourceTableId ??
    lookup.source_table_id ??
    lookup.tableId ??
    lookup.table_id ??
    null;

  const displayColumnId =
    lookup.displayColumnId ??
    lookup.display_column_id ??
    lookup.columnId ??
    lookup.column_id ??
    null;

  return {
    sourceTableId:
      sourceTableId !== null && sourceTableId !== ""
        ? Number(sourceTableId)
        : null,

    displayColumnId:
      displayColumnId !== null && displayColumnId !== ""
        ? Number(displayColumnId)
        : null,

    showAvatar: lookup.showAvatar !== false,
    showTime: lookup.showTime === true,
    showDateHint: lookup.showDateHint !== false,
  };
};

export const safeNormalizeLookup = (lookup) => {
  const normalized = normalizeLookup(lookup || {});

  return {
    sourceTableId: normalized?.sourceTableId
      ? Number(normalized.sourceTableId)
      : null,

    displayColumnId: normalized?.displayColumnId
      ? Number(normalized.displayColumnId)
      : null,

    showAvatar: normalized?.showAvatar !== false,
    showTime: normalized?.showTime === true,
    showDateHint: normalized?.showDateHint !== false,
  };
};

export const getDefaultChoiceOptions = () => [
  { id: `option-${Date.now()}-1`, label: "Новый", color: "#6b7280" },
  { id: `option-${Date.now()}-2`, label: "В работе", color: "#2563eb" },
  { id: `option-${Date.now()}-3`, label: "Завершено", color: "#16a34a" },
];

export const areOptionsEqual = (a, b) => {
  return (
    JSON.stringify(normalizeOptions(a)) === JSON.stringify(normalizeOptions(b))
  );
};

export const areLookupEqual = (a, b) => {
  return (
    JSON.stringify(normalizeLookup(a)) === JSON.stringify(normalizeLookup(b))
  );
};

export const areUserValuesEqual = (a, b) => {
  return (
    JSON.stringify(normalizeUserValue(a)) ===
    JSON.stringify(normalizeUserValue(b))
  );
};