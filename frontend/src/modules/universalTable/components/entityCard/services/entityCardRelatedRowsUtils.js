const DEFAULT_AVATAR_SETTINGS = {
  x: 0,
  y: 0,
  scale: 1,
};

export const PROFILE_AVATAR_SIZE = 132;

export const DEFAULT_VISIBLE_COLUMNS = [
  "title",
  "date",
  "status",
  "user",
];

export const ROLE_FALLBACK_NAMES = {
  title: ["название", "задач", "name", "title"],
  date: ["срок", "дата", "due", "deadline"],
  status: ["статус", "status"],
  choice: ["статус", "status"],
  user: [
    "ответственный",
    "исполнитель",
    "assignee",
    "responsible",
    "user",
  ],
};

export function getRowId(row) {
  return String(
    row?.id ||
      row?.rowId ||
      row?.row_id ||
      ""
  );
}

export function getParentId(row) {
  const values = row?.values || {};

  const direct =
    row?.parentId ||
    row?.parent_id ||
    row?.parentRowId ||
    row?.parent_row_id ||
    row?.parent?.id ||
    row?.parentRow?.id ||
    row?.parent_row?.id ||
    null;

  if (direct) {
    return String(direct);
  }

  const parentValue =
    values.parent ||
    values.parent_task ||
    values.parentTask ||
    values.parent_row ||
    values.parentRow ||
    null;

  if (
    parentValue &&
    typeof parentValue === "object"
  ) {
    return String(
      parentValue.id ||
        parentValue.rowId ||
        parentValue.row_id ||
        ""
    );
  }

  return "";
}

export function getColumnId(column) {
  return String(
    column?.id ||
      column?.key ||
      ""
  );
}

export function getColumnById(
  columns = [],
  fieldId
) {
  if (!fieldId) return null;

  return (
    columns.find(
      (column) =>
        getColumnId(column) ===
        String(fieldId)
    ) || null
  );
}

export function getColumnByNames(
  columns = [],
  names = []
) {
  return (
    columns.find((column) => {
      const title = String(
        column?.title || ""
      ).toLowerCase();

      const key = String(
        column?.key ||
          column?.id ||
          ""
      ).toLowerCase();

      return names.some((name) => {
        const normalizedName =
          String(name).toLowerCase();

        return (
          title.includes(
            normalizedName
          ) ||
          key.includes(normalizedName)
        );
      });
    }) || null
  );
}

export function getColumnForConfig(
  columns = [],
  config
) {
  if (!config) return null;

  if (typeof config === "object") {
    const byFieldId =
      getColumnById(
        columns,
        config.fieldId ||
          config.columnId
      );

    if (byFieldId) {
      return byFieldId;
    }

    const fallbackNames =
      config.fallbackNames ||
      ROLE_FALLBACK_NAMES[
        config.role
      ] ||
      [];

    return getColumnByNames(
      columns,
      fallbackNames
    );
  }

  return getColumnByNames(
    columns,
    ROLE_FALLBACK_NAMES[
      config
    ] || []
  );
}

export function normalizeVisibleColumns(
  visibleColumns
) {
  const source =
    Array.isArray(visibleColumns) &&
    visibleColumns.length
      ? visibleColumns
      : DEFAULT_VISIBLE_COLUMNS;

  return source
    .map((item) => {
      if (
        typeof item === "string"
      ) {
        return {
          role: item,
          key: item,
          fieldId: null,
          title: item,
        };
      }

      if (
        item &&
        typeof item === "object"
      ) {
        const role =
          item.role ||
          item.type ||
          "text";

        return {
          ...item,
          role,

          key:
            item.key ||
            item.id ||
            item.fieldId ||
            item.columnId ||
            role,
        };
      }

      return null;
    })
    .filter(Boolean);
}

export function getGridColumnByRole(
  role
) {
  switch (role) {
    case "title":
      return "minmax(150px, 1fr)";

    case "date":
      return "82px";

    case "status":
    case "choice":
      return "96px";

    case "user":
      return "minmax(110px, 140px)";

    default:
      return "minmax(90px, 1fr)";
  }
}

export function getGridTemplateColumns(
  configs = []
) {
  if (!configs.length) {
    return "minmax(150px, 1fr)";
  }

  return configs
    .map((config) =>
      getGridColumnByRole(
        config.role
      )
    )
    .join(" ");
}

export function getColumnOptions(
  column
) {
  const rawOptions =
    column?.options ||
    column?.settings
      ?.options ||
    column?.config?.options ||
    [];

  if (
    !Array.isArray(rawOptions)
  ) {
    return [];
  }

  return rawOptions;
}

export function getValue(
  row,
  column
) {
  if (!row || !column) {
    return "";
  }

  const values = row.values || {};

  const columnId =
    column.id || column.key;

  return (
    values[columnId] ?? ""
  );
}

export function getOptionLabel(
  option
) {
  if (!option) return "";

  if (
    typeof option === "string"
  ) {
    return option;
  }

  return (
    option.label ||
    option.title ||
    option.name ||
    option.value ||
    ""
  );
}

export function getOptionColor(
  option
) {
  if (
    !option ||
    typeof option !== "object"
  ) {
    return "";
  }

  return (
    option.color ||
    option.background ||
    option.bg ||
    option.backgroundColor ||
    option.background_color ||
    ""
  );
}

export function normalizeChoiceValue(
  value,
  column
) {
  if (!value) {
    return {
      label: "—",
      color: "",
    };
  }

  if (Array.isArray(value)) {
    return normalizeChoiceValue(
      value[0],
      column
    );
  }

  const options =
    getColumnOptions(column);

  if (
    typeof value === "object"
  ) {
    const label =
      value.label ||
      value.title ||
      value.name ||
      value.value ||
      "—";

    const valueId =
      value.id ||
      value.key ||
      value.value ||
      label;

    const matchedOption =
      options.find((option) => {
        const optionLabel =
          getOptionLabel(option);

        const optionId =
          option?.id ||
          option?.key ||
          option?.value ||
          optionLabel;

        return (
          String(optionId) ===
            String(valueId) ||
          String(optionLabel) ===
            String(label)
        );
      }) || null;

    return {
      label,

      color:
        getOptionColor(value) ||
        getOptionColor(
          matchedOption
        ),
    };
  }

  const label = String(value);

  const matchedOption =
    options.find((option) => {
      const optionLabel =
        getOptionLabel(option);

      const optionId =
        option?.id ||
        option?.key ||
        option?.value ||
        optionLabel;

      return (
        String(optionId) ===
          label ||
        String(optionLabel) ===
          label
      );
    }) || null;

  return {
    label,
    color:
      getOptionColor(
        matchedOption
      ),
  };
}

export function normalizeTextValue(
  value
) {
  if (!value) return "—";

  if (
    typeof value === "object"
  ) {
    return (
      value.title ||
      value.name ||
      value.label ||
      value.value ||
      "—"
    );
  }

  return String(value);
}

export function normalizeDateValue(
  value
) {
  if (!value) return "—";

  const date = new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return String(value);
  }

  return date.toLocaleDateString(
    "ru-RU"
  );
}

export function normalizeAvatarSettings(
  settings
) {
  if (!settings) {
    return DEFAULT_AVATAR_SETTINGS;
  }

  if (
    typeof settings === "string"
  ) {
    try {
      return {
        ...DEFAULT_AVATAR_SETTINGS,
        ...JSON.parse(settings),
      };
    } catch {
      return DEFAULT_AVATAR_SETTINGS;
    }
  }

  if (
    typeof settings === "object"
  ) {
    return {
      ...DEFAULT_AVATAR_SETTINGS,
      ...settings,
    };
  }

  return DEFAULT_AVATAR_SETTINGS;
}

export function getInitials(
  fullName
) {
  if (!fullName) return "?";

  return String(fullName)
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export function normalizeUser(
  value
) {
  if (!value) {
    return {
      name: "—",
      avatarUrl: "",
      avatarSettings:
        DEFAULT_AVATAR_SETTINGS,
    };
  }

  if (Array.isArray(value)) {
    return normalizeUser(
      value[0]
    );
  }

  if (
    typeof value === "object"
  ) {
    return {
      name:
        value.full_name ||
        value.fullName ||
        value.name ||
        value.label ||
        value.email ||
        value.value ||
        "—",

      avatarUrl:
        value.avatar_url ||
        value.avatarUrl ||
        "",

      avatarSettings:
        value.avatar_settings ||
        value.avatarSettings ||
        DEFAULT_AVATAR_SETTINGS,
    };
  }

  return {
    name: String(value),
    avatarUrl: "",
    avatarSettings:
      DEFAULT_AVATAR_SETTINGS,
  };
}