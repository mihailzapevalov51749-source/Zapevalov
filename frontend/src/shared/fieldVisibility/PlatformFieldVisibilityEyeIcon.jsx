import eyeOpenIcon from "../../assets/icons/eye-open.png";
import eyeClosedIcon from "../../assets/icons/eye-closed.png";
import {
  hiddenVisibilityIconStyle,
  visibilityIconStyle,
} from "../entityCardShell/styles/entityCardSettingsPanelStyles";

/**
 * Platform field visibility eye — same assets as Object Table view settings → Fields.
 */
export default function PlatformFieldVisibilityEyeIcon({
  visible = true,
  size = 16,
  style = null,
  className = "",
  draggable = false,
}) {
  const baseStyle = visible ? visibilityIconStyle : hiddenVisibilityIconStyle;

  return (
    <img
      src={visible ? eyeOpenIcon : eyeClosedIcon}
      alt=""
      className={className}
      draggable={draggable}
      style={{
        ...baseStyle,
        width: size,
        height: size,
        ...style,
      }}
    />
  );
}
