import { useEffect, useState } from "react";

import {
  buildNavigationBlockMovePayload,
  canMoveNavigationItemToBlock,
  findNavigationItemBlockIndex,
  findNavigationItemInBlocks,
  moveItemInNavigationBlocks,
  organizeRootNavigationIntoBlocks,
} from "../../../shared/navigation/navigationMenuBlocks.js";

export default function useBlockedMenuDragAndDrop({
  rootItems = [],
  settings = {},
  menuProfile = "platform",
  isEnabled = false,
  restrictSameBlockOnly = false,
  skipBlocksSyncRef = null,
  onMove,
}) {
  const organizedBlocks = organizeRootNavigationIntoBlocks(rootItems, settings, {
    menuProfile,
  });

  const [blocks, setBlocks] = useState(organizedBlocks);
  const [draggedId, setDraggedId] = useState(null);
  const [dropTarget, setDropTarget] = useState(null);

  useEffect(() => {
    if (draggedId) {
      return;
    }

    if (skipBlocksSyncRef?.current) {
      return;
    }

    setBlocks(organizeRootNavigationIntoBlocks(rootItems, settings, { menuProfile }));
  }, [rootItems, settings, menuProfile, draggedId, skipBlocksSyncRef]);

  const draggedBlockIndex = draggedId
    ? findNavigationItemBlockIndex(blocks, draggedId)
    : -1;

  const canDropAtBlock = (targetBlockIndex) => {
    const draggedItem = findNavigationItemInBlocks(blocks, draggedId);
    if (!draggedItem) {
      return false;
    }

    if (
      restrictSameBlockOnly &&
      draggedBlockIndex >= 0 &&
      targetBlockIndex !== draggedBlockIndex
    ) {
      return false;
    }

    return canMoveNavigationItemToBlock(draggedItem, targetBlockIndex);
  };

  const resetDrag = () => {
    setDraggedId(null);
    setDropTarget(null);
  };

  const handleDragStart = (itemId) => {
    if (!isEnabled) {
      return;
    }
    setDraggedId(itemId);
  };

  const handleDragOver = (event, targetItem, blockIndex) => {
    if (!isEnabled || !draggedId || !targetItem) {
      return;
    }
    if (String(draggedId) === String(targetItem.id)) {
      return;
    }
    if (!canDropAtBlock(blockIndex)) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = "move";

    const rect = event.currentTarget.getBoundingClientRect();
    const offsetY = event.clientY - rect.top;
    const position = offsetY < rect.height / 2 ? "before" : "after";

    setDropTarget({
      blockIndex,
      targetId: targetItem.id,
      position,
    });
  };

  const handleGapDragOver = (event, blockIndex) => {
    if (!isEnabled || !draggedId || !canDropAtBlock(blockIndex)) {
      return;
    }

    event.preventDefault();
    event.dataTransfer.dropEffect = "move";

    setDropTarget({
      blockIndex,
      targetId: null,
      position: "start",
    });
  };

  const handleBlockZoneDragOver = (event, blockIndex) => {
    if (!isEnabled || !draggedId || !canDropAtBlock(blockIndex)) {
      return;
    }

    event.preventDefault();
    event.dataTransfer.dropEffect = "move";

    const blockItems = blocks[blockIndex] || [];
    if (blockItems.length === 0) {
      setDropTarget({
        blockIndex,
        targetId: null,
        position: "start",
      });
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    const offsetY = event.clientY - rect.top;
    const relativeY = offsetY / Math.max(rect.height, 1);

    if (relativeY <= 0.2) {
      setDropTarget({
        blockIndex,
        targetId: null,
        position: "start",
      });
      return;
    }

    if (relativeY >= 0.8) {
      setDropTarget({
        blockIndex,
        targetId: null,
        position: "end",
      });
    }
  };

  const applyDrop = async (nextDropTarget) => {
    if (!isEnabled || !draggedId || !nextDropTarget) {
      resetDrag();
      return;
    }

    if (!canDropAtBlock(nextDropTarget.blockIndex)) {
      resetDrag();
      return;
    }

    const nextBlocks = moveItemInNavigationBlocks(blocks, draggedId, nextDropTarget);
    if (!nextBlocks) {
      resetDrag();
      return;
    }

    setBlocks(nextBlocks);

    const payload = buildNavigationBlockMovePayload(nextBlocks);

    try {
      if (typeof onMove === "function") {
        await onMove(payload, nextBlocks);
      }
    } catch (error) {
      console.error("Ошибка сохранения порядка меню:", error);
      setBlocks(organizeRootNavigationIntoBlocks(rootItems, settings, { menuProfile }));
    } finally {
      resetDrag();
    }
  };

  const handleDrop = async (event, targetItem, blockIndex) => {
    event.preventDefault();
    event.stopPropagation();

    if (!targetItem) {
      await applyDrop({
        blockIndex,
        targetId: null,
        position: "start",
      });
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    const offsetY = event.clientY - rect.top;
    const position = offsetY < rect.height / 2 ? "before" : "after";

    await applyDrop({
      blockIndex,
      targetId: targetItem.id,
      position,
    });
  };

  const handleGapDrop = async (event, blockIndex) => {
    event.preventDefault();
    await applyDrop({
      blockIndex,
      targetId: null,
      position: "start",
    });
  };

  const handleBlockZoneDrop = async (event, blockIndex) => {
    event.preventDefault();

    const blockItems = blocks[blockIndex] || [];
    if (blockItems.length === 0) {
      await applyDrop({
        blockIndex,
        targetId: null,
        position: "start",
      });
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    const offsetY = event.clientY - rect.top;
    const relativeY = offsetY / Math.max(rect.height, 1);
    const position = relativeY >= 0.8 ? "end" : "start";

    await applyDrop({
      blockIndex,
      targetId: null,
      position,
    });
  };

  return {
    blocks: isEnabled ? blocks : organizedBlocks,
    draggedId,
    draggedBlockIndex,
    dropTarget,
    handleDragStart,
    handleDragOver,
    handleGapDragOver,
    handleBlockZoneDragOver,
    handleDrop,
    handleGapDrop,
    handleBlockZoneDrop,
    resetDrag,
  };
}
