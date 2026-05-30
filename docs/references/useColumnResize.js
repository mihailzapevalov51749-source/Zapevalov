import { useEffect, useRef, useState } from "react";

import {
  MIN_COLUMN_WIDTH,
  MAX_COLUMN_WIDTH,
} from "../services/tableConstants";

export default function useColumnResize({
  updateColumn,
  closeColumnMenu,
  setEditingColumnDraft,
  setColumnMenuAnchorRect,
  onAfterResize,
}) {
  const isResizingColumnRef = useRef(false);

  const [columnWidthOverrides, setColumnWidthOverrides] = useState({});
  const [resizeState, setResizeState] = useState(null);

  const getColumnWidth = (column) => {
    return columnWidthOverrides[column.id] || column.width || 180;
  };

  useEffect(() => {
    if (!resizeState) return;

    const handleMouseMove = (event) => {
      const delta = event.clientX - resizeState.startX;

      const nextWidth = Math.min(
        MAX_COLUMN_WIDTH,
        Math.max(MIN_COLUMN_WIDTH, resizeState.startWidth + delta)
      );

      setColumnWidthOverrides((prev) => ({
        ...prev,
        [resizeState.columnId]: nextWidth,
      }));
    };

    const handleMouseUp = async (event) => {
      const delta = event.clientX - resizeState.startX;

      const nextWidth = Math.min(
        MAX_COLUMN_WIDTH,
        Math.max(MIN_COLUMN_WIDTH, resizeState.startWidth + delta)
      );

      setResizeState(null);

      await updateColumn(resizeState.columnId, {
        width: nextWidth,
      });

      setTimeout(() => {
        isResizingColumnRef.current = false;
      }, 0);

      onAfterResize?.();
    };

    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.body.style.cursor = "";
      document.body.style.userSelect = "";

      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [resizeState, updateColumn, onAfterResize]);

  const handleStartResizeColumn = (event, column) => {
    event.preventDefault();
    event.stopPropagation();

    isResizingColumnRef.current = true;

    closeColumnMenu?.();
    setEditingColumnDraft?.(null);
    setColumnMenuAnchorRect?.(null);

    setResizeState({
      columnId: column.id,
      startX: event.clientX,
      startWidth: getColumnWidth(column),
    });
  };

  return {
    isResizingColumnRef,
    columnWidthOverrides,
    getColumnWidth,
    handleStartResizeColumn,
  };
}