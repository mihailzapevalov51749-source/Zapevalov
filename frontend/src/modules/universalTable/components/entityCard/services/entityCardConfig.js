export const DEFAULT_ENTITY_CARD_SECTIONS = [
  {
    id: "parent",
    type: "parentRow",
    visible: true,
  },
  {
    id: "main",
    type: "mainFields",
    visible: true,
  },
  {
    id: "fields",
    type: "fieldsGrid",
    visible: true,
  },
  {
    id: "tabs",
    type: "tabs",
    visible: true,
  },
  {
    id: "attachments",
    type: "attachments",
    visible: true,
  },
];

export const DEFAULT_ENTITY_CARD_TABS = [
  {
    id: "checklist",
    title: "Чек-лист",
    label: "Чек-лист",
    type: "checklist",
    placeholder: "Чек-лист",
    visible: true,
    enabled: true,
    iconKey: "checklist",
  },
  {
    id: "relatedRows",
    title: "Связанные записи",
    label: "Связанные записи",
    type: "relatedRows",
    relationType: "children",
    visibleColumns: ["title", "date", "status", "user"],
    visible: true,
    enabled: true,
    iconKey: "relatedRows",
  },
  {
    id: "notes",
    title: "Заметки",
    label: "Заметки",
    type: "notes",
    placeholder: "Заметки",
    visible: true,
    enabled: true,
    iconKey: "notebook",
  },
];

export const DEFAULT_ENTITY_CARD_SIDEBAR = {
  enabled: true,
  type: "comments",
};

function getLockedDefaultType(defaultItem, savedItem) {
  if (defaultItem.id === "checklist") return "checklist";
  if (defaultItem.id === "relatedRows") return "relatedRows";
  if (defaultItem.id === "notes") return "notes";

  return savedItem?.type || defaultItem.type || "placeholder";
}

function getLockedDefaultIconKey(defaultItem, savedItem) {
  if (defaultItem.id === "checklist") return "checklist";
  if (defaultItem.id === "relatedRows") return "relatedRows";
  if (defaultItem.id === "notes") return "notebook";

  return savedItem?.iconKey || defaultItem.iconKey;
}

function normalizeArrayConfig({ savedItems, defaultItems }) {
  const sourceSavedItems = Array.isArray(savedItems)
    ? savedItems
    : [];

  const savedById = new Map(
    sourceSavedItems
      .filter((item) => item?.id)
      .map((item) => [item.id, item])
  );

  const mergedDefaultItems = defaultItems.map((defaultItem, index) => {
    const savedItem = savedById.get(defaultItem.id);

    if (!savedItem) {
      return {
        ...defaultItem,
        order:
          typeof defaultItem.order === "number"
            ? defaultItem.order
            : index,
        visible: defaultItem.visible !== false,
        enabled:
          defaultItem.enabled !== false &&
          defaultItem.visible !== false,
      };
    }

    return {
      ...defaultItem,
      ...savedItem,

      type: getLockedDefaultType(defaultItem, savedItem),

      iconKey: getLockedDefaultIconKey(defaultItem, savedItem),

      order:
        typeof savedItem.order === "number"
          ? savedItem.order
          : typeof defaultItem.order === "number"
            ? defaultItem.order
            : index,

      visible: savedItem.visible !== false,
      enabled:
        savedItem.enabled !== false &&
        savedItem.visible !== false,

      config: {
        ...(defaultItem.config || {}),
        ...(savedItem.config || {}),
      },
    };
  });

  const customItems = sourceSavedItems.filter((savedItem) => {
    if (!savedItem?.id) return false;

    return !defaultItems.some(
      (defaultItem) => defaultItem.id === savedItem.id
    );
  });

  return [...mergedDefaultItems, ...customItems].sort((a, b) => {
    const aOrder =
      typeof a?.order === "number" ? a.order : 0;

    const bOrder =
      typeof b?.order === "number" ? b.order : 0;

    return aOrder - bOrder;
  });
}

function normalizeSidebarConfig(savedSidebar) {
  if (!savedSidebar || typeof savedSidebar !== "object") {
    return DEFAULT_ENTITY_CARD_SIDEBAR;
  }

  return {
    ...DEFAULT_ENTITY_CARD_SIDEBAR,
    ...savedSidebar,
    enabled: savedSidebar.enabled !== false,
  };
}

export function getEntityCardConfig(table) {
  const rowCard =
    table?.settings?.rowCard ||
    table?.settings?.card ||
    {};

  return {
    sections: normalizeArrayConfig({
      savedItems: rowCard.sections,
      defaultItems: DEFAULT_ENTITY_CARD_SECTIONS,
    }),

    tabs: normalizeArrayConfig({
      savedItems: rowCard.tabs,
      defaultItems: DEFAULT_ENTITY_CARD_TABS,
    }),

    sidebar: normalizeSidebarConfig(rowCard.sidebar),

    fieldVisibility: {
      ...(rowCard.fieldVisibility || {}),
      hiddenFieldIds: Array.isArray(
        rowCard.fieldVisibility?.hiddenFieldIds
      )
        ? rowCard.fieldVisibility.hiddenFieldIds
        : [],
    },
  };
}