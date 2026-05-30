import {
  hasUploadedIcon,
  resolveIconFileSrc,
} from "../../../icons/iconFileUtils";

/**
 * Shared sidebar upload icon renderer for navigation and Object Type projection items.
 */
export default function SidebarNavigationItemIcon({
  iconType,
  iconFileUrl,
  size = 16,
  className = "",
}) {
  if (!hasUploadedIcon(iconType, iconFileUrl)) {
    return null;
  }

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
