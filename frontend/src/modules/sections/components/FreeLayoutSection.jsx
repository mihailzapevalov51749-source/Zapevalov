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
  selectedBlockId = null,
  onEditBlock,
  onDeleteBlock,
  onSectionUpdated,
  onBlockUpdated,
  onMoveBlock,
}) {
  const gridRef = useRef(null);
  const manualHeightRef = useRef(
    Number(section?.settings?.freeHeight) || DEFAULT_FREE_HEIGHT
  );
  const suppressClickRef = useRef({ blockId: null, until: 0 });

  const [height, setHeight] = useState(
    Number(section?.settings?.freeHeight) || DEFAULT_FREE_HEIGHT
  );

  const [localPositions, setLocalPositions] = useState({});
  const [blockedBlockId, setBlockedBlockId] = useState(null);

  useEffect(() => {
    const savedHeight = Number(section?.settings?.freeHeight) || DEFAULT_FREE_HEIGHT;
    manualHeightRef.current = savedHeight;
    setHeight(savedHeight);
  }, [section?.settings?.freeHeight]);

  useEffect(() => {
    const positions = buildSmartPositions(blocks);
    setLocalPositions(positions);

    const requiredHeight = calculateRequiredSectionHeight(positions, blocks);
    const nextHeight = Math.max(
      manualHeightRef.current || MIN_FREE_HEIGHT,
      requiredHeight,
      MIN_FREE_HEIGHT
    );

    setHeight(nextHeight);
  }, [blocks]);

  const getPosition = (block, index) => {
    return localPositions[block.id] || getBlockPosition(block, index);
  };

  const recalculateSectionHeight = (positions) => {
    const requiredHeight = calculateRequiredSectionHeight(positions, blocks);

    setHeight((current) =>
      Math.max(
        manualHeightRef.current || MIN_FREE_HEIGHT,
        requiredHeight,
        current,
        MIN_FREE_HEIGHT
      )
    );
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
      "button, input, textarea, select, a, [contenteditable='true'], [data-inline-editor='true'], [data-text-block-content='true'], [data-document-block-content='true'], [data-button-block-content='true'], [data-link-block-content='true'], [data-section-resize-handle='true'], [data-block-resize-handle='true']"
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
    let didMove = false;

    const handlePointerMove = (moveEvent) => {
      moveEvent.preventDefault();

      const deltaX = moveEvent.clientX - startMouseX;
      const deltaY = moveEvent.clientY - startMouseY;

      if (Math.abs(deltaX) > 4 || Math.abs(deltaY) > 4) {
        didMove = true;
      }

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

      if (didMove) {
        suppressClickRef.current = {
          blockId: block.id,
          until: Date.now() + 250,
        };
      }

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

    const resizeHandle = event.currentTarget;
    resizeHandle.setPointerCapture?.(event.pointerId);

    const startY = event.clientY;
    const startHeight = height;
    let finalHeight = startHeight;

    const handlePointerMove = (moveEvent) => {
      moveEvent.preventDefault();

      const delta = moveEvent.clientY - startY;
      const nextHeight = Math.max(
        MIN_FREE_HEIGHT,
        Math.round(startHeight + delta)
      );

      finalHeight = nextHeight;
      manualHeightRef.current = nextHeight;
      setHeight(nextHeight);
    };

    const handlePointerUp = async () => {
      resizeHandle.releasePointerCapture?.(event.pointerId);
      resizeHandle.removeEventListener("pointermove", handlePointerMove);
      resizeHandle.removeEventListener("pointerup", handlePointerUp);
      resizeHandle.removeEventListener("pointercancel", handlePointerUp);

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

        manualHeightRef.current = finalHeight;
        setHeight(finalHeight);
        onSectionUpdated?.(normalizedSection);
      } catch (error) {
        console.error("Ошибка сохранения высоты гибкого раздела", error);
      }
    };

    resizeHandle.addEventListener("pointermove", handlePointerMove);
    resizeHandle.addEventListener("pointerup", handlePointerUp);
    resizeHandle.addEventListener("pointercancel", handlePointerUp);
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

              if (
                String(suppressClickRef.current.blockId) === String(block.id) &&
                Date.now() < suppressClickRef.current.until
              ) {
                event.preventDefault();
                event.stopPropagation();
                return;
              }

              const link = event.target.closest?.("a");

              const documentContent = event.target.closest?.(
                "[data-document-block-content='true']"
              );

              const buttonContent = event.target.closest?.(
                "[data-button-block-content='true']"
              );

              const linkContent = event.target.closest?.(
                "[data-link-block-content='true']"
              );

              if (link && !documentContent && !buttonContent && !linkContent) {
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
              data-block-layout-host="true"
              style={{
                width: "100%",
                height: "100%",
                minHeight: 0,
                position: "relative",
                overflow: "hidden",
              }}
            >
              <BlockRenderer
                block={block}
                isEditMode={isEditMode}
                isSelected={
                  selectedBlockId != null &&
                  String(selectedBlockId) === String(block.id)
                }
                embeddedInCanvas
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
          </div>
        );
      })}

      {isEditMode && (
        <div
          data-section-resize-handle="true"
          onPointerDown={handleSectionResizeStart}
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

function getDefaultBlockSize(blockType) {
  const sizes = {
    text: { w: 12, h: 6 },
    image: { w: 16, h: 18 },
    document: { w: 12, h: 8 },
    link: { w: 10, h: 5 },
    button: { w: 8, h: 4 },
    cards: { w: 18, h: 12 },
    universal_table: { w: 36, h: 18 },
    table: { w: 36, h: 18 },
  };

  return sizes[blockType] || { w: 12, h: 6 };
}

function buildSmartPositions(blocks) {
  const positions = {};

  const preparedBlocks = blocks
    .map((block, index) => {
      const savedPosition = getSavedBlockPosition(block);
      const defaultSize = getDefaultBlockSize(block?.type);

      const basePosition = savedPosition
        ? normalizePosition({
            ...savedPosition,
            w: savedPosition.w || defaultSize.w,
            h: savedPosition.h || defaultSize.h,
          })
        : null;

      return {
        block,
        index,
        savedPosition: basePosition,
        defaultSize,
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

  preparedBlocks.forEach(({ block, savedPosition, defaultSize }) => {
    let basePosition;

    if (savedPosition) {
      basePosition = normalizePosition({
        ...savedPosition,
        x: savedPosition.x,
        y: savedPosition.y,
        w: savedPosition.w || defaultSize.w,
        h: savedPosition.h || defaultSize.h,
      });
    } else {
      basePosition = normalizePosition({
        x: 0,
        y: currentY,
        w: defaultSize.w,
        h: defaultSize.h,
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

function getBlockPosition(block, index) {
  const savedPosition = getSavedBlockPosition(block);
  const defaultSize = getDefaultBlockSize(block?.type);

  if (savedPosition) {
    return normalizePosition({
      ...savedPosition,
      x: savedPosition.x,
      y: savedPosition.y,
      w: savedPosition.w || defaultSize.w,
      h: savedPosition.h || defaultSize.h,
    });
  }

  return normalizePosition({
    x: 0,
    y: index * (defaultSize.h + BLOCK_MARGIN_ROWS),
    w: defaultSize.w,
    h: defaultSize.h,
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
    let bottom =
      (Number(position.y || 0) + Number(position.h || 1)) *
      (GRID_ROW_HEIGHT + GRID_GAP);

    maxBottom = Math.max(maxBottom, bottom);
  });

  return Math.max(MIN_FREE_HEIGHT, Math.ceil(maxBottom + 48));
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