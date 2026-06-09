import { ChevronDown, ChevronRight, FileText, Folder } from "lucide-react";

import { PLAN_TREE_DROP_POSITION } from "./planTreeDragDrop.js";

export default function PlanTreeNode({
  node,
  selectedNodeId,
  expandedNodeIds,
  dragNodeId,
  dropHint = null,
  onSelectNode,
  onToggleExpand,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragEnd,
  onContextMenu,
  showStatusColumn = true,
}) {
  const hasChildren = Array.isArray(node.children) && node.children.length > 0;
  const isExpanded = expandedNodeIds.has(node.id);
  const isSelected = selectedNodeId === node.id;
  const isDragging = dragNodeId === node.id;
  const isDropBefore =
    dropHint?.targetId === node.id && dropHint?.position === PLAN_TREE_DROP_POSITION.BEFORE;
  const isDropAfter =
    dropHint?.targetId === node.id && dropHint?.position === PLAN_TREE_DROP_POSITION.AFTER;
  const isDropInside =
    dropHint?.targetId === node.id && dropHint?.position === PLAN_TREE_DROP_POSITION.INSIDE;
  const NodeIcon = hasChildren ? Folder : FileText;
  const depthIndent = Math.max(0, Number(node.depth) || 0) * 12;
  const dropLineIndentPx = 8 + (Number(dropHint?.insertDepth) || 0) * 12;

  return (
    <div className="object-plan-view__tree-node-wrap" role="none">
      <div
        className={[
          "object-plan-view__tree-node",
          isSelected ? "is-selected" : "",
          isDragging ? "is-dragging" : "",
          isDropBefore ? "is-drop-before" : "",
          isDropAfter ? "is-drop-after" : "",
          isDropInside ? "is-drop-inside" : "",
        ]
          .filter(Boolean)
          .join(" ")}
        style={{
          paddingLeft: `${8 + depthIndent}px`,
          ...(isDropBefore || isDropAfter
            ? { "--plan-tree-drop-line-indent": `${dropLineIndentPx}px` }
            : null),
        }}
        role="treeitem"
        aria-selected={isSelected}
        aria-expanded={hasChildren ? isExpanded : undefined}
        draggable={Boolean(onDragStart)}
        onDragStart={(event) => onDragStart?.(event, node.id)}
        onDragOver={(event) => onDragOver?.(event, node.id, event.currentTarget)}
        onDragLeave={(event) => onDragLeave?.(event, node.id)}
        onDrop={(event) => onDrop?.(event, node.id, event.currentTarget)}
        onDragEnd={onDragEnd}
        onContextMenu={(event) => onContextMenu?.(event, node)}
      >
        <div className="object-plan-view__tree-node-name">
          {hasChildren ? (
            <button
              type="button"
              className="object-plan-view__tree-toggle"
              aria-label={isExpanded ? "Свернуть" : "Развернуть"}
              onClick={(event) => {
                event.stopPropagation();
                onToggleExpand?.(node.id);
              }}
            >
              {isExpanded ? (
                <ChevronDown size={14} aria-hidden="true" />
              ) : (
                <ChevronRight size={14} aria-hidden="true" />
              )}
            </button>
          ) : (
            <span className="object-plan-view__tree-toggle object-plan-view__tree-toggle--spacer" />
          )}

          <NodeIcon size={14} className="object-plan-view__tree-icon" aria-hidden="true" />

          {node.hierarchyNumber ? (
            <span className="object-plan-view__tree-number">{node.hierarchyNumber}</span>
          ) : null}

          <button
            type="button"
            className="object-plan-view__tree-select"
            onClick={() => onSelectNode?.(node.id)}
          >
            <span className="object-plan-view__tree-title">{node.title}</span>
          </button>
        </div>

        <span className="object-plan-view__tree-col-readiness">{node.readiness}%</span>

        {showStatusColumn ? (
          <span className="object-plan-view__tree-col-status">
            <span
              className="object-plan-view__tree-status-dot"
              style={{ color: node.statusColor || "#94a3b8" }}
              aria-hidden="true"
            >
              ●
            </span>
            <span className="object-plan-view__tree-status-label">{node.statusLabel}</span>
          </span>
        ) : null}
      </div>

      {hasChildren && isExpanded
        ? node.children.map((child) => (
            <PlanTreeNode
              key={child.id}
              node={child}
              selectedNodeId={selectedNodeId}
              expandedNodeIds={expandedNodeIds}
              dragNodeId={dragNodeId}
              dropHint={dropHint}
              onSelectNode={onSelectNode}
              onToggleExpand={onToggleExpand}
              onDragStart={onDragStart}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
              onDragEnd={onDragEnd}
              onContextMenu={onContextMenu}
              showStatusColumn={showStatusColumn}
            />
          ))
        : null}
    </div>
  );
}
