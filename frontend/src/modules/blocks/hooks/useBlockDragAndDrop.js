import { useRef, useState } from "react";

export default function useBlockDragAndDrop({ onMoveBlock }) {
  const [dropTarget, setDropTarget] = useState(null);
  const [draggedBlockId, setDraggedBlockId] = useState(null);

  const dragDataRef = useRef({
    blockId: null,
    sourceSectionId: null,
  });

  const handleBlockDragStart = (event, block, sourceSectionId) => {
    event.stopPropagation();

    const blockId = String(block.id);
    const sectionId = String(sourceSectionId);

    dragDataRef.current = {
      blockId,
      sourceSectionId: sectionId,
    };

    setDraggedBlockId(blockId);

    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("drag/type", "block");
    event.dataTransfer.setData("block/id", blockId);
    event.dataTransfer.setData("block/sourceSectionId", sectionId);

    if (event.dataTransfer.setDragImage) {
      const dragGhost = document.createElement("div");
      dragGhost.style.cssText =
        "position:fixed;left:-9999px;top:-9999px;width:1px;height:1px;opacity:0;";
      document.body.appendChild(dragGhost);
      event.dataTransfer.setDragImage(dragGhost, 0, 0);
      window.setTimeout(() => dragGhost.remove(), 0);
    }
  };

  const handleBlockDragEnd = () => {
    resetDrag();
  };

  const handleBlockDragOver = (event, targetBlock, targetSectionId) => {
    const currentDraggedBlockId = dragDataRef.current.blockId;
    const targetBlockId = String(targetBlock?.id || "");

    if (!currentDraggedBlockId || !targetBlockId) return;
    if (currentDraggedBlockId === targetBlockId) return;

    event.preventDefault();
    event.stopPropagation();

    setDropTarget({
      targetBlockId,
      targetSectionId: String(targetSectionId),
      position: "replace",
    });

    event.dataTransfer.dropEffect = "move";
  };

  const handleBlockDrop = async (
    event,
    targetBlock,
    targetSectionId,
    blocks = []
  ) => {
    event.preventDefault();
    event.stopPropagation();

    const currentDraggedBlockId = dragDataRef.current.blockId;
    const sourceSectionId = dragDataRef.current.sourceSectionId;
    const targetBlockId = String(targetBlock?.id || "");
    const nextTargetSectionId = String(targetSectionId);

    if (!currentDraggedBlockId || !targetBlockId) {
      resetDrag();
      return;
    }

    if (currentDraggedBlockId === targetBlockId) {
      resetDrag();
      return;
    }

    const targetOrderIndex = calculateTargetOrderIndex({
      blocks,
      draggedBlockId: currentDraggedBlockId,
      targetBlockId,
      isSameSection: sourceSectionId === nextTargetSectionId,
    });

    await onMoveBlock?.({
      blockId: Number(currentDraggedBlockId),
      targetSectionId: Number(nextTargetSectionId),
      targetOrderIndex,
    });

    resetDrag();
  };

  const handleSectionDragOver = (event, targetSectionId) => {
    const currentDraggedBlockId = dragDataRef.current.blockId;
    if (!currentDraggedBlockId) return;

    event.preventDefault();
    event.stopPropagation();

    setDropTarget({
      targetBlockId: null,
      targetSectionId: String(targetSectionId),
      position: "inside",
    });

    event.dataTransfer.dropEffect = "move";
  };

  const handleSectionDrop = async (event, targetSectionId, blocks = []) => {
    event.preventDefault();
    event.stopPropagation();

    const currentDraggedBlockId = dragDataRef.current.blockId;
    const sourceSectionId = dragDataRef.current.sourceSectionId;
    const nextTargetSectionId = String(targetSectionId);

    if (!currentDraggedBlockId) {
      resetDrag();
      return;
    }

    const targetOrderIndex = calculateSectionEndOrderIndex({
      blocks,
      draggedBlockId: currentDraggedBlockId,
      isSameSection: sourceSectionId === nextTargetSectionId,
    });

    await onMoveBlock?.({
      blockId: Number(currentDraggedBlockId),
      targetSectionId: Number(nextTargetSectionId),
      targetOrderIndex,
    });

    resetDrag();
  };

  const resetDrag = () => {
    dragDataRef.current = {
      blockId: null,
      sourceSectionId: null,
    };

    setDropTarget(null);
    setDraggedBlockId(null);
  };

  return {
    dropTarget,
    draggedBlockId,
    handleBlockDragStart,
    handleBlockDragOver,
    handleBlockDrop,
    handleBlockDragEnd,
    handleSectionDragOver,
    handleSectionDrop,
    resetDrag,
  };
}

function calculateTargetOrderIndex({
  blocks,
  draggedBlockId,
  targetBlockId,
  isSameSection,
}) {
  const originalBlocks = Array.isArray(blocks) ? [...blocks] : [];

  const originalTargetIndex = originalBlocks.findIndex(
    (block) => String(block.id) === String(targetBlockId)
  );

  if (originalTargetIndex === -1) {
    return originalBlocks.length;
  }

  if (isSameSection) {
    const workingBlocks = originalBlocks.filter(
      (block) => String(block.id) !== String(draggedBlockId)
    );

    const targetIndex = workingBlocks.findIndex(
      (block) => String(block.id) === String(targetBlockId)
    );

    return targetIndex === -1 ? workingBlocks.length : targetIndex;
  }

  return originalTargetIndex;
}

function calculateSectionEndOrderIndex({
  blocks,
  draggedBlockId,
  isSameSection,
}) {
  let workingBlocks = Array.isArray(blocks) ? [...blocks] : [];

  if (isSameSection) {
    workingBlocks = workingBlocks.filter(
      (block) => String(block.id) !== String(draggedBlockId)
    );
  }

  return workingBlocks.length;
}