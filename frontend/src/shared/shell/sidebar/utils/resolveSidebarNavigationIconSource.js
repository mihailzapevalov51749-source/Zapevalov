import {
  hasNavigationMenuIcon,
  isObjectTypeNavigationItem,
  resolveNavigationMenuIconFileUrl,
} from "../../../navigation/navigationMenuIconPolicy.js";

export { isObjectTypeNavigationItem };

/** Menu-only flag: hide Object Type icon in sidebar without changing Object Type. */
export function shouldShowNavigationMenuIcon(item) {
  if (!isObjectTypeNavigationItem(item)) {
    return true;
  }

  return item?.show_icon !== false;
}

/**
 * Resolves sidebar title and uploaded icon file for navigation items.
 */
export function resolveSidebarNavigationIconSource(item) {
  if (!item) {
    return {
      title: undefined,
      iconFileUrl: undefined,
      hasUploadedIcon: false,
    };
  }

  const title = isObjectTypeNavigationItem(item)
    ? item.display_title || item.title
    : item.title;
  const iconFileUrl = resolveNavigationMenuIconFileUrl(item) ?? undefined;

  return {
    title,
    iconFileUrl,
    hasUploadedIcon: hasNavigationMenuIcon(item),
  };
}
