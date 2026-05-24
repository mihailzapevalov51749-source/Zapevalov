import { useEffect, useRef, useState } from "react";

import BlockRenderer from "../../blocks/components/BlockRenderer";
import { updateSection } from "../services/sectionService";
import { updateBlock } from "../../blocks/services/blockService";

const GRID_COLUMNS = 60;
const GRID_ROW_HEIGHT = 10;
const GRID_GAP = 2;

const DEFAULT_FREE_HEIGHT = 320;
const MIN_FREE_HEIGHT = 160;

const DEFAULT_BLOCK_WIDTH = 1;
const DEFAULT_BLOCK_HEIGHT = 1;
const BLOCK_MARGIN_ROWS = 1;

export default function FreeLayoutSection({
  section,
  sectionId,
  blocks = [],
  isEditMode,
  onEditBlock,
  onDeleteBlock,
  onSectionUpdated,
  onBlockUpdated,
  onMoveBlock,
}) {
  const gridRef = useRef(null);
  const blockContentRefs = useRef({});

  const [height, setHeight] = useState(
    Number(section?.settings?.freeHeight) || DEFAULT_FREE_HEIGHT
  );

  const [localPositions, setLocalPositions] = useState({});
  const [measuredSizes, setMeasuredSizes] = useState({});
  const [blockedBlockId, setBlockedBlockId] = useState(null);

  useEffect(() => {
    setHeight(Number(section?.settings?.freeHeight) || DEFAULT_FREE_HEIGHT);
  }, [section?.settings?.freeHeight]);

  useEffect(() => {
    const positions = buildSmartPositions(blocks, measuredSizes);
    setLocalPositions(positions);

    const requiredHeight = calculateRequiredSectionHeight(positions, blocks);
    setHeight(requiredHeight);
  }, [blocks, measuredSizes]);

  useEffect(() => {
    const gridElement = gridRef.current;
    if (!gridElement) return;

    const observers = [];

    blocks.forEach((block) => {
      const element = blockContentRefs.current[block.id];
      if (!element) return;

      const observer = new ResizeObserver(([entry]) => {
        const rect = entry.contentRect;

        const nextSize = {
          w: widthToGridColumns(rect.width, gridElement),
          h: heightToGridRows(rect.height),
        };

        setMeasuredSizes((current) => {
          const currentSize = current[block.id];

          if (currentSize?.w === nextSize.w && currentSize?.h === nextSize.h) {
            return current;
          }

          return {
            ...current,
            [block.id]: nextSize,
          };
        });
      });

      observer.observe(element);
      observers.push(observer);
    });

    return () => {
      observers.forEach((observer) => observer.disconnect());
    };
  }, [blocks]);

  const getPosition = (block, index) => {
    return (
      localPositions[block.id] ||
      getBlockPosition(block, index, measuredSizes)
    );
  };

  const recalculateSectionHeight = (positions) => {
    const requiredHeight = calculateRequiredSectionHeight(positions, blocks);
    setHeight(requiredHeight);
  };

  const saveBlockPosition = async (block, position) => {
    const finalPosition = normalizePosition(position);

    const savedBlock = await updateBlock(block.id, {
      settings: {
        ...(normalizeSettings(block.settings) || {}),
        position: finalPosition,
      },
    });

    const normalizedBlock = {
      ...block,
      ...savedBlock,
      settings: {
        ...(normalizeSettings(block.settings) || {}),
        ...(normalizeSettings(savedBlock?.settings) || {}),
        position:
          normalizeSettings(savedBlock?.settings)?.position || finalPosition,
      },
    };

    setLocalPositions((current) => {
      const nextPositions = {
        ...current,
        [block.id]: normalizedBlock.settings.position,
      };

      recalculateSectionHeight(nextPositions);

      return nextPositions;
    });

    onBlockUpdated?.(normalizedBlock);
  };

  const handleBlockPointerDown = (event, block, index) => {
    if (!isEditMode) return;

    const dragHandle = event.target.closest?.("[data-block-drag-handle='true']");

    const ignored = event.target.closest?.(
      "button, input, textarea, select, a, [contenteditable='true'], [data-inline-editor='true'], [data-text-block-content='true'], [data-document-block-content='true'], [data-button-block-content='true'], [data-section-resize-handle='true'], [data-block-resize-handle='true']"
    );

    if (ignored && !dragHandle) return;

    event.preventDefault();
    event.stopPropagation();

    const gridElement = gridRef.current;
    if (!gridElement) return;

    const columnWidth = getColumnWidth(gridElement);

    const startMouseX = event.clientX;
    const startMouseY = event.clientY;
    const startPosition = getPosition(block, index);

    let finalPosition = startPosition;

    const handlePointerMove = (moveEvent) => {
      moveEvent.preventDefault();

      const deltaX = moveEvent.clientX - startMouseX;
      const deltaY = moveEvent.clientY - startMouseY;

      const deltaColumns = Math.round(deltaX / (columnWidth + GRID_GAP));
      const deltaRows = Math.round(deltaY / (GRID_ROW_HEIGHT + GRID_GAP));

      const nextPosition = normalizePosition({
        ...startPosition,
        x: startPosition.x + deltaColumns,
        y: Math.max(0, startPosition.y + deltaRows),
      });

      const isFree = isPositionFree(nextPosition, block.id, localPositions);

      if (!isFree) {
        setBlockedBlockId(block.id);
        return;
      }

      setBlockedBlockId(null);
      finalPosition = nextPosition;

      setLocalPositions((current) => {
        const nextPositions = {
          ...current,
          [block.id]: finalPosition,
        };

        recalculateSectionHeight(nextPositions);

        return nextPositions;
      });
    };

    const handlePointerUp = async (upEvent) => {
      document.removeEventListener("pointermove", handlePointerMove);
      document.removeEventListener("pointerup", handlePointerUp);

      setBlockedBlockId(null);

      try {
        const elementUnderCursor = document.elementFromPoint(
          upEvent.clientX,
          upEvent.clientY
        );

        const targetSectionElement =
          elementUnderCursor?.closest?.("[data-section-id]");

        const targetSectionId = targetSectionElement?.dataset?.sectionId;

        if (targetSectionId && String(targetSectionId) !== String(sectionId)) {
          await onMoveBlock?.({
            blockId: Number(block.id),
            targetSectionId: Number(targetSectionId),
            targetOrderIndex: 999,
          });

          return;
        }

        await saveBlockPosition(block, finalPosition);
      } catch (error) {
        console.error("Ошибка перемещения блока", error);
      }
    };

    document.addEventListener("pointermove", handlePointerMove);
    document.addEventListener("pointerup", handlePointerUp);
  };

  const handleBlockResizeStart = (event, block, index, direction) => {
    if (!isEditMode) return;

    event.preventDefault();
    event.stopPropagation();

    const gridElement = gridRef.current;
    if (!gridElement) return;

    const columnWidth = getColumnWidth(gridElement);

    const startMouseX = event.clientX;
    const startMouseY = event.clientY;
    const startPosition = getPosition(block, index);

    let finalPosition = startPosition;

    const handlePointerMove = (moveEvent) => {
      moveEvent.preventDefault();

      const deltaX = moveEvent.clientX - startMouseX;
      const deltaY = moveEvent.clientY - startMouseY;

      const deltaColumns = Math.round(deltaX / (columnWidth + GRID_GAP));
      const deltaRows = Math.round(deltaY / (GRID_ROW_HEIGHT + GRID_GAP));

      const nextPosition = normalizePosition({
        ...startPosition,
        w:
          direction === "right" || direction === "corner"
            ? startPosition.w + deltaColumns
            : startPosition.w,
        h:
          direction === "bottom" || direction === "corner"
            ? startPosition.h + deltaRows
            : startPosition.h,
      });

      const isFree = isPositionFree(nextPosition, block.id, localPositions);

      if (!isFree) {
        setBlockedBlockId(block.id);
        return;
      }

      setBlockedBlockId(null);
      finalPosition = nextPosition;

      setLocalPositions((current) => {
        const nextPositions = {
          ...current,
          [block.id]: finalPosition,
        };

        recalculateSectionHeight(nextPositions);

        return nextPositions;
      });
    };

    const handlePointerUp = async () => {
      document.removeEventListener("pointermove", handlePointerMove);
      document.removeEventListener("pointerup", handlePointerUp);

      setBlockedBlockId(null);

      try {
        await saveBlockPosition(block, finalPosition);
      } catch (error) {
        console.error("Ошибка изменения размера блока", error);
      }
    };

    document.addEventListener("pointermove", handlePointerMove);
    document.addEventListener("pointerup", handlePointerUp);
  };

  const handleSectionResizeStart = (event) => {
    if (!isEditMode) return;

    event.preventDefault();
    event.stopPropagation();

    const startY = event.clientY;
    const startHeight = height;
    let finalHeight = startHeight;

    const handleMouseMove = (moveEvent) => {
      moveEvent.preventDefault();

      const delta = moveEvent.clientY - startY;
      const nextHeight = Math.max(
        MIN_FREE_HEIGHT,
        Math.round(startHeight + delta)
      );

      finalHeight = nextHeight;
      setHeight(nextHeight);
    };

    const handleMouseUp = async () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);

      try {
        const savedSection = await updateSection(sectionId, {
          settings: {
            ...(section?.settings || {}),
            freeHeight: finalHeight,
          },
        });

        const normalizedSection = {
          ...section,
          ...savedSection,
          settings: {
            ...(section?.settings || {}),
            ...(savedSection?.settings || {}),
            freeHeight: finalHeight,
          },
        };

        setHeight(finalHeight);
        onSectionUpdated?.(normalizedSection);
      } catch (error) {
        console.error("Ошибка сохранения высоты гибкого раздела", error);
      }
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  return (
    <div
      ref={gridRef}
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${GRID_COLUMNS}, minmax(0, 1fr))`,
        gridAutoRows: `${GRID_ROW_HEIGHT}px`,
        gap: `${GRID_GAP}px`,
        marginTop: 0,
        height: `${height}px`,
        minHeight: `${MIN_FREE_HEIGHT}px`,
        position: "relative",
        padding: isEditMode ? "8px 8px 22px" : 0,
        border: isEditMode ? "1px dashed #94a3b8" : "none",
        borderRadius: isEditMode ? 12 : 0,
        background: isEditMode
          ? `
            linear-gradient(to right, rgba(148, 163, 184, 0.25) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(148, 163, 184, 0.25) 1px, transparent 1px)
          `
          : "transparent",
        backgroundSize: isEditMode
          ? `calc((100% - ${
              (GRID_COLUMNS - 1) * GRID_GAP
            }px) / ${GRID_COLUMNS} + ${GRID_GAP}px) ${
              GRID_ROW_HEIGHT + GRID_GAP
            }px`
          : "auto",
        boxSizing: "border-box",
        overflow: "visible",
      }}
    >
      {blocks.map((block, index) => {
        const position = getPosition(block, index);
        const isBlocked = String(blockedBlockId) === String(block.id);

        return (
          <div
            key={block.id}
            onPointerDownCapture={(event) =>
              handleBlockPointerDown(event, block, index)
            }
            onClickCapture={(event) => {
              if (!isEditMode) return;

              const link = event.target.closest?.("a");

              const documentContent = event.target.closest?.(
                "[data-document-block-content='true']"
              );

              const buttonContent = event.target.closest?.(
                "[data-button-block-content='true']"
              );

              if (link && !documentContent && !buttonContent) {
                event.preventDefault();
                event.stopPropagation();
              }
            }}
            style={{
              gridColumn: `${position.x + 1} / span ${position.w}`,
              gridRow: `${position.y + 1} / span ${position.h}`,
              minWidth: 0,
              position: "relative",
              cursor: isEditMode ? "grab" : "default",
              touchAction: "none",
              userSelect: "none",
              outline: isBlocked ? "2px solid #ef4444" : "none",
              outlineOffset: 2,
              borderRadius: 12,
              alignSelf: "stretch",
              justifySelf: "stretch",
              overflow: "visible",
            }}
          >
            <div
              ref={(element) => {
                if (element) {
                  const realContent = element.firstElementChild || element;
                  blockContentRefs.current[block.id] = realContent;
                } else {
                  delete blockContentRefs.current[block.id];
                }
              }}
              style={{
                width: "100%",
                height: block?.settings?.autoHeight ? "auto" : "100%",
                minHeight: block?.settings?.autoHeight
                  ? `${block.settings.autoHeight}px`
                  : 0,
                display: "block",
                overflow: "visible",
              }}
            >
              <BlockRenderer
                block={block}
                isEditMode={isEditMode}
                onEdit={onEditBlock}
                onDelete={onDeleteBlock}
                onBlockUpdated={onBlockUpdated}
                draggable={false}
              />
            </div>

            {isEditMode && (
              <>
                <ResizeHandle
                  type="right"
                  onPointerDown={(event) =>
                    handleBlockResizeStart(event, block, index, "right")
                  }
                />

                {!block?.settings?.autoHeight && (
                  <>
                    <ResizeHandle
                      type="bottom"
                      onPointerDown={(event) =>
                        handleBlockResizeStart(event, block, index, "bottom")
                      }
                    />

                    <ResizeHandle
                      type="corner"
                      onPointerDown={(event) =>
                        handleBlockResizeStart(event, block, index, "corner")
                      }
                    />
                  </>
                )}
              </>
            )}
          </div>
        );
      })}

      {isEditMode && (
        <div
          data-section-resize-handle="true"
          onMouseDown={handleSectionResizeStart}
          draggable={false}
          title="Изменить высоту раздела"
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            height: 26,
            cursor: "ns-resize",
            zIndex: 100,
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "center",
            paddingBottom: 6,
            background:
              "linear-gradient(to bottom, transparent, rgba(241, 245, 249, 0.95))",
            userSelect: "none",
          }}
        >
          <div
            style={{
              width: 72,
              height: 6,
              borderRadius: 999,
              background: "#64748b",
              pointerEvents: "none",
            }}
          />
        </div>
      )}
    </div>
  );
}

function ResizeHandle({ type, onPointerDown }) {
  const base = {
    position: "absolute",
    zIndex: 50,
    background: "transparent",
    userSelect: "none",
  };

  const styles = {
    right: {
      ...base,
      top: 0,
      right: -5,
      width: 10,
      height: "100%",
      cursor: "ew-resize",
    },
    bottom: {
      ...base,
      left: 0,
      right: 0,
      bottom: -5,
      height: 10,
      cursor: "ns-resize",
    },
    corner: {
      ...base,
      right: -6,
      bottom: -6,
      width: 14,
      height: 14,
      cursor: "nwse-resize",
    },
  };

  return (
    <div
      data-block-resize-handle="true"
      onPointerDown={onPointerDown}
      draggable={false}
      style={styles[type]}
    />
  );
}

function buildSmartPositions(blocks, measuredSizes = {}) {
  const positions = {};

  const preparedBlocks = blocks
    .map((block, index) => {
      const savedPosition = getSavedBlockPosition(block);
      const measuredSize = measuredSizes[block.id] || {
        w: DEFAULT_BLOCK_WIDTH,
        h: DEFAULT_BLOCK_HEIGHT,
      };

      const basePosition = savedPosition
        ? normalizePosition({
            ...savedPosition,
            w: savedPosition.w || measuredSize.w,
            h: savedPosition.h || measuredSize.h,
          })
        : null;

      return {
        block,
        index,
        savedPosition: basePosition,
        measuredSize,
      };
    })
    .sort((a, b) => {
      const aY = a.savedPosition?.y ?? a.index * 1000;
      const bY = b.savedPosition?.y ?? b.index * 1000;

      if (aY !== bY) return aY - bY;

      const aX = a.savedPosition?.x ?? 0;
      const bX = b.savedPosition?.x ?? 0;

      return aX - bX;
    });

  let currentY = 0;

  preparedBlocks.forEach(({ block, savedPosition, measuredSize }) => {
    let basePosition;

    if (savedPosition) {
      basePosition = normalizePosition({
        ...savedPosition,
        x: savedPosition.x,
        y: savedPosition.y,
        w: savedPosition.w || measuredSize.w,
        h: savedPosition.h || measuredSize.h,
      });
    } else {
      basePosition = normalizePosition({
        x: 0,
        y: currentY,
        w: measuredSize.w,
        h: measuredSize.h,
      });
    }

    const freePosition = findFreePosition(basePosition, block.id, positions);

    positions[block.id] = freePosition;

    currentY = Math.max(
      currentY,
      freePosition.y + freePosition.h + BLOCK_MARGIN_ROWS
    );
  });

  return positions;
}

function findFreePosition(position, currentBlockId, positions) {
  let nextPosition = { ...position };

  while (!isPositionFree(nextPosition, currentBlockId, positions)) {
    nextPosition = {
      ...nextPosition,
      y: nextPosition.y + BLOCK_MARGIN_ROWS,
    };
  }

  return nextPosition;
}

function getBlockPosition(block, index, measuredSizes = {}) {
  const savedPosition = getSavedBlockPosition(block);
  const measuredSize = measuredSizes[block.id] || {
    w: DEFAULT_BLOCK_WIDTH,
    h: DEFAULT_BLOCK_HEIGHT,
  };

  if (savedPosition) {
    return normalizePosition({
      ...savedPosition,
      x: savedPosition.x,
      y: savedPosition.y,
      w: savedPosition.w || measuredSize.w,
      h: savedPosition.h || measuredSize.h,
    });
  }

  return normalizePosition({
    x: 0,
    y: index * (measuredSize.h + BLOCK_MARGIN_ROWS),
    w: measuredSize.w,
    h: measuredSize.h,
  });
}

function getSavedBlockPosition(block) {
  const settings = normalizeSettings(block.settings);
  const position = settings?.position;

  if (!position) return null;

  return {
    x: Number(position.x ?? 0),
    y: Number(position.y ?? 0),
    w: Number(position.w ?? DEFAULT_BLOCK_WIDTH),
    h: Number(position.h ?? DEFAULT_BLOCK_HEIGHT),
  };
}

function calculateRequiredSectionHeight(positions = {}, blocks = []) {
  let maxBottom = 0;

  Object.entries(positions).forEach(([blockId, position]) => {
    const block = blocks.find((item) => String(item.id) === String(blockId));
    const autoHeight = Number(block?.settings?.autoHeight || 0);

    let bottom;

    if (autoHeight > 0) {
      bottom = Number(position.y || 0) * (GRID_ROW_HEIGHT + GRID_GAP) + autoHeight;
    } else {
      bottom =
        (Number(position.y || 0) + Number(position.h || 1)) *
        (GRID_ROW_HEIGHT + GRID_GAP);
    }

    maxBottom = Math.max(maxBottom, bottom);
  });

  return Math.max(MIN_FREE_HEIGHT, Math.ceil(maxBottom + 48));
}

function heightToGridRows(height) {
  return Math.max(
    1,
    Math.ceil((Number(height) + GRID_GAP) / (GRID_ROW_HEIGHT + GRID_GAP))
  );
}

function widthToGridColumns(width, gridElement) {
  const columnWidth = getColumnWidth(gridElement);

  return clamp(
    Math.ceil((Number(width) + GRID_GAP) / (columnWidth + GRID_GAP)),
    1,
    GRID_COLUMNS
  );
}

function getColumnWidth(gridElement) {
  const gridRect = gridElement.getBoundingClientRect();
  const contentWidth = gridRect.width - 16;

  return (contentWidth - (GRID_COLUMNS - 1) * GRID_GAP) / GRID_COLUMNS;
}

function normalizePosition(position) {
  const width = clamp(
    Number(position.w ?? DEFAULT_BLOCK_WIDTH),
    1,
    GRID_COLUMNS
  );

  const x = clamp(Number(position.x ?? 0), 0, GRID_COLUMNS - width);

  return {
    x,
    y: Math.max(0, Number(position.y ?? 0)),
    w: width,
    h: Math.max(1, Number(position.h ?? DEFAULT_BLOCK_HEIGHT)),
  };
}

function normalizeSettings(settings) {
  if (!settings) return {};

  if (typeof settings === "string") {
    try {
      return JSON.parse(settings);
    } catch {
      return {};
    }
  }

  return settings;
}

function isPositionFree(nextPosition, currentBlockId, positions) {
  return !Object.entries(positions).some(([blockId, position]) => {
    if (String(blockId) === String(currentBlockId)) return false;

    return isOverlapping(nextPosition, position);
  });
}

function isOverlapping(a, b) {
  return !(
    a.x + a.w <= b.x ||
    b.x + b.w <= a.x ||
    a.y + a.h <= b.y ||
    b.y + b.h <= a.y
  );
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}