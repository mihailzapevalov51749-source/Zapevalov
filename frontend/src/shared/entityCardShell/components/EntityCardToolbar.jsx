import favoriteIcon from "../../../assets/icons/star.svg";
import closeIcon from "../../../assets/icons/x.svg";

import {
  entityCardToolbarStyle,
  entityCardToolbarButtonStyle,
  entityCardToolbarCloseButtonStyle,
  entityCardToolbarIconStyle,
} from "../styles/entityCardToolbarStyles";

export default function EntityCardToolbar({
  onClose,
  onFavorite,
  beforeClose = null,
}) {
  return (
    <div style={entityCardToolbarStyle}>
      <button
        type="button"
        onClick={onFavorite}
        style={entityCardToolbarButtonStyle}
      >
        <img
          src={favoriteIcon}
          alt=""
          style={entityCardToolbarIconStyle}
        />
      </button>

      {beforeClose}

      <button
        type="button"
        onClick={onClose}
        style={entityCardToolbarCloseButtonStyle}
      >
        <img
          src={closeIcon}
          alt=""
          style={entityCardToolbarIconStyle}
        />
      </button>
    </div>
  );
}
