import backIcon from "../../../assets/icons/ArrowLeft.svg";
import saveIcon from "../../../assets/icons/save.gif";
import settingsIcon from "../../../assets/icons/settings.gif";

import { EntityCardToolbar } from "../../../shared/entityCardShell";

import {
  entityCardHeaderBackButtonStyle,
  entityCardHeaderBackIconStyle,
  entityCardHeaderBackTextStyle,
  entityCardHeaderIdStyle,
  entityCardHeaderLeftStyle,
  entityCardHeaderStyle,
} from "../../../shared/entityCardShell/styles/entityCardObjectHeaderStyles";

import {
  entityCardToolbarButtonStyle,
  entityCardToolbarIconStyle,
} from "../../../shared/entityCardShell/styles/entityCardToolbarStyles";

import { formatEntityDisplayNumber } from "../services/runtimeEntityCardAdapter";

const entityCardHeaderSettingsButtonStyle = {
  width: 28,
  height: 28,
  minWidth: 28,
  border: "none",
  background: "transparent",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  padding: 0,
};

const entityCardHeaderSettingsIconStyle = {
  width: 15,
  height: 15,
  objectFit: "contain",
  display: "block",
};

const saveToolbarButtonDisabledStyle = {
  ...entityCardToolbarButtonStyle,
  opacity: 0.5,
  cursor: "not-allowed",
};

export default function ObjectEntityCardHeader({
  entityId,
  onClose,
  onBack,
  onOpenSettings = null,
  onSave,
  submitting = false,
  canSave = true,
}) {
  const displayNumber = formatEntityDisplayNumber(entityId);

  const handleBack = () => {
    if (typeof onBack === "function") {
      onBack();
      return;
    }

    onClose?.();
  };

  const saveControl =
    typeof onSave === "function" ? (
      <button
        type="button"
        title="Сохранить изменения"
        style={
          submitting || !canSave
            ? saveToolbarButtonDisabledStyle
            : entityCardToolbarButtonStyle
        }
        disabled={submitting || !canSave}
        onClick={() => {
          void onSave();
        }}
      >
        <img src={saveIcon} alt="" style={entityCardToolbarIconStyle} />
      </button>
    ) : null;

  const settingsControl =
    typeof onOpenSettings === "function" ? (
      <button
        type="button"
        onClick={onOpenSettings}
        title="Настроить карточку"
        aria-label="Настроить карточку"
        style={entityCardHeaderSettingsButtonStyle}
      >
        <img
          src={settingsIcon}
          alt=""
          style={entityCardHeaderSettingsIconStyle}
        />
      </button>
    ) : null;

  return (
    <header style={entityCardHeaderStyle}>
      <div style={entityCardHeaderLeftStyle}>
        <button
          type="button"
          onClick={handleBack}
          style={entityCardHeaderBackButtonStyle}
        >
          <img src={backIcon} alt="" style={entityCardHeaderBackIconStyle} />
          <span style={entityCardHeaderBackTextStyle}>Назад</span>
        </button>

        <div
          style={entityCardHeaderIdStyle}
          title={entityId ? `ID: ${entityId}` : undefined}
        >
          № {displayNumber}
        </div>
      </div>

      <EntityCardToolbar
        onClose={onClose}
        onFavorite={() => {}}
        beforeClose={
          <>
            {saveControl}
            {settingsControl}
          </>
        }
      />
    </header>
  );
}
