import {
  getBlockTypeTitle,
  getBlockViewComponent,
} from "../registry/blockRegistry";
import BlockWrapper from "./BlockWrapper";

export default function BlockRenderer({
  block,
  isEditMode,
  onEdit,
  onDelete,
  onBlockUpdated,
  draggable,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  isDropBefore,
  isDropAfter,
  isDragTarget,
  isDragged,
  tableRepresentationProps,
}) {
  const BlockComponent = getBlockViewComponent(block?.type);

  const isUniversalTableBlock = block?.type === "universal_table";
  const isAdminSystemBlock = block?.type === "admin_system";

  const isTableBlock =
    isUniversalTableBlock ||
    ["table", "tables", "table_block", "tableBlock"].includes(block?.type) ||
    Array.isArray(block?.content?.columns) ||
    Array.isArray(block?.content?.rows);

  const isDocumentsBlock =
    ["documents", "document", "file", "files"].includes(block?.type) ||
    Array.isArray(block?.content?.documents) ||
    Boolean(block?.content?.file_url) ||
    Boolean(block?.content?.fileUrl);

  const isImageBlock =
    ["image", "images", "picture"].includes(block?.type) ||
    Boolean(block?.content?.image_url) ||
    Boolean(block?.content?.imageUrl) ||
    Boolean(block?.content?.url);

  const wrapperStyle = getWrapperStyle({
    isAdminSystemBlock,
    isTableBlock,
    isDocumentsBlock,
    isImageBlock,
    isEditMode,
  });

  return (
    <BlockWrapper
      block={block}
      isEditMode={isEditMode}
      wrapperStyle={wrapperStyle}
      isResizable={false}
      onEdit={() => onEdit?.(block)}
      onDelete={() => onDelete?.(block)}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      isDropBefore={isDropBefore}
      isDropAfter={isDropAfter}
      isDragTarget={isDragTarget}
      isDragged={isDragged}
    >
      {BlockComponent ? (
        <BlockComponent
          block={block}
          isEditMode={isEditMode}
          onEdit={onEdit}
          onDelete={onDelete}
          onBlockUpdated={onBlockUpdated}
          tableRepresentationProps={tableRepresentationProps}
        />
      ) : (
        <DefaultBlock block={block} />
      )}
    </BlockWrapper>
  );
}

function getWrapperStyle({
  isAdminSystemBlock,
  isTableBlock,
  isDocumentsBlock,
  isImageBlock,
  isEditMode,
}) {
  if (isAdminSystemBlock) {
    return {
      width: "100%",
      height: "auto",
      minHeight: "100%",
      padding: 0,
      boxSizing: "border-box",
      overflow: "visible",
      background: "transparent",
      boxShadow: isEditMode ? undefined : "none",
      border: isEditMode ? undefined : "none",
    };
  }

  if (isTableBlock) {
    return {
      width: "100%",
      height: "100%",
      minHeight: 0,
      padding: 0,
      boxSizing: "border-box",
      overflow: "hidden",
      background: "transparent",
      boxShadow: isEditMode ? undefined : "none",
      border: isEditMode ? undefined : "none",
    };
  }

  if (isImageBlock) {
    return {
      width: "100%",
      height: "100%",
      minHeight: 0,
      padding: 0,
      boxSizing: "border-box",
      overflow: "hidden",
      background: "transparent",
      boxShadow: isEditMode ? undefined : "none",
      border: isEditMode ? undefined : "none",
    };
  }

  if (isDocumentsBlock) {
    return {
      width: "100%",
      height: "100%",
      minHeight: 0,
      padding: "8px 12px",
      boxSizing: "border-box",
      display: "flex",
      alignItems: "center",
      overflow: "hidden",
    };
  }

  return {
    width: "100%",
    height: "auto",
    minHeight: "100%",
    boxSizing: "border-box",
    overflow: "visible",
  };
}

function DefaultBlock({ block }) {
  return (
    <div>
      <strong>{block?.title || getBlockTypeTitle(block?.type)}</strong>
      <p
        style={{
          margin: "6px 0 0",
          color: "#64748b",
          fontSize: 14,
        }}
      >
        Тип блока: {getBlockTypeTitle(block?.type)}
      </p>
    </div>
  );
}