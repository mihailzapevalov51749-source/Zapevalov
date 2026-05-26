import TableTitle from "./TableTitle";

import eyeOpenIcon from "../../../../assets/icons/eye-open.png";
import eyeClosedIcon from "../../../../assets/icons/eye-closed.png";
import deleteIcon from "../../../../assets/icons/delet.png";

import {
  hiddenVisibilityIconStyle,
  visibilityButtonStyle,
  visibilityIconStyle,
} from "../entityCard/styles/entityCardSettingsPanelStyles";

function VisibilityEyeButton({ showTitle, onClick, title }) {
  return (
    <button
      type="button"
      data-table-block-control="true"
      onClick={onClick}
      style={visibilityButtonStyle}
      title={title}
    >
      <img
        src={showTitle ? eyeOpenIcon : eyeClosedIcon}
        alt=""
        draggable={false}
        style={showTitle ? visibilityIconStyle : hiddenVisibilityIconStyle}
      />
    </button>
  );
}

export default function UniversalTableTopBar({
  table,
  showTitle,

  isPageEditMode,
  embeddedInCanvas = false,
  isInlineEditMode,
  onToggleInlineEditMode,

  onToggleShowTitle,
  onDeleteBlock,

  onSaveTitle,
  onAfterChange,

  onAddRow,
}) {
  const showBlockControls = embeddedInCanvas && isPageEditMode;
  const showEye = Boolean(onToggleShowTitle);

  if (embeddedInCanvas) {
    if (!showBlockControls && !showTitle) {
      return null;
    }

    return (
      <div
        data-table-action="true"
        style={{
          ...styles.wrapper,
          justifyContent: "space-between",
          gap: 12,
          minHeight: showTitle ? 36 : 32,
          padding: showTitle ? "4px 16px" : "4px 10px",
        }}
      >
        <div style={styles.left}>
          {showTitle ? (
            <TableTitle
              table={table}
              isEditMode={isPageEditMode}
              onSaveTitle={onSaveTitle}
              onAfterChange={onAfterChange}
            />
          ) : null}

          {showEye ? (
            <VisibilityEyeButton
              showTitle={showTitle}
              onClick={onToggleShowTitle}
              title={showTitle ? "Скрыть название" : "Показать название"}
            />
          ) : null}
        </div>

        {showBlockControls ? (
          <button
            type="button"
            data-table-block-control="true"
            onClick={onDeleteBlock}
            style={styles.deleteButton}
            title="Удалить блок из раздела"
          >
            <img
              src={deleteIcon}
              alt=""
              draggable={false}
              style={styles.deleteIcon}
            />
          </button>
        ) : null}
      </div>
    );
  }

  const showStandaloneBar = showTitle || isPageEditMode;

  if (!showStandaloneBar) {
    return null;
  }

  const handleAddRowTop = (event) => {
    event.preventDefault();
    event.stopPropagation();

    onAddRow?.({
      position: "top",
      openCard: false,
      focusFirstCell: true,
    });
  };

  const showCompactStandaloneBar = !showTitle && isPageEditMode;
  const showStandaloneEditTools =
    isPageEditMode && (showTitle || showCompactStandaloneBar);

  return (
    <div
      data-table-action="true"
      style={{
        ...styles.wrapper,
        minHeight: showTitle ? 36 : 32,
        padding: showTitle ? "4px 16px" : "4px 10px",
      }}
    >
      <div style={styles.left}>
        {showTitle ? (
          <TableTitle
            table={table}
            isEditMode={isPageEditMode}
            onSaveTitle={onSaveTitle}
            onAfterChange={onAfterChange}
          />
        ) : null}

        {showEye ? (
          <VisibilityEyeButton
            showTitle={showTitle}
            onClick={onToggleShowTitle}
            title={showTitle ? "Скрыть название" : "Показать название"}
          />
        ) : null}

        {showStandaloneEditTools ? (
          <>
            <button
              type="button"
              onClick={onToggleInlineEditMode}
              title={
                isInlineEditMode
                  ? "Выключить редактирование"
                  : "Редактировать таблицу"
              }
              style={getIconButtonStyle(isInlineEditMode)}
            >
              ✎
            </button>

            <button
              type="button"
              onClick={handleAddRowTop}
              title="Добавить строку сверху"
              style={styles.iconButton}
            >
              +
            </button>
          </>
        ) : null}
      </div>
    </div>
  );
}

const styles = {
  wrapper: {
    width: "100%",
    minHeight: 36,
    padding: "4px 16px",
    display: "flex",
    alignItems: "center",
    boxSizing: "border-box",
    background: "#FFFFFF",
    borderBottom: "1px solid #EEF2F7",
  },

  left: {
    minWidth: 0,
    flex: 1,
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
  },

  iconButton: {
    width: 26,
    height: 26,
    borderRadius: 6,
    border: "1px solid #E2E8F0",
    background: "#FFFFFF",
    color: "#334155",
    cursor: "pointer",
    fontSize: 14,
    fontWeight: 700,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  deleteButton: {
    width: 28,
    height: 28,
    borderRadius: 8,
    border: "1px solid #fecaca",
    background: "#ffffff",
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    padding: 0,
  },

  deleteIcon: {
    width: 16,
    height: 16,
    objectFit: "contain",
    pointerEvents: "none",
  },
};

const getIconButtonStyle = (active) => ({
  width: 26,
  height: 26,
  borderRadius: 6,
  border: active ? "1px solid #2563EB" : "1px solid #E2E8F0",
  background: active ? "#EFF6FF" : "#FFFFFF",
  color: active ? "#2563EB" : "#334155",
  cursor: "pointer",
  fontSize: 14,
  fontWeight: 700,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
});
