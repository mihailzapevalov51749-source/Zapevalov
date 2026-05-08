import { useState } from "react";

const ROW_DND_MIME = "application/x-universal-table-row";

export default function useTableRowDragAndDrop({
  row,
  rowRef,
  onMoveRow,
  disabled = false,
}) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [dragPosition, setDragPosition] = useState(null); // top | inside | bottom

  const resetDragState = () => {
    setIsDragOver(false);
    setDragPosition(null);
  };

  const getDropPosition = (event) => {
    const rect = rowRef.current?.getBoundingClientRect?.();

    if (!rect || !rect.height) return "inside";

    const offsetY = event.clientY - rect.top;
    const threshold = rect.height / 3;

    if (offsetY < threshold) return "top";
    if (offsetY > rect.height - threshold) return "bottom";

    return "inside";
  };

  const handleDragStart = (event) => {
    if (disabled || !row?.id) return;

    event.stopPropagation();

    const payload = {
      rowId: String(row.id),
      parentId:
        row?.parent_id ??
        row?.parentId ??
        row?.parent_row_id ??
        row?.parentRowId ??
        null,
    };

    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData(ROW_DND_MIME, JSON.stringify(payload));
    event.dataTransfer.setData("text/plain", String(row.id));
  };

  const handleDragOver = (event) => {
    if (disabled || !row?.id) return;

    event.preventDefault();
    event.stopPropagation();

    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = "move";
    }

    setIsDragOver(true);
    setDragPosition(getDropPosition(event));
  };

  const handleDrop = (event) => {
    if (disabled || !row?.id) return;

    event.preventDefault();
    event.stopPropagation();

    const rawPayload =
      event.dataTransfer.getData(ROW_DND_MIME) ||
      event.dataTransfer.getData("text/plain");

    if (!rawPayload) {
      resetDragState();
      return;
    }

    let sourceRowId = "";

    try {
      const parsed = JSON.parse(rawPayload);
      sourceRowId = String(parsed?.rowId || "");
    } catch {
      sourceRowId = String(rawPayload || "");
    }

    const targetRowId = String(row.id);

    if (!sourceRowId || sourceRowId === targetRowId) {
      resetDragState();
      return;
    }

    onMoveRow?.({
      sourceRowId,
      targetRowId,
      position: dragPosition || "inside",
    });

    resetDragState();
  };

  const handleDragLeave = (event) => {
    const nextTarget = event.relatedTarget;

    if (rowRef.current && nextTarget && rowRef.current.contains(nextTarget)) {
      return;
    }

    resetDragState();
  };

  const handleDragEnd = () => {
    resetDragState();
  };

  const getDropVisualStyle = ({ isSelected = false } = {}) => {
    if (!isDragOver) {
      return isSelected ? "inset 3px 0 0 #2563ff" : "none";
    }

    if (dragPosition === "top") return "inset 0 3px 0 #2563eb";
    if (dragPosition === "bottom") return "inset 0 -3px 0 #2563eb";

    return "inset 0 0 0 2px #2563eb";
  };

  return {
    isDragOver,
    dragPosition,

    draggable: !disabled,

    handleDragStart,
    handleDragOver,
    handleDrop,
    handleDragLeave,
    handleDragEnd,

    getDropVisualStyle,
  };
}