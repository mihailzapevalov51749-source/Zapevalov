/**
 * Assigns hierarchical display numbers (1, 1.1, 1.2.1) to plan tree nodes.
 *
 * @param {Array<{ children?: Array<unknown>, hierarchyNumber?: string }>} nodes
 * @param {string} [parentPrefix]
 */
export function assignPlanTreeHierarchyNumbers(nodes = [], parentPrefix = "") {
  nodes.forEach((node, index) => {
    if (!node || typeof node !== "object") {
      return;
    }

    const number = parentPrefix ? `${parentPrefix}.${index + 1}` : `${index + 1}`;
    node.hierarchyNumber = number;

    if (Array.isArray(node.children) && node.children.length) {
      assignPlanTreeHierarchyNumbers(node.children, number);
    }
  });
}
