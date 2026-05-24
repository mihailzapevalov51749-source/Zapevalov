import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import UniversalViewsManagePopover from "./UniversalViewsManagePopover";
import UniversalViewSettingsModal from "./UniversalViewSettingsModal";

import { universalViewsBarStyles as styles } from "./universalViewsBarStyles";

const VIEW_LABELS = {
  table: "Таблица",
  tree: "Дерево",
  composite: "Составное",
  cards: "Карточки",
  kanban: "Канбан",
  calendar: "Календарь",
  org_structure: "Оргструктура",
  bpmn: "BPMN",
};

const VIEW_TYPES = [
  { value: "tree", label: "Дерево" },
  { value: "composite", label: "Составное" },
  { value: "cards", label: "Карточки" },
  { value: "kanban", label: "Канбан" },
  { value: "calendar", label: "Календарь" },
  { value: "org_structure", label: "Оргструктура" },
  { value: "bpmn", label: "BPMN" },
];

const MANAGE_POPOVER_WIDTH = 240;
const CREATE_POPOVER_WIDTH = 300;
const DRAG_THRESHOLD = 5;

function moveItem(array, fromIndex, toIndex) {
  const next = [...array];

  const [item] = next.splice(fromIndex, 1);

  next.splice(toIndex, 0, item);

  return next;
}

function getPopoverPosition(rect, width) {
  if (!rect) {
    return {
      top: 260,
      left: 260,
    };
  }

  const viewportWidth =
    window.innerWidth || document.documentElement.clientWidth;

  const preferredLeft = rect.left;
  const maxLeft = viewportWidth - width - 16;

  return {
    top: rect.bottom + 8,
    left: Math.max(16, Math.min(preferredLeft, maxLeft)),
  };
}

function getTargetIndexByMouseX(mouseX, orderedViewIds = []) {
  const tabElements = Array.from(
    document.querySelectorAll("[data-universal-view-tab-id]")
  );

  const sortedElements = tabElements
    .filter((element) =>
      orderedViewIds.includes(String(element.dataset.universalViewTabId))
    )
    .sort((a, b) => {
      const aIndex = orderedViewIds.indexOf(
        String(a.dataset.universalViewTabId)
      );

      const bIndex = orderedViewIds.indexOf(
        String(b.dataset.universalViewTabId)
      );

      return aIndex - bIndex;
    });

  if (!sortedElements.length) {
    return -1;
  }

  for (let index = 0; index < sortedElements.length; index += 1) {
    const rect = sortedElements[index].getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;

    if (mouseX < centerX) {
      return index;
    }
  }

  return sortedElements.length - 1;
}

export default function UniversalViewsBar({
  views = [],
  fields = [],

  activeViewId,
  defaultViewId,

  viewsManagePopoverLayout,

  isLoadingViews,

  onSelectView,
  onCreateView,
  onViewsReorder,
  onViewVisibilityToggle,
  onViewRename,
  onViewSettingsSave,
  onDefaultViewChange,
  onViewsManagePopoverLayoutSave,
  onViewDelete,
}) {
  const safeViews = Array.isArray(views) ? views : [];

  const createButtonRef = useRef(null);
  const manageButtonRef = useRef(null);

  const dragStateRef = useRef({
    viewId: null,
    startX: 0,
    startY: 0,
    hasMoved: false,
  });

  const [localViews, setLocalViews] = useState(safeViews);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isManageOpen, setIsManageOpen] = useState(false);

  const [settingsView, setSettingsView] = useState(null);

  const [viewName, setViewName] = useState("");
  const [viewType, setViewType] = useState("tree");

  const [isSaving, setIsSaving] = useState(false);
  const [draggedViewId, setDraggedViewId] = useState(null);

  useEffect(() => {
    setLocalViews(safeViews);
  }, [safeViews]);

  const createButtonRect =
    createButtonRef.current?.getBoundingClientRect();

  const manageButtonRect =
    manageButtonRef.current?.getBoundingClientRect();

  const popoverPosition = getPopoverPosition(
    createButtonRect,
    CREATE_POPOVER_WIDTH
  );

  const managePopoverPosition = getPopoverPosition(
    manageButtonRect,
    MANAGE_POPOVER_WIDTH
  );

  const visibleViews = localViews.filter(
    (view) =>
      view.hidden !== true &&
      view.isVisible !== false &&
      view.is_visible !== false
  );

  async function handleSaveView() {
    const name =
      viewName.trim() ||
      VIEW_LABELS[viewType] ||
      "Представление";

    setIsSaving(true);

    try {
      await onCreateView?.({
        name,
        type: viewType,
      });

      setViewName("");
      setViewType("tree");

      setIsCreateOpen(false);
    } finally {
      setIsSaving(false);
    }
  }

  function handleSelectView(viewId) {
    if (dragStateRef.current.hasMoved) {
      return;
    }

    const view = localViews.find(
      (item) => String(item.id) === String(viewId)
    );

    if (!view) {
      return;
    }

    if (
      view.hidden === true ||
      view.isVisible === false ||
      view.is_visible === false
    ) {
      return;
    }

    onSelectView?.(viewId);

    setIsManageOpen(false);
  }

  function handleViewVisibilityToggle(viewId, nextVisible) {
    setLocalViews((prev) =>
      prev.map((view) => {
        if (String(view.id) !== String(viewId)) {
          return view;
        }

        return {
          ...view,
          hidden: !nextVisible,
          isVisible: nextVisible,
          is_visible: nextVisible,
        };
      })
    );

    onViewVisibilityToggle?.(viewId, nextVisible);
  }

  function handleViewRename(viewId, nextName) {
    const normalizedName = String(nextName || "").trim();

    if (!normalizedName) {
      return;
    }

    setLocalViews((prev) =>
      prev.map((view) => {
        if (String(view.id) !== String(viewId)) {
          return view;
        }

        return {
          ...view,
          name: normalizedName,
        };
      })
    );

    onViewRename?.(viewId, normalizedName);
  }

  function handleDefaultViewChange(viewId) {
    if (!viewId) {
      return;
    }

    onDefaultViewChange?.(viewId);
  }

  function handleOpenSettings(view) {
    setSettingsView(view);

    setIsCreateOpen(false);
  }

  async function handleSettingsSave(viewId, payload = {}) {
    const currentView = localViews.find(
      (view) => String(view.id) === String(viewId)
    );

    if (!currentView) {
      return;
    }

    const normalizedPayload = {
      ...payload,
      settings: payload.settings || {},
    };

    if (currentView.is_system) {
      delete normalizedPayload.type;
    }

    setLocalViews((prev) =>
      prev.map((view) => {
        if (String(view.id) !== String(viewId)) {
          return view;
        }

        return {
          ...view,
          ...normalizedPayload,

          settings: {
            ...(view.settings || {}),
            ...(normalizedPayload.settings || {}),
          },
        };
      })
    );

    setSettingsView(null);

    await onViewSettingsSave?.(
      viewId,
      normalizedPayload
    );
  }

  async function handleSettingsLayoutSave(
    viewId,
    payload = {}
  ) {
    const currentView = localViews.find(
      (view) => String(view.id) === String(viewId)
    );

    if (!currentView) {
      return;
    }

    const normalizedPayload = {
      ...payload,
      settings: payload.settings || {},
    };

    if (currentView.is_system) {
      delete normalizedPayload.type;
    }

    setLocalViews((prev) =>
      prev.map((view) => {
        if (String(view.id) !== String(viewId)) {
          return view;
        }

        const nextView = {
          ...view,
          ...normalizedPayload,

          settings: {
            ...(view.settings || {}),
            ...(normalizedPayload.settings || {}),
          },
        };

        setSettingsView((currentSettingsView) => {
          if (
            !currentSettingsView ||
            String(currentSettingsView.id) !== String(viewId)
          ) {
            return currentSettingsView;
          }

          return nextView;
        });

        return nextView;
      })
    );

    await onViewSettingsSave?.(
      viewId,
      normalizedPayload
    );
  }

  async function handleSettingsDelete(viewId) {
    const currentView = localViews.find(
      (view) => String(view.id) === String(viewId)
    );

    if (currentView?.is_system) {
      return;
    }

    setLocalViews((prev) =>
      prev.filter(
        (view) => String(view.id) !== String(viewId)
      )
    );

    setSettingsView(null);

    await onViewDelete?.(viewId);
  }

  function handleTabMouseDown(event, view) {
    if (event.button !== 0) {
      return;
    }

    if (view.is_system) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    dragStateRef.current = {
      viewId: view.id,
      startX: event.clientX,
      startY: event.clientY,
      hasMoved: false,
    };

    setDraggedViewId(view.id);

    document.body.style.userSelect = "";
    document.body.style.cursor = "grabbing";

    window.addEventListener(
      "mousemove",
      handleMouseMove
    );

    window.addEventListener(
      "mouseup",
      handleMouseUp
    );
  }

  function handleMouseMove(event) {
    const dragState = dragStateRef.current;

    if (!dragState.viewId) {
      return;
    }

    const deltaX = Math.abs(
      event.clientX - dragState.startX
    );

    const deltaY = Math.abs(
      event.clientY - dragState.startY
    );

    if (
      deltaX <= DRAG_THRESHOLD &&
      deltaY <= DRAG_THRESHOLD
    ) {
      return;
    }

    dragState.hasMoved = true;

    setLocalViews((prev) => {
      const visibleIds = prev
        .filter(
          (view) =>
            !view.is_system &&
            view.hidden !== true &&
            view.isVisible !== false &&
            view.is_visible !== false
        )
        .map((view) => String(view.id));

      const draggedId = String(dragState.viewId);

      const fromVisibleIndex =
        visibleIds.indexOf(draggedId);

      const toVisibleIndex = getTargetIndexByMouseX(
        event.clientX,
        visibleIds
      );

      if (
        fromVisibleIndex === -1 ||
        toVisibleIndex === -1 ||
        fromVisibleIndex === toVisibleIndex
      ) {
        return prev;
      }

      const fromIndex = prev.findIndex(
        (view) => String(view.id) === draggedId
      );

      const targetVisibleId =
        visibleIds[toVisibleIndex];

      const toIndex = prev.findIndex(
        (view) =>
          String(view.id) ===
          String(targetVisibleId)
      );

      if (
        fromIndex === -1 ||
        toIndex === -1 ||
        fromIndex === toIndex
      ) {
        return prev;
      }

      return moveItem(prev, fromIndex, toIndex);
    });
  }

  function handleMouseUp() {
    const dragState = dragStateRef.current;

    window.removeEventListener(
      "mousemove",
      handleMouseMove
    );

    window.removeEventListener(
      "mouseup",
      handleMouseUp
    );

    document.body.style.userSelect = "";
    document.body.style.cursor = "";

    setDraggedViewId(null);

    setLocalViews((currentViews) => {
      if (dragState.hasMoved) {
        onViewsReorder?.(
          currentViews.filter(
            (view) => !view.is_system
          )
        );
      }

      return currentViews;
    });

    setTimeout(() => {
      dragStateRef.current = {
        viewId: null,
        startX: 0,
        startY: 0,
        hasMoved: false,
      };
    }, 0);
  }

  return (
    <div style={styles.wrapper}>
      <div style={styles.tabs}>
        {visibleViews.map((view) => {
          const isActive =
            String(view.id) ===
            String(activeViewId);

          const isDragging =
            String(view.id) ===
            String(draggedViewId);

          return (
            <div
              key={view.id}
              role="button"
              tabIndex={0}
              data-universal-view-tab-id={String(
                view.id
              )}
              style={{
                ...styles.tab,
                ...(isActive
                  ? styles.tabActive
                  : {}),
                ...(isDragging
                  ? styles.tabDragging
                  : {}),
              }}
              onMouseDown={(event) =>
                handleTabMouseDown(event, view)
              }
              onClick={() =>
                handleSelectView(view.id)
              }
              onKeyDown={(event) => {
                if (
                  event.key === "Enter" ||
                  event.key === " "
                ) {
                  handleSelectView(view.id);
                }
              }}
              title={`${view.name} · ${
                VIEW_LABELS[view.type] ||
                view.type
              }`}
            >
              <span style={styles.tabName}>
                {view.name || "Представление"}
              </span>
            </div>
          );
        })}
      </div>

      <div style={styles.createWrapper}>
        <button
          ref={manageButtonRef}
          type="button"
          style={styles.manageButton}
          onClick={(event) => {
            event.stopPropagation();

            setIsManageOpen((prev) => !prev);

            setIsCreateOpen(false);
          }}
        >
          ...
        </button>

        <button
          ref={createButtonRef}
          type="button"
          style={styles.createButton}
          onClick={(event) => {
            event.stopPropagation();

            setIsCreateOpen((prev) => !prev);

            setIsManageOpen(false);
          }}
        >
          + Вкладка
        </button>

        {isCreateOpen &&
          createPortal(
            <div
              style={styles.overlay}
              onMouseDown={() =>
                setIsCreateOpen(false)
              }
            >
              <div
                style={{
                  ...styles.popover,
                  top: popoverPosition.top,
                  left: popoverPosition.left,
                }}
                onMouseDown={(event) =>
                  event.stopPropagation()
                }
                onClick={(event) =>
                  event.stopPropagation()
                }
              >
                <div style={styles.popoverTitle}>
                  Новая вкладка
                </div>

                <label style={styles.label}>
                  Название
                </label>

                <input
                  value={viewName}
                  onChange={(event) =>
                    setViewName(
                      event.target.value
                    )
                  }
                  placeholder="Например: Структура компании"
                  style={styles.input}
                />

                <label style={styles.label}>
                  Тип
                </label>

                <select
                  value={viewType}
                  onChange={(event) =>
                    setViewType(
                      event.target.value
                    )
                  }
                  style={styles.select}
                >
                  {VIEW_TYPES.map((type) => (
                    <option
                      key={type.value}
                      value={type.value}
                    >
                      {type.label}
                    </option>
                  ))}
                </select>

                <div style={styles.actions}>
                  <button
                    type="button"
                    style={styles.cancelButton}
                    onClick={() =>
                      setIsCreateOpen(false)
                    }
                    disabled={isSaving}
                  >
                    Отмена
                  </button>

                  <button
                    type="button"
                    style={styles.saveButton}
                    onClick={handleSaveView}
                    disabled={isSaving}
                  >
                    {isSaving
                      ? "Сохранение..."
                      : "Создать"}
                  </button>
                </div>
              </div>
            </div>,
            document.body
          )}

        {isManageOpen &&
          createPortal(
            <div
              style={styles.overlay}
              onMouseDown={() =>
                setIsManageOpen(false)
              }
            >
              <UniversalViewsManagePopover
                top={managePopoverPosition.top}
                left={managePopoverPosition.left}
                savedLayout={
                  viewsManagePopoverLayout
                }
                views={localViews}
                activeViewId={activeViewId}
                defaultViewId={defaultViewId}
                onSelectView={handleSelectView}
                onDefaultViewChange={
                  handleDefaultViewChange
                }
                onLayoutSave={
                  onViewsManagePopoverLayoutSave
                }
                onViewVisibilityToggle={
                  handleViewVisibilityToggle
                }
                onViewSettingsToggle={
                  handleOpenSettings
                }
                onViewRename={
                  handleViewRename
                }
              />
            </div>,
            document.body
          )}
      </div>

      <UniversalViewSettingsModal
        isOpen={Boolean(settingsView)}
        view={settingsView}
        fields={fields}
        onClose={() =>
          setSettingsView(null)
        }
        onSave={handleSettingsSave}
        onLayoutSave={
          handleSettingsLayoutSave
        }
        onDelete={handleSettingsDelete}
      />
    </div>
  );
}