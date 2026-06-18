import { isPinnedHomeNavigationItem } from "./navigationMenuBlocks.js";

/**
 * Navigation items that must stay pinned (block 1) and cannot be dragged.
 */
export function isNavigationDragDisabled(item, sidebarMode = "runtime") {
  void sidebarMode;
  return isPinnedHomeNavigationItem(item);
}

/**
 * Whether a menu item can be dragged in sidebar edit mode.
 * Protected/runtime/system items remain reorderable; only pinned home is locked.
 */
export function canDragNavigationItem(
  item,
  { sidebarMode = "runtime", isEditMode = false } = {},
) {
  void sidebarMode;

  if (!isEditMode) {
    return false;
  }

  return !isNavigationDragDisabled(item, sidebarMode);
}
