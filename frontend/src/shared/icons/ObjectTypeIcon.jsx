import {
  getObjectTypeIconColorStyle,
  getObjectTypeIconRenderMode,
  hasUploadedIcon,
  normalizeObjectTypeColor,
  resolveIconFileSrc,
} from "./iconFileUtils";

import "./objectTypeIcon.css";

function ObjectTypeFallbackGlyph() {
  return (
    <svg
      className="object-type-icon__fallback"
      viewBox="0 0 24 24"
      aria-hidden
      focusable="false"
    >
      <path
        fill="currentColor"
        d="M4 5a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5zm3 4h10v2H7V9zm0 4h7v2H7v-2z"
      />
    </svg>
  );
}

export default function ObjectTypeIcon({
  iconType,
  iconFileUrl,
  color,
  size = 32,
  className = "",
  emptyClassName = "is-empty",
  showFallback = true,
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
      {!uploaded && showFallback ? <ObjectTypeFallbackGlyph /> : null}
    </span>
  );
}
