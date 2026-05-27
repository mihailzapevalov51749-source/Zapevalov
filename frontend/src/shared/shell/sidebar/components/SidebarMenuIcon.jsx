/**
 * Lightweight monochrome menu icon (no Runtime/Designer navigation logic).
 * `icon` may be an asset URL or a known menu icon type key.
 */

const MENU_ICON_SYMBOLS = {
  section: "▣",
  workspace: "▣",
  page: "□",
  home: "□",
  universal_table: "▦",
  table: "▦",
  external_link: "↗",
  document_library: "▤",
  system_page: "⚙",
  tasks: "✓",
  chat: "◎",
  notification: "◉",
  report: "▦",
  calendar: "◷",
  org: "▣",
  directory: "▤",
  admin: "⚙",
  objects: "▦",
  relations: "↗",
  views: "▦",
  users: "□",
  settings: "⚙",
};

function isIconAssetUrl(value) {
  if (!value || typeof value !== "string") {
    return false;
  }

  return (
    value.startsWith("/") ||
    value.startsWith("http://") ||
    value.startsWith("https://") ||
    value.startsWith("data:") ||
    /\.(png|jpe?g|gif|svg|webp)$/i.test(value)
  );
}

/**
 * @param {{ icon?: string; className?: string }} props
 */
export default function SidebarMenuIcon({ icon, className = "" }) {
  if (isIconAssetUrl(icon)) {
    return (
      <img
        src={icon}
        alt=""
        className={["app-sidebar-renderer__item-icon-image", className]
          .filter(Boolean)
          .join(" ")}
      />
    );
  }

  const symbol =
    (icon && MENU_ICON_SYMBOLS[icon]) ||
    (icon && icon.length === 1 ? icon : null) ||
    MENU_ICON_SYMBOLS.page;

  return (
    <span
      className={["app-sidebar-renderer__item-icon-symbol", className]
        .filter(Boolean)
        .join(" ")}
      aria-hidden
    >
      {symbol}
    </span>
  );
}
