import { useEffect, useState } from "react";
import { navigationService } from "../services/navigationService";

export default function useMenuDragAndDrop({ items, isEnabled, reload, onMove }) {
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
    if (!isEnabled || !draggedId || !targetItem) return;
    if (String(draggedId) === String(targetItem.id)) return;

    event.preventDefault();
    event.dataTransfer.dropEffect = "move";

    const rect = event.currentTarget.getBoundingClientRect();
    const offsetY = event.clientY - rect.top;
    const height = Math.max(rect.height, 1);

    let position;

if (canAcceptChildren(targetItem)) {
  position = "inside";

  if (offsetY < height * 0.3) {
    position = "before";
  } else if (offsetY > height * 0.7) {
    position = "after";
  }
} else {
  position = offsetY < height * 0.5
    ? "before"
    : "after";
}

    setDropTarget({
      targetId: targetItem.id,
      position,
    });
  };

  const handleContainerDragOver = (event) => {
    if (!isEnabled || !draggedId || !tree.length) return;

    event.preventDefault();
    event.dataTransfer.dropEffect = "move";

    const lastRootItem = tree[tree.length - 1];

    if (!lastRootItem || String(lastRootItem.id) === String(draggedId)) {
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    const bottomDistance = rect.bottom - event.clientY;

    if (bottomDistance <= 56) {
      setDropTarget({
        targetId: lastRootItem.id,
        position: "after",
      });
    }
  };

  const handleDrop = async (event, targetItem) => {
    event.preventDefault();

    if (!isEnabled || !draggedId || !dropTarget) {
      resetDrag();
      return;
    }

    if (targetItem && String(draggedId) === String(targetItem.id)) {
      resetDrag();
      return;
    }

    const result = moveNode(
      tree,
      draggedId,
      dropTarget.targetId,
      dropTarget.position
    );

    if (!result) {
      resetDrag();
      return;
    }

    setTree(result);

    const payload = flattenTree(result);

    try {
      if (typeof onMove === "function") {
        await onMove(payload, result);
      } else {
        await navigationService.moveItems(payload);
        await reload();
      }
    } catch (e) {
      console.error("Ошибка сохранения порядка меню:", e);
      alert("Не удалось сохранить порядок меню");
      await reload();
    } finally {
      resetDrag();
    }
  };

  const handleContainerDrop = async (event) => {
    event.preventDefault();

    if (!isEnabled || !draggedId || !dropTarget) {
      resetDrag();
      return;
    }

    const result = moveNode(
      tree,
      draggedId,
      dropTarget.targetId,
      dropTarget.position
    );

    if (!result) {
      resetDrag();
      return;
    }

    setTree(result);

    const payload = flattenTree(result);

    try {
      if (typeof onMove === "function") {
        await onMove(payload, result);
      } else {
        await navigationService.moveItems(payload);
        await reload();
      }
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
    handleContainerDragOver,
    handleContainerDrop,
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
      if (String(item.id) === String(id)) {
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
    if (String(item.id) === String(targetId)) {
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
    if (String(child.id) === String(targetId)) return true;
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