import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

import ViewCreatePopover from "./ViewCreatePopover";
import TableRepresentationsOverflowMenu from "./TableRepresentationsOverflowMenu";

import useTableRepresentationsBarState from "../../hooks/useTableRepresentationsBarState";
import {
  registerTableSessionSaveHandler,
  resolveTableSessionId,
  unregisterTableSessionSaveHandler,
} from "../../session/tableSessionStore";

import {
  tableRepresentationsRootStyle,
  tableRepresentationsLeftSideStyle,
  tableRepresentationsRightSideStyle,
  tableRepresentationsPinnedGroupStyle,
  getTableRepresentationsPinnedButtonStyle,
  tableRepresentationsEmptySlotStyle,
  tableRepresentationsNameStyle,
  tableRepresentationsOverflowWrapperStyle,
  tableRepresentationsOverflowButtonStyle,
  tableRepresentationsCreateWrapperStyle,
  tableRepresentationsCreateButtonStyle,
} from "../../styles/tableStyles";

const getViewsVisibleLimitStorageKey = (tableKey) =>
  `universal-table-views-visible-limit-${tableKey || "default"}`;

const normalizeViewsVisibleLimit = (value) => {
  return Math.max(0, Math.min(3, Number(value) || 0));
};

const getTableIdentityKey = (tableIdentity = {}) => {
  return (
    tableIdentity?.tableId ||
    tableIdentity?.table_id ||
    tableIdentity?.blockId ||
    tableIdentity?.block_id ||
    tableIdentity?.sectionId ||
    tableIdentity?.section_id ||
    "default"
  );
};

function normalizeWidth(value) {
  if (typeof value === "number") {
    return `${value}px`;
  }

  return value || "100%";
}

export default function TableRepresentationsBar({
  fullTableMinWidth,

  representations = [],
  activeRepresentationId = null,
  isRepresentationDirty = false,
  isBaseStateDirty = false,

  columns = [],
  tableViewState = {},
  tableIdentity = {},

  viewsVisibleLimit = 2,
  onViewsVisibleLimitChange,

  onSelectRepresentation,
  onCreateRepresentation,
  onDeleteRepresentation,
  onToggleRepresentationVisibility,
  onToggleColumnVisibility,
  onOpenRepresentationFilters,

  onRenameRepresentation,
  onSaveRepresentation,
  onSaveAsRepresentation,
  onDuplicateRepresentation,
  onSetDefaultRepresentation,

  handleStartDragColumnWithSystem,
  handleDragOverColumnWithSystem,
  handleDropColumnWithSystem,
}) {
  const overflowRef = useRef(null);
  const settingsMenuRef = useRef(null);

  const [leavePageRequest, setLeavePageRequest] = useState(null);
  const [baseViewName, setBaseViewName] = useState("");

  const resolvedTableWidth = normalizeWidth(fullTableMinWidth);

  const safeRepresentations = Array.isArray(representations)
    ? representations.filter(Boolean)
    : [];

  const tableStorageKey = useMemo(() => {
    return getViewsVisibleLimitStorageKey(getTableIdentityKey(tableIdentity));
  }, [
    tableIdentity?.tableId,
    tableIdentity?.table_id,
    tableIdentity?.blockId,
    tableIdentity?.block_id,
    tableIdentity?.sectionId,
    tableIdentity?.section_id,
  ]);

  const sessionId = useMemo(
    () =>
      resolveTableSessionId({
        blockId:
          tableIdentity?.blockId || tableIdentity?.block_id,
        tableId:
          tableIdentity?.tableId || tableIdentity?.table_id,
      }),
    [
      tableIdentity?.blockId,
      tableIdentity?.block_id,
      tableIdentity?.tableId,
      tableIdentity?.table_id,
    ]
  );

  const [localViewsVisibleLimit, setLocalViewsVisibleLimit] = useState(() => {
    try {
      const savedValue = localStorage.getItem(
        getViewsVisibleLimitStorageKey(getTableIdentityKey(tableIdentity))
      );

      if (savedValue !== null) {
        return normalizeViewsVisibleLimit(savedValue);
      }
    } catch {
      // ignore
    }

    return normalizeViewsVisibleLimit(viewsVisibleLimit);
  });

  const normalizedViewsVisibleLimit =
    normalizeViewsVisibleLimit(localViewsVisibleLimit);

  useEffect(() => {
    try {
      const savedValue = localStorage.getItem(tableStorageKey);

      if (savedValue !== null) {
        setLocalViewsVisibleLimit(normalizeViewsVisibleLimit(savedValue));
        return;
      }
    } catch {
      // ignore
    }

    setLocalViewsVisibleLimit(normalizeViewsVisibleLimit(viewsVisibleLimit));
  }, [tableStorageKey, viewsVisibleLimit]);

  const {
    isOverflowOpen,
    setIsOverflowOpen,
    isCreatePopoverOpen,
    setIsCreatePopoverOpen,

    settingsViewId: settingsRepresentationId,
    setSettingsViewId: setSettingsRepresentationId,

    renameViewId: renameRepresentationId,
    setRenameViewId: setRenameRepresentationId,
    renameValue,
    setRenameValue,

    pendingView: pendingRepresentation,

    normalizedViews: normalizedRepresentations = [],
    pinnedViews: pinnedRepresentations = [],

    getPinnedSlotIndex,
    toggleOverflow,

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
  } = useTableRepresentationsBarState({
    representations: safeRepresentations,
    activeRepresentationId,
    isRepresentationDirty,
    isBaseStateDirty,
    sessionId,

    onSelectRepresentation,
    onCreateRepresentation,
    onDeleteRepresentation,
    onToggleRepresentationVisibility,

    onRenameRepresentation,
    onSaveRepresentation,
    onSaveAsRepresentation,
    onDuplicateRepresentation,
    onSetDefaultRepresentation,

    visibleSlotsCount: normalizedViewsVisibleLimit,
  });

  useEffect(() => {
    if (sessionId === "unknown") {
      return undefined;
    }

    registerTableSessionSaveHandler(sessionId, async () => {
      await handleSave?.();
    });

    return () => {
      unregisterTableSessionSaveHandler(sessionId);
    };
  }, [sessionId, handleSave]);

  useEffect(() => {
    const handleLeaveRequest = (event) => {
      const { onConfirm, onCancel } = event.detail || {};

      setBaseViewName("");

      setLeavePageRequest({
        onConfirm,
        onCancel,
      });
    };

    window.addEventListener(
      "universal-table:request-leave-confirm",
      handleLeaveRequest
    );

    return () => {
      window.removeEventListener(
        "universal-table:request-leave-confirm",
        handleLeaveRequest
      );
    };
  }, []);

  useEffect(() => {
    if (!isOverflowOpen && !settingsRepresentationId && !leavePageRequest) {
      return;
    }

    const handleOutsideMouseDown = (event) => {
      const isInsideOverflow =
        overflowRef.current && overflowRef.current.contains(event.target);

      const isInsideSettings =
        settingsMenuRef.current &&
        settingsMenuRef.current.contains(event.target);

      const isRenameEditor = event.target.closest?.(
        "[data-representation-rename='true']"
      );

      const isDirtyModal = event.target.closest?.(
        "[data-representation-dirty-modal='true']"
      );

      const isPortalMenu = event.target.closest?.(
        "[data-table-representations-portal-menu='true']"
      );

      const isFilterModal = event.target.closest?.(
        "[data-table-filter-modal='true']"
      );

      if (isRenameEditor || isDirtyModal || isFilterModal || isPortalMenu) {
        return;
      }

      if (settingsRepresentationId && !isInsideSettings) {
        setSettingsRepresentationId(null);
        setRenameRepresentationId(null);
      }

      if (isOverflowOpen && !isInsideOverflow && !settingsRepresentationId) {
        setIsOverflowOpen(false);
      }
    };

    const handleKeyDown = (event) => {
      const isRenameEditor = event.target.closest?.(
        "[data-representation-rename='true']"
      );

      if (isRenameEditor && event.key !== "Escape") {
        return;
      }

      if (event.key === "Escape") {
        if (leavePageRequest) {
          leavePageRequest.onCancel?.();
          setLeavePageRequest(null);
          setBaseViewName("");
          return;
        }

        if (settingsRepresentationId) {
          setSettingsRepresentationId(null);
          setRenameRepresentationId(null);
          return;
        }

        setIsOverflowOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideMouseDown, true);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handleOutsideMouseDown, true);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [
    isOverflowOpen,
    settingsRepresentationId,
    setIsOverflowOpen,
    setSettingsRepresentationId,
    setRenameRepresentationId,
    leavePageRequest,
  ]);

  const handleViewsVisibleLimitChange = (nextValue) => {
    const normalizedValue = normalizeViewsVisibleLimit(nextValue);

    setLocalViewsVisibleLimit(normalizedValue);

    try {
      localStorage.setItem(tableStorageKey, String(normalizedValue));
    } catch {
      // ignore
    }

    onViewsVisibleLimitChange?.(normalizedValue);
  };

  const handleDirtySave = async ({
    shouldShowBaseStateModal,
    isLeavePageMode,
  }) => {
    if (shouldShowBaseStateModal) {
      await onCreateRepresentation?.({
        name: String(baseViewName || "").trim() || "Новое представление",
      });

      if (isLeavePageMode) {
        leavePageRequest?.onConfirm?.();
        setLeavePageRequest(null);
      } else {
        handleConfirmSwitchWithoutSave?.();
      }

      setBaseViewName("");
      return;
    }

    if (isLeavePageMode) {
      await handleSave?.();

      leavePageRequest?.onConfirm?.();
      setLeavePageRequest(null);
      return;
    }

    await handleSave?.();
    await handleConfirmSaveAndSwitch?.();
  };

  const handleDirtyDiscard = ({ isLeavePageMode }) => {
    if (isLeavePageMode) {
      leavePageRequest?.onConfirm?.();
      setLeavePageRequest(null);
      setBaseViewName("");
      return;
    }

    handleConfirmSwitchWithoutSave?.();
    setBaseViewName("");
  };

  const handleDirtyCancel = ({ isLeavePageMode }) => {
    if (isLeavePageMode) {
      leavePageRequest?.onCancel?.();
      setLeavePageRequest(null);
      setBaseViewName("");
      return;
    }

    handleCancelSwitch?.();
    setBaseViewName("");
  };

  const renderDirtyModal = () => {
    if (!pendingRepresentation && !leavePageRequest) {
      return null;
    }

    if (typeof document === "undefined") {
      return null;
    }

    const isLeavePageMode = Boolean(leavePageRequest);

    const shouldShowBaseStateModal =
      (isLeavePageMode || pendingRepresentation) &&
      !activeRepresentationId &&
      isBaseStateDirty;

    const stopModalEvent = (event) => {
      event.stopPropagation();
    };

    return createPortal(
      <div
        data-representation-dirty-modal="true"
        style={dirtyModalOverlayStyle}
        onMouseDown={stopModalEvent}
        onPointerDown={stopModalEvent}
        onClick={stopModalEvent}
      >
        <div
          style={dirtyModalStyle}
          onMouseDown={stopModalEvent}
          onPointerDown={stopModalEvent}
          onClick={stopModalEvent}
        >
          <div style={dirtyModalHeaderStyle}>
            <div style={dirtyModalTitleStyle}>
              {shouldShowBaseStateModal
                ? "Сохранить как новое представление"
                : "Сохранить изменения в представлении"}
            </div>

            <div style={dirtyModalTextStyle}>
              {shouldShowBaseStateModal
                ? "В режиме «Все» были изменены фильтры, сортировка или отображение таблицы."
                : "В текущем представлении изменены настройки отображения таблицы: фильтры, сортировка, порядок или видимость колонок."}
            </div>
          </div>

          {shouldShowBaseStateModal && (
            <input
              value={baseViewName}
              onChange={(event) => setBaseViewName(event.target.value)}
              placeholder="Название представления"
              autoFocus
              style={dirtyModalInputStyle}
              onKeyDown={async (event) => {
                if (event.key === "Enter") {
                  await handleDirtySave({
                    shouldShowBaseStateModal,
                    isLeavePageMode,
                  });
                }

                if (event.key === "Escape") {
                  handleDirtyCancel({ isLeavePageMode });
                }
              }}
            />
          )}

          <div style={dirtyModalActionsStyle}>
            <button
              type="button"
              onClick={async () =>
                await handleDirtySave({
                  shouldShowBaseStateModal,
                  isLeavePageMode,
                })
              }
              style={dirtyModalPrimaryButtonStyle}
            >
              Сохранить
            </button>

            <button
              type="button"
              onClick={() => handleDirtyDiscard({ isLeavePageMode })}
              style={dirtyModalSecondaryButtonStyle}
            >
              Не сохранять
            </button>

            <button
              type="button"
              onClick={() => handleDirtyCancel({ isLeavePageMode })}
              style={dirtyModalGhostButtonStyle}
            >
              Отмена
            </button>
          </div>
        </div>
      </div>,
      document.body
    );
  };

  const renderRepresentationName = (representation) => {
    if (!representation) {
      return (
        <span style={tableRepresentationsNameStyle}>
          Без названия
        </span>
      );
    }

    return (
      <span style={tableRepresentationsNameStyle}>
        {representation.isDefault ? "★ " : ""}
        {representation.name || "Представление"}
      </span>
    );
  };

  const renderPinnedRepresentation = (representation, index) => {
    if (!representation) {
      return (
        <div
          key={`empty-slot-${index}`}
          style={tableRepresentationsEmptySlotStyle}
        >
          Слот {index + 1}
        </div>
      );
    }

    const representationId = String(representation?.id || "");
    const isActive =
      representationId &&
      String(activeRepresentationId) === representationId;

    return (
      <button
        key={`${representationId || "unknown"}_${index}`}
        type="button"
        onClick={() => handleSelect?.(representation)}
        style={getTableRepresentationsPinnedButtonStyle({
          isActive,
          isFirst: index === 0,
        })}
        title={representation?.name || "Представление"}
      >
        {renderRepresentationName(representation)}
      </button>
    );
  };

  return (
    <div
      data-table-action="true"
      style={{
        ...tableRepresentationsRootStyle,
        width: "fit-content",
        minWidth: resolvedTableWidth,
        maxWidth: "none",
        boxSizing: "border-box",
      }}
    >
      <div style={tableRepresentationsLeftSideStyle}>
        {normalizedViewsVisibleLimit > 0 && (
          <div style={tableRepresentationsPinnedGroupStyle}>
            {Array.from({ length: normalizedViewsVisibleLimit }).map(
              (_, index) =>
                renderPinnedRepresentation(
                  pinnedRepresentations?.[index],
                  index
                )
            )}
          </div>
        )}
      </div>

      <div style={tableRepresentationsRightSideStyle}>
        <div ref={overflowRef} style={tableRepresentationsOverflowWrapperStyle}>
          <button
            type="button"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              toggleOverflow?.();
            }}
            style={tableRepresentationsOverflowButtonStyle}
            title="Все представления"
          >
            ...
          </button>

          {isOverflowOpen &&
            createPortal(
              <TableRepresentationsOverflowMenu
                menuRef={null}
                settingsMenuRef={settingsMenuRef}
                representations={normalizedRepresentations || []}
                activeRepresentationId={activeRepresentationId}
                columns={columns}
                tableViewState={tableViewState}
                settingsRepresentationId={settingsRepresentationId}
                renameRepresentationId={renameRepresentationId}
                renameValue={renameValue}
                setRenameValue={setRenameValue}
                viewsVisibleLimit={normalizedViewsVisibleLimit}
                onViewsVisibleLimitChange={handleViewsVisibleLimitChange}
                getPinnedSlotIndex={getPinnedSlotIndex}
                replacePinnedSlot={replacePinnedSlot}
                handleSelect={handleSelect}
                handleToggleVisibility={handleToggleVisibility}
                handleToggleSettings={handleToggleSettings}
                handleStartRename={handleStartRename}
                handleSubmitRename={handleSubmitRename}
                handleCancelRename={handleCancelRename}
                handleSave={handleSave}
                handleSaveAs={handleSaveAs}
                handleDuplicate={handleDuplicate}
                handleSetDefault={handleSetDefault}
                handleDelete={handleDelete}
                onToggleColumnVisibility={onToggleColumnVisibility}
                onOpenRepresentationFilters={onOpenRepresentationFilters}
                handleStartDragColumnWithSystem={
                  handleStartDragColumnWithSystem
                }
                handleDragOverColumnWithSystem={
                  handleDragOverColumnWithSystem
                }
                handleDropColumnWithSystem={handleDropColumnWithSystem}
              />,
              document.body
            )}
        </div>

        <div style={tableRepresentationsCreateWrapperStyle}>
          <button
            type="button"
            onClick={handleCreateButtonClick}
            style={tableRepresentationsCreateButtonStyle}
            title="Добавить представление"
          >
            <span style={{ fontSize: 16, lineHeight: 1 }}>+</span>
            <span>Представление</span>
          </button>

          <ViewCreatePopover
            isOpen={isCreatePopoverOpen}
            onClose={() => setIsCreatePopoverOpen(false)}
            onSave={handleCreateSave}
          />
        </div>
      </div>

      {renderDirtyModal()}
    </div>
  );
}

const DIRTY_MODAL_Z_INDEX = 10000050;

const dirtyModalOverlayStyle = {
  position: "fixed",
  inset: 0,
  zIndex: DIRTY_MODAL_Z_INDEX,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "rgba(15, 23, 42, 0.45)",
  backdropFilter: "blur(2px)",
  pointerEvents: "auto",
};

const dirtyModalStyle = {
  position: "relative",
  zIndex: DIRTY_MODAL_Z_INDEX + 1,
  width: 440,
  maxWidth: "calc(100vw - 32px)",
  background: "#ffffff",
  borderRadius: 14,
  border: "1px solid #dbe4ee",
  boxShadow: "0 25px 80px rgba(15, 23, 42, 0.25)",
  overflow: "hidden",
  pointerEvents: "auto",
};

const dirtyModalHeaderStyle = {
  padding: "18px 18px 12px",
};

const dirtyModalTitleStyle = {
  fontSize: 16,
  fontWeight: 700,
  color: "#0f172a",
  marginBottom: 8,
};

const dirtyModalTextStyle = {
  fontSize: 13,
  lineHeight: 1.5,
  color: "#475569",
};

const dirtyModalInputStyle = {
  width: "calc(100% - 36px)",
  margin: "0 18px",
  height: 38,
  padding: "0 12px",
  borderRadius: 10,
  border: "1px solid #cbd5e1",
  outline: "none",
  fontSize: 13,
  color: "#0f172a",
  boxSizing: "border-box",
};

const dirtyModalActionsStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "flex-end",
  gap: 8,
  padding: 18,
  borderTop: "1px solid #e2e8f0",
  marginTop: 16,
};

const dirtyModalPrimaryButtonStyle = {
  height: 34,
  padding: "0 14px",
  borderRadius: 10,
  border: "1px solid #2563eb",
  background: "#2563eb",
  color: "#ffffff",
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
};

const dirtyModalSecondaryButtonStyle = {
  height: 34,
  padding: "0 14px",
  borderRadius: 10,
  border: "1px solid #cbd5e1",
  background: "#ffffff",
  color: "#334155",
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
};

const dirtyModalGhostButtonStyle = {
  height: 34,
  padding: "0 14px",
  borderRadius: 10,
  border: "1px solid transparent",
  background: "transparent",
  color: "#64748b",
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
};