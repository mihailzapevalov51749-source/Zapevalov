export function isObjectTypeNavigationItem(item) {
  return item?.type === "object_type" || item?.object_type_id != null;
}

/**
 * Resolves sidebar icon/title fields.
 * Object Type items use display_* projection; other items use navigation fields.
 */
export function resolveSidebarNavigationIconSource(item) {
  if (!item) {
    return {
      title: undefined,
      iconType: undefined,
      iconFileUrl: undefined,
    };
  }

  if (isObjectTypeNavigationItem(item)) {
    return {
      title: item.display_title || item.title,
      iconType: item.display_icon_type ?? item.icon_type,
      iconFileUrl: item.display_icon_file_url ?? item.icon_file_url,
    };
  }

  return {
    title: item.title,
    iconType: item.icon_type,
    iconFileUrl: item.icon_file_url,
  };
}
