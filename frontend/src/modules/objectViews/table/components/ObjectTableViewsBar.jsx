import { useEffect, useMemo, useRef, useState } from "react";

import ObjectTableCreateViewDialog from "./ObjectTableCreateViewDialog";
import ObjectTableDirtyGuardModal from "./ObjectTableDirtyGuardModal";
import ObjectTableRenameViewDialog from "./ObjectTableRenameViewDialog";
import ObjectTableViewsOverflowMenu from "./ObjectTableViewsOverflowMenu";

const MAX_VISIBLE_QUICK_FILTERS = 4;
const PINNED_VIEW_SLOTS = 2;

function buildPinnedViewSlots(views, activeViewKey, slotCount) {
  const list = Array.isArray(views) ? views.filter(Boolean) : [];
  const activeIndex = list.findIndex(
    (item) => String(item.contract?.key || "") === String(activeViewKey),
  );

  const pinned = [];

  if (activeIndex >= 0) {
    pinned.push(list[activeIndex]);
  }

  for (const item of list) {
    if (pinned.length >= slotCount) {
      break;
    }

    if (pinned.includes(item)) {
      continue;
    }

    pinned.push(item);
  }

  const slots = Array.from({ length: slotCount }, (_, index) => pinned[index] || null);
  const overflow = list.filter((item) => !pinned.includes(item));

  return { slots, overflow };
}

/**
 * Object Table toolbar — UX aligned with reference TableViewBar + TableRepresentationsBar.
 */
export default function ObjectTableViewsBar({
  views = [],
  activeViewKey = "default_table",
  activeViewContract = null,
  onSelectView,
  onOpenFilters,
  onOpenColumns,
  isColumnsPanelOpen = false,
  activeFilterCount = 0,
  onRefresh,
  refreshing = false,
  loading = false,
  isDirty = false,
  canSave = false,
  saving = false,
  saveError = "",
  onSave,
  onReset,
  onCreateView,
  creating = false,
  createError = "",
  dirtyGuard,
  canRename = false,
  canDuplicate = false,
  canDelete = false,
  canSetDefault = false,
  onRename,
  onDuplicate,
  onDelete,
  onSetDefault,
  actionLoading = false,
  actionError = "",
  canCreateEntity = false,
  onCreateEntity,
  creatingEntity = false,
  quickFilters = [],
  activeQuickFilterId = null,
  defaultQuickFilterId = null,
  canCreateQuickFilter = false,
  onSelectQuickFilter,
  onOpenCreateQuickFilter,
}) {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isRenameOpen, setIsRenameOpen] = useState(false);
  const [isQuickFiltersOverflowOpen, setIsQuickFiltersOverflowOpen] = useState(false);
  const [isViewsOverflowOpen, setIsViewsOverflowOpen] = useState(false);

  const quickFiltersOverflowRef = useRef(null);
  const viewsOverflowRef = useRef(null);

  const displayViews =
    views.length > 0
      ? views
      : [
          {
            contract: { key: "default_table", name: "Таблица" },
          },
        ];

  const { slots: pinnedViewSlots, overflow: overflowViews } = useMemo(
    () => buildPinnedViewSlots(displayViews, activeViewKey, PINNED_VIEW_SLOTS),
    [displayViews, activeViewKey],
  );

  const quickFilterItems = useMemo(() => {
    const items = [
      {
        id: null,
        label: "Все",
        isSystem: true,
      },
    ];

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

  const runGuarded = dirtyGuard?.runGuarded || ((action) => action?.());

  const handleSelectView = (key) => {
    const normalized = String(key || "").trim();

    if (!normalized || normalized === String(activeViewKey)) {
      return;
    }

    runGuarded(() => onSelectView?.(normalized));
  };

  const handleGuardSave = dirtyGuard?.handleGuardSave;
  const handleGuardDiscard = dirtyGuard?.handleGuardDiscard;
  const handleGuardCancel = dirtyGuard?.cancelGuard;
  const guardOpen = Boolean(dirtyGuard?.guardOpen);

  const handleDeleteView = () => {
    const confirmed = window.confirm(
      `Удалить представление «${activeViewContract?.name || activeViewKey}»?`,
    );

    if (confirmed) {
      onDelete?.();
    }
  };

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

  return (
    <>
      <div className="view-engine-toolbar" data-object-table-views-bar="true">
        <div className="view-engine-toolbar__left">
          {typeof onOpenColumns === "function" ? (
            <button
              type="button"
              className={`view-engine-toolbar__tool-btn${isColumnsPanelOpen ? " is-active" : ""}`}
              title="Настройки таблицы"
              aria-label="Настройки таблицы"
              onClick={onOpenColumns}
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
            {visibleQuickFilters.map((filter) => renderQuickFilterButton(filter))}

            {hiddenQuickFilters.length > 0 || canCreateQuickFilter ? (
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

                    {canCreateQuickFilter ? (
                      <>
                        <div className="view-engine-toolbar__portal-menu-divider" />
                        <button
                          type="button"
                          className="view-engine-toolbar__quick-filter-dropdown-item"
                          onClick={() => {
                            setIsQuickFiltersOverflowOpen(false);
                            onOpenCreateQuickFilter?.();
                          }}
                        >
                          + Создать быстрый фильтр
                        </button>
                      </>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>

        <div className="view-engine-toolbar__right">
          <div className="view-engine-toolbar__views-group">
            {pinnedViewSlots.map((item, index) => {
              if (!item) {
                return (
                  <div
                    key={`empty-slot-${index}`}
                    className="view-engine-toolbar__view-slot-empty"
                  >
                    Слот {index + 1}
                  </div>
                );
              }

              const key = String(item.contract?.key || "");
              const isActive = key === String(activeViewKey);
              const label = item.contract?.name || key;
              const showDirtyMarker = isActive && isDirty;
              const isDefaultView = item.contract?.meta?.isDefault === true;

              return (
                <button
                  key={key}
                  type="button"
                  className={`view-engine-toolbar__rep${isActive ? " is-active" : ""}`}
                  title={
                    showDirtyMarker
                      ? `${label} — есть несохранённые изменения`
                      : key
                  }
                  disabled={loading || !key}
                  onClick={() => handleSelectView(key)}
                >
                  {label}
                  {isDefaultView ? " ★" : ""}
                  {showDirtyMarker ? " *" : ""}
                </button>
              );
            })}
          </div>

          <div className="view-engine-toolbar__views-overflow-wrap">
            <button
              ref={viewsOverflowRef}
              type="button"
              className={`view-engine-toolbar__overflow-btn${isDirty ? " is-dirty" : ""}`}
              title="Все представления и действия"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                setIsViewsOverflowOpen((current) => !current);
              }}
            >
              ...
            </button>

            <ObjectTableViewsOverflowMenu
              open={isViewsOverflowOpen}
              anchorRef={viewsOverflowRef}
              onClose={() => setIsViewsOverflowOpen(false)}
              overflowViews={overflowViews}
              activeViewKey={activeViewKey}
              activeViewLabel={activeViewContract?.name || activeViewKey}
              isDirty={isDirty}
              canSave={canSave}
              saving={saving}
              canRename={canRename}
              canDuplicate={canDuplicate}
              canDelete={canDelete}
              canSetDefault={canSetDefault}
              actionLoading={actionLoading}
              onSelectView={handleSelectView}
              onRename={() => runGuarded(() => setIsRenameOpen(true))}
              onDuplicate={() => runGuarded(() => onDuplicate?.())}
              onDelete={() => runGuarded(() => handleDeleteView())}
              onSetDefault={() => runGuarded(() => onSetDefault?.())}
              onSave={onSave}
              onReset={onReset}
              onRefresh={onRefresh}
              refreshing={refreshing}
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

      {actionError ? (
        <div className="designer-error" style={{ margin: "4px 12px 0", fontSize: 12 }}>
          {actionError}
        </div>
      ) : null}

      <ObjectTableCreateViewDialog
        open={isCreateDialogOpen}
        onClose={() => setIsCreateDialogOpen(false)}
        onCreate={onCreateView}
        creating={creating}
        createError={createError}
      />

      <ObjectTableRenameViewDialog
        open={isRenameOpen}
        initialName={activeViewContract?.name || ""}
        onClose={() => setIsRenameOpen(false)}
        onRename={onRename}
        loading={actionLoading}
        error={actionError}
      />

      <ObjectTableDirtyGuardModal
        open={guardOpen}
        saving={saving}
        onSave={handleGuardSave}
        onDiscard={handleGuardDiscard}
        onCancel={handleGuardCancel}
      />
    </>
  );
}
