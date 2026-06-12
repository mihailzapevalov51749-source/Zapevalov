import { useState } from "react";

import SectionToolbar from "./SectionToolbar";
import BlocksList from "../../blocks/components/BlocksList";
import FreeLayoutSection from "./FreeLayoutSection";

import {
  isLegacyTableBlockType,
  LEGACY_TABLE_BLOCK_CREATION_MESSAGE,
} from "../../blocks/registry/legacyTableBlockTypes";

export default function ContentSection({
  section,
  blocks = [],
  sections = [],
  isEditMode,
  onEditSection,
  onDeleteSection,
  onSectionUpdated,
  onBlockUpdated,
  onMoveBlock,
  onEditBlock,
  onDeleteBlock,
  onWidgetDragOver,
  onWidgetDrop,
  blockDragAndDrop,
  sectionDragAndDrop,
}) {
  const [isHovered, setIsHovered] = useState(false);

  const isSectionDragActive = Boolean(sectionDragAndDrop?.draggedSectionId);

  const isBlockDropInside =
    !isSectionDragActive &&
    String(blockDragAndDrop?.dropTarget?.targetSectionId) ===
      String(section.id) &&
    blockDragAndDrop?.dropTarget?.position === "inside";

  const isSectionDragTarget =
    String(sectionDragAndDrop?.dropTarget) === String(section.id);

  const isSectionDragged =
    String(sectionDragAndDrop?.draggedSectionId) === String(section.id);

  const isFreeLayout =
    section.layout === "free" ||
    section.type === "free" ||
    section.settings?.layout === "free";

  const isLegacyTableWidgetDrag = (event) => {
    const widgetType = event.dataTransfer.getData("widget/type");
    return isLegacyTableBlockType(widgetType);
  };

  return (
    <section
      data-section-id={section.id}
      draggable={Boolean(isEditMode)}
      onDragStart={(event) => {
        const isResizeHandle = event.target.closest?.(
          '[data-section-resize-handle="true"]'
        );

        if (isResizeHandle) {
          event.preventDefault();
          event.stopPropagation();
          return;
        }

        const blockId = event.dataTransfer.getData("block/id");
        const widgetType = event.dataTransfer.getData("widget/type");

        if (blockId || widgetType) return;

        sectionDragAndDrop?.handleDragStart(event, section);
      }}
      onDragOverCapture={(event) => {
        const widgetType = event.dataTransfer.getData("widget/type");

        if (widgetType) {
          if (isLegacyTableWidgetDrag(event)) {
            event.preventDefault();
            event.dataTransfer.dropEffect = "none";
            return;
          }

          onWidgetDragOver?.(event);
          return;
        }

        if (!isSectionDragActive) return;

        sectionDragAndDrop?.handleDragOver(event, section);
      }}
      onDropCapture={(event) => {
        const widgetType = event.dataTransfer.getData("widget/type");

        if (widgetType) {
          if (isLegacyTableWidgetDrag(event)) {
            event.preventDefault();
            event.stopPropagation();
            alert(LEGACY_TABLE_BLOCK_CREATION_MESSAGE);
            return;
          }

          onWidgetDrop?.(event);
          return;
        }

        if (!isSectionDragActive) return;

        sectionDragAndDrop?.handleDrop(event, section, sections);
      }}
      onDragOver={(event) => {
        if (isSectionDragActive) return;

        const widgetType = event.dataTransfer.getData("widget/type");
        const blockId = event.dataTransfer.getData("block/id");

        if (widgetType) {
          if (isLegacyTableWidgetDrag(event)) {
            event.preventDefault();
            return;
          }

          onWidgetDragOver?.(event);
          return;
        }

        if (blockId) {
          blockDragAndDrop?.handleSectionDragOver(event, section.id);
        }
      }}
      onDrop={(event) => {
        if (isSectionDragActive) return;

        const widgetType = event.dataTransfer.getData("widget/type");
        const blockId = event.dataTransfer.getData("block/id");

        if (widgetType) {
          if (isLegacyTableWidgetDrag(event)) {
            event.preventDefault();
            alert(LEGACY_TABLE_BLOCK_CREATION_MESSAGE);
            return;
          }

          onWidgetDrop?.(event);
          return;
        }

        if (blockId) {
          blockDragAndDrop?.handleSectionDrop(event, section.id, blocks);
        }
      }}
      onDragEnd={() => {
        sectionDragAndDrop?.reset?.();
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        width: "100%",
        flex: 1,
        minHeight: 0,

        display: "flex",
        flexDirection: "column",

        padding: "0",

        background:
          isSectionDragTarget || isBlockDropInside
            ? "#eff6ff"
            : "transparent",

        boxSizing: "border-box",

        position: "relative",

        borderRadius: 12,

        outline: isSectionDragTarget
          ? "2px solid #2563eb"
          : isBlockDropInside
            ? "2px dashed #2563eb"
            : "none",

        outlineOffset: 4,

        opacity: isSectionDragged ? 0.35 : 1,

        cursor: isEditMode ? "grab" : "default",

        overflow: "visible",
      }}
    >
      {isEditMode && !isSectionDragActive && (
        <div
          style={{
            opacity: isHovered ? 1 : 0,
            pointerEvents: isHovered ? "auto" : "none",
          }}
        >
          <SectionToolbar
            onEdit={() => onEditSection(section)}
            onDelete={() => onDeleteSection(section, blocks)}
          />
        </div>
      )}

      <div
        style={{
          flex: 1,
          minHeight: 0,
          width: "100%",

          display: "flex",
          flexDirection: "column",

          overflow: "visible",
        }}
      >
        {isFreeLayout ? (
          <FreeLayoutSection
            section={section}
            sectionId={section.id}
            blocks={blocks}
            isEditMode={isEditMode}
            onEditBlock={onEditBlock}
            onDeleteBlock={onDeleteBlock}
            onSectionUpdated={onSectionUpdated}
            onBlockUpdated={onBlockUpdated}
            onMoveBlock={onMoveBlock}
          />
        ) : (
          <BlocksList
            sectionId={section.id}
            blocks={blocks}
            isEditMode={isEditMode}
            layout={section.layout || "one_column"}
            onEditBlock={onEditBlock}
            onDeleteBlock={onDeleteBlock}
            onBlockUpdated={onBlockUpdated}
            blockDragAndDrop={
              isSectionDragActive ? undefined : blockDragAndDrop
            }
          />
        )}
      </div>
    </section>
  );
}
