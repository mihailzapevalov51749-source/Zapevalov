import { useRef, useState } from "react";

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
  const suppressClickRef = useRef(false);
  const pointerRef = useRef({ x: 0, y: 0, moved: false });

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

    borderRadius: isTableBlock ? 0 : 12,

    overflow: "hidden",

    cursor: isEditMode && onEdit ? "pointer" : "default",

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

  const handleDragStart = (event) => {
    suppressClickRef.current = true;
    onDragStart?.(event);
  };

  const handleDragEnd = (event) => {
    onDragEnd?.(event);

    window.setTimeout(() => {
      suppressClickRef.current = false;
    }, 0);
  };

  const handlePointerDown = (event) => {
    if (!isEditMode) return;

    pointerRef.current = {
      x: event.clientX,
      y: event.clientY,
      moved: false,
    };
  };

  const handlePointerMove = (event) => {
    if (!isEditMode) return;

    const deltaX = Math.abs(event.clientX - pointerRef.current.x);
    const deltaY = Math.abs(event.clientY - pointerRef.current.y);

    if (deltaX > 4 || deltaY > 4) {
      pointerRef.current.moved = true;
    }
  };

  const handleClick = () => {
    if (!isEditMode || !onEdit) return;
    if (suppressClickRef.current || pointerRef.current.moved) return;

    onEdit();
  };

  return (
    <div
      data-block-host-id={block?.id}
      draggable={Boolean(draggable)}
      onContextMenu={(event) => {
        if (isEditMode) {
          event.stopPropagation();
        }
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onDragStart={handleDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={handleDragEnd}
      onClick={handleClick}
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

          background: "transparent",
        }}
      >
        {children}
      </div>
    </div>
  );
}
