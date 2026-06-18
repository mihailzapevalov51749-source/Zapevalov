import { resolveIconFileSrc } from "../../../icons/iconFileUtils";

/**
 * Renders only user-uploaded navigation menu icon files.
 */
export default function SidebarNavigationItemIcon({
  iconFileUrl,
  size = 16,
  className = "",
}) {
  const src = resolveIconFileSrc(iconFileUrl);
  if (!src) {
    return null;
  }

  return (
    <img
      src={src}
      alt=""
      className={["app-sidebar-renderer__item-icon-image", className]
        .filter(Boolean)
        .join(" ")}
      style={{
        width: size,
        height: size,
        objectFit: "contain",
        flexShrink: 0,
      }}
    />
  );
}
