import { useState } from "react";

import MenuItem from "./MenuItem";

export default function MenuTree({
  items = [],
  activePageId,
  onSelectPage,
  isEditMode,
  onUpdateItem,
  onDeleteItem,
  dragAndDrop,
  scale = 1,
  sidebarCollapsed = false,
  sidebarMode = "runtime",
}) {
  const [openedEditorItemId, setOpenedEditorItemId] = useState(null);

  const isItemVisible = (item) => {
    if (item?.isSystem) return true;
    if (item?.is_visible === undefined) return true;
    return item.is_visible;
  };

  const visibleItems = isEditMode
    ? items
    : items.filter((item) => isItemVisible(item));

  return (
    <nav
      onDragOver={(event) => {
        dragAndDrop?.handleContainerDragOver?.(event);
      }}
      onDrop={(event) => {
        dragAndDrop?.handleContainerDrop?.(event);
      }}
      style={{
        width: "100%",
        minHeight: isEditMode ? 220 : 0,

        boxSizing: "border-box",

        display: "flex",
        flexDirection: "column",
        gap: sidebarCollapsed ? 4 : 2 * scale,

        padding: sidebarCollapsed ? "0 0 12px" : "0 0 80px",
        margin: 0,
      }}
    >
      {visibleItems.map((item) => (
        <MenuItem
          key={item.id}
          item={item}
          activePageId={activePageId}
          onSelectPage={onSelectPage}
          isEditMode={isEditMode}
          onUpdateItem={onUpdateItem}
          onDeleteItem={onDeleteItem}
          dragAndDrop={item?.isSystem ? null : dragAndDrop}
          scale={scale}
          openedEditorItemId={openedEditorItemId}
          setOpenedEditorItemId={setOpenedEditorItemId}
          sidebarCollapsed={sidebarCollapsed}
          sidebarMode={sidebarMode}
        />
      ))}
    </nav>
  );
}