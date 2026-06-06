import { navigationService } from "../../navigation/services/navigationService";

const ANCESTOR_NODE_TYPES = new Set(["workspace", "section", "page"]);

function readNavigationNodeTitle(node) {
  return String(node?.display_title || node?.title || "").trim();
}

/**
 * @param {Array<Record<string, unknown>>} items
 * @param {string | number} objectTypeId
 * @param {string[]} ancestors
 * @param {Set<string>} paths
 */
function collectPlacementPaths(items, objectTypeId, ancestors, paths, scopePrefix) {
  if (!Array.isArray(items) || !objectTypeId) {
    return;
  }

  const targetId = String(objectTypeId);
  const prefix = String(scopePrefix || "").trim();

  for (const item of items) {
    if (!item || typeof item !== "object") {
      continue;
    }

    const title = readNavigationNodeTitle(item);
    const nodeType = String(item.type || "");

    if (nodeType === "object_type" && String(item.object_type_id) === targetId) {
      const segments = [...ancestors];

      if (title) {
        segments.push(title);
      }

      if (segments.length) {
        const path = segments.join(" → ");
        paths.add(prefix ? `${prefix} → ${path}` : path);
      }

      continue;
    }

    const nextAncestors =
      ANCESTOR_NODE_TYPES.has(nodeType) && title
        ? [...ancestors, title]
        : ancestors;

    if (Array.isArray(item.children) && item.children.length) {
      collectPlacementPaths(
        item.children,
        objectTypeId,
        nextAncestors,
        paths,
        scopePrefix,
      );
    }
  }
}

/**
 * Human-readable menu placement paths for an object type (Office + Studio menus).
 *
 * @param {string | number} tenantId
 * @param {string | number} objectTypeId
 */
export async function resolveObjectTypeMenuPlacementPaths(tenantId, objectTypeId) {
  if (!tenantId || !objectTypeId) {
    return [];
  }

  try {
    const [runtimeTree, designerTree] = await Promise.all([
      navigationService
        .getTree(tenantId, { scope: "runtime", mode: "runtime" })
        .catch(() => []),
      navigationService
        .getTree(tenantId, { scope: "designer", mode: "designer" })
        .catch(() => []),
    ]);

    const paths = new Set();

    collectPlacementPaths(
      Array.isArray(runtimeTree) ? runtimeTree : [],
      objectTypeId,
      [],
      paths,
      "Офис",
    );
    collectPlacementPaths(
      Array.isArray(designerTree) ? designerTree : [],
      objectTypeId,
      [],
      paths,
      "Студия",
    );

    return Array.from(paths);
  } catch {
    return [];
  }
}
