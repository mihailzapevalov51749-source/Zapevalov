import { useEffect, useMemo, useState } from "react";

const getRaw = (representation) => representation?.raw || representation;

const clearUniversalTableDirty = () => {
  window.__UNIVERSAL_TABLE_DIRTY__ = false;
};

const normalizeVisibleSlotsCount = (value) => {
  return Math.max(0, Math.min(6, Number(value) || 0));
};

const normalizeIds = (value) => {
  return Array.isArray(value) ? value.map(String).filter(Boolean) : [];
};

const normalizeArray = (value) => {
  return Array.isArray(value) ? value : [];
};

const normalizeRepresentation = (item, index) => ({
  id: String(item?.id ?? item?.key ?? index),

  name: item?.name || item?.title || item?.label || "Без названия",

  title: item?.title || item?.name || item?.label || "Без названия",
  label: item?.label || item?.name || item?.title || "Без названия",

  isVisible: item?.isVisible ?? item?.is_visible ?? true,

  isDefault: Boolean(
    item?.isDefault ?? item?.is_default ?? item?.default ?? false
  ),

  position: Number.isFinite(Number(item?.position))
    ? Number(item.position)
    : index,

  conditions: normalizeArray(item?.conditions),
  activeConditions: normalizeArray(item?.activeConditions),

  activeFilter: item?.activeFilter || item?.active_filter || "all",
  activeQuickFilterId:
    item?.activeQuickFilterId || item?.active_quick_filter_id || null,

  activeSort: item?.activeSort || item?.active_sort || "none",
  sortDirection: item?.sortDirection || item?.sort_direction || "asc",
  sortRules: normalizeArray(item?.sortRules),

  hiddenColumnIds: normalizeIds(item?.hiddenColumnIds || item?.hiddenColumns),
  visibleColumnIds: normalizeIds(item?.visibleColumnIds),
  columnOrder: normalizeIds(
    item?.columnOrder || item?.columnsOrder || item?.visibleColumnOrder
  ),

  raw: item,
});

const compactPinnedIds = ({
  pinnedIds = [],
  visibleIds = [],
  existingIds = new Set(),
  limit = 2,
}) => {
  if (limit <= 0) return [];

  const normalizedVisibleIds = visibleIds.map(String);

  const validPinnedIds = pinnedIds
    .map(String)
    .filter((id) => existingIds.has(id))
    .filter((id) => normalizedVisibleIds.includes(id));

  const missingIds = normalizedVisibleIds.filter(
    (id) => !validPinnedIds.includes(id)
  );

  return Array.from(new Set([...validPinnedIds, ...missingIds])).slice(
    0,
    limit
  );
};

export default function useTableRepresentationsBarState({
  representations = [],
  activeRepresentationId = null,
  isRepresentationDirty = false,
  isBaseStateDirty = false,

  onSelectRepresentation,
  onCreateRepresentation,
  onDeleteRepresentation,
  onToggleRepresentationVisibility,

  onRenameRepresentation,
  onSaveRepresentation,
  onSaveAsRepresentation,
  onDuplicateRepresentation,
  onSetDefaultRepresentation,

  visibleSlotsCount = 2,
}) {
  const safeVisibleSlotsCount = normalizeVisibleSlotsCount(visibleSlotsCount);

  const [isOverflowOpen, setIsOverflowOpen] = useState(false);
  const [isCreatePopoverOpen, setIsCreatePopoverOpen] = useState(false);
  const [pinnedIds, setPinnedIds] = useState([]);
  const [settingsRepresentationId, setSettingsRepresentationId] =
    useState(null);
  const [renameRepresentationId, setRenameRepresentationId] = useState(null);
  const [renameValue, setRenameValue] = useState("");
  const [pendingRepresentation, setPendingRepresentation] = useState(null);

  const hasUnsavedChanges = Boolean(isRepresentationDirty || isBaseStateDirty);

  const normalizedRepresentations = useMemo(() => {
    return Array.isArray(representations)
      ? representations
          .map((item, index) => normalizeRepresentation(item, index))
          .sort((a, b) => a.position - b.position)
      : [];
  }, [representations]);

  const visibleRepresentations = useMemo(() => {
    return normalizedRepresentations.filter((item) => item.isVisible !== false);
  }, [normalizedRepresentations]);

  const activeRepresentation = useMemo(() => {
    return (
      normalizedRepresentations.find(
        (item) => String(item.id) === String(activeRepresentationId)
      ) || null
    );
  }, [normalizedRepresentations, activeRepresentationId]);

  useEffect(() => {
    const existingIds = new Set(
      normalizedRepresentations.map((item) => String(item.id))
    );

    const visibleIds = visibleRepresentations.map((item) => String(item.id));

    setPinnedIds((prev) =>
      compactPinnedIds({
        pinnedIds: prev,
        visibleIds,
        existingIds,
        limit: safeVisibleSlotsCount,
      })
    );
  }, [
    normalizedRepresentations,
    visibleRepresentations,
    safeVisibleSlotsCount,
  ]);

  const pinnedRepresentations = useMemo(() => {
    if (safeVisibleSlotsCount <= 0) return [];

    return pinnedIds
      .slice(0, safeVisibleSlotsCount)
      .map((id) =>
        visibleRepresentations.find((item) => String(item.id) === String(id))
      )
      .filter(Boolean);
  }, [pinnedIds, visibleRepresentations, safeVisibleSlotsCount]);

  const overflowRepresentations = useMemo(() => {
    const pinnedSet = new Set(
      pinnedRepresentations.map((item) => String(item.id))
    );

    return normalizedRepresentations.filter(
      (item) => !pinnedSet.has(String(item.id))
    );
  }, [normalizedRepresentations, pinnedRepresentations]);

  useEffect(() => {
    if (!activeRepresentationId) return;

    const active = normalizedRepresentations.find(
      (item) => String(item.id) === String(activeRepresentationId)
    );

    if (!active || active.isVisible !== false) return;

    const nextVisible = visibleRepresentations.find(
      (item) => String(item.id) !== String(activeRepresentationId)
    );

    if (nextVisible) {
      onSelectRepresentation?.(getRaw(nextVisible));
    }
  }, [
    activeRepresentationId,
    normalizedRepresentations,
    visibleRepresentations,
    onSelectRepresentation,
  ]);

  const getPinnedSlotIndex = (representation) => {
    const index = pinnedIds.findIndex(
      (id) => String(id) === String(representation?.id)
    );

    return index >= 0 ? index : null;
  };

  const closeAllMenus = () => {
    setIsOverflowOpen(false);
    setIsCreatePopoverOpen(false);
    setSettingsRepresentationId(null);
    setRenameRepresentationId(null);
  };

  const closeOverflowMenus = () => {
    setIsOverflowOpen(false);
    setSettingsRepresentationId(null);
    setRenameRepresentationId(null);
  };

  const toggleOverflow = () => {
    setIsCreatePopoverOpen(false);
    setSettingsRepresentationId(null);
    setRenameRepresentationId(null);
    setIsOverflowOpen((prev) => !prev);
  };

  const selectRepresentation = (representation) => {
    if (representation?.isVisible === false) return;

    onSelectRepresentation?.(getRaw(representation));
    closeAllMenus();
  };

  const handleSelect = (representation) => {
    if (representation?.isVisible === false) return;

    const isSame = String(representation.id) === String(activeRepresentationId);

    if (!isSame && hasUnsavedChanges) {
      setPendingRepresentation(representation);
      return;
    }

    selectRepresentation(representation);
  };

  const saveActiveRepresentation = async () => {
    if (!activeRepresentation) return null;

    const rawActiveRepresentation = getRaw(activeRepresentation);

    await onSaveRepresentation?.(rawActiveRepresentation);

    clearUniversalTableDirty();

    return rawActiveRepresentation;
  };

  const handleConfirmSaveAndSwitch = async () => {
    await saveActiveRepresentation();

    if (pendingRepresentation) {
      selectRepresentation(pendingRepresentation);
    }

    setPendingRepresentation(null);
  };

  const handleConfirmSwitchWithoutSave = () => {
    clearUniversalTableDirty();

    if (pendingRepresentation) {
      selectRepresentation(pendingRepresentation);
    }

    setPendingRepresentation(null);
  };

  const handleCancelSwitch = () => {
    setPendingRepresentation(null);
  };

  const handleCreateButtonClick = (event) => {
    event?.preventDefault?.();
    event?.stopPropagation?.();

    setIsOverflowOpen(false);
    setSettingsRepresentationId(null);
    setRenameRepresentationId(null);
    setIsCreatePopoverOpen((prev) => !prev);
  };

  const handleCreateSave = async (payload) => {
    await onCreateRepresentation?.(payload);
    setIsCreatePopoverOpen(false);
  };

  const replacePinnedSlot = (representation, slotIndex) => {
    if (!representation || representation.isVisible === false) return;

    const representationId = String(representation.id);
    const normalizedSlotIndex = Number(slotIndex);

    if (
      !Number.isInteger(normalizedSlotIndex) ||
      normalizedSlotIndex < 0 ||
      normalizedSlotIndex >= safeVisibleSlotsCount
    ) {
      return;
    }

    setPinnedIds((prev) => {
      const visibleIds = visibleRepresentations.map((item) => String(item.id));
      const existingIds = new Set(
        normalizedRepresentations.map((item) => String(item.id))
      );

      const currentPinnedIds = compactPinnedIds({
        pinnedIds: prev,
        visibleIds,
        existingIds,
        limit: safeVisibleSlotsCount,
      });

      const next = [...currentPinnedIds];

      while (next.length < safeVisibleSlotsCount) {
        const missingId = visibleIds.find((id) => !next.includes(id));
        if (!missingId) break;
        next.push(missingId);
      }

      const currentIndex = next.findIndex((id) => id === representationId);
      const targetId = next[normalizedSlotIndex];

      if (currentIndex >= 0) {
        next[currentIndex] = targetId;
      }

      next[normalizedSlotIndex] = representationId;

      return Array.from(new Set(next.filter(Boolean))).slice(
        0,
        safeVisibleSlotsCount
      );
    });
  };

  const saveRenameByRepresentation = async (representation) => {
    const nextName = String(renameValue || "").trim();

    if (!representation || !nextName) {
      setRenameRepresentationId(null);
      setRenameValue("");
      return;
    }

    const currentName = String(representation.name || "").trim();

    if (nextName !== currentName) {
      await onRenameRepresentation?.(getRaw(representation), nextName);
    }

    setRenameRepresentationId(null);
    setRenameValue("");
  };

  const handleToggleSettings = (event, representation) => {
    event?.preventDefault?.();
    event?.stopPropagation?.();

    setIsCreatePopoverOpen(false);
    setRenameRepresentationId(null);
    setSettingsRepresentationId((prev) =>
      String(prev) === String(representation.id)
        ? null
        : String(representation.id)
    );
  };

  const handleStartRename = async (event, representation) => {
    event?.preventDefault?.();
    event?.stopPropagation?.();

    const representationId = String(representation?.id || "");

    if (
      renameRepresentationId &&
      String(renameRepresentationId) === representationId
    ) {
      await saveRenameByRepresentation(representation);
      return;
    }

    setRenameValue(representation.name || "");
    setRenameRepresentationId(representationId);
  };

  const handleSubmitRename = async (event, representation) => {
    event?.preventDefault?.();
    event?.stopPropagation?.();

    await saveRenameByRepresentation(representation);
  };

  const handleCancelRename = async (event) => {
    event?.preventDefault?.();
    event?.stopPropagation?.();

    const isEscape = event?.key === "Escape";

    if (isEscape) {
      setRenameRepresentationId(null);
      setRenameValue("");
      return;
    }

    const currentRepresentation = normalizedRepresentations.find(
      (item) => String(item.id) === String(renameRepresentationId)
    );

    if (currentRepresentation) {
      await saveRenameByRepresentation(currentRepresentation);
      return;
    }

    setRenameRepresentationId(null);
    setRenameValue("");
  };

  const handleToggleVisibility = async (event, representation) => {
    event?.preventDefault?.();
    event?.stopPropagation?.();

    const representationId = String(representation?.id || "");

    await onToggleRepresentationVisibility?.(getRaw(representation));

    if (representation?.isVisible) {
      setPinnedIds((prev) =>
        prev.filter((id) => String(id) !== representationId)
      );
    }

    if (!representation?.isVisible && safeVisibleSlotsCount > 0) {
      setPinnedIds((prev) => {
        if (prev.map(String).includes(representationId)) return prev;

        return [...prev.map(String), representationId].slice(
          0,
          safeVisibleSlotsCount
        );
      });
    }

    setSettingsRepresentationId(null);
  };

  const handleSave = async (event, representation) => {
    event?.preventDefault?.();
    event?.stopPropagation?.();

    const targetRepresentation = representation || activeRepresentation;

    if (!targetRepresentation) return null;

    const rawTargetRepresentation = getRaw(targetRepresentation);

    await onSaveRepresentation?.(rawTargetRepresentation);

    clearUniversalTableDirty();
    setSettingsRepresentationId(null);

    return rawTargetRepresentation;
  };

  const handleSaveAs = async (event, representation) => {
    event?.preventDefault?.();
    event?.stopPropagation?.();

    const targetRepresentation = representation || activeRepresentation;

    if (!targetRepresentation) return null;

    const rawTargetRepresentation = getRaw(targetRepresentation);

    await onSaveAsRepresentation?.(rawTargetRepresentation);

    clearUniversalTableDirty();
    setSettingsRepresentationId(null);

    return rawTargetRepresentation;
  };

  const handleDuplicate = async (event, representation) => {
    event?.preventDefault?.();
    event?.stopPropagation?.();

    await onDuplicateRepresentation?.(getRaw(representation));
    setSettingsRepresentationId(null);
  };

  const handleSetDefault = async (event, representation) => {
    event?.preventDefault?.();
    event?.stopPropagation?.();

    await onSetDefaultRepresentation?.(getRaw(representation));
    setSettingsRepresentationId(null);
  };

  const handleDelete = async (event, representation) => {
    event?.preventDefault?.();
    event?.stopPropagation?.();

    setPinnedIds((prev) =>
      prev.filter((id) => String(id) !== String(representation.id))
    );

    await onDeleteRepresentation?.(getRaw(representation));

    setSettingsRepresentationId(null);
    setRenameRepresentationId(null);
  };

  return {
    isOverflowOpen,
    setIsOverflowOpen,
    isCreatePopoverOpen,
    setIsCreatePopoverOpen,

    pinnedIds,
    setPinnedIds,

    settingsRepresentationId,
    setSettingsRepresentationId,

    renameRepresentationId,
    setRenameRepresentationId,
    renameValue,
    setRenameValue,

    pendingRepresentation,
    setPendingRepresentation,

    normalizedRepresentations,
    visibleRepresentations,
    activeRepresentation,
    pinnedRepresentations,
    overflowRepresentations,

    safeVisibleSlotsCount,

    getRaw,
    getPinnedSlotIndex,

    closeAllMenus,
    closeOverflowMenus,
    toggleOverflow,

    selectRepresentation,
    handleSelect,
    handleConfirmSaveAndSwitch,
    handleConfirmSwitchWithoutSave,
    handleCancelSwitch,

    handleCreateButtonClick,
    handleCreateSave,

    replacePinnedSlot,

    handleToggleSettings,
    handleStartRename,
    handleSubmitRename,
    handleCancelRename,

    handleToggleVisibility,
    handleSave,
    handleSaveAs,
    handleDuplicate,
    handleSetDefault,
    handleDelete,
  };
}