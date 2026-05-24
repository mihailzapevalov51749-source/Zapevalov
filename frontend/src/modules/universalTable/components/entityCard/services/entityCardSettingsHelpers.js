export const DEFAULT_SECTIONS = [
  {
    id: "parent",
    type: "parentRow",
    label: "Родительская запись",
  },

  {
    id: "main",
    type: "mainFields",
    label: "Основной блок",
  },

  {
    id: "fields",
    type: "fieldsGrid",
    label: "Поля",
  },

  {
    id: "tabs",
    type: "tabs",
    label: "Вкладки",
  },

  {
    id: "attachments",
    type: "attachments",
    label: "Вложения",
  },
];

export const DEFAULT_TABS = [
  {
    id: "checklist",
    label: "Чек-лист",
  },

  {
    id: "relatedRows",
    label: "Связанные записи",
  },

  {
    id: "notes",
    label: "Заметки",
  },
];

export const EXCLUDED_FIELDS_SECTION_TITLES = [
  "№",
  "id",

  "название задачи",
  "название",
  "задача",
  "наименование",

  "описание",
  "описание задачи",
  "комментарий",

  "вложения",
];

export const EXCLUDED_FIELDS_SECTION_TYPES = [
  "file",
  "files",
  "attachment",
  "attachments",
];

export const getColumnId = (column) =>
  String(
    column?.id ??
      column?.key ??
      ""
  ).trim();

export const getColumnTitle = (
  column
) =>
  String(
    column?.title || ""
  ).trim();

export const getColumnType = (
  column
) =>
  String(
    column?.type || ""
  )
    .trim()
    .toLowerCase();

export const normalizeIds = (
  value
) => {
  if (!Array.isArray(value))
    return [];

  return value
    .map((id) =>
      String(id || "").trim()
    )
    .filter(Boolean);
};

export const normalizeSectionId = (
  id
) => {
  if (id === "customFields")
    return "fields";

  return id;
};

export const getDefaultSection = (
  sectionId
) => {
  return (
    DEFAULT_SECTIONS.find(
      (section) =>
        section.id === sectionId
    ) || null
  );
};

export const getSectionLabel = (
  sectionId
) => {
  return (
    getDefaultSection(sectionId)
      ?.label || sectionId
  );
};

export const getSectionType = (
  section
) => {
  const id =
    normalizeSectionId(
      section?.id
    );

  const defaultSection =
    getDefaultSection(id);

  return (
    defaultSection?.type ||
    section?.type ||
    "fieldsGrid"
  );
};

export const isSectionEnabled = (
  section
) => {
  return (
    section?.enabled !== false &&
    section?.visible !== false
  );
};

export const normalizeSections = (
  sections = []
) => {
  const source = Array.isArray(
    sections
  )
    ? sections
    : [];

  const byId = new Map();

  source.forEach(
    (section, index) => {
      const originalId = String(
        section?.id || ""
      );

      const id =
        normalizeSectionId(
          originalId
        );

      if (!id) return;
      if (id === "comments")
        return;

      const existing =
        byId.get(id);

      if (
        originalId ===
          "customFields" &&
        existing
      ) {
        return;
      }

      const defaultSection =
        getDefaultSection(id);

      const normalizedSection = {
        ...(section || {}),

        id,

        type: getSectionType({
          ...(section || {}),
          id,
        }),

        order:
          typeof section?.order ===
          "number"
            ? section.order
            : typeof defaultSection?.order ===
                "number"
              ? defaultSection.order
              : index,

        visible:
          section?.visible !==
          false,

        enabled:
          section?.enabled !==
            false &&
          section?.visible !==
            false,

        config: {
          ...(section?.config ||
            {}),
        },
      };

      if (
        existing &&
        id === "fields"
      ) {
        byId.set(id, {
          ...normalizedSection,

          visible:
            isSectionEnabled(
              existing
            )
              ? existing.visible
              : normalizedSection.visible,

          enabled:
            isSectionEnabled(
              existing
            )
              ? existing.enabled
              : normalizedSection.enabled,

          order:
            typeof existing.order ===
            "number"
              ? existing.order
              : normalizedSection.order,

          fieldIds:
            normalizeIds(
              existing.fieldIds
            ).length > 0
              ? existing.fieldIds
              : normalizedSection.fieldIds,

          config: {
            ...(normalizedSection.config ||
              {}),

            ...(existing.config ||
              {}),

            fieldIds:
              normalizeIds(
                existing.config
                  ?.fieldIds
              ).length > 0
                ? existing.config
                    .fieldIds
                : normalizedSection
                    .config
                    ?.fieldIds,
          },
        });

        return;
      }

      byId.set(
        id,
        normalizedSection
      );
    }
  );

  DEFAULT_SECTIONS.forEach(
    (section, index) => {
      if (
        byId.has(section.id)
      )
        return;

      byId.set(section.id, {
        id: section.id,
        type: section.type,
        order: index,
        visible: true,
        enabled: true,
        config: {},
      });
    }
  );

  return Array.from(
    byId.values()
  )
    .filter((section) =>
      getDefaultSection(
        section.id
      )
    )
    .sort((a, b) => {
      const aOrder =
        typeof a?.order ===
        "number"
          ? a.order
          : 0;

      const bOrder =
        typeof b?.order ===
        "number"
          ? b.order
          : 0;

      return aOrder - bOrder;
    });
};

export const ensureAllDefaultSections =
  (sections) => {
    const normalizedSections =
      normalizeSections(
        sections
      );

    const existingIds =
      normalizedSections.map(
        (section) =>
          section.id
      );

    const missingSections =
      DEFAULT_SECTIONS.filter(
        (section) =>
          !existingIds.includes(
            section.id
          )
      ).map(
        (section, index) => ({
          id: section.id,
          type: section.type,

          order:
            normalizedSections.length +
            index,

          visible: true,
          enabled: true,
          config: {},
        })
      );

    return [
      ...normalizedSections,
      ...missingSections,
    ].sort((a, b) => {
      const aOrder =
        typeof a?.order ===
        "number"
          ? a.order
          : 0;

      const bOrder =
        typeof b?.order ===
        "number"
          ? b.order
          : 0;

      return aOrder - bOrder;
    });
  };

export const isFieldsSectionColumn =
  (column) => {
    const columnId =
      getColumnId(column);

    const title =
      getColumnTitle(
        column
      ).toLowerCase();

    const type =
      getColumnType(column);

    if (!columnId)
      return false;

    if (
      EXCLUDED_FIELDS_SECTION_TITLES.includes(
        title
      )
    ) {
      return false;
    }

    if (
      EXCLUDED_FIELDS_SECTION_TYPES.includes(
        type
      )
    ) {
      return false;
    }

    return true;
  };

export const getFieldsSectionColumns =
  (columns = []) => {
    return columns.filter(
      isFieldsSectionColumn
    );
  };

export const getFieldsSectionColumnIds =
  (columns = []) => {
    return getFieldsSectionColumns(
      columns
    )
      .map(getColumnId)
      .filter(Boolean);
  };

export const getInitialHiddenFieldIds =
  (config) => {
    return normalizeIds(
      config?.fieldVisibility
        ?.hiddenFieldIds ||
        config?.hiddenFieldIds ||
        []
    );
  };

export const getSectionFieldIds = (
  sections,
  sectionId
) => {
  const normalizedSectionId =
    normalizeSectionId(
      sectionId
    );

  const section =
    sections.find(
      (item) =>
        normalizeSectionId(
          item.id
        ) ===
        normalizedSectionId
    );

  return normalizeIds(
    section?.fieldIds ||
      section?.config
        ?.fieldIds ||
      section?.config
        ?.fields ||
      []
  );
};

export const updateSectionFieldIds =
  (
    sections,
    sectionId,
    fieldIds
  ) => {
    const normalizedSectionId =
      normalizeSectionId(
        sectionId
      );

    return sections.map(
      (section) => {
        if (
          normalizeSectionId(
            section.id
          ) !==
          normalizedSectionId
        ) {
          return section;
        }

        return {
          ...section,

          fieldIds,

          config: {
            ...(section.config ||
              {}),

            fieldIds,
          },
        };
      }
    );
  };