import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import editIcon from "../../../../assets/icons/edit.png";
import eyeOpenIcon from "../../../../assets/icons/eye-open.png";
import eyeClosedIcon from "../../../../assets/icons/eye-closed.png";
import viewFieldsIcon from "../../../../assets/icons/view.png";
import viewFiltersIcon from "../../../../assets/icons/view-filters.png";
import viewSortIcon from "../../../../assets/icons/view-sort.png";
import viewColumnsIcon from "../../../../assets/icons/view-columns.png";
import viewSaveAsIcon from "../../../../assets/icons/view-save-as.png";
import viewDuplicateIcon from "../../../../assets/icons/view-duplicate.png";
import deleteIcon from "../../../../assets/icons/delet.png";
import saveIcon from "../../../../assets/icons/save.gif";

import { PlatformModal } from "../../../../shared/platformModal";
import ObjectTableCreateViewDialog from "../components/ObjectTableCreateViewDialog";
import ObjectTableViewSettingsColumnsDetails from "./ObjectTableViewSettingsColumnsDetails";
import ObjectTableViewSettingsFieldsDetails from "./ObjectTableViewSettingsFieldsDetails";
import ObjectTableViewSettingsFiltersDetails from "./ObjectTableViewSettingsFiltersDetails";
import ObjectTableViewSettingsRows from "./ObjectTableViewSettingsRows";
import ObjectTableViewSettingsSortDetails from "./ObjectTableViewSettingsSortDetails";
import {
  OBJECT_TABLE_VIEW_SETTINGS_DEFAULT_BOUNDS,
  OBJECT_TABLE_VIEW_SETTINGS_PANEL_KEY,
} from "./objectTableViewSettingsModalKeys";
import { buildObjectTableViewSummaries } from "./objectTableViewSettingsSummaries";
import { anchorToModalDefaultBounds } from "./resolveSettingsPanelPosition";

import "./objectTableViewSettings.css";
import "./objectTableViewSettingsPanel.css";

const SECTION_META = [
  { key: "fields", title: "Поля", icon: viewFieldsIcon, summaryKey: "fieldsSummary" },
  { key: "filters", title: "Фильтры", icon: viewFiltersIcon, summaryKey: "filtersSummary" },
  { key: "sort", title: "Сортировка", icon: viewSortIcon, summaryKey: "sortSummary" },
  { key: "columns", title: "Колонки", icon: viewColumnsIcon, summaryKey: "columnsSummary" },
];

function isInsideProtectedSurface(target) {
  if (!(target instanceof Element)) {
    return false;
  }

  return Boolean(
    target.closest("[data-object-table-view-settings-panel]") ||
      target.closest("[data-object-table-representations-panel]") ||
      target.closest("[data-object-table-views-bar]") ||
      target.closest(
        `[data-platform-modal-panel][data-platform-modal-key="${OBJECT_TABLE_VIEW_SETTINGS_PANEL_KEY}"]`,
      ),
  );
}

/**
 * Настройки Table Representation — ViewSettingsCard UX + PlatformModal drag/resize/persist.
 * Карандаш меняет только имя представления (contract.name), не вкладку Object View.
 */
export default function ObjectTableViewSettingsPanel({
  open = false,
  onClose,
  anchorEl = null,
  initialExpandedKey = null,
  activeViewContract = null,
  representationContract = null,
  activeViewKey = "",
  effectiveContract = null,
  catalog = null,
  objectTypeKey = "",
  sessionApi = null,
  onSave,
  onCreateView,
  creating = false,
  createError = "",
  canSave = false,
  canCustomizeLayout = false,
  isDirty = false,
  saving = false,
  saveError = "",
  canRename = false,
  canDuplicate = false,
  canDelete = false,
  canSetDefault = false,
  onRename,
  onDuplicate,
  onDelete,
  onSetDefault,
  onToggleViewVisibility,
  isViewHidden = false,
  actionLoading = false,
  actionError = "",
  onOpenFiltersEditor,
  onEditSavedFilter,
  onDeleteSavedFilter,
}) {
  const renameInputRef = useRef(null);
  const [expandedKey, setExpandedKey] = useState(null);
  const [isSaveAsOpen, setIsSaveAsOpen] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const [renameError, setRenameError] = useState("");

  const tableRepresentation = representationContract || null;

  const representationViewId = tableRepresentation?.meta?.viewId;
  const isSystemRepresentation =
    tableRepresentation?.meta?.isSystem === true ||
    tableRepresentation?.meta?.isBaseState === true;
  const representationKey = String(tableRepresentation?.key || activeViewKey || "").trim();

  /** Карандаш в header модалки — Table Representation.name, не Object View tab. */
  const canShowRenamePencil = !isSystemRepresentation;
  const canRenameRepresentation =
    Boolean(canRename) || (Boolean(canSave) && !isSystemRepresentation);

  const representationName = String(tableRepresentation?.name ?? "").trim();
  const viewName = representationName || representationKey || "Представление";
  const isDefaultView = tableRepresentation?.meta?.isDefault === true;

  const layoutCustomizationEnabled = Boolean(canCustomizeLayout || canSave);

  const defaultBounds = useMemo(() => {
    if (anchorEl) {
      return anchorToModalDefaultBounds(anchorEl);
    }

    return OBJECT_TABLE_VIEW_SETTINGS_DEFAULT_BOUNDS;
  }, [anchorEl, open]);

  const summaries = useMemo(
    () =>
      buildObjectTableViewSummaries({
        effectiveContract,
        catalog,
        objectTypeKey,
      }),
    [effectiveContract, catalog, objectTypeKey],
  );

  const handleClose = useCallback(
    (reason) => {
      setIsRenaming(false);
      setRenameValue("");
      setRenameError("");
      onClose?.(reason);
    },
    [onClose],
  );

  useEffect(() => {
    if (!open) {
      setExpandedKey(null);
      setIsRenaming(false);
      setRenameValue("");
      setRenameError("");
      return;
    }

    setExpandedKey(initialExpandedKey || null);
  }, [open, initialExpandedKey]);

  useEffect(() => {
    if (!isRenaming) {
      return undefined;
    }

    const timeout = window.setTimeout(() => {
      renameInputRef.current?.focus?.();
      renameInputRef.current?.select?.();
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [isRenaming]);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const handleMouseDown = (event) => {
      const inPanel = event.target?.closest?.(
        `[data-platform-modal-panel][data-platform-modal-key="${OBJECT_TABLE_VIEW_SETTINGS_PANEL_KEY}"]`,
      );
      const inAnchor = anchorEl?.contains?.(event.target);

      if (!inPanel && !inAnchor && !isInsideProtectedSurface(event.target)) {
        handleClose("outside");
      }
    };

    const handleKeyDown = (event) => {
      if (event.key !== "Escape") {
        return;
      }

      event.stopPropagation();

      if (isRenaming) {
        setIsRenaming(false);
        setRenameValue("");
        setRenameError("");
        return;
      }

      handleClose("escape");
    };

    document.addEventListener("mousedown", handleMouseDown);
    document.addEventListener("keydown", handleKeyDown, true);

    return () => {
      document.removeEventListener("mousedown", handleMouseDown);
      document.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [open, handleClose, anchorEl, isRenaming]);

  const handleSave = async () => {
    const saved = await onSave?.();

    if (saved !== false) {
      handleClose("save");
    }
  };

  const handleDelete = () => {
    const confirmed = window.confirm(
      `Удалить представление «${viewName}»?`,
    );

    if (confirmed) {
      onDelete?.();
      handleClose("delete");
    }
  };

  const handleCreateFromSaveAs = async (payload) => {
    const result = await onCreateView?.({
      ...payload,
      copyCurrent: true,
    });

    if (result?.ok) {
      setIsSaveAsOpen(false);
      sessionApi?.markSaved?.();
    }

    return result;
  };

  const handleStartRename = (event) => {
    event?.preventDefault?.();
    event?.stopPropagation?.();

    if (!canShowRenamePencil) {
      return;
    }

    if (isRenaming) {
      setIsRenaming(false);
      setRenameValue("");
      setRenameError("");
      return;
    }

    setRenameValue(representationName || viewName);
    setRenameError("");
    setIsRenaming(true);
  };

  const handleSubmitRename = async (event) => {
    event?.preventDefault?.();
    event?.stopPropagation?.();

    if (!canRenameRepresentation) {
      setRenameError("Переименование недоступно в этом режиме");
      return;
    }

    const trimmed = renameValue.trim();

    if (!trimmed) {
      setRenameError("Введите название");
      return;
    }

    if (trimmed === representationName) {
      setIsRenaming(false);
      setRenameValue("");
      setRenameError("");
      return;
    }

    const ok = await onRename?.(trimmed);

    if (ok === false) {
      setRenameError(actionError || "Не удалось переименовать");
      return;
    }

    setIsRenaming(false);
    setRenameValue("");
    setRenameError("");
  };

  const handleCancelRename = (event) => {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    setIsRenaming(false);
    setRenameValue("");
    setRenameError("");
  };

  const rows = useMemo(
    () =>
      SECTION_META.map((meta) => ({
        ...meta,
        description: summaries[meta.summaryKey],
        renderContent: () => {
          if (meta.key === "fields") {
            return (
              <ObjectTableViewSettingsFieldsDetails
                effectiveContract={effectiveContract}
                catalog={catalog}
                objectTypeKey={objectTypeKey}
                sessionApi={sessionApi}
              />
            );
          }

          if (meta.key === "filters") {
            return (
              <ObjectTableViewSettingsFiltersDetails
                effectiveContract={effectiveContract}
                catalog={catalog}
                objectTypeKey={objectTypeKey}
                onOpenFilters={onOpenFiltersEditor}
                onEditSavedFilter={onEditSavedFilter}
                onDeleteSavedFilter={onDeleteSavedFilter}
              />
            );
          }

          if (meta.key === "sort") {
            return (
              <ObjectTableViewSettingsSortDetails
                effectiveContract={effectiveContract}
                catalog={catalog}
                objectTypeKey={objectTypeKey}
                sessionApi={sessionApi}
              />
            );
          }

          return (
            <ObjectTableViewSettingsColumnsDetails
              effectiveContract={effectiveContract}
              catalog={catalog}
              objectTypeKey={objectTypeKey}
              sessionApi={sessionApi}
            />
          );
        },
      })),
    [
      summaries,
      effectiveContract,
      catalog,
      objectTypeKey,
      sessionApi,
      onOpenFiltersEditor,
      onEditSavedFilter,
      onDeleteSavedFilter,
    ],
  );

  const footer = (
    <div className="ot-view-settings-panel__footer">
      <button
        type="button"
        className="ot-view-settings-panel__footer-save"
        disabled={!canSave || !isDirty || saving}
        title={
          !canSave
            ? "Сохранение недоступно"
            : !isDirty
              ? "Нет несохранённых изменений"
              : ""
        }
        onClick={() => void handleSave()}
      >
        <img
          src={saveIcon}
          alt=""
          className="ot-view-settings-panel__footer-icon"
          draggable={false}
        />
        {saving ? "Сохранение…" : "Сохранить"}
      </button>

      <button
        type="button"
        className="ot-view-settings-panel__footer-delete"
        disabled={!canDelete || actionLoading}
        onClick={handleDelete}
      >
        <img
          src={deleteIcon}
          alt=""
          className="ot-view-settings-panel__footer-icon"
          draggable={false}
        />
        Удалить
      </button>
    </div>
  );

  return (
    <>
      <PlatformModal
        open={open}
        modalKey={OBJECT_TABLE_VIEW_SETTINGS_PANEL_KEY}
        onClose={handleClose}
        hideHeader
        transparentBackdrop
        canCustomizeLayout={layoutCustomizationEnabled}
        defaultBounds={defaultBounds}
        ariaLabel="Настройки представления таблицы"
        footer={footer}
        contentStyle={{
          display: "flex",
          flexDirection: "column",
          minHeight: 0,
          padding: 0,
          overflow: "hidden",
        }}
      >
        {({ headerCursor, startDrag }) => (
        <div
          className="ot-view-settings-panel object-table-view-settings"
          data-object-table-view-settings-panel="true"
        >
          <header
            className="ot-view-settings-panel__header object-table-view-settings__header"
            style={{ cursor: headerCursor }}
            onMouseDown={layoutCustomizationEnabled ? startDrag : undefined}
            data-platform-modal-drag-handle
          >
            <div className="ot-view-settings-panel__title-wrap">
              {isRenaming ? (
                <form
                  className="ot-view-settings-panel__rename-form"
                  onSubmit={handleSubmitRename}
                  onClick={(event) => event.stopPropagation()}
                  onMouseDown={(event) => event.stopPropagation()}
                  data-platform-modal-no-drag
                >
                  <input
                    ref={renameInputRef}
                    className="ot-view-settings-panel__rename-input"
                    value={renameValue}
                    onChange={(event) => setRenameValue(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Escape") {
                        handleCancelRename(event);
                      }
                    }}
                  />
                </form>
              ) : (
                <>
                  <h2
                    className="ot-view-settings-panel__title object-table-view-settings__title"
                    title={viewName}
                  >
                    {viewName}
                  </h2>
                  <button
                    type="button"
                    className={`ot-view-settings-panel__star${isDefaultView ? " is-default" : ""}`}
                    disabled={!canSetDefault || isDefaultView}
                    title={
                      isDefaultView
                        ? "Представление по умолчанию"
                        : "Сделать по умолчанию"
                    }
                    onClick={() => onSetDefault?.()}
                    onMouseDown={(event) => event.stopPropagation()}
                    data-platform-modal-no-drag
                  >
                    {isDefaultView ? "★" : "☆"}
                  </button>
                </>
              )}
            </div>

            <div className="ot-view-settings-panel__header-tools object-table-view-settings__header-tools">
              {canShowRenamePencil ? (
                isRenaming ? (
                  <div
                    className="ot-view-settings-panel__rename-actions"
                    data-platform-modal-no-drag
                  >
                    <button
                      type="button"
                      className="ot-view-settings-panel__rename-confirm"
                      disabled={!canRenameRepresentation || actionLoading}
                      onClick={(event) => void handleSubmitRename(event)}
                      onMouseDown={(event) => event.stopPropagation()}
                    >
                      {actionLoading ? "…" : "Сохранить"}
                    </button>
                    <button
                      type="button"
                      className="ot-view-settings-panel__rename-cancel"
                      onClick={handleCancelRename}
                      onMouseDown={(event) => event.stopPropagation()}
                    >
                      Отмена
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="ot-view-settings-panel__icon-btn object-table-view-settings__icon-btn"
                    title="Переименовать представление"
                    disabled={!canRenameRepresentation || actionLoading}
                    onClick={handleStartRename}
                    onMouseDown={(event) => event.stopPropagation()}
                    data-platform-modal-no-drag
                    aria-label="Переименовать представление"
                  >
                    <img src={editIcon} alt="" draggable={false} />
                  </button>
                )
              ) : null}

              <button
                type="button"
                className="ot-view-settings-panel__icon-btn object-table-view-settings__icon-btn"
                title={
                  isViewHidden
                    ? "Показать представление"
                    : "Скрыть представление"
                }
                onClick={() => onToggleViewVisibility?.()}
                onMouseDown={(event) => event.stopPropagation()}
                data-platform-modal-no-drag
                aria-label={
                  isViewHidden
                    ? "Показать представление"
                    : "Скрыть представление"
                }
              >
                <img
                  src={isViewHidden ? eyeClosedIcon : eyeOpenIcon}
                  alt=""
                  draggable={false}
                />
              </button>
            </div>
          </header>

          {renameError ? (
            <div
              className="designer-error"
              style={{ margin: "0 14px 8px", fontSize: 12 }}
            >
              {renameError}
            </div>
          ) : null}

          <div className="ot-view-settings-panel__body object-table-view-settings__scroll">
            <div className="ot-view-settings-panel__body-block">
              <p
                className="ot-view-settings-panel__summary object-table-view-settings__summary"
                title={summaries.cardSummaryLine}
              >
                {summaries.cardSummaryLine}
                {isDirty ? " *" : ""}
              </p>

              {saveError ? (
                <div
                  className="designer-error"
                  style={{ marginBottom: 8, fontSize: 12 }}
                >
                  {saveError}
                </div>
              ) : null}

              {actionError && !renameError ? (
                <div
                  className="designer-error"
                  style={{ marginBottom: 8, fontSize: 12 }}
                >
                  {actionError}
                </div>
              ) : null}

              <p className="ot-view-settings-panel__section-title object-table-view-settings__section-title">
                Настройки представления
              </p>

              <ObjectTableViewSettingsRows
                rows={rows}
                expandedKey={expandedKey}
                onToggleExpanded={(key) =>
                  setExpandedKey((current) => (current === key ? null : key))
                }
              />
            </div>

            <div className="ot-view-settings-panel__actions-block object-table-view-settings__actions-block">
              <p className="ot-view-settings-panel__section-title object-table-view-settings__section-title">
                Действия
              </p>

              <button
                type="button"
                className="ot-view-settings-panel__action-btn object-table-view-settings__action-row"
                disabled={isSystemRepresentation && !isDirty}
                title={
                  isSystemRepresentation && !isDirty
                    ? "Сначала измените настройки таблицы"
                    : ""
                }
                onClick={() => setIsSaveAsOpen(true)}
              >
                <img
                  src={viewSaveAsIcon}
                  alt=""
                  className="ot-view-settings-panel__action-icon"
                  draggable={false}
                />
                Сохранить как новое
              </button>

              <button
                type="button"
                className="ot-view-settings-panel__action-btn object-table-view-settings__action-row"
                disabled={!canDuplicate || actionLoading}
                onClick={() => void onDuplicate?.()}
              >
                <img
                  src={viewDuplicateIcon}
                  alt=""
                  className="ot-view-settings-panel__action-icon"
                  draggable={false}
                />
                Дублировать
              </button>
            </div>
          </div>
        </div>
        )}
      </PlatformModal>

      <ObjectTableCreateViewDialog
        open={isSaveAsOpen}
        onClose={() => setIsSaveAsOpen(false)}
        onCreate={handleCreateFromSaveAs}
        creating={creating}
        createError={createError}
      />
    </>
  );
}
