import { isFileFieldType } from "../../../shared/files/attachments/utils/attachmentFileTypes";
import { findDescriptionField } from "./runtimeEntityCardAdapter";

export const OBJECT_ENTITY_SECTION_TYPES = {
  parentRow: "parentRow",
  subtasksRow: "subtasksRow",
  mainFields: "mainFields",
  fieldsGrid: "fieldsGrid",
  attachments: "attachments",
  tabs: "tabs",
  comments: "comments",
};

export const OBJECT_ENTITY_INNER_TAB_IDS = ["checklist", "notes", "relations"];

export const REQUIRED_CARD_SECTION_IDS = ["main", "fields"];

const SECTION_TYPE_BY_ID = {
  parent: OBJECT_ENTITY_SECTION_TYPES.parentRow,
  subtasks: OBJECT_ENTITY_SECTION_TYPES.subtasksRow,
  main: OBJECT_ENTITY_SECTION_TYPES.mainFields,
  fields: OBJECT_ENTITY_SECTION_TYPES.fieldsGrid,
  tabs: OBJECT_ENTITY_SECTION_TYPES.tabs,
  attachments: OBJECT_ENTITY_SECTION_TYPES.attachments,
  comments: OBJECT_ENTITY_SECTION_TYPES.comments,
};

const INNER_TAB_LABELS = {
  checklist: "Чек-лист",
  notes: "Заметки",
  relations: "Связанные записи",
};

/** Эталонный порядок секций UT Card: Parent → Main → Fields → Tabs → Attachments → Comments */
const CANONICAL_SECTION_ORDER = {
  parent: 0,
  main: 1,
  fields: 2,
  tabs: 3,
  attachments: 4,
  comments: 5,
};

function enforceCanonicalSectionOrder(sections) {
  return sections.map((section) => {
    const canonicalOrder = CANONICAL_SECTION_ORDER[section?.id];

    return {
      ...section,
      order:
        typeof canonicalOrder === "number"
          ? canonicalOrder
          : typeof section?.order === "number"
            ? section.order
            : 99,
    };
  });
}

const SECTION_LABELS = {
  parent: "Родитель",
  subtasks: "Подзадачи",
  main: "Основной блок",
  fields: "Поля",
  attachments: "Вложения",
  tabs: "Блок вкладок",
  comments: "Комментарии",
};

function sortByOrder(items) {
  return [...items].sort((a, b) => {
    const aOrder = typeof a?.order === "number" ? a.order : 0;
    const bOrder = typeof b?.order === "number" ? b.order : 0;
    return aOrder - bOrder;
  });
}

const safeArray = (value) => (Array.isArray(value) ? value : []);

function uniqueKeys(keys) {
  const seen = new Set();

  return safeArray(keys)
    .map((key) => String(key || "").trim())
    .filter((key) => {
      if (!key || seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    });
}

function resolveSectionType(section) {
  const id = String(section?.id || "").trim();

  if (SECTION_TYPE_BY_ID[id]) {
    return SECTION_TYPE_BY_ID[id];
  }

  const explicitType = String(section?.type || "").trim();

  if (explicitType && Object.values(OBJECT_ENTITY_SECTION_TYPES).includes(explicitType)) {
    return explicitType;
  }

  return OBJECT_ENTITY_SECTION_TYPES.fieldsGrid;
}

function isLegacyPrimaryAdditionalSections(sections) {
  return sections.some(
    (section) =>
      section?.id === "primary" || section?.id === "additional",
  );
}

function collectLegacyFieldKeys(sections, editableFields, hiddenSet) {
  const keys = [];

  for (const section of sections) {
    const sectionKeys = uniqueKeys(section?.fieldKeys);

    keys.push(...sectionKeys);
  }

  if (!keys.length) {
    return editableFields
      .map((field) => field.key)
      .filter((key) => key && !hiddenSet.has(key));
  }

  return keys.filter((key) => !hiddenSet.has(key));
}

function buildDefaultUtSections(editableFields, titleFieldKey, hiddenSet) {
  const titleKey = String(titleFieldKey || "").trim();
  const descriptionField = findDescriptionField(editableFields, titleKey);
  const descriptionKey = descriptionField?.key
    ? String(descriptionField.key)
    : null;

  const mainFieldKeys = uniqueKeys(
    [titleKey, descriptionKey].filter(Boolean),
  );

  const gridFieldKeys = editableFields
    .filter((field) => {
      const key = String(field?.key || "").trim();
      const rawType = String(field?.rawFieldType || field?.type || "").toLowerCase();

      if (!key || hiddenSet.has(key) || mainFieldKeys.includes(key)) {
        return false;
      }

      return !isFileFieldType(rawType);
    })
    .map((field) => String(field.key));

  return [
    {
      id: "parent",
      type: OBJECT_ENTITY_SECTION_TYPES.parentRow,
      visible: true,
      order: 0,
      fieldKeys: [],
    },
    {
      id: "main",
      type: OBJECT_ENTITY_SECTION_TYPES.mainFields,
      visible: true,
      order: 1,
      fieldKeys: mainFieldKeys,
    },
    {
      id: "fields",
      type: OBJECT_ENTITY_SECTION_TYPES.fieldsGrid,
      visible: true,
      order: 2,
      fieldKeys: gridFieldKeys,
    },
    {
      id: "tabs",
      type: OBJECT_ENTITY_SECTION_TYPES.tabs,
      visible: true,
      order: 3,
      fieldKeys: [],
      tabIds: [...OBJECT_ENTITY_INNER_TAB_IDS],
    },
    {
      id: "attachments",
      type: OBJECT_ENTITY_SECTION_TYPES.attachments,
      visible: true,
      order: 4,
      fieldKeys: [],
    },
    {
      id: "comments",
      type: OBJECT_ENTITY_SECTION_TYPES.comments,
      visible: true,
      order: 6,
      fieldKeys: [],
    },
  ];
}

function buildDefaultTabsForSettings() {
  return OBJECT_ENTITY_INNER_TAB_IDS.map((id, index) => ({
    id,
    visible: true,
    order: index,
  }));
}

/**
 * All known tabs for settings UI — includes hidden tabs.
 */
export function resolveAllTabsForSettings(layout) {
  const savedTabs = Array.isArray(layout?.tabs) ? layout.tabs : [];
  const savedById = new Map(
    savedTabs
      .filter((tab) => tab?.id)
      .map((tab) => [String(tab.id), tab]),
  );

  return OBJECT_ENTITY_INNER_TAB_IDS.map((id, index) => {
    const saved = savedById.get(id);

    return {
      id,
      visible: saved?.visible !== false,
      order: typeof saved?.order === "number" ? saved.order : index,
    };
  });
}

/**
 * Visible inner tab ids for card render.
 */
export function resolveVisibleTabIdsForCard(layout) {
  return resolveAllTabsForSettings(layout)
    .filter((tab) => tab.visible !== false)
    .map((tab) => tab.id);
}

function mergeSavedSectionsWithDefaults(savedSections, defaults) {
  const savedById = new Map(
    savedSections
      .filter((section) => section?.id)
      .map((section) => [String(section.id), section]),
  );

  return defaults.map((defaultSection) => {
    const saved = savedById.get(defaultSection.id);

    if (!saved) {
      return normalizeSectionArrays(defaultSection);
    }

    const mergedType = resolveSectionType({
      ...defaultSection,
      ...saved,
      id: defaultSection.id,
    });

    const defaultFieldKeys = uniqueKeys(safeArray(defaultSection.fieldKeys));
    const savedFieldKeys = uniqueKeys(safeArray(saved.fieldKeys));
    const defaultTabIds = uniqueKeys(safeArray(defaultSection.tabIds));
    const savedTabIds = uniqueKeys(safeArray(saved.tabIds));

    return normalizeSectionArrays({
      ...defaultSection,
      ...saved,
      id: defaultSection.id,
      type: mergedType,
      visible: saved.visible !== false,
      order:
        typeof saved.order === "number" ? saved.order : defaultSection.order,
      fieldKeys: savedFieldKeys.length ? savedFieldKeys : defaultFieldKeys,
      tabIds: savedTabIds.length ? savedTabIds : defaultTabIds,
    });
  });
}

function normalizeSectionArrays(section) {
  return {
    ...section,
    fieldKeys: uniqueKeys(safeArray(section?.fieldKeys)),
    tabIds: uniqueKeys(safeArray(section?.tabIds)),
  };
}

function syncTabsSectionWithSettings(sections, tabsForSettings) {
  const visibleTabIds = tabsForSettings
    .filter((tab) => tab.visible !== false)
    .map((tab) => tab.id);

  return sections.map((section) => {
    if (section.type !== OBJECT_ENTITY_SECTION_TYPES.tabs) {
      return normalizeSectionArrays(section);
    }

    const sectionExplicitlyHidden = section.visible === false;

    return normalizeSectionArrays({
      ...section,
      tabIds: visibleTabIds,
      visible: sectionExplicitlyHidden ? false : visibleTabIds.length > 0,
    });
  });
}

function buildFieldsGridExclusionContext(
  editableFields,
  titleFieldKey,
  hiddenSet,
  catalogFileFieldKeys = [],
) {
  const titleKey = String(titleFieldKey || "").trim();
  const descriptionField = findDescriptionField(editableFields, titleKey);
  const descriptionKey = descriptionField?.key
    ? String(descriptionField.key)
    : null;
  const mainKeys = new Set(
    uniqueKeys([titleKey, descriptionKey].filter(Boolean)),
  );
  const fieldsByKey = new Map(
    editableFields.map((field) => [String(field?.key || "").trim(), field]),
  );
  const fileKeys = new Set(
    safeArray(catalogFileFieldKeys)
      .map((key) => String(key || "").trim())
      .filter(Boolean),
  );

  const shouldExcludeFromFieldsGrid = (key) => {
    const normalizedKey = String(key || "").trim();

    if (!normalizedKey || hiddenSet.has(normalizedKey) || mainKeys.has(normalizedKey)) {
      return true;
    }

    if (fileKeys.has(normalizedKey)) {
      return true;
    }

    const field = fieldsByKey.get(normalizedKey);

    if (!field) {
      return false;
    }

    const rawType = String(field?.rawFieldType || field?.type || "").toLowerCase();

    return isFileFieldType(rawType);
  };

  return { shouldExcludeFromFieldsGrid };
}

function repairMainSectionFieldKeys(sections, editableFields, titleFieldKey) {
  const titleKey = String(titleFieldKey || "").trim();

  if (!titleKey) {
    return sections;
  }

  const descriptionField = findDescriptionField(editableFields, titleKey);
  const descriptionKey = descriptionField?.key
    ? String(descriptionField.key)
    : null;
  const canonicalMainKeys = uniqueKeys(
    [titleKey, descriptionKey].filter(Boolean),
  );

  return sections.map((section) => {
    if (
      section.id !== "main" &&
      section.type !== OBJECT_ENTITY_SECTION_TYPES.mainFields
    ) {
      return section;
    }

    return normalizeSectionArrays({
      ...section,
      fieldKeys: canonicalMainKeys,
    });
  });
}

function repairFieldsGridFieldKeys(
  sections,
  editableFields,
  titleFieldKey,
  hiddenSet,
  catalogFileFieldKeys = [],
) {
  const defaults = buildDefaultUtSections(editableFields, titleFieldKey, hiddenSet);
  const defaultFieldsSection = defaults.find((section) => section.id === "fields");
  const { shouldExcludeFromFieldsGrid } = buildFieldsGridExclusionContext(
    editableFields,
    titleFieldKey,
    hiddenSet,
    catalogFileFieldKeys,
  );

  const canonicalGridKeys = safeArray(defaultFieldsSection?.fieldKeys).filter(
    (key) => !shouldExcludeFromFieldsGrid(key),
  );

  return sections.map((section) => {
    if (section.type !== OBJECT_ENTITY_SECTION_TYPES.fieldsGrid) {
      return section;
    }

    const savedOrder = uniqueKeys(safeArray(section.fieldKeys)).filter(
      (key) => !shouldExcludeFromFieldsGrid(key),
    );
    const mergedKeys = [...savedOrder];

    for (const key of canonicalGridKeys) {
      if (!mergedKeys.includes(key)) {
        mergedKeys.push(key);
      }
    }

    return normalizeSectionArrays({
      ...section,
      fieldKeys: mergedKeys.length > 0 ? mergedKeys : canonicalGridKeys,
    });
  });
}

export function validateObjectEntityCardLayout(layout) {
  const errors = [];

  if (!isValidObjectEntityCardLayout(layout)) {
    return ["layout is invalid"];
  }

  for (const requiredId of REQUIRED_CARD_SECTION_IDS) {
    const section = layout.sections.find((item) => item.id === requiredId);

    if (!section || section.visible === false) {
      errors.push(`required section "${requiredId}" must stay visible`);
    }
  }

  return errors;
}

export function isValidObjectEntityCardLayout(layout) {
  return (
    layout &&
    typeof layout === "object" &&
    Array.isArray(layout.sections) &&
    layout.sections.length > 0 &&
    Array.isArray(layout.tabs) &&
    Array.isArray(layout.hiddenFieldKeys)
  );
}

/**
 * Normalizes objectView.presentation.card to UT-like sections model.
 * Keeps hiddenFieldKeys; migrates legacy primary/additional + top tabs.
 */
export function normalizeObjectEntityCardUtLayout(
  savedLayout,
  editableFields = [],
  titleFieldKey = null,
  catalogFileFieldKeys = [],
) {
  const allowedFieldKeys = new Set(
    editableFields.map((field) => String(field.key || "").trim()).filter(Boolean),
  );
  const source =
    savedLayout && typeof savedLayout === "object" ? savedLayout : {};
  const hiddenFieldKeys = uniqueKeys(source.hiddenFieldKeys).filter((key) =>
    allowedFieldKeys.has(key),
  );
  const hiddenSet = new Set(hiddenFieldKeys);

  const savedSections = Array.isArray(source.sections) ? source.sections : [];
  const savedTabs = Array.isArray(source.tabs) ? source.tabs : [];

  const defaults = buildDefaultUtSections(
    editableFields,
    titleFieldKey,
    hiddenSet,
  );

  let sections;

  if (
    savedSections.length > 0 &&
    !isLegacyPrimaryAdditionalSections(savedSections)
  ) {
    const normalizedSaved = savedSections.map((section, index) => ({
      id: String(section?.id || `section_${index}`),
      type: resolveSectionType(section),
      visible: section?.visible !== false,
      order: typeof section?.order === "number" ? section.order : index,
      fieldKeys: uniqueKeys(safeArray(section?.fieldKeys)).filter(
        (key) => allowedFieldKeys.has(key) && !hiddenSet.has(key),
      ),
      tabIds: uniqueKeys(safeArray(section?.tabIds)),
    }));

    sections = mergeSavedSectionsWithDefaults(normalizedSaved, defaults);
  } else {
    const legacyKeys = collectLegacyFieldKeys(
      savedSections,
      editableFields,
      hiddenSet,
    );

    sections = defaults.map((section) => normalizeSectionArrays(section));

    if (legacyKeys.length && isLegacyPrimaryAdditionalSections(savedSections)) {
      sections.find((section) => section.id === "fields").fieldKeys =
        legacyKeys.filter((key) => {
          const titleKey = String(titleFieldKey || "").trim();
          const descriptionField = findDescriptionField(
            editableFields,
            titleKey,
          );
          const descriptionKey = descriptionField?.key
            ? String(descriptionField.key)
            : null;

          return key !== titleKey && key !== descriptionKey;
        });
    }
  }

  sections = repairMainSectionFieldKeys(sections, editableFields, titleFieldKey);

  sections = repairFieldsGridFieldKeys(
    sections,
    editableFields,
    titleFieldKey,
    hiddenSet,
    catalogFileFieldKeys,
  );

  const tabsForSettings =
    savedTabs.length > 0
      ? resolveAllTabsForSettings({ tabs: savedTabs })
      : buildDefaultTabsForSettings();

  sections = syncTabsSectionWithSettings(sections, tabsForSettings);

  for (const requiredId of REQUIRED_CARD_SECTION_IDS) {
    const section = sections.find((item) => item.id === requiredId);

    if (section) {
      section.visible = true;
    }
  }

  return {
    sections: sortByOrder(
      enforceCanonicalSectionOrder(sections).map(normalizeSectionArrays),
    ),
    hiddenFieldKeys,
    tabs: tabsForSettings,
  };
}

export function getInnerTabLabel(tabId) {
  return INNER_TAB_LABELS[tabId] || tabId;
}

export function getUtSectionLabel(section) {
  return (
    SECTION_LABELS[section?.id] ||
    section?.title ||
    section?.type ||
    section?.id
  );
}

export function buildDefaultObjectEntityCardUtLayout(
  editableFields = [],
  titleFieldKey = null,
) {
  return normalizeObjectEntityCardUtLayout(
    null,
    editableFields,
    titleFieldKey,
  );
}

export function resolveVisibleUtSections(layout) {
  return sortByOrder(layout?.sections || []).filter(
    (section) =>
      section.visible !== false &&
      section.type !== OBJECT_ENTITY_SECTION_TYPES.subtasksRow &&
      section.id !== "subtasks",
  );
}

/** Whether the comments sidebar should render for the normalized card layout. */
export function isCommentsSectionVisible(layout) {
  const section = (layout?.sections || []).find((item) => item?.id === "comments");

  if (!section) {
    return true;
  }

  return section.visible !== false;
}
