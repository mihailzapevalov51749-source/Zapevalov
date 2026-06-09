export const YASII_PANEL_CONTROL = {
  MINIMIZE: "minimize",
  FULLSCREEN: "fullscreen",
  PIN: "pin",
  CLOSE: "close",
};

const PANEL_CONTROL_ORDER = [
  YASII_PANEL_CONTROL.FULLSCREEN,
  YASII_PANEL_CONTROL.PIN,
  YASII_PANEL_CONTROL.CLOSE,
];

const WORKSPACE_CONTROL_ORDER = [
  YASII_PANEL_CONTROL.MINIMIZE,
  ...PANEL_CONTROL_ORDER,
];

/**
 * @param {"floating" | "workspace" | string} layoutMode
 */
export function resolveYasiiPanelControlOrder(layoutMode) {
  if (layoutMode === "workspace") {
    return WORKSPACE_CONTROL_ORDER;
  }

  return PANEL_CONTROL_ORDER;
}
