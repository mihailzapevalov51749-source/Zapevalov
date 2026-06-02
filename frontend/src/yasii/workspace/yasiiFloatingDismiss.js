const PLATFORM_NAVIGATION_SELECTORS = [
  ".app-sidebar-renderer--runtime",
  ".app-sidebar-renderer--designer",
  ".app-header-renderer",
  ".app-header-renderer__breadcrumb-link",
  ".designer-shell",
  "[data-designer-shell]",
].join(", ");

export function isPlatformNavigationTarget(target) {
  if (!target || typeof target.closest !== "function") {
    return false;
  }

  return Boolean(target.closest(PLATFORM_NAVIGATION_SELECTORS));
}

/**
 * Floating: close on outside click only when target is not platform navigation chrome.
 * Pinned: never close on outside click.
 */
export function shouldCloseFloatingOnOutsideClick(
  target,
  { panelElement, buttonElement, isPinned },
) {
  if (isPinned) {
    return false;
  }

  if (!target) {
    return false;
  }

  if (buttonElement?.contains(target)) {
    return false;
  }

  if (panelElement?.contains(target)) {
    return false;
  }

  if (isPlatformNavigationTarget(target)) {
    return false;
  }

  return true;
}
