import { useEffect, useState } from "react";
import { navigationService } from "../services/navigationService";

export default function useMenuDragAndDrop({ items, isEnabled, reload }) {
  const [tree, setTree] = useState(items || []);
  const [draggedId, setDraggedId] = useState(null);
  const [dropTarget, setDropTarget] = useState(null);

  useEffect(() => {
    setTree(items || []);
  }, [items]);

  const handleDragStart = (itemId) => {
    if (!isEnabled) return;
    setDraggedId(itemId);
  };

  const handleDragOver = (event, targetItem) => {
    if (!isEnabled || !draggedId || draggedId === targetItem.id) return;

    event.preventDefault();

    const rect = event.currentTarget.getBoundingClientRect();
    const offsetY = event.clientY - rect.top;
    const height = rect.height;

    let position = "inside";

    if (offsetY < height * 0.25) {
      position = "before";
    } else if (offsetY > height * 0.75) {
      position = "after";
    }

    if (position === "inside" && !canAcceptChildren(targetItem)) {
      position = "after";
    }

    setDropTarget({
      targetId: targetItem.id,
      position,
    });
  };

  const handleDrop = async (event, targetItem) => {
    event.preventDefault();

    if (!isEnabled || !draggedId || draggedId === targetItem.id || !dropTarget) {
      resetDrag();
      return;
    }

    const result = moveNode(tree, draggedId, targetItem.id, dropTarget.position);

    if (!result) {
      resetDrag();
      return;
    }

    setTree(result);

    const payload = flattenTree(result);

    try {
      await navigationService.moveItems(payload);
      await reload();
    } catch (e) {
      console.error("Ошибка сохранения порядка меню:", e);
      alert("Не удалось сохранить порядок меню");
      await reload();
    } finally {
      resetDrag();
    }
  };

  const resetDrag = () => {
    setDraggedId(null);
    setDropTarget(null);
  };

  return {
    tree,
    draggedId,
    dropTarget,
    handleDragStart,
    handleDragOver,
    handleDrop,
    resetDrag,
  };
}

function canAcceptChildren(item) {
  return item.type === "section" || item.type === "workspace";
}

function moveNode(tree, draggedId, targetId, position) {
  const removed = removeNode(tree, draggedId);

  if (!removed.node) return null;

  if (containsNode(removed.node, targetId)) {
    return tree;
  }

  return insertNode(removed.tree, targetId, removed.node, position);
}

function removeNode(items, id) {
  let removedNode = null;

  const nextItems = items
    .map((item) => {
      if (item.id === id) {
        removedNode = item;
        return null;
      }

      if (item.children?.length) {
        const result = removeNode(item.children, id);

        if (result.node) {
          removedNode = result.node;
          return {
            ...item,
            children: result.tree,
          };
        }
      }

      return item;
    })
    .filter(Boolean);

  return {
    tree: nextItems,
    node: removedNode,
  };
}

function insertNode(items, targetId, node, position) {
  const result = [];

  for (const item of items) {
    if (item.id === targetId) {
      if (position === "before") {
        result.push(normalizeNode(node));
        result.push(item);
        continue;
      }

      if (position === "after") {
        result.push(item);
        result.push(normalizeNode(node));
        continue;
      }

      if (position === "inside" && canAcceptChildren(item)) {
        result.push({
          ...item,
          children: [...(item.children || []), normalizeNode(node)],
        });
        continue;
      }
    }

    if (item.children?.length) {
      result.push({
        ...item,
        children: insertNode(item.children, targetId, node, position),
      });
    } else {
      result.push(item);
    }
  }

  return result;
}

function normalizeNode(node) {
  return {
    ...node,
    children: node.children || [],
  };
}

function containsNode(node, targetId) {
  if (!node.children?.length) return false;

  return node.children.some((child) => {
    if (child.id === targetId) return true;
    return containsNode(child, targetId);
  });
}

function flattenTree(items, parentId = null, result = []) {
  items.forEach((item, index) => {
    result.push({
      id: item.id,
      parent_id: parentId,
      sort_order: index,
    });

    if (item.children?.length) {
      flattenTree(item.children, item.id, result);
    }
  });

  return result;
}