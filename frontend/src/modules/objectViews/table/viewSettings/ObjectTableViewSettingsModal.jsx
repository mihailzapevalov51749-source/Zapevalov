import { useCallback, useEffect, useMemo, useState } from "react";

import closeIcon from "../../../../assets/icons/x.svg";
import editIcon from "../../../../assets/icons/edit.png";
import eyeOpenIcon from "../../../../assets/icons/eye-open.png";
import settingsIcon from "../../../../assets/icons/settings.gif";
import viewFieldsIcon from "../../../../assets/icons/view.png";
import viewFiltersIcon from "../../../../assets/icons/view-filters.png";
import viewSortIcon from "../../../../assets/icons/view-sort.png";
import viewColumnsIcon from "../../../../assets/icons/view-columns.png";
import viewSaveAsIcon from "../../../../assets/icons/view-save-as.png";
import viewDuplicateIcon from "../../../../assets/icons/view-duplicate.png";
import deleteIcon from "../../../../assets/icons/delet.png";
import saveIcon from "../../../../assets/icons/save.gif";

import PlatformModalShell from "../../../../shared/platformModal/PlatformModalShell";
import usePlatformModalLayout from "../../../../shared/platformModal/usePlatformModalLayout";
import ObjectTableCreateViewDialog from "../components/ObjectTableCreateViewDialog";
import ObjectTableRenameViewDialog from "../components/ObjectTableRenameViewDialog";

import ObjectTableViewSettingsColumnsModal from "./ObjectTableViewSettingsColumnsModal";
import ObjectTableViewSettingsFieldsModal from "./ObjectTableViewSettingsFieldsModal";
import ObjectTableViewSettingsFiltersModal from "./ObjectTableViewSettingsFiltersModal";
import ObjectTableViewSettingsSortModal from "./ObjectTableViewSettingsSortModal";
import {
  OBJECT_TABLE_VIEW_SETTINGS_DEFAULT_BOUNDS,
  OBJECT_TABLE_VIEW_SETTINGS_PANEL_KEY,
} from "./objectTableViewSettingsModalKeys";
import { buildObjectTableViewSummaries } from "./objectTableViewSettingsSummaries";

import "./objectTableViewSettings.css";

const SECTION_ROWS = [
  { key: "fields", title: "Поля", icon: viewFieldsIcon, summaryKey: "fieldsSummary" },
  { key: "filters", title: "Фильтры", icon: viewFiltersIcon, summaryKey: "filtersSummary" },
  { key: "sort", title: "Сортировка", icon: viewSortIcon, summaryKey: "sortSummary" },
  { key: "columns", title: "Колонки", icon: viewColumnsIcon, summaryKey: "columnsSummary" },
];

export default function ObjectTableViewSettingsModal({
  open = false,
  onClose,
  canCustomizeLayout = false,
  activeViewContract = null,
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
  actionLoading = false,
  actionError = "",
  onAppliedFilters,
}) {
  const [childSection, setChildSection] = useState(null);
  const [isSaveAsOpen, setIsSaveAsOpen] = useState(false);
  const [isRenameOpen, setIsRenameOpen] = useState(false);

  const layout = usePlatformModalLayout({
    modalKey: OBJECT_TABLE_VIEW_SETTINGS_PANEL_KEY,
    open,
    canCustomizeLayout,
    defaultBounds: OBJECT_TABLE_VIEW_SETTINGS_DEFAULT_BOUNDS,
  });

  const { persistCurrentBounds, bounds, headerCursor, startDrag, startResize } =
    layout;

  useEffect(() => {
    if (!open) {
      setChildSection(null);
    }
  }, [open]);

  const viewName = activeViewContract?.name || activeViewKey || "Представление";
  const isDefaultView = activeViewContract?.meta?.isDefault === true;

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
      setChildSection(null);
      persistCurrentBounds();
      onClose?.(reason);
    },
    [onClose, persistCurrentBounds],
  );

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        event.preventDefault();
        handleClose("escape");
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, handleClose]);

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

  const footer = (
    <div className="object-table-view-settings__footer">
      <button
        type="button"
        className="object-table-view-settings__footer-save"
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
          className="object-table-view-settings__footer-btn-icon"
        />
        {saving ? "Сохранение…" : "Сохранить"}
      </button>

      <button
        type="button"
        className="object-table-view-settings__footer-delete"
        disabled={!canDelete || actionLoading}
        onClick={handleDelete}
      >
        <img
          src={deleteIcon}
          alt=""
          className="object-table-view-settings__footer-btn-icon"
        />
        Удалить
      </button>
    </div>
  );

  return (
    <>
      <PlatformModalShell
        open={open}
        modalKey={OBJECT_TABLE_VIEW_SETTINGS_PANEL_KEY}
        onClose={handleClose}
        hideHeader
        canCustomizeLayout={canCustomizeLayout}
        ariaLabel="Настройки представления таблицы"
        footer={footer}
        contentStyle={{
          display: "flex",
          flexDirection: "column",
          minHeight: 0,
          padding: 0,
          overflow: "hidden",
        }}
        bounds={bounds}
        headerCursor={headerCursor}
        startDrag={startDrag}
        startResize={startResize}
      >
        <div className="object-table-view-settings">
          <header
            className="object-table-view-settings__header"
            style={{ cursor: headerCursor }}
            onMouseDown={canCustomizeLayout ? startDrag : undefined}
            data-platform-modal-drag-handle
          >
            <div className="object-table-view-settings__header-top">
              <div className="object-table-view-settings__title-row">
                <h2 className="object-table-view-settings__title" title={viewName}>
                  {viewName}
                </h2>
                <button
                  type="button"
                  className={`object-table-view-settings__star-btn${isDefaultView ? " is-default" : ""}`}
                  disabled={!canSetDefault || isDefaultView}
                  title={
                    isDefaultView
                      ? "Представление по умолчанию"
                      : "Сделать по умолчанию"
                  }
                  onClick={() => onSetDefault?.()}
                  onMouseDown={(event) => event.stopPropagation()}
                >
                  {isDefaultView ? "★" : "☆"}
                </button>
              </div>

              <div className="object-table-view-settings__header-tools">
                {canRename ? (
                  <button
                    type="button"
                    className="object-table-view-settings__icon-btn"
                    title="Редактировать"
                    disabled={actionLoading}
                    onClick={() => setIsRenameOpen(true)}
                    onMouseDown={(event) => event.stopPropagation()}
                  >
                    <img src={editIcon} alt="" />
                  </button>
                ) : null}

                <button
                  type="button"
                  className="object-table-view-settings__icon-btn"
                  title="Показать/скрыть"
                  disabled
                  onMouseDown={(event) => event.stopPropagation()}
                >
                  <img src={eyeOpenIcon} alt="" />
                </button>

                <button
                  type="button"
                  className="object-table-view-settings__icon-btn is-active"
                  title="Настройки представления"
                  aria-current="true"
                  onMouseDown={(event) => event.stopPropagation()}
                >
                  <img src={settingsIcon} alt="" />
                </button>

                <button
                  type="button"
                  className="object-table-view-settings__close-btn"
                  aria-label="Закрыть"
                  onClick={() => handleClose("close-button")}
                  onMouseDown={(event) => event.stopPropagation()}
                  data-platform-modal-no-drag
                >
                  <img src={closeIcon} alt="" draggable={false} />
                </button>
              </div>
            </div>

            <p className="object-table-view-settings__summary" title={summaries.summaryLine}>
              {summaries.summaryLine}
            </p>
          </header>

          <div className="object-table-view-settings__scroll">
            {saveError ? (
              <div className="designer-error" style={{ marginBottom: 8, fontSize: 12 }}>
                {saveError}
              </div>
            ) : null}

            {actionError ? (
              <div className="designer-error" style={{ marginBottom: 8, fontSize: 12 }}>
                {actionError}
              </div>
            ) : null}

            <p className="object-table-view-settings__section-title">
              Настройки представления
            </p>

            <div className="object-table-view-settings__settings-list">
              {SECTION_ROWS.map((row) => (
                <div
                  key={row.key}
                  className="object-table-view-settings__settings-item"
                >
                  <button
                    type="button"
                    className="object-table-view-settings__row"
                    onClick={() => setChildSection(row.key)}
                  >
                    <span className="object-table-view-settings__row-icon-wrap">
                      <img
                        src={row.icon}
                        alt=""
                        className="object-table-view-settings__row-icon"
                      />
                    </span>
                    <span className="object-table-view-settings__row-main">
                      <span className="object-table-view-settings__row-title">
                        {row.title}
                      </span>
                      <span className="object-table-view-settings__row-desc">
                        {summaries[row.summaryKey]}
                      </span>
                    </span>
                    <span className="object-table-view-settings__row-chevron">›</span>
                  </button>
                </div>
              ))}
            </div>

            <div className="object-table-view-settings__actions-block">
              <p
                className="object-table-view-settings__section-title"
                style={{ marginTop: 14 }}
              >
                Действия
              </p>

              <button
                type="button"
                className="object-table-view-settings__action-row"
                onClick={() => setIsSaveAsOpen(true)}
              >
                <img
                  src={viewSaveAsIcon}
                  alt=""
                  className="object-table-view-settings__action-icon"
                />
                Сохранить как новое
              </button>

              <button
                type="button"
                className="object-table-view-settings__action-row"
                disabled={!canDuplicate || actionLoading}
                onClick={() => {
                  onDuplicate?.();
                  handleClose("duplicate");
                }}
              >
                <img
                  src={viewDuplicateIcon}
                  alt=""
                  className="object-table-view-settings__action-icon"
                />
                Дублировать
              </button>
            </div>
          </div>
        </div>
      </PlatformModalShell>

      <ObjectTableViewSettingsFieldsModal
        open={childSection === "fields"}
        onClose={() => setChildSection(null)}
        canCustomizeLayout={canCustomizeLayout}
        effectiveContract={effectiveContract}
        catalog={catalog}
        objectTypeKey={objectTypeKey}
        sessionApi={sessionApi}
      />

      <ObjectTableViewSettingsFiltersModal
        open={childSection === "filters"}
        onClose={() => setChildSection(null)}
        canCustomizeLayout={canCustomizeLayout}
        effectiveContract={effectiveContract}
        catalog={catalog}
        objectTypeKey={objectTypeKey}
        sessionApi={sessionApi}
        onApplied={onAppliedFilters}
        savedFilters={effectiveContract?.query?.filters?.savedFilters || []}
      />

      <ObjectTableViewSettingsSortModal
        open={childSection === "sort"}
        onClose={() => setChildSection(null)}
        canCustomizeLayout={canCustomizeLayout}
        effectiveContract={effectiveContract}
        catalog={catalog}
        objectTypeKey={objectTypeKey}
        sessionApi={sessionApi}
      />

      <ObjectTableViewSettingsColumnsModal
        open={childSection === "columns"}
        onClose={() => setChildSection(null)}
        canCustomizeLayout={canCustomizeLayout}
        effectiveContract={effectiveContract}
        catalog={catalog}
        objectTypeKey={objectTypeKey}
        sessionApi={sessionApi}
      />

      <ObjectTableCreateViewDialog
        open={isSaveAsOpen}
        onClose={() => setIsSaveAsOpen(false)}
        onCreate={handleCreateFromSaveAs}
        creating={creating}
        createError={createError}
      />

      <ObjectTableRenameViewDialog
        open={isRenameOpen}
        initialName={viewName}
        onClose={() => setIsRenameOpen(false)}
        onRename={onRename}
        loading={actionLoading}
        error={actionError}
      />
    </>
  );
}
