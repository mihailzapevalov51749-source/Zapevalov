import EntityCardToolbar from "./EntityCardToolbar";

import backIcon from "../../../../assets/icons/ArrowLeft.svg";
import settingsIcon from "../../../../assets/icons/settings.gif";

import {
  entityCardHeaderStyle,
  entityCardHeaderLeftStyle,
  entityCardHeaderBackButtonStyle,
  entityCardHeaderBackIconStyle,
  entityCardHeaderBackTextStyle,
  entityCardHeaderIdStyle,
} from "./styles/entityCardHeaderStyles";

function getRowSystemNumber(row) {
  return (
    row?.number ||
    row?.system_number ||
    row?.systemNumber ||
    row?.row_number ||
    row?.rowNumber ||
    row?.values?.__row_number ||
    row?.values?.system_number ||
    row?.values?.systemNumber ||
    row?.values?.number ||
    row?.id ||
    "—"
  );
}

function formatSystemNumber(value) {
  if (!value) return "—";

  const text = String(value);

  if (/^\d+$/.test(text)) {
    return text.padStart(5, "0");
  }

  return text;
}

export default function EntityCardHeader({
  row,
  onClose,
  onBack,
  onOpenSettings,
}) {
  const systemNumber = formatSystemNumber(getRowSystemNumber(row));

  const handleBack = () => {
    if (typeof onBack === "function") {
      onBack();
      return;
    }

    onClose?.();
  };

  const canEditCard = true;

  return (
    <header style={entityCardHeaderStyle}>
      <div style={entityCardHeaderLeftStyle}>
        <button
          type="button"
          onClick={handleBack}
          style={entityCardHeaderBackButtonStyle}
        >
          <img
            src={backIcon}
            alt=""
            style={entityCardHeaderBackIconStyle}
          />

          <span style={entityCardHeaderBackTextStyle}>
            Назад
          </span>
        </button>

        <div style={entityCardHeaderIdStyle}>
          № {systemNumber}
        </div>
      </div>

      <EntityCardToolbar
        onClose={onClose}
        beforeClose={
          canEditCard ? (
            <button
              type="button"
              onClick={onOpenSettings}
              title="Настроить карточку"
              style={{
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
              }}
            >
              <img
                src={settingsIcon}
                alt=""
                style={{
                  width: 15,
                  height: 15,
                  objectFit: "contain",
                  display: "block",
                }}
              />
            </button>
          ) : null
        }
      />
    </header>
  );
}