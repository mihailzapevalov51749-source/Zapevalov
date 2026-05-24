import { useEffect, useMemo, useState } from "react";

import UniversalTableLayout from "../tableView/UniversalTableLayout";
import UniversalTreeView from "./UniversalTreeView";

import dndIcon from "../../../../assets/icons/dnd.png";

const MIN_BLOCK_WIDTH = 240;
const MIN_BLOCK_HEIGHT = 240;

const SNAP_SIZE = 1;
const DRAG_START_THRESHOLD = 4;

function getFieldId(field) {
  return String(
    field?.id ||
      field?.field_id ||
      field?.fieldId ||
      field?.key ||
      field?.name ||
      ""
  );
}

function filterItemsByFieldIds(items = [], selectedFieldIds = []) {
  if (!Array.isArray(selectedFieldIds) || !selectedFieldIds.length) {
    return items;
  }

  const selectedSet = new Set(selectedFieldIds.map((id) => String(id)));

  return items.filter((item) => selectedSet.has(getFieldId(item)));
}

function snap(value) {
  return Math.round(value / SNAP_SIZE) * SNAP_SIZE;
}

function getRect(block) {
  const x = Number(block.x || 0);
  const y = Number(block.y || 0);
  const width = Number(block.width || 0);
  const height = Number(block.height || 0);

  return {
    left: x,
    top: y,
    right: x + width,
    bottom: y + height,
  };
}

function isRectIntersect(a, b) {
  return !(
    a.right <= b.left ||
    a.left >= b.right ||
    a.bottom <= b.top ||
    a.top >= b.bottom
  );
}

function hasCollision(candidateBlock, blocks, ignoreBlockId) {
  const candidateRect = getRect(candidateBlock);

  return blocks.some((block) => {
    if (block.id === ignoreBlockId) return false;

    return isRectIntersect(candidateRect, getRect(block));
  });
}

function normalizeBlocks(view) {
  const source = Array.isArray(view?.settings?.blocks)
    ? view.settings.blocks
    : [];

  return source.map((block, index) => ({
    id: block.id || `${block.type || "block"}-${index}`,
    type: block.type || "unknown",
    title: block.title || "Блок",
    fields: Array.isArray(block.fields) ? block.fields : [],
    x: Number(block.x ?? 0),
    y: Number(block.y ?? 0),
    width: Number(block.width ?? 420),
    height: Number(block.height ?? 620),
    settings: block.settings || {},
  }));
}

function isInteractiveTarget(target) {
  if (!target) return false;

  return Boolean(
    target.closest?.(
      [
        "button",
        "input",
        "textarea",
        "select",
        "a",
        "[role='button']",
        "[contenteditable='true']",
        "[data-resize-handle='true']",
        "[data-no-block-drag='true']",
      ].join(",")
    )
  );
}

function OrgStructurePlaceholder() {
  return (
    <div style={styles.placeholder}>
      <div style={styles.placeholderTitle}>Схема структуры компании</div>

      <div style={styles.placeholderText}>
        Здесь будет визуальная схема оргструктуры.
      </div>
    </div>
  );
}

function renderViewBlock({
  block,
  rows,
  columns,
  fields,
  controller,
  onRowOpen,
  onRowCreate,
  onRowUpdate,
  onRowDelete,
}) {
  const type = block?.type || "unknown";

  const blockFields = filterItemsByFieldIds(fields, block?.fields);
  const blockColumns = filterItemsByFieldIds(columns, block?.fields);

  if (type === "tree") {
    return (
      <UniversalTreeView
        embedded
        view={block}
        rows={rows}
        columns={blockColumns}
        fields={blockFields}
        onRowOpen={onRowOpen}
        onRowCreate={onRowCreate}
        onRowUpdate={onRowUpdate}
        onRowDelete={onRowDelete}
      />
    );
  }

  if (type === "table") {
    return (
      <UniversalTableLayout
        topBarProps={controller?.topBarProps}
        tableViewBarProps={controller?.tableViewBarProps}
        mainContentProps={{
          ...(controller?.mainContentProps || {}),
          columns: blockColumns,
          fields: blockFields,
        }}
      />
    );
  }

  if (type === "org_structure" || type === "org_chart") {
    return <OrgStructurePlaceholder />;
  }

  return (
    <div style={styles.unsupported}>
      Блок «{type}» пока не реализован.
    </div>
  );
}

export default function UniversalCompositeView({
  view,
  rows,
  columns,
  fields,
  controller,
  onViewUpdate,
  onRowOpen,
  onRowCreate,
  onRowUpdate,
  onRowDelete,
}) {
  const viewKey = String(view?.id || view?.key || view?.name || "default");

  const initialBlocks = useMemo(() => normalizeBlocks(view), [viewKey]);

  const [blocks, setBlocks] = useState(initialBlocks);
  const [activeBlockId, setActiveBlockId] = useState(null);
  const [hoveredBlockId, setHoveredBlockId] = useState(null);
  const [invalidDropBlockId, setInvalidDropBlockId] = useState(null);
  const [dragIconPoint, setDragIconPoint] = useState(null);

  useEffect(() => {
    setBlocks(normalizeBlocks(view));

    setActiveBlockId(null);
    setHoveredBlockId(null);
    setInvalidDropBlockId(null);
    setDragIconPoint(null);
  }, [viewKey, view?.settings?.blocks]);

  const canvasMinHeight = useMemo(() => {
    const maxBlockBottom = blocks.reduce((max, block) => {
      return Math.max(max, Number(block.y || 0) + Number(block.height || 0));
    }, 0);

    return Math.max(maxBlockBottom, window.innerHeight - 180);
  }, [blocks]);

  function persistBlocks(nextBlocks) {
    if (!view?.id) return;

    onViewUpdate?.(view.id, {
      settings: {
        ...(view.settings || {}),
        blocks: nextBlocks,
      },
    });
  }

  function flashInvalid(blockId) {
    setInvalidDropBlockId(blockId);

    window.setTimeout(() => {
      setInvalidDropBlockId(null);
    }, 180);
  }

  function handleBlockDragStart(event, blockId) {
    if (event.button !== 0) return;
    if (isInteractiveTarget(event.target)) return;

    event.preventDefault();

    const currentBlock = blocks.find((block) => block.id === blockId);
    if (!currentBlock) return;

    const blockElement = event.currentTarget;
    const blockRect = blockElement.getBoundingClientRect();

    setHoveredBlockId(blockId);

    setDragIconPoint({
      blockId,
      x: event.clientX - blockRect.left,
      y: event.clientY - blockRect.top,
    });

    const startMouseX = event.clientX;
    const startMouseY = event.clientY;
    const startBlock = { ...currentBlock };

    let hasStartedDrag = false;

    function handleMouseMove(moveEvent) {
      const deltaX = moveEvent.clientX - startMouseX;
      const deltaY = moveEvent.clientY - startMouseY;

      if (
        !hasStartedDrag &&
        Math.abs(deltaX) < DRAG_START_THRESHOLD &&
        Math.abs(deltaY) < DRAG_START_THRESHOLD
      ) {
        return;
      }

      if (!hasStartedDrag) {
        hasStartedDrag = true;

        setActiveBlockId(blockId);

        document.body.style.cursor = "grabbing";
        document.body.style.userSelect = "none";
      }

      const nextBlock = {
        ...startBlock,
        x: Math.max(0, snap(startBlock.x + deltaX)),
        y: Math.max(0, snap(startBlock.y + deltaY)),
      };

      setBlocks((prev) =>
        prev.map((block) => (block.id === blockId ? nextBlock : block))
      );
    }

    function handleMouseUp() {
      let nextBlocksToPersist = null;

      setBlocks((prev) => {
        const droppedBlock = prev.find((block) => block.id === blockId);

        if (!droppedBlock) return prev;

        if (hasCollision(droppedBlock, prev, blockId)) {
          flashInvalid(blockId);

          const revertedBlocks = prev.map((block) =>
            block.id === blockId ? startBlock : block
          );

          nextBlocksToPersist = revertedBlocks;

          return revertedBlocks;
        }

        nextBlocksToPersist = prev;

        return prev;
      });

      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);

      document.body.style.cursor = "";
      document.body.style.userSelect = "";

      setActiveBlockId(null);
      setHoveredBlockId(null);
      setDragIconPoint(null);

      window.setTimeout(() => {
        if (nextBlocksToPersist) {
          persistBlocks(nextBlocksToPersist);
        }
      }, 0);
    }

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  }

  function handleBlockResizeStart(event, blockId, direction) {
    event.preventDefault();
    event.stopPropagation();

    const currentBlock = blocks.find((block) => block.id === blockId);
    if (!currentBlock) return;

    setActiveBlockId(blockId);
    setHoveredBlockId(blockId);
    setDragIconPoint(null);

    const startMouseX = event.clientX;
    const startMouseY = event.clientY;

    const startBlock = { ...currentBlock };

    const startLeft = Number(startBlock.x || 0);
    const startTop = Number(startBlock.y || 0);
    const startWidth = Number(startBlock.width || MIN_BLOCK_WIDTH);
    const startHeight = Number(startBlock.height || MIN_BLOCK_HEIGHT);
    const startRight = startLeft + startWidth;
    const startBottom = startTop + startHeight;

    const isHorizontal = direction === "left" || direction === "right";

    function getNextBlock(moveEvent) {
      const deltaX = moveEvent.clientX - startMouseX;
      const deltaY = moveEvent.clientY - startMouseY;

      if (direction === "right") {
        return {
          ...startBlock,
          width: Math.max(MIN_BLOCK_WIDTH, snap(startWidth + deltaX)),
        };
      }

      if (direction === "left") {
        const rawLeft = snap(startLeft + deltaX);
        const maxLeft = startRight - MIN_BLOCK_WIDTH;
        const nextLeft = Math.max(0, Math.min(rawLeft, maxLeft));

        return {
          ...startBlock,
          x: nextLeft,
          width: startRight - nextLeft,
        };
      }

      if (direction === "bottom") {
        return {
          ...startBlock,
          height: Math.max(MIN_BLOCK_HEIGHT, snap(startHeight + deltaY)),
        };
      }

      if (direction === "top") {
        const rawTop = snap(startTop + deltaY);
        const maxTop = startBottom - MIN_BLOCK_HEIGHT;
        const nextTop = Math.max(0, Math.min(rawTop, maxTop));

        return {
          ...startBlock,
          y: nextTop,
          height: startBottom - nextTop,
        };
      }

      return startBlock;
    }

    function handleMouseMove(moveEvent) {
      const nextBlock = getNextBlock(moveEvent);

      setBlocks((prev) =>
        prev.map((block) => (block.id === blockId ? nextBlock : block))
      );
    }

    function handleMouseUp() {
      let nextBlocksToPersist = null;

      setBlocks((prev) => {
        const resizedBlock = prev.find((block) => block.id === blockId);

        if (!resizedBlock) return prev;

        if (hasCollision(resizedBlock, prev, blockId)) {
          flashInvalid(blockId);

          const revertedBlocks = prev.map((block) =>
            block.id === blockId ? startBlock : block
          );

          nextBlocksToPersist = revertedBlocks;

          return revertedBlocks;
        }

        nextBlocksToPersist = prev;

        return prev;
      });

      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);

      document.body.style.cursor = "";
      document.body.style.userSelect = "";

      setActiveBlockId(null);
      setHoveredBlockId(null);
      setDragIconPoint(null);

      window.setTimeout(() => {
        if (nextBlocksToPersist) {
          persistBlocks(nextBlocksToPersist);
        }
      }, 0);
    }

    document.body.style.cursor = isHorizontal ? "col-resize" : "row-resize";
    document.body.style.userSelect = "none";

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  }

  return (
    <div style={styles.viewport}>
      <div
        style={{
          ...styles.canvas,
          minHeight: `max(100%, ${canvasMinHeight}px)`,
        }}
      >
        {blocks.map((block) => {
          const isActive = activeBlockId === block.id;
          const isHovered = hoveredBlockId === block.id;
          const isInvalid = invalidDropBlockId === block.id;

          const shouldShowDragIcon =
            dragIconPoint?.blockId === block.id || isActive;

          return (
            <div
              key={block.id}
              style={{
                ...styles.blockFrame,
                ...(isHovered ? styles.blockFrameHovered : {}),
                ...(isActive ? styles.blockFrameActive : {}),
                ...(isInvalid ? styles.blockFrameInvalid : {}),
                left: block.x,
                top: block.y,
                width: block.width,
                height: block.height,
                zIndex: isActive ? 100 : isHovered ? 10 : 1,
              }}
              onMouseEnter={() => setHoveredBlockId(block.id)}
              onMouseLeave={() => {
                if (activeBlockId !== block.id) {
                  setHoveredBlockId(null);
                  setDragIconPoint(null);
                }
              }}
              onMouseDown={(event) => handleBlockDragStart(event, block.id)}
            >
              {shouldShowDragIcon && (
                <img
                  src={dndIcon}
                  alt=""
                  style={{
                    ...styles.dragIcon,
                    left: dragIconPoint?.x ?? 16,
                    top: dragIconPoint?.y ?? 16,
                  }}
                  draggable={false}
                />
              )}

              <div style={styles.blockContent}>
                {renderViewBlock({
                  block,
                  rows,
                  columns,
                  fields,
                  controller,
                  onRowOpen,
                  onRowCreate,
                  onRowUpdate,
                  onRowDelete,
                })}
              </div>

              <div
                data-resize-handle="true"
                style={styles.resizeHandleLeft}
                onMouseDown={(event) =>
                  handleBlockResizeStart(event, block.id, "left")
                }
              />

              <div
                data-resize-handle="true"
                style={styles.resizeHandleRight}
                onMouseDown={(event) =>
                  handleBlockResizeStart(event, block.id, "right")
                }
              />

              <div
                data-resize-handle="true"
                style={styles.resizeHandleTop}
                onMouseDown={(event) =>
                  handleBlockResizeStart(event, block.id, "top")
                }
              />

              <div
                data-resize-handle="true"
                style={styles.resizeHandleBottom}
                onMouseDown={(event) =>
                  handleBlockResizeStart(event, block.id, "bottom")
                }
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

const styles = {
  viewport: {
    width: "100%",
    height: "100%",
    minHeight: 0,
    background: "transparent",
    overflow: "auto",
  },

  canvas: {
    position: "relative",
    width: "100%",
    height: "100%",
    minHeight: "100%",
    background: "transparent",
    boxSizing: "border-box",
  },

  blockFrame: {
    position: "absolute",
    minWidth: MIN_BLOCK_WIDTH,
    minHeight: MIN_BLOCK_HEIGHT,
    background: "transparent",
    border: "none",
    borderRadius: 0,
    boxSizing: "border-box",
    overflow: "hidden",
    cursor: "default",
  },

  blockFrameHovered: {
    outline: "1px solid rgba(37, 99, 235, 0.45)",
    outlineOffset: -1,
  },

  blockFrameActive: {
    outline: "2px solid #2563EB",
    outlineOffset: -2,
    cursor: "grabbing",
  },

  blockFrameInvalid: {
    outline: "2px solid #EF4444",
    outlineOffset: -2,
  },

  dragIcon: {
    position: "absolute",
    width: 16,
    height: 16,
    transform: "translate(-50%, -50%)",
    objectFit: "contain",
    pointerEvents: "none",
    userSelect: "none",
    zIndex: 50,
  },

  blockContent: {
    width: "100%",
    height: "100%",
    minWidth: 0,
    minHeight: 0,
    background: "transparent",
    overflow: "hidden",
  },

  resizeHandleLeft: {
    position: "absolute",
    top: 0,
    left: -4,
    width: 8,
    height: "100%",
    cursor: "col-resize",
    background: "transparent",
    zIndex: 40,
  },

  resizeHandleRight: {
    position: "absolute",
    top: 0,
    right: -4,
    width: 8,
    height: "100%",
    cursor: "col-resize",
    background: "transparent",
    zIndex: 40,
  },

  resizeHandleTop: {
    position: "absolute",
    top: -4,
    left: 0,
    right: 0,
    height: 8,
    cursor: "row-resize",
    background: "transparent",
    zIndex: 40,
  },

  resizeHandleBottom: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: -4,
    height: 8,
    cursor: "row-resize",
    background: "transparent",
    zIndex: 40,
  },

  placeholder: {
    width: "100%",
    height: "100%",
    padding: 24,
    background: "transparent",
    boxSizing: "border-box",
  },

  placeholderTitle: {
    marginBottom: 8,
    fontSize: 16,
    fontWeight: 700,
    color: "#111827",
  },

  placeholderText: {
    fontSize: 13,
    color: "#94A3B8",
  },

  unsupported: {
    margin: 16,
    padding: 16,
    border: "1px dashed #CBD5E1",
    borderRadius: 10,
    background: "#F8FAFC",
    fontSize: 13,
    color: "#64748B",
  },
};