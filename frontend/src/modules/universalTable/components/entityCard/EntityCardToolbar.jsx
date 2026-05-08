import favoriteIcon from "../../../../assets/icons/star.svg";
import linkIcon from "../../../../assets/icons/paperclip.svg";
import menuIcon from "../../../../assets/icons/dots-three-vertical.svg";
import closeIcon from "../../../../assets/icons/x.svg";

import {
  entityCardToolbarStyle,
  entityCardToolbarButtonStyle,
  entityCardToolbarCloseButtonStyle,
  entityCardToolbarIconStyle,
} from "./styles/entityCardToolbarStyles";

export default function EntityCardToolbar({
  onClose,
  onFavorite,
  onCopyLink,
  onMenu,
}) {
  return (
    <div style={entityCardToolbarStyle}>
      <button type="button" onClick={onFavorite} style={entityCardToolbarButtonStyle}>
        <img src={favoriteIcon} alt="" style={entityCardToolbarIconStyle} />
      </button>

      <button type="button" onClick={onCopyLink} style={entityCardToolbarButtonStyle}>
        <img src={linkIcon} alt="" style={entityCardToolbarIconStyle} />
      </button>

      <button type="button" onClick={onMenu} style={entityCardToolbarButtonStyle}>
        <img src={menuIcon} alt="" style={entityCardToolbarIconStyle} />
      </button>

      <button type="button" onClick={onClose} style={entityCardToolbarCloseButtonStyle}>
        <img src={closeIcon} alt="" style={entityCardToolbarIconStyle} />
      </button>
    </div>
  );
}