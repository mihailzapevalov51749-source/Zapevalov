export const DESIGNER_NAVIGATION_RELOAD_EVENT = "yasnopro:designer-navigation:reload";
export const PORTAL_NAVIGATION_RELOAD_EVENT = "yasnopro:portal-navigation:reload";

export function dispatchDesignerNavigationReload() {
  window.dispatchEvent(new CustomEvent(DESIGNER_NAVIGATION_RELOAD_EVENT));
}

export function dispatchPortalNavigationReload() {
  window.dispatchEvent(new CustomEvent(PORTAL_NAVIGATION_RELOAD_EVENT));
}