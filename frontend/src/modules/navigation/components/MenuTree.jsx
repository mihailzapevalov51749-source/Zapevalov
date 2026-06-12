import { useState } from "react";

import { NAVIGATION_MENU_BLOCK_GAP_PX } from "../../../shared/navigation/navigationMenuBlocks.js";
import MenuItem from "./MenuItem";
import "./navigationMenuBlocks.css";

function createBlockAwareDragAndDrop(blockedDragAndDrop, blockIndex) {
  if (!blockedDragAndDrop) {
    return null;
  }

  const activeDropTarget =
    blockedDragAndDrop.dropTarget?.blockIndex === blockIndex
      ? blockedDragAndDrop.dropTarget
      : null;

  return {
    draggedId: blockedDragAndDrop.draggedId,
    dropTarget: activeDropTarget,
    handleDragStart: blockedDragAndDrop.handleDragStart,
    handleDragOver: (event, item) =>
      blockedDragAndDrop.handleDragOver(event, item, blockIndex),
    handleDrop: (event, item) =>
      blockedDragAndDrop.handleDrop(event, item, blockIndex),
    resetDrag: blockedDragAndDrop.resetDrag,
  };
}

function BlockDropLine({ scale = 1 }) {
  return (
    <div
      className="navigation-menu-block-drop-line"
      style={{
        margin: `${4 * scale}px 0`,
      }}
    />
  );
}

function renderMenuItem({
  item,
  dragAndDrop,
  openedEditorItemId,
  setOpenedEditorItemId,
  commonProps,
}) {
  return (
    <MenuItem
      key={item.id}
      item={item}
      dragAndDrop={dragAndDrop}
      openedEditorItemId={openedEditorItemId}
      setOpenedEditorItemId={setOpenedEditorItemId}
      {...commonProps}
    />
  );
}

export default function MenuTree({
  items = [],
  navigationBlocks = null,
  blockedDragAndDrop = null,
  activePageId,
  activeSidebarItemId = null,
  activeSidebarParentIds = [],
  onSelectPage,
  onItemAction,
  isEditMode,
  onUpdateItem,
  onDeleteItem,
  dragAndDrop,
  scale = 1,
  sidebarCollapsed = false,
  sidebarMode = "runtime",
  routeOwner = null,
  tenantId = 1,
}) {
  const [openedEditorItemId, setOpenedEditorItemId] = useState(null);

  const isItemVisible = (item) => {
    if (item?.isSystem) return true;
    if (item?.is_visible === undefined) return true;
    return item.is_visible;
  };

  const resolveItemDragAndDrop = (item, blockDragAndDrop) => {
    const activeDragAndDrop = blockDragAndDrop || dragAndDrop;
    if (!activeDragAndDrop) {
      return null;
    }

    const isSystemItem =
      item?.isSystem === true
      || item?.is_system === true
      || item?.is_protected === true;

    if (
      isSystemItem
      && sidebarMode !== "designer"
      && sidebarMode !== "control-plane"
    ) {
      return null;
    }

    return activeDragAndDrop;
  };

  const commonProps = {
    activePageId,
    activeSidebarItemId,
    activeSidebarParentIds,
    onSelectPage,
    onItemAction,
    isEditMode,
    onUpdateItem,
    onDeleteItem,
    scale,
    sidebarCollapsed,
    sidebarMode,
    routeOwner,
    tenantId,
  };

  const navStyle = {
    width: "100%",
    minHeight: isEditMode ? 220 : 0,
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "column",
    gap: sidebarCollapsed ? 4 : 2 * scale,
    padding: sidebarCollapsed ? "0 0 12px" : "0 0 80px",
    margin: 0,
  };

  if (Array.isArray(navigationBlocks) && navigationBlocks.length > 0) {
    return (
      <nav style={navStyle}>
        {navigationBlocks.map((blockItems, blockIndex) => {
          const visibleBlockItems = isEditMode
            ? blockItems
            : blockItems.filter((item) => isItemVisible(item));
          const blockDragAndDrop = createBlockAwareDragAndDrop(
            blockedDragAndDrop,
            blockIndex,
          );
          const blockDropTarget =
            isEditMode && blockedDragAndDrop?.dropTarget?.blockIndex === blockIndex
              ? blockedDragAndDrop.dropTarget
              : null;
          const isBlockDropTarget =
            blockDropTarget != null && blockDropTarget.targetId == null;
          const isSourceBlock =
            isEditMode
            && blockedDragAndDrop?.draggedBlockIndex === blockIndex
            && blockedDragAndDrop?.draggedId;

          const zoneClassName = [
            "navigation-menu-block-zone",
            isEditMode ? "is-edit-mode" : "",
            isBlockDropTarget ? "is-drop-target" : "",
            isSourceBlock ? "is-source-block" : "",
          ]
            .filter(Boolean)
            .join(" ");

          return (
            <div
              key={`navigation-block-${blockIndex + 1}`}
              className={zoneClassName}
              style={{
                marginTop: blockIndex > 0 ? NAVIGATION_MENU_BLOCK_GAP_PX * scale : 0,
              }}
              onDragOver={(event) => {
                if (isEditMode) {
                  blockedDragAndDrop?.handleBlockZoneDragOver?.(event, blockIndex);
                }
              }}
              onDrop={(event) => {
                if (isEditMode) {
                  blockedDragAndDrop?.handleBlockZoneDrop?.(event, blockIndex);
                }
              }}
            >
              {isBlockDropTarget && blockDropTarget.position === "start" ? (
                <BlockDropLine scale={scale} />
              ) : null}

              {visibleBlockItems.map((item) =>
                renderMenuItem({
                  item,
                  dragAndDrop: resolveItemDragAndDrop(item, blockDragAndDrop),
                  openedEditorItemId,
                  setOpenedEditorItemId,
                  commonProps,
                }),
              )}

              {isBlockDropTarget && blockDropTarget.position === "end" ? (
                <BlockDropLine scale={scale} />
              ) : null}

              {isEditMode && visibleBlockItems.length === 0 ? (
                <div
                  className="navigation-menu-block-zone__empty"
                  aria-hidden="true"
                />
              ) : null}
            </div>
          );
        })}
      </nav>
    );
  }

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
      style={navStyle}
    >
      {visibleItems.map((item) =>
        renderMenuItem({
          item,
          dragAndDrop: resolveItemDragAndDrop(item),
          openedEditorItemId,
          setOpenedEditorItemId,
          commonProps,
        }),
      )}
    </nav>
  );
}
