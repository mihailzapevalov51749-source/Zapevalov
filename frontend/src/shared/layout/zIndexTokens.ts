/**
 * Unified platform layer system.
 *
 * Lower layers must never paint above higher layers in normal UX flows.
 */
export const Z_INDEX_LAYERS = {
  content: 100,
  stickyTableHeader: 200,
  sidePanels: 300,
  dropdowns: 400,
  notificationDropdown: 500,
  popovers: 600,
  modal: 700,
  entityCardModal: 800,
  globalOverlay: 900,
  systemOverlay: 1000,
} as const;

export const Z_INDEX_TOKENS = {
  layers: Z_INDEX_LAYERS,
  shell: {
    topBar: 20,
    sidebarToggle: 10000,
  },
  overlays: {
    entityCard: 100000,
    fileViewer: 999999,
    notificationBlocked: Z_INDEX_LAYERS.globalOverlay,
  },
  popovers: {
    default: 3000,
    high: 1000000,
  },
} as const;

export type ZIndexTokens = typeof Z_INDEX_TOKENS;
