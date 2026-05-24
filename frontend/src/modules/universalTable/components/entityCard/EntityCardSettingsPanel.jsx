import { useMemo } from "react";

import closeIcon from "../../../../assets/icons/x.svg";
import saveIcon from "../../../../assets/icons/save.gif";
import eyeOpenIcon from "../../../../assets/icons/eye-open.png";
import eyeClosedIcon from "../../../../assets/icons/eye-closed.png";

import {
  overlayStyle,
  panelStyle,
  headerStyle,
  titleStyle,
  closeButtonStyle,
  contentStyle,
  sectionStyle,
  sectionHeaderStyle,
  sectionHeaderLeftStyle,
  sectionTitleStyle,
  sectionDescriptionStyle,
  listStyle,
  rowStyle,
  dragOverRowStyle,
  leftStyle,
  dragHandleStyle,
  rowLabelStyle,
  disabledRowLabelStyle,
  moveButtonsStyle,
  visibilityButtonStyle,
  visibilityIconStyle,
  footerStyle,
  saveButtonStyle,
  saveIconStyle,
} from "./styles/entityCardSettingsPanelStyles";

import { getEntityCardConfig } from "./services/entityCardConfig";

import {
  getColumnId,
  getSectionLabel,
  isSectionEnabled,
} from "./services/entityCardSettingsHelpers";

import useEntityCardSettings from "./hooks/useEntityCardSettings";

const collapseButtonStyle = {
  width: 28,
  height: 28,
  border: "none",
  borderRadius: 8,
  background: "transparent",
  color: "#64748B",
  fontSize: 16,
  cursor: "pointer",
};

const rowTextWrapperStyle = {
  minWidth: 0,
  display: "flex",
  flexDirection: "column",
  gap: 3,
};

const footerActionsStyle = {
  display: "flex",
  gap: 10,
};

const resetButtonStyle = {
  width: "42%",
  height: 42,
  border: "1px solid #CBD5E1",
  borderRadius: 14,
  background: "#FFFFFF",
  color: "#475569",
  fontSize: 14,
  fontWeight: 700,
  cursor: "pointer",
};

const saveButtonCompactStyle = {
  ...saveButtonStyle,
  width: "58%",
};

export default function EntityCardSettingsPanel({
  table,
  columns = [],
  onClose,
  onSave,
}) {
  const config = useMemo(
    () => getEntityCardConfig(table),
    [table]
  );

  const {
    orderedSections,
    draftTabs,
    isSidebarEnabled,
    visibleFieldRows,

    collapsedGroups,
    dragOverSectionId,
    dragOverTabId,
    dragOverFieldId,

    setIsSidebarEnabled,

    toggleGroup,
    toggleSection,
    toggleTab,
    toggleField,

    isTabEnabled,
    isFieldEnabled,

    handleSave,
    handleResetDefaults,

    handleStartDragSection,
    handleDragOverSection,
    handleDropSection,

    handleStartDragTab,
    handleDragOverTab,
    handleDropTab,

    handleStartDragField,
    handleDragOverField,
    handleDropField,

    handleDragLeave,
  } = useEntityCardSettings({
    config,
    columns,
    onSave,
  });

  const renderVisibilityButton = ({
    isVisible,
    onClick,
    visibleTitle = "Скрыть",
    hiddenTitle = "Показать",
  }) => (
    <button
      type="button"
      onClick={onClick}
      style={visibilityButtonStyle}
      title={isVisible ? visibleTitle : hiddenTitle}
    >
      <img
        src={isVisible ? eyeOpenIcon : eyeClosedIcon}
        alt=""
        style={visibilityIconStyle}
      />
    </button>
  );

  const renderSectionHeader = ({
    groupKey,
    title,
    description,
  }) => {
    const isCollapsed = collapsedGroups?.[groupKey] === true;

    return (
      <div style={sectionHeaderStyle}>
        <div style={sectionHeaderLeftStyle}>
          <div>
            <div style={sectionTitleStyle}>{title}</div>

            {description ? (
              <div style={sectionDescriptionStyle}>
                {description}
              </div>
            ) : null}
          </div>
        </div>

        <button
          type="button"
          onClick={() => toggleGroup(groupKey)}
          style={collapseButtonStyle}
          title={isCollapsed ? "Развернуть" : "Свернуть"}
        >
          {isCollapsed ? "⌄" : "⌃"}
        </button>
      </div>
    );
  };

  const renderSettingsRow = ({
    keyValue,
    label,
    isVisible = true,
    onToggle,

    draggable = false,
    isDragOver = false,
    onDragStart,
    onDragOver,
    onDragLeave,
    onDrop,
  }) => (
    <div
      key={keyValue}
      style={isDragOver ? dragOverRowStyle : rowStyle}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <div style={leftStyle}>
        <div style={dragHandleStyle}>⋮⋮</div>

        <div style={rowTextWrapperStyle}>
          <div
            style={
              isVisible
                ? rowLabelStyle
                : disabledRowLabelStyle
            }
          >
            {label}
          </div>
        </div>
      </div>

      <div style={moveButtonsStyle}>
        {renderVisibilityButton({
          isVisible,
          onClick: onToggle,
        })}
      </div>
    </div>
  );

  return (
    <div style={overlayStyle} onMouseDown={onClose}>
      <div
        style={panelStyle}
        onMouseDown={(event) =>
          event.stopPropagation()
        }
      >
        <div style={headerStyle}>
          <div>
            <div style={titleStyle}>
              Настройка карточки
            </div>

            <div style={sectionDescriptionStyle}>
              Порядок, видимость и состав блоков карточки
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={closeButtonStyle}
          >
            <img
              src={closeIcon}
              alt=""
              style={{
                width: 16,
                height: 16,
              }}
            />
          </button>
        </div>

        <div style={contentStyle}>
          <div style={sectionStyle}>
            {renderSectionHeader({
              groupKey: "structure",
              title: "Структура карточки",
              description: "Основные блоки карточки",
            })}

            {!collapsedGroups?.structure && (
              <div style={listStyle}>
                {orderedSections.map((section, index) => {
                  const sectionId = section.id;

                  return renderSettingsRow({
                    keyValue: sectionId,
                    label: `${index + 1}. ${getSectionLabel(
                      sectionId
                    )}`,
                    isVisible: isSectionEnabled(section),
                    onToggle: () => toggleSection(sectionId),
                    draggable: true,
                    isDragOver:
                      dragOverSectionId === sectionId,
                    onDragStart: () =>
                      handleStartDragSection(sectionId),
                    onDragOver: (event) =>
                      handleDragOverSection(
                        event,
                        sectionId
                      ),
                    onDragLeave: handleDragLeave,
                    onDrop: () =>
                      handleDropSection(sectionId),
                  });
                })}
              </div>
            )}
          </div>

          <div style={sectionStyle}>
            {renderSectionHeader({
              groupKey: "sidebar",
              title: "Правая панель",
              description: "Боковая область карточки",
            })}

            {!collapsedGroups?.sidebar && (
              <div style={listStyle}>
                {renderSettingsRow({
                  keyValue: "comments-sidebar",
                  label: "Комментарии",
                  isVisible: isSidebarEnabled,
                  onToggle: () =>
                    setIsSidebarEnabled(
                      (prev) => !prev
                    ),
                })}
              </div>
            )}
          </div>

          <div style={sectionStyle}>
            {renderSectionHeader({
              groupKey: "tabs",
              title: "Вкладки",
              description: "Дополнительные разделы",
            })}

            {!collapsedGroups?.tabs && (
              <div style={listStyle}>
                {draftTabs.map((tab) => {
                  const tabId = tab.id;

                  return renderSettingsRow({
                    keyValue: tabId,
                    label:
                      tab.label ||
                      tab.title ||
                      tabId,
                    isVisible: isTabEnabled(tabId),
                    onToggle: () =>
                      toggleTab(tabId),
                    draggable: true,
                    isDragOver:
                      dragOverTabId === tabId,
                    onDragStart: () =>
                      handleStartDragTab(tabId),
                    onDragOver: (event) =>
                      handleDragOverTab(
                        event,
                        tabId
                      ),
                    onDragLeave: handleDragLeave,
                    onDrop: () => handleDropTab(tabId),
                  });
                })}
              </div>
            )}
          </div>

          <div style={sectionStyle}>
            {renderSectionHeader({
              groupKey: "fields",
              title: "Поля",
              description: "Состав и порядок полей",
            })}

            {!collapsedGroups?.fields && (
              <div style={listStyle}>
                {visibleFieldRows.map((column) => {
                  const columnId =
                    getColumnId(column);

                  if (!columnId) {
                    return null;
                  }

                  return renderSettingsRow({
                    keyValue: columnId,
                    label:
                      column.title || "Поле",
                    isVisible:
                      isFieldEnabled(column),
                    onToggle: () =>
                      toggleField(columnId),
                    draggable: true,
                    isDragOver:
                      dragOverFieldId === columnId,
                    onDragStart: () =>
                      handleStartDragField(
                        columnId
                      ),
                    onDragOver: (event) =>
                      handleDragOverField(
                        event,
                        columnId
                      ),
                    onDragLeave: handleDragLeave,
                    onDrop: () =>
                      handleDropField(columnId),
                  });
                })}
              </div>
            )}
          </div>
        </div>

        <div style={footerStyle}>
          <div style={footerActionsStyle}>
            <button
              type="button"
              onClick={handleResetDefaults}
              style={resetButtonStyle}
            >
              Сбросить
            </button>

            <button
              type="button"
              onClick={handleSave}
              style={saveButtonCompactStyle}
            >
              <img
                src={saveIcon}
                alt=""
                style={saveIconStyle}
              />

              <span>Сохранить</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}