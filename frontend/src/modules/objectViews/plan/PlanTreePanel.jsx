import { useCallback, useMemo, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

import PlanTreeNode from "./PlanTreeNode.jsx";
import PlanTreeContextMenu from "./PlanTreeContextMenu.jsx";
import { isPlanTreeDescendant } from "./planHierarchyMove.js";
import {
  PLAN_DATA_EMPTY_HINT,
  PLAN_DATA_EMPTY_TITLE,
  PLAN_TREE_EMPTY_FALLBACK_MESSAGE,
} from "./planEmptyStateMessages.js";

export default function PlanTreePanel({
  roots = [],
  nodesById = new Map(),
  selectedNodeId = null,
  expandedNodeIds = new Set(),
  isTreeFullyExpanded = false,
  onToggleExpandAll,
  onSelectNode,
  onToggleExpand,
  onReparentNode,
  onContextMenuAction,
  onCreateRoot,
  canCreate = false,
  isDataEmpty = false,
  previewMode = false,
  emptyMessage = PLAN_TREE_EMPTY_FALLBACK_MESSAGE,
}) {
  const [dragNodeId, setDragNodeId] = useState(null);
  const [dropTargetId, setDropTargetId] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);

  const contextMenuActions = useMemo(() => {
    if (previewMode) {
      return [];
    }

    return [
      { id: "create", label: "+ Создать" },
      { id: "rename", label: "Переименовать" },
      { id: "duplicate", label: "Дублировать" },
      { id: "create_task", label: "Создать задачу" },
      { id: "create_issue", label: "Создать проблему" },
      { id: "delete", label: "Удалить", tone: "danger" },
    ];
  }, [previewMode]);

  const emptyContextMenuActions = useMemo(() => {
    if (previewMode || !canCreate) {
      return [];
    }

    return [{ id: "create_root", label: "Создать запись" }];
  }, [previewMode, canCreate]);

  const handleDragStart = useCallback((event, nodeId) => {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", nodeId);
    setDragNodeId(nodeId);
  }, []);

  const handleDragOver = useCallback(
    (event, targetId) => {
      if (!dragNodeId || dragNodeId === targetId) {
        return;
      }

      if (isPlanTreeDescendant(nodesById, dragNodeId, targetId)) {
        return;
      }

      event.preventDefault();
      event.dataTransfer.dropEffect = "move";
      setDropTargetId(targetId);
    },
    [dragNodeId, nodesById],
  );

  const handleDragLeave = useCallback((_event, targetId) => {
    setDropTargetId((current) => (current === targetId ? null : current));
  }, []);

  const handleDrop = useCallback(
    (event, targetId) => {
      event.preventDefault();
      const sourceId = dragNodeId || event.dataTransfer.getData("text/plain");

      setDragNodeId(null);
      setDropTargetId(null);

      if (!sourceId || !targetId || sourceId === targetId) {
        return;
      }

      if (isPlanTreeDescendant(nodesById, sourceId, targetId)) {
        return;
      }

      void onReparentNode?.(sourceId, targetId);
    },
    [dragNodeId, nodesById, onReparentNode],
  );

  const handleDragEnd = useCallback(() => {
    setDragNodeId(null);
    setDropTargetId(null);
  }, []);

  const handleDropToRoot = useCallback(
    (event) => {
      event.preventDefault();
      const sourceId = dragNodeId || event.dataTransfer.getData("text/plain");

      setDragNodeId(null);
      setDropTargetId(null);

      if (!sourceId) {
        return;
      }

      void onReparentNode?.(sourceId, null);
    },
    [dragNodeId, onReparentNode],
  );

  const handlePanelDragOver = useCallback(
    (event) => {
      if (!dragNodeId) {
        return;
      }

      event.preventDefault();
      event.dataTransfer.dropEffect = "move";
      setDropTargetId("__root__");
    },
    [dragNodeId],
  );

  const handleContextMenu = useCallback(
    (event, node) => {
      if (previewMode) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      onSelectNode?.(node.id);
      setContextMenu({
        nodeId: node.id,
        x: event.clientX,
        y: event.clientY,
      });
    },
    [previewMode, onSelectNode],
  );

  const handleEmptyContextMenu = useCallback(
    (event) => {
      if (previewMode || !canCreate) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      setContextMenu({
        isEmpty: true,
        x: event.clientX,
        y: event.clientY,
      });
    },
    [previewMode, canCreate],
  );

  const handleContextMenuSelect = useCallback(
    (actionId) => {
      if (contextMenu?.isEmpty) {
        if (actionId === "create_root") {
          onCreateRoot?.();
        }

        return;
      }

      const nodeId = contextMenu?.nodeId;

      if (!nodeId) {
        return;
      }

      void onContextMenuAction?.(actionId, nodeId);
    },
    [contextMenu?.isEmpty, contextMenu?.nodeId, onContextMenuAction, onCreateRoot],
  );

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
        onContextMenu={handleEmptyContextMenu}
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

        <PlanTreeContextMenu
          open={Boolean(contextMenu?.isEmpty)}
          position={contextMenu?.isEmpty ? { x: contextMenu.x, y: contextMenu.y } : null}
          actions={emptyContextMenuActions}
          onSelectAction={handleContextMenuSelect}
          onClose={() => setContextMenu(null)}
        />
      </div>
    );
  }

  return (
    <div
      className={`object-plan-view__tree-panel${
        dropTargetId === "__root__" ? " is-root-drop-target" : ""
      }`}
      onDragOver={handlePanelDragOver}
      onDragLeave={() => {
        setDropTargetId((current) => (current === "__root__" ? null : current));
      }}
      onDrop={handleDropToRoot}
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
        <span className="object-plan-view__tree-columns-readiness">Готовность</span>
        <span className="object-plan-view__tree-columns-status">Статус</span>
      </div>

      <div className="object-plan-view__tree-list" role="tree">
        {roots.map((node) => (
          <PlanTreeNode
            key={node.id}
            node={node}
            selectedNodeId={selectedNodeId}
            expandedNodeIds={expandedNodeIds}
            dragNodeId={dragNodeId}
            dropTargetId={dropTargetId}
            onSelectNode={onSelectNode}
            onToggleExpand={onToggleExpand}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onDragEnd={handleDragEnd}
            onContextMenu={handleContextMenu}
          />
        ))}
      </div>

      <PlanTreeContextMenu
        open={Boolean(contextMenu)}
        position={contextMenu ? { x: contextMenu.x, y: contextMenu.y } : null}
        actions={contextMenuActions}
        onSelectAction={handleContextMenuSelect}
        onClose={() => setContextMenu(null)}
      />
    </div>
  );
}
