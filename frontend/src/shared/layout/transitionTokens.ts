export const TRANSITION_TOKENS = {
  shell: {
    workspaceLeft: "left 180ms ease",
    sidebarWidth: "width 180ms ease, background 180ms ease",
  },
} as const;

export type TransitionTokens = typeof TRANSITION_TOKENS;
