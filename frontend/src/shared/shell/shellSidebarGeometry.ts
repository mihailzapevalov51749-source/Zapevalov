/** AppSidebar target widths when feature-flagged renderer is enabled. */
export const APP_SIDEBAR_WIDTHS = {
  expanded: 220,
  collapsed: 56,
} as const;

export function resolveAppSidebarWidth(collapsed = false): number {
  return collapsed
    ? APP_SIDEBAR_WIDTHS.collapsed
    : APP_SIDEBAR_WIDTHS.expanded;
}
