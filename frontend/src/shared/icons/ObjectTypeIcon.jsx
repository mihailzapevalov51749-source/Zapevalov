import {
  getObjectTypeIconColorStyle,
  getObjectTypeIconRenderMode,
  hasUploadedIcon,
  normalizeObjectTypeColor,
  resolveIconFileSrc,
} from "./iconFileUtils";

import "./objectTypeIcon.css";

export default function ObjectTypeIcon({
  iconType,
  iconFileUrl,
  color,
  size = 32,
  className = "",
  emptyClassName = "is-empty",
}) {
  const dimension = `${size}px`;
  const uploaded = hasUploadedIcon(iconType, iconFileUrl);
  const src = uploaded ? resolveIconFileSrc(iconFileUrl) : null;
  const renderMode = uploaded ? getObjectTypeIconRenderMode(iconFileUrl) : "empty";
  const tintColor = normalizeObjectTypeColor(color);
  const maskStyle =
    renderMode === "svg-mask" && tintColor
      ? getObjectTypeIconColorStyle(tintColor, iconFileUrl)
      : null;

  const rootClass = [
    "object-type-icon",
    className,
    uploaded ? "has-image" : emptyClassName,
    maskStyle ? "has-tint" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <span
      className={rootClass}
      style={{ width: dimension, height: dimension }}
      aria-hidden={uploaded ? undefined : true}
    >
      {maskStyle ? (
        <span className="object-type-icon__mask" style={maskStyle} aria-hidden />
      ) : null}
      {src && !maskStyle ? (
        <img src={src} alt="" className="object-type-icon__image" />
      ) : null}
    </span>
  );
}
