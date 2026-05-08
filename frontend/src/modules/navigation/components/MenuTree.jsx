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
      style={{
        paddingLeft: 4 * scale,
        boxSizing: "border-box",
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
        />
      ))}
    </nav>
  );
}