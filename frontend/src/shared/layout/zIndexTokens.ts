export const Z_INDEX_TOKENS = {
  shell: {
    topBar: 20,
    sidebarToggle: 10000,
  },
  overlays: {
    entityCard: 100000,
    fileViewer: 999999,
  },
  popovers: {
    default: 3000,
    high: 1000000,
  },
} as const;

export type ZIndexTokens = typeof Z_INDEX_TOKENS;
