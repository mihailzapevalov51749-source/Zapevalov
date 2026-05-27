import { SIDEBAR_MODES } from "../sidebarMode";
import SidebarMenuIcon from "./SidebarMenuIcon";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8010";

const DEFAULT_ICON_SYMBOLS = {
  section: "▣",
  workspace: "▣",
  page: "□",
  universal_table: "▦",
  external_link: "↗",
  document_library: "▤",
  system_page: "⚙",
  table: "▦",
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

function hasRuntimeUploadIcon(meta) {
  return (
    readMetaString(meta, "icon_type") === "upload" &&
    Boolean(readMetaString(meta, "icon_file_url"))
  );
}

/**
 * Temporary Runtime-compatible icons until analyst-driven configuration exists.
 *
 * @param {{ item: import("../sidebarTypes").SidebarItemContract, mode: import("../sidebarTypes").SidebarMode }} props
 */
export default function AppSidebarIconRenderer({ item, mode }) {
  const meta = item.meta ?? {};

  if (mode !== SIDEBAR_MODES.DESIGNER) {
    const iconFileUrl = readMetaString(meta, "icon_file_url");

    if (hasRuntimeUploadIcon(meta) && iconFileUrl) {
      return (
        <img
          src={`${API_BASE_URL}${iconFileUrl}`}
          alt=""
          className="app-sidebar-renderer__item-icon-image"
        />
      );
    }

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
