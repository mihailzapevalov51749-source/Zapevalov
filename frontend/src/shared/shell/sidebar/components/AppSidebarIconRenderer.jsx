import { hasUploadedIcon } from "../../../icons/iconFileUtils";
import { SIDEBAR_MODES } from "../sidebarMode";
import SidebarMenuIcon from "./SidebarMenuIcon";
import SidebarNavigationItemIcon from "./SidebarNavigationItemIcon";

const DEFAULT_ICON_SYMBOLS = {
  section: "▣",
  workspace: "▣",
  page: "□",
  universal_table: "▦",
  external_link: "↗",
  document_library: "▤",
  system_page: "⚙",
  table: "▦",
  object_type: "◆",
};

function readMetaString(meta, key) {
  const value = meta?.[key];
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : undefined;
}

function resolveRuntimeMenuType(meta, item) {
  return (
    readMetaString(meta, "type") ??
    readMetaString(meta, "iconType") ??
    (typeof item.icon === "string" ? item.icon : undefined)
  );
}

function resolveMetaIconSource(meta) {
  return {
    iconType:
      readMetaString(meta, "display_icon_type") ?? readMetaString(meta, "icon_type"),
    iconFileUrl:
      readMetaString(meta, "display_icon_file_url") ??
      readMetaString(meta, "icon_file_url"),
  };
}

/**
 * Temporary Runtime-compatible icons until analyst-driven configuration exists.
 *
 * @param {{ item: import("../sidebarTypes").SidebarItemContract, mode: import("../sidebarTypes").SidebarMode }} props
 */
export default function AppSidebarIconRenderer({ item, mode }) {
  const meta = item.meta ?? {};
  const { iconType, iconFileUrl } = resolveMetaIconSource(meta);

  if (hasUploadedIcon(iconType, iconFileUrl)) {
    return (
      <SidebarNavigationItemIcon
        iconType={iconType}
        iconFileUrl={iconFileUrl}
        size={16}
      />
    );
  }

  if (mode !== SIDEBAR_MODES.DESIGNER) {
    const menuType = resolveRuntimeMenuType(meta, item);
    const symbol =
      (menuType && DEFAULT_ICON_SYMBOLS[menuType]) ||
      DEFAULT_ICON_SYMBOLS.page;

    return (
      <span
        className="app-sidebar-renderer__item-icon-symbol app-sidebar-renderer__item-icon-symbol--runtime-default"
        aria-hidden
        title={menuType || "menu"}
      >
        {symbol}
      </span>
    );
  }

  const designerIcon =
    readMetaString(meta, "iconType") ||
    (typeof item.icon === "string" ? item.icon : "page");

  return <SidebarMenuIcon icon={designerIcon} />;
}
