import SidebarNavigationItemIcon from "./SidebarNavigationItemIcon";

function readMetaString(meta, key) {
  const value = meta?.[key];
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : undefined;
}

function resolveMetaIconFileUrl(meta) {
  return (
    readMetaString(meta, "display_icon_file_url") ??
    readMetaString(meta, "icon_file_url")
  );
}

/**
 * Sidebar adapter icon renderer: uploaded files only.
 */
export default function AppSidebarIconRenderer({ item }) {
  const meta = item.meta ?? {};
  const iconFileUrl = resolveMetaIconFileUrl(meta);

  if (!iconFileUrl) {
    return null;
  }

  return <SidebarNavigationItemIcon iconFileUrl={iconFileUrl} size={16} />;
}
