import { useCallback, useEffect } from "react";

import eyeOpenIcon from "../../../assets/icons/eye-open.png";
import eyeClosedIcon from "../../../assets/icons/eye-closed.png";
import saveIcon from "../../../assets/icons/save.gif";

import {
  CARD_SETTINGS_MODAL_DEFAULT_BOUNDS,
  CARD_SETTINGS_MODAL_KEY,
  debugCardSettingsModal,
} from "../../../shared/platformModal/cardSettingsModalDebug";
import PlatformModalShell from "../../../shared/platformModal/PlatformModalShell";
import usePlatformModalLayout from "../../../shared/platformModal/usePlatformModalLayout";
import useObjectEntityCardSettings from "../hooks/useObjectEntityCardSettings";

import {
  contentStyle as settingsContentStyle,
  disabledRowLabelStyle,
  dragHandleStyle,
  footerActionsStyle,
  leftStyle,
  listStyle,
  moveButtonsStyle,
  resetButtonStyle,
  rowLabelStyle,
  rowStyle,
  saveButtonCompactStyle,
  saveIconStyle,
  sectionDescriptionStyle,
  sectionHeaderLeftStyle,
  sectionHeaderStyle,
  sectionStyle,
  sectionTitleStyle,
  visibilityButtonStyle,
  visibilityIconStyle,
} from "../../../shared/entityCardShell/styles/entityCardSettingsPanelStyles";

function VisibilityButton({ visible, onClick, disabled = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        ...visibilityButtonStyle,
        opacity: disabled ? 0.45 : 1,
        cursor: disabled ? "not-allowed" : "pointer",
      }}
      title={visible ? "Скрыть" : "Показать"}
    >
      <img
        src={visible ? eyeOpenIcon : eyeClosedIcon}
        alt=""
        style={visibilityIconStyle}
      />
    </button>
  );
}

function SettingsRow({ label, visible, onToggle, disabled = false }) {
  return (
    <div style={rowStyle}>
      <div style={leftStyle}>
        <div style={dragHandleStyle}>⋮⋮</div>
        <div style={{ minWidth: 0 }}>
          <div style={visible ? rowLabelStyle : disabledRowLabelStyle}>{label}</div>
        </div>
      </div>
      <div style={moveButtonsStyle}>
        <VisibilityButton
          visible={visible}
          disabled={disabled}
          onClick={onToggle}
        />
      </div>
    </div>
  );
}

export default function ObjectEntityCardSettingsPanel({
  open = false,
  editableFields = [],
  titleFieldKey = null,
  initialLayout = null,
  onClose,
  onSave,
  saving = false,
  canCustomizeLayout = false,
}) {
  const {
    sectionRows,
    tabRows,
    fieldRows,
    toggleSectionVisibility,
    toggleTabVisibility,
    toggleFieldVisibility,
    handleReset,
    handleSave,
  } = useObjectEntityCardSettings({
    editableFields,
    titleFieldKey,
    initialLayout,
    onSave,
  });

  // Panel mounts only when user can configure card layout — always enable drag/resize/persist.
  const layout = usePlatformModalLayout({
    modalKey: CARD_SETTINGS_MODAL_KEY,
    open,
    canCustomizeLayout: true,
    defaultBounds: CARD_SETTINGS_MODAL_DEFAULT_BOUNDS,
  });

  const { persistCurrentBounds, bounds, headerCursor, startDrag, startResize } = layout;

  const handleClose = useCallback(
    (reason) => {
      debugCardSettingsModal("close", { reason, canCustomizeLayout });
      persistCurrentBounds();
      onClose?.(reason);
    },
    [canCustomizeLayout, onClose, persistCurrentBounds],
  );

  useEffect(() => {
    debugCardSettingsModal("props", { open, canCustomizeLayout });
  }, [open, canCustomizeLayout]);

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

  const footer = (
    <div style={footerActionsStyle}>
      <button
        type="button"
        style={resetButtonStyle}
        onClick={handleReset}
        title="Сбросить настройки карточки"
      >
        Сбросить
      </button>
      <button
        type="button"
        style={saveButtonCompactStyle}
        disabled={saving}
        onClick={() => {
          persistCurrentBounds();
          void handleSave();
        }}
      >
        <img src={saveIcon} alt="" style={saveIconStyle} />
        {saving ? "Сохранение…" : "Сохранить"}
      </button>
    </div>
  );

  return (
    <PlatformModalShell
      open={open}
      modalKey={CARD_SETTINGS_MODAL_KEY}
      onClose={handleClose}
      title="Настройка карточки"
      subtitle="Порядок, видимость и состав блоков карточки"
      canCustomizeLayout
      ariaLabel="Настройка карточки"
      contentStyle={settingsContentStyle}
      footer={footer}
      bounds={bounds}
      headerCursor={headerCursor}
      startDrag={startDrag}
      startResize={startResize}
    >
      <div style={sectionStyle}>
        <div style={sectionHeaderStyle}>
          <div style={sectionHeaderLeftStyle}>
            <div>
              <div style={sectionTitleStyle}>Структура карточки</div>
              <div style={sectionDescriptionStyle}>Основные блоки</div>
            </div>
          </div>
        </div>
        <div style={listStyle}>
          {sectionRows.map((section) => (
            <SettingsRow
              key={section.id}
              label={section.label}
              visible={section.visible !== false}
              disabled={section.canHide === false}
              onToggle={() => toggleSectionVisibility(section.id)}
            />
          ))}
        </div>
      </div>

      <div style={sectionStyle}>
        <div style={sectionHeaderStyle}>
          <div style={sectionHeaderLeftStyle}>
            <div>
              <div style={sectionTitleStyle}>Вкладки</div>
              <div style={sectionDescriptionStyle}>
                Заметки и связанные записи в нижнем блоке
              </div>
            </div>
          </div>
        </div>
        <div style={listStyle}>
          {tabRows.map((tab) => (
            <SettingsRow
              key={tab.id}
              label={tab.label}
              visible={tab.visible !== false}
              onToggle={() => toggleTabVisibility(tab.id)}
            />
          ))}
        </div>
      </div>

      <div style={sectionStyle}>
        <div style={sectionHeaderStyle}>
          <div style={sectionHeaderLeftStyle}>
            <div>
              <div style={sectionTitleStyle}>Поля</div>
              <div style={sectionDescriptionStyle}>Видимость в сетке полей</div>
            </div>
          </div>
        </div>
        <div style={listStyle}>
          {fieldRows.length === 0 ? (
            <div style={rowStyle}>
              <span style={rowLabelStyle}>Нет редактируемых полей</span>
            </div>
          ) : (
            fieldRows.map((field) => (
              <SettingsRow
                key={field.key}
                label={field.label}
                visible={field.visible}
                onToggle={() => toggleFieldVisibility(field.key)}
              />
            ))
          )}
        </div>
      </div>
    </PlatformModalShell>
  );
}
