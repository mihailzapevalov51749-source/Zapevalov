import { useEffect, useMemo, useRef, useState } from "react";

import ObjectTableCreateViewDialog from "./ObjectTableCreateViewDialog";
import ObjectTableDirtyGuardModal from "./ObjectTableDirtyGuardModal";
import ObjectTableRepresentationsPanel from "../representations/ObjectTableRepresentationsPanel";
import useObjectTableRepresentationsBar from "../representations/useObjectTableRepresentationsBar";
import { getViewIdentity } from "../../services/resolveActiveView";

const MAX_VISIBLE_QUICK_FILTERS = 4;

/**
 * Object Table toolbar — representations UX aligned with quick filter chips.
 */
export default function ObjectTableViewsBar({
  views = [],
  activeViewKey = "default_table",
  activeViewContract = null,
  objectTypeKey = "",
  representationsPrefsScopeKey = null,
  catalog = null,
  onSelectView,
  onOpenFilters,
  onToggleInlineEdit,
  isInlineEditMode = false,
  onOpenViewSettingsForKey,
  onSetDefaultView,
  isViewSettingsOpen = false,
  settingsPanelAnchorRef = null,
  visibilityRevision = 0,
  isTableBaseStateActive = false,
  onSelectTableBaseState = null,
  activeFilterCount = 0,
  loading = false,
  isDirty = false,
  canSave = false,
  saving = false,
  saveError = "",
  onCreateView,
  creating = false,
  createError = "",
  dirtyGuard,
  canCreateEntity = false,
  onCreateEntity,
  creatingEntity = false,
  quickFilters = [],
  activeQuickFilterId = null,
  defaultQuickFilterId = null,
  onSelectQuickFilter,
}) {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isQuickFiltersOverflowOpen, setIsQuickFiltersOverflowOpen] = useState(false);

  const quickFiltersOverflowRef = useRef(null);
  const representationsAnchorRef = useRef(null);

  const displayViews = useMemo(
    () => (Array.isArray(views) ? views.filter(Boolean) : []),
    [views],
  );

  const representations = useObjectTableRepresentationsBar({
    objectTypeKey,
    prefsScopeKey: representationsPrefsScopeKey,
    views: displayViews,
    activeViewKey,
    onSelectView,
    isDirty,
    dirtyGuard,
    visibilityRevision,
  });

  const {
    isPanelOpen,
    togglePanel,
    closePanel,
    visibleSlotsLimit,
    setVisibleSlotsLimit,
    normalizedViews,
    pinnedSlots,
    getPinnedSlotIndex,
    replacePinnedSlot,
    toggleViewVisibility,
    selectView,
  } = representations;

  const quickFilterItems = useMemo(() => {
    const items = [];

    for (const filter of quickFilters) {
      items.push({
        id: String(filter.id || ""),
        label: filter.label || filter.key || filter.id,
        isDefault:
          defaultQuickFilterId === String(filter.id || "") ||
          filter.isDefault === true,
      });
    }

    return items;
  }, [quickFilters, defaultQuickFilterId]);

  const visibleQuickFilters = quickFilterItems.slice(0, MAX_VISIBLE_QUICK_FILTERS);
  const hiddenQuickFilters = quickFilterItems.slice(MAX_VISIBLE_QUICK_FILTERS);
  const pinnedRepresentationViews = useMemo(
    () => pinnedSlots.map((slot) => slot.view).filter(Boolean),
    [pinnedSlots],
  );

  const handleGuardSave = dirtyGuard?.handleGuardSave;
  const handleGuardDiscard = dirtyGuard?.handleGuardDiscard;
  const handleGuardCancel = dirtyGuard?.cancelGuard;
  const guardOpen = Boolean(dirtyGuard?.guardOpen);

  useEffect(() => {
    if (!isPanelOpen) {
      return undefined;
    }

    const handleMouseDown = (event) => {
      const inRepresentationsPanel = event.target?.closest?.(
        "[data-object-table-representations-panel]",
      );
      const inSettingsPanel = event.target?.closest?.(
        "[data-object-table-view-settings-panel]",
      );
      const inAnchor = representationsAnchorRef.current?.contains(event.target);

      if (!inRepresentationsPanel && !inSettingsPanel && !inAnchor) {
        closePanel();
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        if (isViewSettingsOpen) {
          return;
        }

        closePanel();
      }
    };

    document.addEventListener("mousedown", handleMouseDown, true);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handleMouseDown, true);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isPanelOpen, closePanel, isViewSettingsOpen]);

  useEffect(() => {
    if (!isQuickFiltersOverflowOpen) {
      return undefined;
    }

    const handleMouseDown = (event) => {
      if (quickFiltersOverflowRef.current?.contains(event.target)) {
        return;
      }

      setIsQuickFiltersOverflowOpen(false);
    };

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setIsQuickFiltersOverflowOpen(false);
      }
    };

    document.addEventListener("mousedown", handleMouseDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handleMouseDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isQuickFiltersOverflowOpen]);

  const isAllFilterActive =
    isTableBaseStateActive && (activeQuickFilterId == null || activeQuickFilterId === "");

  const renderQuickFilterButton = (filter, variant = "inline") => {
    const isActive =
      filter.id == null
        ? activeQuickFilterId == null
        : activeQuickFilterId === filter.id;

    const className =
      variant === "dropdown"
        ? `view-engine-toolbar__quick-filter-dropdown-item${isActive ? " is-active" : ""}${filter.isDefault ? " is-default" : ""}`
        : `view-engine-toolbar__quick-filter-btn${isActive ? " is-active" : ""}${filter.isDefault ? " is-default" : ""}`;

    return (
      <button
        key={filter.id ?? "all"}
        type="button"
        className={className}
        onClick={() => {
          onSelectQuickFilter?.(filter.id);
          setIsQuickFiltersOverflowOpen(false);
        }}
      >
        {filter.label}
        {filter.isDefault && filter.id != null ? " ★" : ""}
      </button>
    );
  };

  const renderRepresentationButton = (view) => {
    const isActive =
      !isTableBaseStateActive &&
      getViewIdentity(view) === String(activeViewKey || "").trim();
    const showDirtyMarker = isActive && isDirty;

    return (
      <button
        key={view.key}
        type="button"
        className={`view-engine-toolbar__quick-filter-btn${isActive ? " is-active" : ""}${
          view.isDefault ? " is-default" : ""
        }`}
        title={
          showDirtyMarker
            ? `${view.name} — есть несохранённые изменения`
            : view.key
        }
        disabled={loading || !view.key}
        onClick={() => selectView(view)}
      >
        {view.name}
        {view.isDefault ? " ★" : ""}
        {showDirtyMarker ? " *" : ""}
      </button>
    );
  };

  return (
    <>
      <div className="view-engine-toolbar" data-object-table-views-bar="true">
        <div className="view-engine-toolbar__left">
          {typeof onToggleInlineEdit === "function" ? (
            <button
              type="button"
              className={`view-engine-toolbar__tool-btn${isInlineEditMode ? " is-active" : ""}`}
              title={
                isInlineEditMode
                  ? "Выключить редактирование записей"
                  : "Редактировать записи в таблице"
              }
              aria-label={
                isInlineEditMode
                  ? "Выключить редактирование записей"
                  : "Редактировать записи в таблице"
              }
              onClick={onToggleInlineEdit}
            >
              ✎
            </button>
          ) : null}

          {canCreateEntity ? (
            <button
              type="button"
              className="view-engine-toolbar__tool-btn"
              title="Добавить экземпляр объекта"
              aria-label="Добавить экземпляр объекта"
              disabled={creatingEntity}
              onClick={() => onCreateEntity?.()}
            >
              +
            </button>
          ) : null}

          <button
            type="button"
            className="view-engine-toolbar__filters-trigger"
            title="Фильтры"
            onClick={onOpenFilters}
          >
            Фильтры
            {activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
          </button>

          <div className="view-engine-toolbar__quick-filters-row">
            {typeof onSelectTableBaseState === "function" ? (
              <button
                type="button"
                className={`view-engine-toolbar__quick-filter-btn${
                  isAllFilterActive ? " is-active" : ""
                }`}
                title="Показать все поля без сохранённого представления"
                onClick={onSelectTableBaseState}
              >
                Все
              </button>
            ) : null}

            {visibleQuickFilters.map((filter) => renderQuickFilterButton(filter))}

            {hiddenQuickFilters.length > 0 ? (
              <div
                ref={quickFiltersOverflowRef}
                className="view-engine-toolbar__quick-filters-overflow"
              >
                <button
                  type="button"
                  className="view-engine-toolbar__more-btn"
                  title="Ещё быстрые фильтры"
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    setIsQuickFiltersOverflowOpen((current) => !current);
                  }}
                >
                  ...
                </button>

                {isQuickFiltersOverflowOpen ? (
                  <div className="view-engine-toolbar__quick-filters-dropdown">
                    {hiddenQuickFilters.map((filter) =>
                      renderQuickFilterButton(filter, "dropdown"),
                    )}
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>

        <div className="view-engine-toolbar__right">
          {pinnedRepresentationViews.map((view) => renderRepresentationButton(view))}

          <div
            ref={(node) => {
              representationsAnchorRef.current = node;

              if (settingsPanelAnchorRef) {
                settingsPanelAnchorRef.current = node;
              }
            }}
            className="view-engine-toolbar__views-overflow-wrap"
          >
            <button
              type="button"
              className={`view-engine-toolbar__overflow-btn${isPanelOpen || isViewSettingsOpen || isDirty ? " is-dirty" : ""}`}
              title="Управление представлениями"
              aria-label="Управление представлениями"
              aria-expanded={isPanelOpen}
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                togglePanel();
              }}
            >
              ...
            </button>

            <ObjectTableRepresentationsPanel
              open={isPanelOpen}
              anchorRef={representationsAnchorRef}
              onClose={closePanel}
              views={normalizedViews.map((view) => ({
                ...view,
                isDirty: view.key === String(activeViewKey) && isDirty,
              }))}
              activeViewKey={activeViewKey}
              catalog={catalog}
              objectTypeKey={objectTypeKey}
              visibleSlotsLimit={visibleSlotsLimit}
              onVisibleSlotsLimitChange={setVisibleSlotsLimit}
              getPinnedSlotIndex={getPinnedSlotIndex}
              replacePinnedSlot={replacePinnedSlot}
              onSelectView={selectView}
              onToggleVisibility={toggleViewVisibility}
              onOpenViewSettings={onOpenViewSettingsForKey}
              onSetDefaultView={onSetDefaultView}
            />
          </div>

          <button
            type="button"
            className="view-engine-toolbar__add-representation"
            title="Создать представление"
            disabled={creating}
            onClick={() => setIsCreateDialogOpen(true)}
          >
            + Представление
          </button>
        </div>
      </div>

      {saveError ? (
        <div className="designer-error" style={{ margin: "4px 12px 0", fontSize: 12 }}>
          {saveError}
        </div>
      ) : null}

      <ObjectTableCreateViewDialog
        open={isCreateDialogOpen}
        onClose={() => setIsCreateDialogOpen(false)}
        onCreate={onCreateView}
        creating={creating}
        createError={createError}
      />

      <ObjectTableDirtyGuardModal
        open={guardOpen}
        mode={dirtyGuard?.guardMode}
        viewName={dirtyGuard?.guardViewName}
        saving={saving}
        onSave={handleGuardSave}
        onSaveAsNew={dirtyGuard?.handleGuardSaveAsNew}
        onDiscard={handleGuardDiscard}
        onCancel={handleGuardCancel}
      />
    </>
  );
}
