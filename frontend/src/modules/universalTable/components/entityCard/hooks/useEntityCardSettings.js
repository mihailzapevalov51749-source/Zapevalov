import { useEffect, useMemo, useState } from "react";

import {
  DEFAULT_TABS,
  ensureAllDefaultSections,
  getColumnId,
  getFieldsSectionColumns,
  getFieldsSectionColumnIds,
  getInitialHiddenFieldIds,
  getSectionFieldIds,
  updateSectionFieldIds,
  isSectionEnabled,
} from "../services/entityCardSettingsHelpers";

const REQUIRED_SECTION_IDS = [
  "parent",
  "main",
  "fields",
  "tabs",
  "attachments",
];

const DEFAULT_COLLAPSED_GROUPS = {
  structure: false,
  sidebar: false,
  tabs: false,
  fields: false,
};

function ensureRequiredSections(sections) {
  const normalized = ensureAllDefaultSections(sections);

  const byId = new Map(
    normalized
      .filter((section) => section?.id)
      .map((section) => [section.id, section])
  );

  const existingOrdered = normalized.filter((section) =>
    REQUIRED_SECTION_IDS.includes(section.id)
  );

  const missingSections = REQUIRED_SECTION_IDS.filter(
    (id) => !byId.has(id)
  ).map((id, index) => ({
    id,
    visible: true,
    enabled: true,
    order: existingOrdered.length + index,
    config: {},
  }));

  return [...existingOrdered, ...missingSections].map(
    (section, index) => ({
      ...section,
      order: index,
    })
  );
}

function getDefaultSections() {
  return REQUIRED_SECTION_IDS.map((id, index) => ({
    id,
    visible: true,
    enabled: true,
    order: index,
    config: {},
  }));
}

function normalizeTabs(tabs) {
  const currentTabs = Array.isArray(tabs) ? tabs : [];
  const currentIds = currentTabs.map((tab) =>
    String(tab?.id || "")
  );

  const missingTabs = DEFAULT_TABS.filter(
    (tab) => !currentIds.includes(tab.id)
  ).map((tab, index) => ({
    ...tab,
    visible: true,
    enabled: true,
    order: currentTabs.length + index,
  }));

  return [...currentTabs, ...missingTabs].map((tab, index) => ({
    ...tab,
    order:
      typeof tab?.order === "number"
        ? tab.order
        : index,
  }));
}

function getDefaultTabs() {
  return DEFAULT_TABS.map((tab, index) => ({
    ...tab,
    visible: true,
    enabled: true,
    order: index,
  }));
}

function reorderArray({ items, sourceId, targetId, getId }) {
  const sourceIndex = items.findIndex(
    (item) => getId(item) === sourceId
  );

  const targetIndex = items.findIndex(
    (item) => getId(item) === targetId
  );

  if (
    sourceIndex < 0 ||
    targetIndex < 0 ||
    sourceIndex === targetIndex
  ) {
    return items;
  }

  const next = [...items];
  const [moved] = next.splice(sourceIndex, 1);

  next.splice(targetIndex, 0, moved);

  return next;
}

export default function useEntityCardSettings({
  config,
  columns = [],
  onSave,
}) {
  const fieldsSectionColumns = useMemo(
    () => getFieldsSectionColumns(columns),
    [columns]
  );

  const fieldsSectionColumnIds = useMemo(
    () => getFieldsSectionColumnIds(columns),
    [columns]
  );

  const [draftSections, setDraftSections] = useState(() =>
    ensureRequiredSections(config.sections || [])
  );

  const [draftTabs, setDraftTabs] = useState(() =>
    normalizeTabs(config.tabs)
  );

  const [isSidebarEnabled, setIsSidebarEnabled] =
    useState(config.sidebar?.enabled !== false);

  const [hiddenFieldIds, setHiddenFieldIds] = useState(() =>
    getInitialHiddenFieldIds(config)
  );

  const [collapsedGroups, setCollapsedGroups] = useState(
    DEFAULT_COLLAPSED_GROUPS
  );

  const [draggedSectionId, setDraggedSectionId] = useState(null);
  const [draggedTabId, setDraggedTabId] = useState(null);
  const [draggedFieldId, setDraggedFieldId] = useState(null);

  const [dragOverSectionId, setDragOverSectionId] = useState(null);
  const [dragOverTabId, setDragOverTabId] = useState(null);
  const [dragOverFieldId, setDragOverFieldId] = useState(null);

  useEffect(() => {
    setDraftSections(
      ensureRequiredSections(config.sections || [])
    );
  }, [config.sections]);

  useEffect(() => {
    setDraftTabs(normalizeTabs(config.tabs));
  }, [config.tabs]);

  useEffect(() => {
    setIsSidebarEnabled(config.sidebar?.enabled !== false);
  }, [config.sidebar]);

  useEffect(() => {
    setHiddenFieldIds(getInitialHiddenFieldIds(config));
  }, [config]);

  const orderedSections = useMemo(() => {
    return ensureRequiredSections(draftSections);
  }, [draftSections]);

  const orderedTabs = useMemo(() => {
    return [...draftTabs].sort((a, b) => {
      const aOrder =
        typeof a?.order === "number" ? a.order : 0;
      const bOrder =
        typeof b?.order === "number" ? b.order : 0;

      return aOrder - bOrder;
    });
  }, [draftTabs]);

  const normalizedHiddenFieldIds = useMemo(() => {
    const explicitFieldsIds = getSectionFieldIds(
      orderedSections,
      "fields"
    );

    if (explicitFieldsIds.length) {
      return [];
    }

    return hiddenFieldIds.filter((id) =>
      fieldsSectionColumnIds.includes(id)
    );
  }, [
    hiddenFieldIds,
    orderedSections,
    fieldsSectionColumnIds,
  ]);

  const selectedFieldsIds = useMemo(() => {
    const explicitFieldsIds = getSectionFieldIds(
      orderedSections,
      "fields"
    );

    if (explicitFieldsIds.length) {
      return explicitFieldsIds.filter((id) =>
        fieldsSectionColumnIds.includes(id)
      );
    }

    return fieldsSectionColumnIds.filter(
      (id) => !normalizedHiddenFieldIds.includes(id)
    );
  }, [
    orderedSections,
    fieldsSectionColumnIds,
    normalizedHiddenFieldIds,
  ]);

  const visibleFieldRows = useMemo(() => {
    const byId = new Map(
      fieldsSectionColumns.map((column) => [
        getColumnId(column),
        column,
      ])
    );

    const orderedIds =
      selectedFieldsIds.length > 0
        ? selectedFieldsIds
        : fieldsSectionColumnIds;

    const orderedColumns = orderedIds
      .map((id) => byId.get(id))
      .filter(Boolean);

    const restColumns = fieldsSectionColumns.filter(
      (column) => {
        const id = getColumnId(column);
        return id && !orderedIds.includes(id);
      }
    );

    return [...orderedColumns, ...restColumns];
  }, [
    fieldsSectionColumns,
    fieldsSectionColumnIds,
    selectedFieldsIds,
  ]);

  const clearDragState = () => {
    setDraggedSectionId(null);
    setDraggedTabId(null);
    setDraggedFieldId(null);

    setDragOverSectionId(null);
    setDragOverTabId(null);
    setDragOverFieldId(null);
  };

  const toggleGroup = (groupKey) => {
    setCollapsedGroups((prev) => ({
      ...prev,
      [groupKey]: !prev?.[groupKey],
    }));
  };

  const handleResetDefaults = () => {
    setDraftSections(getDefaultSections());
    setDraftTabs(getDefaultTabs());
    setIsSidebarEnabled(true);
    setHiddenFieldIds([]);
    setCollapsedGroups(DEFAULT_COLLAPSED_GROUPS);
    clearDragState();
  };

  const handleStartDragSection = (sectionId) => {
    setDraggedSectionId(sectionId);
    setDraggedTabId(null);
    setDraggedFieldId(null);
  };

  const handleDragOverSection = (event, targetSectionId) => {
    event.preventDefault();
    setDragOverSectionId(targetSectionId);
  };

  const handleDropSection = (targetSectionId) => {
    if (!draggedSectionId || draggedSectionId === targetSectionId) {
      clearDragState();
      return;
    }

    setDraftSections((prev) => {
      const ordered = ensureRequiredSections(prev);

      const reordered = reorderArray({
        items: ordered,
        sourceId: draggedSectionId,
        targetId: targetSectionId,
        getId: (section) => section.id,
      });

      return reordered.map((section, index) => ({
        ...section,
        order: index,
      }));
    });

    clearDragState();
  };

  const handleStartDragTab = (tabId) => {
    setDraggedTabId(tabId);
    setDraggedSectionId(null);
    setDraggedFieldId(null);
  };

  const handleDragOverTab = (event, targetTabId) => {
    event.preventDefault();
    setDragOverTabId(targetTabId);
  };

  const handleDropTab = (targetTabId) => {
    if (!draggedTabId || draggedTabId === targetTabId) {
      clearDragState();
      return;
    }

    setDraftTabs((prev) => {
      const reordered = reorderArray({
        items: [...prev],
        sourceId: draggedTabId,
        targetId: targetTabId,
        getId: (tab) => tab.id,
      });

      return reordered.map((tab, index) => ({
        ...tab,
        order: index,
      }));
    });

    clearDragState();
  };

  const handleStartDragField = (columnId) => {
    setDraggedFieldId(columnId);
    setDraggedSectionId(null);
    setDraggedTabId(null);
  };

  const handleDragOverField = (event, targetColumnId) => {
    event.preventDefault();
    setDragOverFieldId(targetColumnId);
  };

  const handleDropField = (targetColumnId) => {
    if (!draggedFieldId || draggedFieldId === targetColumnId) {
      clearDragState();
      return;
    }

    setDraftSections((prev) => {
      const currentFieldIds = getSectionFieldIds(
        prev,
        "fields"
      );

      const baseFieldIds = currentFieldIds.length
        ? currentFieldIds.filter((id) =>
            fieldsSectionColumnIds.includes(id)
          )
        : fieldsSectionColumnIds;

      const reordered = reorderArray({
        items: baseFieldIds,
        sourceId: draggedFieldId,
        targetId: targetColumnId,
        getId: (id) => id,
      });

      return updateSectionFieldIds(
        prev,
        "fields",
        reordered
      );
    });

    clearDragState();
  };

  const handleDragLeave = () => {
    setDragOverSectionId(null);
    setDragOverTabId(null);
    setDragOverFieldId(null);
  };

  const toggleSection = (sectionId) => {
    setDraftSections((prev) =>
      ensureRequiredSections(prev).map((section) => {
        if (section.id !== sectionId) {
          return section;
        }

        const nextEnabled = !isSectionEnabled(section);

        return {
          ...section,
          visible: nextEnabled,
          enabled: nextEnabled,
        };
      })
    );
  };

  const toggleTab = (tabId) => {
    setDraftTabs((prev) =>
      prev.map((tab) => {
        if (tab.id !== tabId) {
          return tab;
        }

        const nextEnabled =
          !(tab.enabled !== false &&
            tab.visible !== false);

        return {
          ...tab,
          visible: nextEnabled,
          enabled: nextEnabled,
        };
      })
    );
  };

  const toggleField = (columnId) => {
    const normalizedColumnId = String(
      columnId || ""
    ).trim();

    if (!normalizedColumnId) {
      return;
    }

    setDraftSections((prev) => {
      const currentFieldIds = getSectionFieldIds(
        prev,
        "fields"
      );

      const baseFieldIds = currentFieldIds.length
        ? currentFieldIds.filter((id) =>
            fieldsSectionColumnIds.includes(id)
          )
        : fieldsSectionColumnIds;

      const nextFieldIds = baseFieldIds.includes(
        normalizedColumnId
      )
        ? baseFieldIds.filter(
            (id) => id !== normalizedColumnId
          )
        : [...baseFieldIds, normalizedColumnId];

      return updateSectionFieldIds(
        ensureRequiredSections(prev),
        "fields",
        nextFieldIds
      );
    });

    setHiddenFieldIds((prev) => {
      const current = Array.isArray(prev) ? prev : [];

      if (current.includes(normalizedColumnId)) {
        return current.filter(
          (id) => id !== normalizedColumnId
        );
      }

      return [...current, normalizedColumnId];
    });
  };

  const isTabEnabled = (tabId) => {
    return orderedTabs.some(
      (tab) =>
        tab.id === tabId &&
        tab.visible !== false &&
        tab.enabled !== false
    );
  };

  const isFieldEnabled = (column) => {
    const columnId = getColumnId(column);

    if (!columnId) {
      return false;
    }

    return selectedFieldsIds.includes(columnId);
  };

  const handleSave = () => {
    const cleanedSections = updateSectionFieldIds(
      orderedSections,
      "fields",
      selectedFieldsIds
    ).map((section, index) => ({
      ...section,
      order: index,
      visible: section.visible !== false,
      enabled:
        section.enabled !== false &&
        section.visible !== false,
    }));

    const nextConfig = {
      ...config,

      sections: cleanedSections,

      tabs: orderedTabs,

      sidebar: {
        ...(config.sidebar || {}),
        enabled: isSidebarEnabled,
      },

      fieldVisibility: {
        ...(config.fieldVisibility || {}),
        hiddenFieldIds: normalizedHiddenFieldIds,
      },
    };

    onSave?.(nextConfig);
  };

  return {
    orderedSections,
    draftTabs: orderedTabs,
    isSidebarEnabled,
    selectedFieldsIds,
    visibleFieldRows,

    collapsedGroups,

    dragOverSectionId,
    dragOverTabId,
    dragOverFieldId,

    setIsSidebarEnabled,

    toggleGroup,
    toggleSection,
    toggleTab,
    toggleField,

    isTabEnabled,
    isFieldEnabled,

    handleSave,
    handleResetDefaults,

    handleStartDragSection,
    handleDragOverSection,
    handleDropSection,

    handleStartDragTab,
    handleDragOverTab,
    handleDropTab,

    handleStartDragField,
    handleDragOverField,
    handleDropField,

    handleDragLeave,
  };
}