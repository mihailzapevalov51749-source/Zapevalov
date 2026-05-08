import { useState } from "react";

import BlockToolbar from "./BlockToolbar";

export default function BlockWrapper({
  block,
  isEditMode,
  wrapperStyle = {},
  isResizable = false,
  onResizeCommit,
  onEdit,
  onDelete,
  draggable,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  isDragTarget,
  isDragged,
  children,
}) {
  const [isHovered, setIsHovered] = useState(false);

  const isTableBlock =
    block?.type === "universal_table" ||
    ["table", "tables", "table_block", "tableBlock"].includes(block?.type) ||
    Array.isArray(block?.content?.columns) ||
    Array.isArray(block?.content?.rows);

  const defaultStyle = {
    width: "100%",
    height: "100%",
    minWidth: 0,
    minHeight: 0,
    position: "relative",
    boxSizing: "border-box",
    borderRadius: 12,
    overflow: "hidden",
    cursor: isEditMode ? "pointer" : "default",
    opacity: isDragged ? 0.35 : 1,
    transition:
      "border 120ms ease, background 120ms ease, transform 120ms ease, opacity 120ms ease",
  };

  const editFrameStyle = isEditMode
    ? {
        border: isDragTarget ? "2px solid #2563eb" : "1px solid #cbd5e1",
        background: isDragTarget ? "#eff6ff" : "#ffffff",
        boxShadow: isDragTarget
          ? "0 0 0 3px rgba(37, 99, 235, 0.12)"
          : "0 1px 2px rgba(15, 23, 42, 0.06)",
        transform: isDragTarget ? "scale(1.01)" : "scale(1)",
      }
    : {
        border: "none",
        background: "transparent",
        boxShadow: "none",
        transform: "scale(1)",
      };

  return (
    <div
      draggable={Boolean(draggable)}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      onClick={() => {
        if (isEditMode) onEdit?.();
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        ...defaultStyle,
        ...editFrameStyle,
        ...wrapperStyle,
      }}
    >
      {isEditMode && isHovered && (
        <BlockToolbar onDelete={() => onDelete?.()} />
      )}

      <div
        style={{
          width: "100%",
          height: "100%",
          minWidth: 0,
          minHeight: 0,
          overflow: "hidden",
          boxSizing: "border-box",
          display: isTableBlock ? "flex" : "block",
          flexDirection: isTableBlock ? "column" : undefined,
        }}
      >
        {children}
      </div>
    </div>
  );
}