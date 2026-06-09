import { useCallback, useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

import PlanTreeNode from "./PlanTreeNode.jsx";
import PlanTreeContextMenu from "./PlanTreeContextMenu.jsx";
import { isPlanTreeDescendant } from "./planHierarchyMove.js";
import { buildPlanTreeContextMenuActions } from "./buildPlanTreeContextMenuActions.js";
import {
  PLAN_TREE_CONTEXT_TARGET,
  createPlanTreeContextTarget,
  resolvePlanTreeContextMenuLabel,
} from "./planTreeContextTarget.js";
import {
  computePlanTreeDropPosition,
  PLAN_TREE_DROP_POSITION,
  resolvePlanTreeDropDescriptor,
} from "./planTreeDragDrop.js";
import { logPlanTreeDropDebug, logPlanTreeHoverDebug } from "./planTreeMoveDebug.js";
import {
  PLAN_DATA_EMPTY_HINT,
  PLAN_DATA_EMPTY_TITLE,
  PLAN_TREE_EMPTY_FALLBACK_MESSAGE,
} from "./planEmptyStateMessages.js";

const TREE_NODE_SELECTOR = ".object-plan-view__tree-node";

export default function PlanTreePanel({
  roots = [],
  nodesById = new Map(),
  selectedNodeId = null,
  expandedNodeIds = new Set(),
  isTreeFullyExpanded = false,
  onToggleExpandAll,
  onSelectNode,
  onToggleExpand,
  onMoveNode,
  onContextMenuAction,
  onCreateRoot,
  canCreate = false,
  hasClipboard = false,
  isDataEmpty = false,
  previewMode = false,
  emptyMessage = PLAN_TREE_EMPTY_FALLBACK_MESSAGE,
  rootAnchorId = null,
}) {
  const [dragNodeId, setDragNodeId] = useState(null);
  const [dropHint, setDropHint] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);
  const activeDropDescriptorRef = useRef(null);

  const contextMenuActions = useMemo(() => {
    if (!contextMenu) {
      return [];
    }

    return buildPlanTreeContextMenuActions({
      targetType: contextMenu.targetType,
      previewMode,
      canCreate,
      hasClipboard,
    });
  }, [contextMenu, previewMode, canCreate, hasClipboard]);

  const contextMenuLabel = useMemo(() => {
    if (!contextMenu) {
      return resolvePlanTreeContextMenuLabel(PLAN_TREE_CONTEXT_TARGET.TREE);
    }

    return resolvePlanTreeContextMenuLabel(contextMenu.targetType);
  }, [contextMenu]);

  const openContextMenu = useCallback((event, target) => {
    event.preventDefault();
    event.stopPropagation();
    setContextMenu({
      ...target,
      x: event.clientX,
      y: event.clientY,
    });
  }, []);

  const handleNodeContextMenu = useCallback(
    (event, node) => {
      if (previewMode) {
        return;
      }

      onSelectNode?.(node.id);
      openContextMenu(
        event,
        createPlanTreeContextTarget(PLAN_TREE_CONTEXT_TARGET.NODE, node.id),
      );
    },
    [previewMode, onSelectNode, openContextMenu],
  );

  const handleTreeBackgroundContextMenu = useCallback(
    (event) => {
      if (previewMode) {
        return;
      }

      if (event.target.closest(TREE_NODE_SELECTOR)) {
        return;
      }

      openContextMenu(
        event,
        createPlanTreeContextTarget(PLAN_TREE_CONTEXT_TARGET.TREE),
      );
    },
    [previewMode, openContextMenu],
  );

  const clearDropHint = useCallback(() => {
    activeDropDescriptorRef.current = null;
    setDropHint(null);
  }, []);

  const handleDragStart = useCallback((event, nodeId) => {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", nodeId);
    setDragNodeId(nodeId);
  }, []);

  const canDropOnTarget = useCallback(
    (sourceId, targetId) => {
      if (!sourceId || !targetId || sourceId === targetId) {
        return false;
      }

      return !isPlanTreeDescendant(nodesById, sourceId, targetId);
    },
    [nodesById],
  );

  const resolveDropDescriptor = useCallback(
    (sourceId, targetId, position) =>
      resolvePlanTreeDropDescriptor({
        sourceId,
        targetId,
        position,
        nodesById,
        roots,
        rootAnchorId,
      }),
    [nodesById, roots, rootAnchorId],
  );

  const handleDragOver = useCallback(
    (event, targetId, rowElement) => {
      const sourceId = dragNodeId;

      if (!sourceId || !canDropOnTarget(sourceId, targetId)) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      event.dataTransfer.dropEffect = "move";

      const position = computePlanTreeDropPosition(event, rowElement);
      const descriptor = resolveDropDescriptor(sourceId, targetId, position);

      if (!descriptor) {
        activeDropDescriptorRef.current = null;
        setDropHint(null);
        return;
      }

      activeDropDescriptorRef.current = descriptor;
      logPlanTreeHoverDebug(descriptor);
      setDropHint(descriptor);
    },
    [dragNodeId, canDropOnTarget, resolveDropDescriptor],
  );

  const handleDragLeave = useCallback((event, targetId) => {
    if (event.currentTarget.contains(event.relatedTarget)) {
      return;
    }

    setDropHint((current) => (current?.targetId === targetId ? null : current));
  }, []);

  const handleDrop = useCallback(
    (event, targetId, rowElement) => {
      event.preventDefault();
      event.stopPropagation();

      const sourceId = dragNodeId || event.dataTransfer.getData("text/plain");
      const position = computePlanTreeDropPosition(event, rowElement);
      const fromEvent = resolveDropDescriptor(sourceId, targetId, position);
      const activeDescriptor = activeDropDescriptorRef.current;
      const descriptor =
        activeDescriptor &&
        activeDescriptor.sourceId === sourceId &&
        activeDescriptor.targetId === targetId &&
        activeDescriptor.position === position
          ? activeDescriptor
          : fromEvent;

      setDragNodeId(null);
      clearDropHint();

      if (!sourceId || !targetId || !descriptor || !canDropOnTarget(sourceId, targetId)) {
        return;
      }

      logPlanTreeDropDebug(descriptor);
      void onMoveNode?.(sourceId, descriptor);
    },
    [dragNodeId, canDropOnTarget, onMoveNode, resolveDropDescriptor, clearDropHint],
  );

  const handleDragEnd = useCallback(() => {
    setDragNodeId(null);
    clearDropHint();
  }, [clearDropHint]);

  const handleRootEndDragOver = useCallback(
    (event) => {
      if (!dragNodeId) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      event.dataTransfer.dropEffect = "move";

      const descriptor = resolveDropDescriptor(
        dragNodeId,
        null,
        PLAN_TREE_DROP_POSITION.ROOT_END,
      );

      if (!descriptor) {
        activeDropDescriptorRef.current = null;
        setDropHint(null);
        return;
      }

      activeDropDescriptorRef.current = descriptor;
      logPlanTreeHoverDebug(descriptor);
      setDropHint(descriptor);
    },
    [dragNodeId, resolveDropDescriptor],
  );

  const handleRootEndDrop = useCallback(
    (event) => {
      event.preventDefault();
      event.stopPropagation();

      const sourceId = dragNodeId || event.dataTransfer.getData("text/plain");
      const activeDescriptor = activeDropDescriptorRef.current;
      const descriptor =
        activeDescriptor &&
        activeDescriptor.sourceId === sourceId &&
        activeDescriptor.position === PLAN_TREE_DROP_POSITION.ROOT_END
          ? activeDescriptor
          : resolveDropDescriptor(sourceId, null, PLAN_TREE_DROP_POSITION.ROOT_END);

      setDragNodeId(null);
      clearDropHint();

      if (!sourceId || !descriptor) {
        return;
      }

      logPlanTreeDropDebug(descriptor);
      void onMoveNode?.(sourceId, descriptor);
    },
    [dragNodeId, onMoveNode, resolveDropDescriptor, clearDropHint],
  );

  const handleContextMenuSelect = useCallback(
    (actionId) => {
      if (!contextMenu) {
        return;
      }

      void onContextMenuAction?.(actionId, {
        targetType: contextMenu.targetType,
        targetId: contextMenu.targetId,
      });
    },
    [contextMenu, onContextMenuAction],
  );

  const contextMenuElement = (
    <PlanTreeContextMenu
      open={Boolean(contextMenu && contextMenuActions.length)}
      position={contextMenu ? { x: contextMenu.x, y: contextMenu.y } : null}
      actions={contextMenuActions}
      menuLabel={contextMenuLabel}
      onSelectAction={handleContextMenuSelect}
      onClose={() => setContextMenu(null)}
    />
  );

  const isRootEndDropTarget =
    dropHint?.position === PLAN_TREE_DROP_POSITION.ROOT_END;

  if (!roots.length) {
    const emptyTitle = isDataEmpty ? PLAN_DATA_EMPTY_TITLE : emptyMessage;
    const emptyHint = previewMode
      ? emptyMessage
      : isDataEmpty
        ? PLAN_DATA_EMPTY_HINT
        : emptyMessage;

    return (
      <div
        className="object-plan-view__tree-panel object-plan-view__tree-panel--empty"
        onContextMenu={handleTreeBackgroundContextMenu}
      >
        <div className="object-plan-view__tree-empty">
          <h4 className="object-plan-view__tree-empty-title">{emptyTitle}</h4>
          <p className="object-plan-view__tree-empty-text">{emptyHint}</p>
          {!previewMode && canCreate ? (
            <button
              type="button"
              className="object-plan-view__tree-create"
              onClick={() => onCreateRoot?.()}
            >
              + Создать запись
            </button>
          ) : null}
        </div>

        {contextMenuElement}
      </div>
    );
  }

  return (
    <div
      className="object-plan-view__tree-panel"
      onContextMenu={handleTreeBackgroundContextMenu}
    >
      <div className="object-plan-view__tree-columns" aria-hidden="true">
        <div className="object-plan-view__tree-columns-name">
          <button
            type="button"
            className="object-plan-view__tree-expand-all"
            aria-label={isTreeFullyExpanded ? "Свернуть всё дерево" : "Развернуть всё дерево"}
            onClick={() => onToggleExpandAll?.()}
          >
            {isTreeFullyExpanded ? (
              <ChevronDown size={14} aria-hidden="true" />
            ) : (
              <ChevronRight size={14} aria-hidden="true" />
            )}
          </button>
          <span className="object-plan-view__tree-columns-name-label">Название</span>
        </div>
        <span className="object-plan-view__tree-columns-readiness">Прогресс</span>
        <span className="object-plan-view__tree-columns-status">Статус</span>
      </div>

      <div
        className="object-plan-view__tree-list"
        role="tree"
        onContextMenu={handleTreeBackgroundContextMenu}
      >
        {roots.map((node) => (
          <PlanTreeNode
            key={node.id}
            node={node}
            selectedNodeId={selectedNodeId}
            expandedNodeIds={expandedNodeIds}
            dragNodeId={dragNodeId}
            dropHint={dropHint}
            onSelectNode={onSelectNode}
            onToggleExpand={onToggleExpand}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onDragEnd={handleDragEnd}
            onContextMenu={handleNodeContextMenu}
          />
        ))}
        <div
          className={`object-plan-view__tree-list-filler${
            isRootEndDropTarget ? " is-root-end-drop-target" : ""
          }`}
          aria-hidden="true"
          onDragOver={handleRootEndDragOver}
          onDragLeave={(event) => {
            if (event.currentTarget.contains(event.relatedTarget)) {
              return;
            }

            setDropHint((current) =>
              current?.position === PLAN_TREE_DROP_POSITION.ROOT_END ? null : current,
            );
          }}
          onDrop={handleRootEndDrop}
        />
      </div>

      {contextMenuElement}
    </div>
  );
}
