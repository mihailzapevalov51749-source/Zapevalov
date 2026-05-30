import { createPortal } from "react-dom";

import closeIcon from "../../../assets/icons/x.svg";
import eyeOpenIcon from "../../../assets/icons/eye-open.png";
import eyeClosedIcon from "../../../assets/icons/eye-closed.png";
import saveIcon from "../../../assets/icons/save.gif";

import useObjectEntityCardSettings from "../hooks/useObjectEntityCardSettings";

import {
  closeButtonStyle,
  contentStyle,
  disabledRowLabelStyle,
  dragHandleStyle,
  footerActionsStyle,
  footerStyle,
  headerStyle,
  leftStyle,
  listStyle,
  moveButtonsStyle,
  overlayStyle,
  panelStyle,
  resetButtonStyle,
  rowLabelStyle,
  rowStyle,
  saveButtonCompactStyle,
  saveButtonStyle,
  saveIconStyle,
  sectionDescriptionStyle,
  sectionHeaderLeftStyle,
  sectionHeaderStyle,
  sectionStyle,
  sectionTitleStyle,
  titleStyle,
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
}) {
  const {
    sectionRows,
    tabRows,
    fieldRows,
    toggleSectionVisibility,
    toggleTabVisibility,
    toggleFieldVisibility,
    moveSection,
    moveTab,
    handleReset,
    handleSave,
  } = useObjectEntityCardSettings({
    editableFields,
    titleFieldKey,
    initialLayout,
    onSave,
  });

  if (!open) {
    return null;
  }

  return createPortal(
    <div style={overlayStyle} onMouseDown={onClose} role="presentation">
      <aside
        style={panelStyle}
        onMouseDown={(event) => event.stopPropagation()}
        aria-label="Настройка карточки"
      >
        <div style={headerStyle}>
          <div>
            <div style={titleStyle}>Настройка карточки</div>
            <div style={sectionDescriptionStyle}>
              Порядок, видимость и состав блоков карточки
            </div>
          </div>
          <button type="button" onClick={onClose} style={closeButtonStyle}>
            <img src={closeIcon} alt="" style={{ width: 16, height: 16 }} />
          </button>
        </div>

        <div style={contentStyle}>
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
                  <div style={sectionDescriptionStyle}>
                    Видимость в сетке полей
                  </div>
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
        </div>

        <div style={footerStyle}>
          <div style={footerActionsStyle}>
            <button type="button" style={resetButtonStyle} onClick={handleReset}>
              Сбросить настройки карточки
            </button>
            <button
              type="button"
              style={saveButtonCompactStyle}
              disabled={saving}
              onClick={() => {
                void handleSave();
              }}
            >
              <img src={saveIcon} alt="" style={saveIconStyle} />
              {saving ? "Сохранение…" : "Сохранить"}
            </button>
          </div>
        </div>
      </aside>
    </div>,
    document.body,
  );
}
