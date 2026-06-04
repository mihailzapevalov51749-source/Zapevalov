import { useCallback, useEffect, useMemo, useState } from "react";

import {
  buildDefaultObjectEntityCardUtLayout,
  getInnerTabLabel,
  getUtSectionLabel,
  normalizeObjectEntityCardUtLayout,
  resolveAllTabsForSettings,
  validateObjectEntityCardLayout,
} from "../services/objectEntityCardSectionsLayout";

function reorderItems(items, sourceId, direction) {
  const list = [...items];
  const index = list.findIndex((item) => item.id === sourceId);

  if (index < 0) {
    return list;
  }

  const targetIndex = direction === "up" ? index - 1 : index + 1;

  if (targetIndex < 0 || targetIndex >= list.length) {
    return list;
  }

  const next = [...list];
  const temp = next[index];
  next[index] = next[targetIndex];
  next[targetIndex] = temp;

  return next.map((item, order) => ({ ...item, order }));
}

function isFieldVisible(fieldKey, layout) {
  return !(layout.hiddenFieldKeys || []).includes(fieldKey);
}

/** Canonical visibility: `visible === false` means hidden; omitted/true means shown. */
function toggleVisibleFlag(currentVisible) {
  return currentVisible !== false ? false : true;
}

export default function useObjectEntityCardSettings({
  editableFields = [],
  titleFieldKey = null,
  initialLayout = null,
  onSave,
}) {
  const baselineLayout = useMemo(
    () =>
      normalizeObjectEntityCardUtLayout(
        initialLayout,
        editableFields,
        titleFieldKey,
      ),
    [initialLayout, editableFields, titleFieldKey],
  );

  const [draftLayout, setDraftLayout] = useState(baselineLayout);

  useEffect(() => {
    setDraftLayout(baselineLayout);
  }, [baselineLayout]);

  const fieldRows = useMemo(() => {
    return editableFields.map((field) => ({
      key: field.key,
      label: field.label || field.key,
      visible: isFieldVisible(field.key, draftLayout),
    }));
  }, [editableFields, draftLayout]);

  const sectionRows = useMemo(() => {
    return draftLayout.sections.map((section) => ({
      ...section,
      label: getUtSectionLabel(section),
      canHide: section.id !== "main" && section.id !== "fields",
    }));
  }, [draftLayout.sections]);

  const tabRows = useMemo(() => {
    return resolveAllTabsForSettings(draftLayout).map((tab) => ({
      ...tab,
      label: getInnerTabLabel(tab.id),
      canHide: true,
    }));
  }, [draftLayout]);

  const toggleSectionVisibility = useCallback((sectionId) => {
    if (sectionId === "main" || sectionId === "fields") {
      return;
    }

    setDraftLayout((current) => ({
      ...current,
      sections: current.sections.map((section) =>
        section.id === sectionId
          ? { ...section, visible: toggleVisibleFlag(section.visible) }
          : section,
      ),
    }));
  }, []);

  const toggleTabVisibility = useCallback((tabId) => {
    setDraftLayout((current) => {
      const nextTabs = resolveAllTabsForSettings(current).map((tab) =>
        tab.id === tabId
          ? { ...tab, visible: toggleVisibleFlag(tab.visible) }
          : tab,
      );

      const visibleTabIds = nextTabs
        .filter((tab) => tab.visible !== false)
        .map((tab) => tab.id);

      return {
        ...current,
        tabs: nextTabs,
        sections: current.sections.map((section) => {
          if (section.id !== "tabs") {
            return section;
          }

          const sectionExplicitlyHidden = section.visible === false;

          return {
            ...section,
            tabIds: visibleTabIds,
            visible: sectionExplicitlyHidden ? false : visibleTabIds.length > 0,
          };
        }),
      };
    });
  }, []);

  const toggleFieldVisibility = useCallback(
    (fieldKey) => {
      const normalized = String(fieldKey || "").trim();

      if (!normalized) {
        return;
      }

      setDraftLayout((current) => {
        const hidden = new Set(current.hiddenFieldKeys || []);

        if (hidden.has(normalized)) {
          hidden.delete(normalized);
        } else {
          const visibleFieldCount = editableFields.filter(
            (field) => !hidden.has(field.key) && field.key !== normalized,
          ).length;

          if (visibleFieldCount <= 0) {
            return current;
          }

          hidden.add(normalized);
        }

        const hiddenFieldKeys = [...hidden];

        return {
          ...current,
          hiddenFieldKeys,
          sections: current.sections.map((section) => {
            if (section.type !== "fieldsGrid") {
              return section;
            }

            return {
              ...section,
              fieldKeys: (section.fieldKeys || []).filter(
                (key) => !hiddenFieldKeys.includes(key),
              ),
            };
          }),
        };
      });
    },
    [editableFields],
  );

  const moveSection = useCallback((sectionId, direction) => {
    setDraftLayout((current) => ({
      ...current,
      sections: reorderItems(current.sections, sectionId, direction),
    }));
  }, []);

  const moveTab = useCallback((tabId, direction) => {
    setDraftLayout((current) => ({
      ...current,
      tabs: reorderItems(resolveAllTabsForSettings(current), tabId, direction),
    }));
  }, []);

  const handleReset = useCallback(() => {
    setDraftLayout(
      buildDefaultObjectEntityCardUtLayout(editableFields, titleFieldKey),
    );
  }, [editableFields, titleFieldKey]);

  const handleSave = useCallback(async () => {
    const normalized = normalizeObjectEntityCardUtLayout(
      draftLayout,
      editableFields,
      titleFieldKey,
    );

    const validationErrors = validateObjectEntityCardLayout(normalized);

    if (validationErrors.length > 0) {
      console.warn(
        "[ObjectEntityCardSettings] Invalid layout blocked:",
        validationErrors,
      );
      return false;
    }

    const saved = await onSave?.(normalized);
    return saved !== false;
  }, [draftLayout, editableFields, titleFieldKey, onSave]);

  return {
    draftLayout,
    fieldRows,
    sectionRows,
    tabRows,
    toggleSectionVisibility,
    toggleTabVisibility,
    toggleFieldVisibility,
    moveSection,
    moveTab,
    handleReset,
    handleSave,
  };
}
