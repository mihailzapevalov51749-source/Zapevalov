import EntityCardToolbar from "./EntityCardToolbar";

import backIcon from "../../../../assets/icons/ArrowLeft.svg";

import {
  entityCardHeaderStyle,
  entityCardHeaderLeftStyle,
  entityCardHeaderBackButtonStyle,
  entityCardHeaderBackIconStyle,
  entityCardHeaderBackTextStyle,
  entityCardHeaderIdStyle,
} from "./styles/entityCardHeaderStyles";

export default function EntityCardHeader({ row, onClose }) {
  const entityId = row?.id || "—";

  return (
    <header style={entityCardHeaderStyle}>
      <div style={entityCardHeaderLeftStyle}>
        <button
          type="button"
          onClick={onClose}
          style={entityCardHeaderBackButtonStyle}
        >
          <img src={backIcon} alt="" style={entityCardHeaderBackIconStyle} />
          <span style={entityCardHeaderBackTextStyle}>Назад</span>
        </button>

        <div style={entityCardHeaderIdStyle}>ID: {entityId}</div>
      </div>

      <EntityCardToolbar onClose={onClose} />
    </header>
  );
}