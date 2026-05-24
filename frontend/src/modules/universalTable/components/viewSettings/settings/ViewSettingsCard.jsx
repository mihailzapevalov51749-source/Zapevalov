import { useEffect, useRef, useState } from "react";

import eyeOpenIcon from "../../../../../assets/icons/eye-open.png";
import eyeClosedIcon from "../../../../../assets/icons/eye-closed.png";

import viewFieldsIcon from "../../../../../assets/icons/view.png";
import viewFiltersIcon from "../../../../../assets/icons/view-filters.png";
import viewSortIcon from "../../../../../assets/icons/view-sort.png";
import viewColumnsIcon from "../../../../../assets/icons/view-columns.png";

import viewSaveAsIcon from "../../../../../assets/icons/view-save-as.png";
import viewDuplicateIcon from "../../../../../assets/icons/view-duplicate.png";

import editIcon from "../../../../../assets/icons/edit.png";
import deleteIcon from "../../../../../assets/icons/delet.png";
import saveIcon from "../../../../../assets/icons/save.gif";

import ViewSettingsRows from "./ViewSettingsRows";
import ViewSettingsFieldsDetails from "./ViewSettingsFieldsDetails";
import ViewSettingsFiltersDetails from "./ViewSettingsFiltersDetails";

import {
  getHiddenColumnsCount,
  getConditionsCount,
} from "../helpers/tableRepresentationViewUtils";

import {
  settingsCardStyle,
  settingsHeaderStyle,
  settingsHeaderTitleWrapperStyle,
  settingsHeaderTitleStyle,
  settingsIconButtonStyle,
  settingsBodyStyle,
  settingsBodyBlockStyle,
  settingsActionsBlockStyle,
  settingsCardSummaryStyle,
  settingsSectionTitleStyle,
  settingsHeaderImageStyle,
  settingsActionButtonStyle,
  settingsActionImageStyle,
  settingsFooterStyle,
  settingsFooterSaveButtonStyle,
  settingsFooterDeleteButtonStyle,
  settingsFooterImageStyle,
  settingsDetailRowStyle,
} from "./viewSettingsStyles";

export default function ViewSettingsCard({
  representation,

  columns = [],
  tableViewState = {},
  activeRepresentationId = null,

  sortLabel = "Без сортировки",
  hasColumnOrderChanges = false,

  isDefault = false,
  isHidden = false,
  canSave = true,

  isRenaming = false,
  renameValue = "",
  setRenameValue,

  onSave,
  onDelete,
  onToggleVisibility,
  onSetDefault,

  onStartRename,
  onSubmitRename,
  onCancelRename,

  onSaveAs,
  onDuplicate,

  onToggleColumnVisibility,
  onOpenRepresentationFilters,

  handleStartDragColumnWithSystem,
  handleDragOverColumnWithSystem,
  handleDropColumnWithSystem,
}) {
  const [expandedKey, setExpandedKey] = useState(null);

  const renameInputRef = useRef(null);

  useEffect(() => {
    if (!isRenaming) return;

    const timeout = setTimeout(() => {
      renameInputRef.current?.focus?.();
      renameInputRef.current?.select?.();
    }, 0);

    return () => clearTimeout(timeout);
  }, [isRenaming]);

  const title = representation?.name || "Без названия";

  const hiddenFieldsCount = getHiddenColumnsCount(
    representation,
    tableViewState,
    activeRepresentationId
  );

  const filtersCount = getConditionsCount(representation);

  const rows = [
    {
      key: "fields",
      icon: viewFieldsIcon,
      title: "Поля",
      description:
        hiddenFieldsCount > 0 ? `Скрыто: ${hiddenFieldsCount}` : "Все поля",
      renderContent: () => (
        <ViewSettingsFieldsDetails
          representation={representation}
          columns={columns}
          tableViewState={tableViewState}
          activeRepresentationId={activeRepresentationId}
          onToggleColumnVisibility={onToggleColumnVisibility}
          handleStartDragColumnWithSystem={handleStartDragColumnWithSystem}
          handleDragOverColumnWithSystem={handleDragOverColumnWithSystem}
          handleDropColumnWithSystem={handleDropColumnWithSystem}
        />
      ),
    },
    {
      key: "filters",
      icon: viewFiltersIcon,
      title: "Фильтры",
      description: filtersCount > 0 ? `Условий: ${filtersCount}` : "Без фильтра",
      renderContent: () => (
        <ViewSettingsFiltersDetails
          representation={representation}
          columns={columns}
          onOpenRepresentationFilters={onOpenRepresentationFilters}
        />
      ),
    },
    {
      key: "sort",
      icon: viewSortIcon,
      title: "Сортировка",
      description: sortLabel || "Без сортировки",
      renderContent: () => (
        <div style={settingsDetailRowStyle}>
          {sortLabel || "Сортировка не настроена"}
        </div>
      ),
    },
    {
      key: "columns",
      icon: viewColumnsIcon,
      title: "Колонки",
      description: hasColumnOrderChanges
        ? "Порядок изменён"
        : "Стандартный порядок",
      renderContent: () => (
        <div style={settingsDetailRowStyle}>
          {hasColumnOrderChanges
            ? "Порядок колонок изменён"
            : "Стандартный порядок"}
        </div>
      ),
    },
  ];

  return (
    <div style={settingsCardStyle}>
      <div style={settingsHeaderStyle}>
        <div style={settingsHeaderTitleWrapperStyle}>
          {isRenaming ? (
            <form
              data-representation-rename="true"
              onSubmit={(event) => {
                event.preventDefault();
                event.stopPropagation();

                onSubmitRename?.(event);
              }}
              onClick={(event) => {
                event.stopPropagation();
              }}
              onPointerDown={(event) => {
                event.stopPropagation();
              }}
              style={{
                flex: 1,
                minWidth: 0,
              }}
            >
              <input
                data-representation-rename="true"
                ref={renameInputRef}
                value={renameValue}
                onChange={(event) => setRenameValue?.(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Escape") {
                    event.preventDefault();
                    event.stopPropagation();
                    onCancelRename?.(event);
                  }
                }}
                style={{
                  width: "100%",
                  height: 34,
                  borderRadius: 9,
                  border: "1px solid #bfdbfe",
                  background: "#ffffff",
                  padding: "0 12px",
                  outline: "none",
                  fontSize: 15,
                  fontWeight: 700,
                  color: "#111827",
                }}
              />
            </form>
          ) : (
            <>
              <div style={settingsHeaderTitleStyle} title={title}>
                {title}
              </div>

              <button
                type="button"
                onClick={onSetDefault}
                disabled={isDefault}
                title={
                  isDefault
                    ? "Представление по умолчанию"
                    : "Сделать по умолчанию"
                }
                style={{
                  border: "none",
                  background: "transparent",
                  cursor: isDefault ? "default" : "pointer",
                  padding: 0,
                  color: isDefault ? "#2563eb" : "#9aa7ba",
                  fontSize: 20,
                  lineHeight: 1,
                  flexShrink: 0,
                }}
              >
                {isDefault ? "★" : "☆"}
              </button>
            </>
          )}
        </div>

        <button
          type="button"
          onClick={(event) => {
            if (isRenaming) {
              onCancelRename?.(event);
              return;
            }

            onStartRename?.(event);
          }}
          title={isRenaming ? "Отменить переименование" : "Переименовать"}
          style={{
            ...settingsIconButtonStyle,
            background: isRenaming ? "#eff6ff" : "#ffffff",
            borderColor: isRenaming ? "#93c5fd" : "#dbe3ef",
          }}
        >
          <img
            src={editIcon}
            alt=""
            draggable={false}
            style={settingsHeaderImageStyle}
          />
        </button>

        <button
          type="button"
          onClick={onToggleVisibility}
          title={isHidden ? "Показать представление" : "Скрыть представление"}
          style={settingsIconButtonStyle}
        >
          <img
            src={isHidden ? eyeClosedIcon : eyeOpenIcon}
            alt=""
            draggable={false}
            style={settingsHeaderImageStyle}
          />
        </button>
      </div>

      <div style={settingsBodyStyle}>
        <div style={settingsBodyBlockStyle}>
          <div style={settingsCardSummaryStyle}>
            {[
              hiddenFieldsCount > 0
                ? `${hiddenFieldsCount} скрытых полей`
                : "все поля",
              filtersCount > 0 ? `${filtersCount} фильтра` : "без фильтра",
              sortLabel || "без сортировки",
            ].join(" • ")}
          </div>

          <div style={settingsSectionTitleStyle}>Настройки представления</div>

          <ViewSettingsRows
            rows={rows}
            expandedKey={expandedKey}
            onToggleExpanded={(key) =>
              setExpandedKey((currentKey) =>
                currentKey === key ? null : key
              )
            }
          />
        </div>

        <div style={settingsActionsBlockStyle}>
          <div style={settingsSectionTitleStyle}>Действия</div>

          <button
            type="button"
            onClick={onSaveAs}
            style={settingsActionButtonStyle}
          >
            <img
              src={viewSaveAsIcon}
              alt=""
              draggable={false}
              style={settingsActionImageStyle}
            />
            Сохранить как новое
          </button>

          <button
            type="button"
            onClick={onDuplicate}
            style={settingsActionButtonStyle}
          >
            <img
              src={viewDuplicateIcon}
              alt=""
              draggable={false}
              style={settingsActionImageStyle}
            />
            Дублировать
          </button>
        </div>
      </div>

      <div style={settingsFooterStyle}>
        <button
          type="button"
          onClick={onSave}
          disabled={!canSave}
          style={{
            ...settingsFooterSaveButtonStyle,
            opacity: canSave ? 1 : 0.55,
            cursor: canSave ? "pointer" : "not-allowed",
          }}
        >
          <img
            src={saveIcon}
            alt=""
            draggable={false}
            style={settingsFooterImageStyle}
          />
          Сохранить
        </button>

        <button
          type="button"
          onClick={onDelete}
          style={settingsFooterDeleteButtonStyle}
        >
          <img
            src={deleteIcon}
            alt=""
            draggable={false}
            style={settingsFooterImageStyle}
          />
          Удалить
        </button>
      </div>
    </div>
  );
}