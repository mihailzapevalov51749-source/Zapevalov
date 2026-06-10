const REMOVED_OFFICE_MENU_TITLES = new Set(["мои задачи"]);

export function isRemovedOfficeMenuItem(item) {
  if (!item || typeof item !== "object") {
    return false;
  }

  const title = String(item.title || "").trim().toLowerCase();
  const route = String(item.route || item.url || item.path || "").trim().toLowerCase();

  return (
    item.id === "system-my-tasks" ||
    REMOVED_OFFICE_MENU_TITLES.has(title) ||
    route === "/my-tasks" ||
    route.endsWith("/my-tasks")
  );
}

export function filterRemovedOfficeMenuItems(tree = []) {
  if (!Array.isArray(tree)) {
    return [];
  }

  return tree
    .filter((item) => !isRemovedOfficeMenuItem(item))
    .map((item) => {
      if (!Array.isArray(item.children) || item.children.length === 0) {
        return item;
      }

      return {
        ...item,
        children: filterRemovedOfficeMenuItems(item.children),
      };
    });
}
