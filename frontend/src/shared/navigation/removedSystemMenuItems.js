export function isRemovedOfficeMenuItem(item) {
  if (!item || typeof item !== "object") {
    return false;
  }

  const type = String(item.type || "").trim().toLowerCase();

  if (type === "object_type" || item.object_type_id) {
    return false;
  }

  const route = String(item.route || item.url || item.path || "").trim().toLowerCase();

  if (type === "universal_table") {
    return true;
  }

  return (
    item.id === "system-my-tasks" ||
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
