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

const getUserFullName = (value) => {
  if (!value || typeof value !== "object") return "";

  const firstName =
    value.firstName || value.first_name || value.firstname || "";

  const lastName = value.lastName || value.last_name || value.lastname || "";

  const combinedName = `${firstName} ${lastName}`.trim();

  return (
    value.full_name ||
    value.fullName ||
    value.displayName ||
    value.display_name ||
    combinedName ||
    value.name ||
    value.label ||
    value.title ||
    value.username ||
    ""
  );
};

const getNestedUserValue = (value) => {
  if (!value || typeof value !== "object") return null;

  return (
    value.user ||
    value.selectedUser ||
    value.selected_user ||
    value.assignee ||
    value.responsible ||
    value.owner ||
    value.created_by ||
    value.updated_by ||
    null
  );
};

export const normalizeUserValue = (value) => {
  if (!value) return null;

  if (Array.isArray(value)) {
    return normalizeUserValue(value[0] || null);
  }

  if (typeof value === "object") {
    const nestedValue = getNestedUserValue(value);

    if (nestedValue) {
      return normalizeUserValue(nestedValue);
    }

    const rawUserId =
      value.userId ??
      value.user_id ??
      value.id ??
      value.user?.id ??
      value.selectedUser?.id ??
      null;

    const userId =
      rawUserId !== null && rawUserId !== "" && !Number.isNaN(Number(rawUserId))
        ? Number(rawUserId)
        : null;

    return {
      userId,
      full_name: getUserFullName(value),
      email: value.email ?? "",
      avatar_url:
        value.avatar_url ??
        value.avatarUrl ??
        value.photo_url ??
        value.photoUrl ??
        value.image_url ??
        value.imageUrl ??
        "",
      avatar_settings: normalizeAvatarSettings(
        value.avatar_settings ?? value.avatarSettings
      ),
    };
  }

  return {
    userId:
      value !== null && value !== "" && !Number.isNaN(Number(value))
        ? Number(value)
        : null,
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