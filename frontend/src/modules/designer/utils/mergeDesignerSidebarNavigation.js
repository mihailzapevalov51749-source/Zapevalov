function isBackendDesignerSystemItem(item) {
  return (
    item?.type === "system_page" ||
    item?.is_system === true ||
    item?.is_protected === true ||
    Boolean(item?.system_key)
  );
}

function stripBackendDesignerSystemDuplicates(apiTree) {
  if (!Array.isArray(apiTree)) {
    return [];
  }

  return apiTree
    .filter((node) => !isBackendDesignerSystemItem(node))
    .map((node) => ({
      ...node,
      children: stripBackendDesignerSystemDuplicates(node.children),
    }));
}

/**
 * Merges persisted API navigation (object_type, workspaces) with frontend meta system menu.
 */
export function mergeDesignerSidebarNavigation(metaItems, apiTree) {
  const meta = Array.isArray(metaItems) ? metaItems : [];
  const apiCustom = stripBackendDesignerSystemDuplicates(apiTree);
  return [...meta, ...apiCustom];
}

const DISALLOWED_PARENT_TYPES = new Set(["object_type", "system_page"]);

export function flattenNavigationParentOptions(apiTree, depth = 0, acc = []) {
  if (!Array.isArray(apiTree)) {
    return acc;
  }

  for (const node of apiTree) {
    const type = String(node?.type || "");
    const id = node?.id;

    if (id != null && !DISALLOWED_PARENT_TYPES.has(type)) {
      const title = node.display_title || node.title || `Пункт #${id}`;
      const typeLabel =
        type === "workspace" || type === "section"
          ? "раздел"
          : type === "page"
            ? "страница"
            : type || "пункт";
      acc.push({
        id,
        label: `${"— ".repeat(depth)}${title} (${typeLabel})`,
        depth,
        type,
      });
    }

    if (Array.isArray(node.children) && node.children.length > 0) {
      flattenNavigationParentOptions(node.children, depth + 1, acc);
    }
  }

  return acc;
}
