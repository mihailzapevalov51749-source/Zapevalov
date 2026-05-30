import { useEffect, useMemo, useState } from "react";
import { writeGlobalDirty } from "../session/tableDirtySaveCompat";

const clearUniversalTableDirty = () => {
  writeGlobalDirty(false);
};

const normalizeVisibleSlotsCount = (value) => {
  return Math.max(0, Math.min(6, Number(value) || 0));
};

function normalizeView(view, index) {
  return {
    ...view,

    id: String(view?.id ?? index),

    name:
      view?.name ||
      view?.title ||
      view?.label ||
      "Без названия",

    title:
      view?.title ||
      view?.name ||
      view?.label ||
      "Без названия",

    label:
      view?.label ||
      view?.name ||
      view?.title ||
      "Без названия",

    type: view?.type || "table",

    isVisible:
      view?.isVisible ??
      view?.is_visible ??
      !view?.hidden,

    isDefault: Boolean(
      view?.isDefault ??
        view?.is_default ??
        false
    ),

    isSystem: Boolean(
      view?.isSystem ??
        view?.is_system ??
        false
    ),

    position: Number.isFinite(
      Number(view?.position)
    )
      ? Number(view.position)
      : index,

    raw: view,
  };
}

function areStringArraysEqual(left = [], right = []) {
  if (left === right) {
    return true;
  }

  if (left.length !== right.length) {
    return false;
  }

  for (let index = 0; index < left.length; index += 1) {
    if (String(left[index]) !== String(right[index])) {
      return false;
    }
  }

  return true;
}

function compactPinnedIds({
  pinnedIds = [],
  visibleIds = [],
  existingIds = new Set(),
  limit = 2,
}) {
  if (limit <= 0) {
    return [];
  }

  const normalizedVisibleIds =
    visibleIds.map(String);

  const validPinnedIds = pinnedIds
    .map(String)
    .filter((id) => existingIds.has(id))
    .filter((id) =>
      normalizedVisibleIds.includes(id)
    );

  const missingIds =
    normalizedVisibleIds.filter(
      (id) => !validPinnedIds.includes(id)
    );

  return Array.from(
    new Set([
      ...validPinnedIds,
      ...missingIds,
    ])
  ).slice(0, limit);
}

export default function useUniversalViewsBarState({
  views,
  representations,

  activeViewId,
  activeRepresentationId,

  isViewDirty,
  isRepresentationDirty,
  isBaseStateDirty = false,

  onSelectView,
  onSelectRepresentation,
  onSetActiveView,
  onSetActiveRepresentation,
  onCreateView,
  onCreateRepresentation,
  onDeleteView,
  onDeleteRepresentation,
  onToggleViewVisibility,
  onToggleRepresentationVisibility,

  onRenameView,
  onRenameRepresentation,
  onSaveView,
  onSaveRepresentation,
  onSaveAsView,
  onSaveAsRepresentation,
  onDuplicateView,
  onDuplicateRepresentation,
  onSetDefaultView,
  onSetDefaultRepresentation,

  visibleSlotsCount = 2,
}) {
  const safeVisibleSlotsCount =
    normalizeVisibleSlotsCount(
      visibleSlotsCount
    );

  const resolvedViews =
    views ?? representations ?? [];

  const resolvedActiveViewId =
    activeViewId ?? activeRepresentationId ?? null;

  const resolvedIsViewDirty =
    isViewDirty ?? isRepresentationDirty ?? false;

  const resolvedOnSelectView =
    onSelectView ??
    onSelectRepresentation ??
    onSetActiveView ??
    onSetActiveRepresentation;

  const resolvedOnDeleteView =
    onDeleteView ?? onDeleteRepresentation;

  const resolvedOnCreateView =
    onCreateView ?? onCreateRepresentation;

  const resolvedOnToggleViewVisibility =
    onToggleViewVisibility ??
    onToggleRepresentationVisibility;

  const resolvedOnRenameView =
    onRenameView ?? onRenameRepresentation;

  const resolvedOnSaveView =
    onSaveView ?? onSaveRepresentation;

  const resolvedOnSaveAsView =
    onSaveAsView ?? onSaveAsRepresentation;

  const resolvedOnDuplicateView =
    onDuplicateView ?? onDuplicateRepresentation;

  const resolvedOnSetDefaultView =
    onSetDefaultView ?? onSetDefaultRepresentation;

  const [isOverflowOpen, setIsOverflowOpen] =
    useState(false);

  const [
    isCreatePopoverOpen,
    setIsCreatePopoverOpen,
  ] = useState(false);

  const [pinnedIds, setPinnedIds] =
    useState([]);

  const [
    settingsViewId,
    setSettingsViewId,
  ] = useState(null);

  const [renameViewId, setRenameViewId] =
    useState(null);

  const [renameValue, setRenameValue] =
    useState("");

  const [pendingView, setPendingView] =
    useState(null);

  const hasUnsavedChanges = Boolean(
    resolvedIsViewDirty || isBaseStateDirty
  );

  const normalizedViews = useMemo(() => {
    return Array.isArray(resolvedViews)
      ? resolvedViews
          .map((item, index) =>
            normalizeView(item, index)
          )
          .sort(
            (a, b) => a.position - b.position
          )
      : [];
  }, [resolvedViews]);

  const visibleViews = useMemo(() => {
    return normalizedViews.filter(
      (item) => item.isVisible !== false
    );
  }, [normalizedViews]);

  const activeView = useMemo(() => {
    return (
      normalizedViews.find(
        (item) =>
          String(item.id) ===
          String(resolvedActiveViewId)
      ) || null
    );
  }, [normalizedViews, resolvedActiveViewId]);

  const pinnedIdsSyncKey = useMemo(() => {
    const items = Array.isArray(resolvedViews)
      ? resolvedViews
      : [];

    const allIds = items
      .map((view, index) => String(view?.id ?? index))
      .join(",");

    const visibleIds = items
      .filter((view) => {
        const isVisible =
          view?.isVisible ??
          view?.is_visible ??
          (view?.hidden !== undefined
            ? !view.hidden
            : true);

        return isVisible !== false;
      })
      .map((view, index) => String(view?.id ?? index))
      .join(",");

    return `${allIds}::${visibleIds}::${safeVisibleSlotsCount}`;
  }, [resolvedViews, safeVisibleSlotsCount]);

  useEffect(() => {
    const existingIds = new Set(
      normalizedViews.map((item) =>
        String(item.id)
      )
    );

    const visibleIds = visibleViews.map(
      (item) => String(item.id)
    );

    setPinnedIds((prev) => {
      const next = compactPinnedIds({
        pinnedIds: prev,
        visibleIds,
        existingIds,
        limit: safeVisibleSlotsCount,
      });

      return areStringArraysEqual(prev, next)
        ? prev
        : next;
    });
  }, [pinnedIdsSyncKey]);

  const pinnedViews = useMemo(() => {
    if (safeVisibleSlotsCount <= 0) {
      return [];
    }

    return pinnedIds
      .slice(0, safeVisibleSlotsCount)
      .map((id) =>
        visibleViews.find(
          (item) =>
            String(item.id) === String(id)
        )
      )
      .filter(Boolean);
  }, [
    pinnedIds,
    visibleViews,
    safeVisibleSlotsCount,
  ]);

  const overflowViews = useMemo(() => {
    const pinnedSet = new Set(
      pinnedViews.map((item) =>
        String(item.id)
      )
    );

    return normalizedViews.filter(
      (item) =>
        !pinnedSet.has(String(item.id))
    );
  }, [normalizedViews, pinnedViews]);

  useEffect(() => {
    if (!resolvedActiveViewId) {
      return;
    }

    const active = normalizedViews.find(
      (item) =>
        String(item.id) ===
        String(resolvedActiveViewId)
    );

    if (
      !active ||
      active.isVisible !== false
    ) {
      return;
    }

    const nextVisible = visibleViews.find(
      (item) =>
        String(item.id) !==
          String(resolvedActiveViewId)
    );

    if (
      nextVisible &&
      String(nextVisible.id) !==
        String(resolvedActiveViewId)
    ) {
      resolvedOnSelectView?.(nextVisible.raw);
    }
  }, [
    resolvedActiveViewId,
    normalizedViews,
    visibleViews,
    resolvedOnSelectView,
  ]);

  const getPinnedSlotIndex = (view) => {
    const index = pinnedIds.findIndex(
      (id) =>
        String(id) === String(view?.id)
    );

    return index >= 0 ? index : null;
  };

  const closeAllMenus = () => {
    setIsOverflowOpen(false);

    setIsCreatePopoverOpen(false);

    setSettingsViewId(null);

    setRenameViewId(null);
  };

  const closeOverflowMenus = () => {
    setIsOverflowOpen(false);

    setSettingsViewId(null);

    setRenameViewId(null);
  };

  const toggleOverflow = () => {
    setIsCreatePopoverOpen(false);

    setSettingsViewId(null);

    setRenameViewId(null);

    setIsOverflowOpen((prev) => !prev);
  };

  const selectView = (view) => {
    if (view?.isVisible === false) {
      return;
    }

    resolvedOnSelectView?.(view.raw);

    closeAllMenus();
  };

  const handleSelect = (view) => {
    if (view?.isVisible === false) {
      return;
    }

    const isSame =
      String(view.id) ===
      String(resolvedActiveViewId);

    if (!isSame && hasUnsavedChanges) {
      setPendingView(view);

      return;
    }

    selectView(view);
  };

  const saveActiveView = async () => {
    if (!activeView) {
      return null;
    }

    await resolvedOnSaveView?.(activeView.raw);

    clearUniversalTableDirty();

    return activeView.raw;
  };

  const handleConfirmSaveAndSwitch =
    async () => {
      await saveActiveView();

      if (pendingView) {
        selectView(pendingView);
      }

      setPendingView(null);
    };

  const handleConfirmSwitchWithoutSave =
    () => {
      clearUniversalTableDirty();

      if (pendingView) {
        selectView(pendingView);
      }

      setPendingView(null);
    };

  const handleCancelSwitch = () => {
    setPendingView(null);
  };

  const handleCreateButtonClick = (
    event
  ) => {
    event?.preventDefault?.();

    event?.stopPropagation?.();

    setIsOverflowOpen(false);

    setSettingsViewId(null);

    setRenameViewId(null);

    setIsCreatePopoverOpen(
      (prev) => !prev
    );
  };

  const handleCreateSave = async (
    payload
  ) => {
    await resolvedOnCreateView?.(payload);

    setIsCreatePopoverOpen(false);
  };

  const replacePinnedSlot = (
    view,
    slotIndex
  ) => {
    if (
      !view ||
      view.isVisible === false
    ) {
      return;
    }

    const viewId = String(view.id);

    const normalizedSlotIndex =
      Number(slotIndex);

    if (
      !Number.isInteger(
        normalizedSlotIndex
      ) ||
      normalizedSlotIndex < 0 ||
      normalizedSlotIndex >=
        safeVisibleSlotsCount
    ) {
      return;
    }

    setPinnedIds((prev) => {
      const visibleIds =
        visibleViews.map((item) =>
          String(item.id)
        );

      const existingIds = new Set(
        normalizedViews.map((item) =>
          String(item.id)
        )
      );

      const currentPinnedIds =
        compactPinnedIds({
          pinnedIds: prev,
          visibleIds,
          existingIds,
          limit: safeVisibleSlotsCount,
        });

      const next = [...currentPinnedIds];

      while (
        next.length <
        safeVisibleSlotsCount
      ) {
        const missingId =
          visibleIds.find(
            (id) => !next.includes(id)
          );

        if (!missingId) {
          break;
        }

        next.push(missingId);
      }

      const currentIndex =
        next.findIndex(
          (id) => id === viewId
        );

      const targetId =
        next[normalizedSlotIndex];

      if (currentIndex >= 0) {
        next[currentIndex] = targetId;
      }

      next[normalizedSlotIndex] =
        viewId;

      const result = Array.from(
        new Set(next.filter(Boolean))
      ).slice(0, safeVisibleSlotsCount);

      return areStringArraysEqual(prev, result)
        ? prev
        : result;
    });
  };

  const saveRenameByView = async (
    view
  ) => {
    const nextName = String(
      renameValue || ""
    ).trim();

    if (!view || !nextName) {
      setRenameViewId(null);

      setRenameValue("");

      return;
    }

    const currentName = String(
      view.name || ""
    ).trim();

    if (nextName !== currentName) {
      await resolvedOnRenameView?.(
        view.raw,
        nextName
      );
    }

    setRenameViewId(null);

    setRenameValue("");
  };

  const handleToggleSettings = (
    event,
    view
  ) => {
    event?.preventDefault?.();

    event?.stopPropagation?.();

    setIsCreatePopoverOpen(false);

    setRenameViewId(null);

    setSettingsViewId((prev) =>
      String(prev) === String(view.id)
        ? null
        : String(view.id)
    );
  };

  const handleStartRename = async (
    event,
    view
  ) => {
    event?.preventDefault?.();

    event?.stopPropagation?.();

    const viewId = String(
      view?.id || ""
    );

    if (
      renameViewId &&
      String(renameViewId) === viewId
    ) {
      await saveRenameByView(view);

      return;
    }

    setRenameValue(view.name || "");

    setRenameViewId(viewId);
  };

  const handleSubmitRename = async (
    event,
    view
  ) => {
    event?.preventDefault?.();

    event?.stopPropagation?.();

    await saveRenameByView(view);
  };

  const handleCancelRename = async (
    event
  ) => {
    event?.preventDefault?.();

    event?.stopPropagation?.();

    const isEscape =
      event?.key === "Escape";

    if (isEscape) {
      setRenameViewId(null);

      setRenameValue("");

      return;
    }

    const currentView =
      normalizedViews.find(
        (item) =>
          String(item.id) ===
          String(renameViewId)
      );

    if (currentView) {
      await saveRenameByView(
        currentView
      );

      return;
    }

    setRenameViewId(null);

    setRenameValue("");
  };

  const handleToggleVisibility =
    async (event, view) => {
      event?.preventDefault?.();

      event?.stopPropagation?.();

      const viewId = String(
        view?.id || ""
      );

      await resolvedOnToggleViewVisibility?.(
        view.raw
      );

      if (view?.isVisible) {
        setPinnedIds((prev) =>
          prev.filter(
            (id) =>
              String(id) !== viewId
          )
        );
      }

      if (
        !view?.isVisible &&
        safeVisibleSlotsCount > 0
      ) {
        setPinnedIds((prev) => {
          if (
            prev
              .map(String)
              .includes(viewId)
          ) {
            return prev;
          }

          return [
            ...prev.map(String),
            viewId,
          ].slice(
            0,
            safeVisibleSlotsCount
          );
        });
      }

      setSettingsViewId(null);
    };

  const handleSave = async (
    event,
    view
  ) => {
    event?.preventDefault?.();

    event?.stopPropagation?.();

    const targetView =
      view || activeView;

    if (!targetView) {
      return null;
    }

    await onSaveView?.(
      targetView.raw
    );

    if (
      renameViewId &&
      renameValue?.trim()
    ) {
      await saveRenameByView(
        targetView
      );
    }

    clearUniversalTableDirty();

    setSettingsViewId(null);

    return targetView.raw;
  };

  const handleSaveAs = async (
    event,
    view
  ) => {
    event?.preventDefault?.();

    event?.stopPropagation?.();

    const targetView =
      view || activeView;

    if (!targetView) {
      return null;
    }

    await resolvedOnSaveAsView?.(
      targetView.raw
    );

    clearUniversalTableDirty();

    setSettingsViewId(null);

    return targetView.raw;
  };

  const handleDuplicate = async (
    event,
    view
  ) => {
    event?.preventDefault?.();

    event?.stopPropagation?.();

    await resolvedOnDuplicateView?.(
      view.raw
    );

    setSettingsViewId(null);
  };

  const handleSetDefault = async (
    event,
    view
  ) => {
    event?.preventDefault?.();

    event?.stopPropagation?.();

    await resolvedOnSetDefaultView?.(
      view.raw
    );

    setSettingsViewId(null);
  };

  const handleDelete = async (
    event,
    view
  ) => {
    event?.preventDefault?.();

    event?.stopPropagation?.();

    if (view?.isSystem) {
      return;
    }

    setPinnedIds((prev) =>
      prev.filter(
        (id) =>
          String(id) !==
          String(view.id)
      )
    );

    await resolvedOnDeleteView?.(view.raw);

    setSettingsViewId(null);

    setRenameViewId(null);
  };

  return {
    isOverflowOpen,
    setIsOverflowOpen,

    isCreatePopoverOpen,
    setIsCreatePopoverOpen,

    pinnedIds,
    setPinnedIds,

    settingsViewId,
    setSettingsViewId,

    renameViewId,
    setRenameViewId,

    renameValue,
    setRenameValue,

    pendingView,
    setPendingView,

    normalizedViews,
    visibleViews,
    activeView,
    pinnedViews,
    overflowViews,

    safeVisibleSlotsCount,

    getPinnedSlotIndex,

    closeAllMenus,
    closeOverflowMenus,
    toggleOverflow,

    selectView,
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