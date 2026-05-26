const SIDEBAR_COLLAPSED_WIDTH = 56;

export const LAYOUT_TOKENS = {
  sidebar: {
    brandLogoSize: 32,
    brandLogoCollapsedSize: 32,
    brandTitleFontSize: 15,
    brandSubtitleFontSize: 11,
    menuItemHeight: 36,
    menuItemIconSize: 18,
    menuItemFontSize: 13,
    menuItemRadius: 8,
    menuItemGap: 8,
    sidebarCollapsedWidth: SIDEBAR_COLLAPSED_WIDTH,
  },
  runtime: {
    sidebarExpandedWidth: 220,
    sidebarCollapsedWidth: SIDEBAR_COLLAPSED_WIDTH,
    workspaceTopOffset: 0,
  },
  designer: {
    sidebarWidth: 248,
    sidebarCollapsedWidth: SIDEBAR_COLLAPSED_WIDTH,
    headerHeight: 64,
    propertiesPanelWidth: 380,
    workspaceTopOffset: 0,
  },
  overlay: {
    commentsPanelWidth: 380,
    entityCardInset: 350,
    workspaceTopOffset: 0,
  },
} as const;

export type LayoutTokens = typeof LAYOUT_TOKENS;
