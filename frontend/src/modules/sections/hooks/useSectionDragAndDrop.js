import { useRef, useState } from "react";

export default function useSectionDragAndDrop({ onMoveSection }) {
  const [dropTarget, setDropTarget] = useState(null);
  const [draggedSectionId, setDraggedSectionId] = useState(null);

  const dragRef = useRef({
    sectionId: null,
  });

  const handleDragStart = (event, section) => {
    event.stopPropagation();

    const sectionId = String(section.id);

    dragRef.current = {
      sectionId,
    };

    setDraggedSectionId(sectionId);

    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("drag/type", "section");
    event.dataTransfer.setData("section/id", sectionId);
  };

  const handleDragOver = (event, targetSection) => {
    const draggedId = dragRef.current.sectionId;
    const targetId = String(targetSection?.id || "");

    if (!draggedId || !targetId) return;
    if (draggedId === targetId) return;

    event.preventDefault();
    event.stopPropagation();

    setDropTarget(targetId);
    event.dataTransfer.dropEffect = "move";
  };

  const handleDrop = async (event, targetSection, sections = []) => {
    event.preventDefault();
    event.stopPropagation();

    const draggedId = dragRef.current.sectionId;
    const targetId = String(targetSection?.id || "");

    if (!draggedId || !targetId || draggedId === targetId) {
      reset();
      return;
    }

    const draggedIndex = sections.findIndex(
      (item) => String(item.section.id) === draggedId
    );

    const targetIndex = sections.findIndex(
      (item) => String(item.section.id) === targetId
    );

    if (draggedIndex === -1 || targetIndex === -1) {
      reset();
      return;
    }

    await onMoveSection({
      sectionId: Number(draggedId),
      targetOrderIndex: targetIndex,
    });

    reset();
  };

  const reset = () => {
    dragRef.current = {
      sectionId: null,
    };

    setDraggedSectionId(null);
    setDropTarget(null);
  };

  return {
    draggedSectionId,
    dropTarget,
    handleDragStart,
    handleDragOver,
    handleDrop,
    reset,
  };
}