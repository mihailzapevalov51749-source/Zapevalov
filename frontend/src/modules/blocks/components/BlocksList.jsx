import BlockRenderer from "./BlockRenderer";

export default function BlocksList({
  sectionId,
  blocks = [],
  isEditMode,
  layout = "one_column",
  onEditBlock,
  onDeleteBlock,
  onBlockUpdated,
  blockDragAndDrop,

  tableViewState,
  tableIdentity,
  representations,
  activeRepresentationId,
  isRepresentationDirty,
  isBaseStateDirty,

  onToggleColumnVisibility,
  onSelectRepresentation,
  onCreateRepresentation,
  onDeleteRepresentation,
  onToggleRepresentationVisibility,
  onRenameRepresentation,
  onSaveRepresentation,
  onSaveAsRepresentation,
  onDuplicateRepresentation,
  onSetDefaultRepresentation,
}) {
  const dropTarget = blockDragAndDrop?.dropTarget;
  const draggedBlockId = blockDragAndDrop?.draggedBlockId;

  const tableRepresentationProps = {
    tableViewState,
    tableIdentity,
    representations,
    activeRepresentationId,
    isRepresentationDirty,
    isBaseStateDirty,

    onToggleColumnVisibility,
    onSelectRepresentation,
    onCreateRepresentation,
    onDeleteRepresentation,
    onToggleRepresentationVisibility,
    onRenameRepresentation,
    onSaveRepresentation,
    onSaveAsRepresentation,
    onDuplicateRepresentation,
    onSetDefaultRepresentation,
  };

  if (blocks.length === 0) {
    return (
      <div
        onDragOver={(event) => {
          blockDragAndDrop?.handleSectionDragOver(event, sectionId);
        }}
        onDrop={(event) => {
          blockDragAndDrop?.handleSectionDrop(event, sectionId, blocks);
        }}
        style={{
          flex: 1,
          minHeight: 0,
          width: "100%",
          border: isEditMode ? "1px dashed #93c5fd" : "none",
          borderRadius: 12,
          background: isEditMode ? "#ffffff" : "transparent",
          color: "#64748b",
          display: isEditMode ? "flex" : "none",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 14,
          boxSizing: "border-box",
          overflow: "hidden",
        }}
      >
        Перетащи блок сюда
      </div>
    );
  }

  return (
    <div
      style={{
        flex: 1,
        minHeight: 0,
        width: "100%",
        display: "grid",
        gap: 16,
        gridTemplateColumns: getGridTemplateColumns(layout),
        alignContent: "stretch",
        boxSizing: "border-box",
        overflow: "hidden",
      }}
    >
      {blocks.map((block) => {
        const isCurrentTarget =
          String(dropTarget?.targetBlockId) === String(block.id) &&
          String(dropTarget?.targetSectionId) === String(sectionId);

        const isDragged = String(draggedBlockId) === String(block.id);

        return (
          <BlockRenderer
            key={block.id}
            block={block}
            isEditMode={isEditMode}
            onEdit={onEditBlock}
            onDelete={onDeleteBlock}
            onBlockUpdated={onBlockUpdated}
            draggable={isEditMode}
            tableRepresentationProps={tableRepresentationProps}
            onDragStart={(event) =>
              blockDragAndDrop?.handleBlockDragStart(event, block, sectionId)
            }
            onDragOver={(event) =>
              blockDragAndDrop?.handleBlockDragOver(event, block, sectionId)
            }
            onDrop={(event) =>
              blockDragAndDrop?.handleBlockDrop(event, block, sectionId, blocks)
            }
            onDragEnd={blockDragAndDrop?.resetDrag}
            isDropBefore={isCurrentTarget && dropTarget?.position === "before"}
            isDropAfter={isCurrentTarget && dropTarget?.position === "after"}
            isDragTarget={isCurrentTarget}
            isDragged={isDragged}
          />
        );
      })}
    </div>
  );
}

function getGridTemplateColumns(layout) {
  if (layout === "two_columns") return "repeat(2, minmax(0, 1fr)";
  if (layout === "three_columns") return "repeat(3, minmax(0, 1fr))";
  if (layout === "grid") return "repeat(auto-fit, minmax(220px, 1fr))";

  return "1fr";
}