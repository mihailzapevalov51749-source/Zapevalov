import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { GripVertical } from "lucide-react";

import useObjectEntityRelations from "../../objectEntities/hooks/useObjectEntityRelations.js";
import {
  canHidePlanTab,
  getInfoEmbeddedPlanTabs,
  getVisiblePlanTabs,
  normalizePlanLayoutSettings,
  resolveFirstVisiblePlanTabKey,
} from "./planLayoutSettings.js";
import PlanInfoTab from "./PlanInfoTab.jsx";
import PlanPreviewContextMenu from "./PlanPreviewContextMenu.jsx";
import PlanPreviewInlineRenameInput from "./PlanPreviewInlineRenameInput.jsx";
import PlanTabContent from "./PlanTabContent.jsx";
import { buildPlanTabContextMenuActions } from "./planPreviewConstructor.js";

export default function PlanWorkArea({
  activeTab = "info",
  onActiveTabChange,
  selectedNode = null,
  resolvedContract = null,
  planLayout = null,
  catalog = null,
  objectTypeKey = null,
  tenantId = null,
  previewMode = false,
  onOpenRelatedEntity = null,
  planPreviewEditor = null,
}) {
  const dropPositionRef = useRef("before");
  const [dragOverTabId, setDragOverTabId] = useState(null);
  const [dragOverPosition, setDragOverPosition] = useState("before");
  const [tabContextMenu, setTabContextMenu] = useState(null);
  const [editingTabId, setEditingTabId] = useState(null);

  const constructorMode = previewMode && Boolean(planPreviewEditor);
  const runtimeEntityId = selectedNode?.id ? String(selectedNode.id) : null;

  const normalizedLayout = useMemo(
    () => normalizePlanLayoutSettings(planLayout),
    [planLayout],
  );

  const visibleTabs = useMemo(
    () => getVisiblePlanTabs(planLayout),
    [planLayout],
  );

  const embeddedTabs = useMemo(
    () => getInfoEmbeddedPlanTabs(planLayout),
    [planLayout],
  );

  const relationsState = useObjectEntityRelations({
    tenantId,
    objectTypeKey,
    entityId: runtimeEntityId,
    catalog,
    enabled: Boolean(tenantId && objectTypeKey && runtimeEntityId),
  });

  useEffect(() => {
    const nextTab = resolveFirstVisiblePlanTabKey(planLayout, activeTab);

    if (nextTab !== activeTab) {
      onActiveTabChange?.(nextTab);
    }
  }, [activeTab, planLayout, onActiveTabChange]);

  const infoPanel = (
    <PlanInfoTab
      node={selectedNode}
      resolvedContract={resolvedContract}
      catalog={catalog}
      objectTypeKey={objectTypeKey}
      tenantId={tenantId}
      previewMode={previewMode}
      embeddedTabs={embeddedTabs}
      relationsState={relationsState}
      onOpenRelatedEntity={onOpenRelatedEntity}
      planPreviewEditor={planPreviewEditor}
    />
  );

  const activeTabMeta = visibleTabs.find((tab) => tab.id === activeTab);
  const infoTabMeta = normalizedLayout.tabs.find((tab) => tab.key === "info");
  const activeTabLabel = activeTabMeta?.label || infoTabMeta?.label || activeTab;

  const recordTitle = selectedNode?.title
    ? String(selectedNode.title)
    : "Выберите запись";

  const handleTabContextMenu = useCallback(
    (event, tab) => {
      if (!constructorMode || editingTabId) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      const tabKey = String(tab?.id || "").trim();

      if (!tabKey) {
        return;
      }

      const layoutTab = normalizedLayout.tabs.find((item) => item.key === tabKey);

      setTabContextMenu({
        tabKey,
        tabLabel: tab.label,
        position: { x: event.clientX, y: event.clientY },
        actions: buildPlanTabContextMenuActions({
          tabKey,
          tabLabel: tab.label,
          showInInfo: layoutTab?.showInInfo === true,
          canHide: canHidePlanTab(planLayout, tabKey),
        }),
      });
    },
    [constructorMode, editingTabId, normalizedLayout.tabs, planLayout],
  );

  const handleTabMenuAction = useCallback(
    (actionId) => {
      const tabKey = tabContextMenu?.tabKey;

      if (!tabKey || !planPreviewEditor) {
        return;
      }

      if (actionId === "rename-tab") {
        setEditingTabId(tabKey);
      } else if (actionId === "hide-tab") {
        planPreviewEditor.hideTab?.(tabKey);
      } else if (actionId === "toggle-show-in-info") {
        planPreviewEditor.toggleTabShowInInfo?.(tabKey);
      }
    },
    [tabContextMenu?.tabKey, planPreviewEditor],
  );

  const handleTabReorder = useCallback(
    (sourceKey, targetKey, position) => {
      if (!sourceKey || sourceKey === targetKey) {
        return;
      }

      planPreviewEditor?.reorderTab?.(sourceKey, targetKey, position);
    },
    [planPreviewEditor],
  );

  const handleTabRenameCommit = useCallback(
    (tabKey, nextLabel) => {
      setEditingTabId(null);
      planPreviewEditor?.commitTabLabel?.(tabKey, nextLabel);
    },
    [planPreviewEditor],
  );

  return (
    <section
      className={`object-plan-view__work-area${
        constructorMode ? " object-plan-view__work-area--constructor" : ""
      }`}
      aria-label="Рабочая область плана"
    >
      <div className="object-plan-view__work-header">
        <h2 className="object-plan-view__work-title" title={recordTitle}>
          {recordTitle}
        </h2>

        <div className="object-plan-view__work-tabs" role="tablist" aria-label="Вкладки записи">
          {visibleTabs.map((tab) => {
            const isDragOver = dragOverTabId === tab.id;
            const isEditing = editingTabId === tab.id;

            return (
              <div
                key={tab.id}
                role="tab"
                tabIndex={0}
                aria-selected={activeTab === tab.id}
                data-plan-tab-key={tab.id}
                className={[
                  "object-plan-view__work-tab",
                  activeTab === tab.id ? "is-active" : "",
                  constructorMode ? "object-plan-view__work-tab--constructor" : "",
                  isDragOver ? "is-drag-over" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                draggable={constructorMode && !isEditing}
                onClick={() => onActiveTabChange?.(tab.id)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onActiveTabChange?.(tab.id);
                  }
                }}
                onContextMenu={(event) => handleTabContextMenu(event, tab)}
                onDragStart={(event) => {
                  if (!constructorMode || isEditing) {
                    event.preventDefault();
                    return;
                  }

                  event.stopPropagation();
                  event.dataTransfer.effectAllowed = "move";
                  event.dataTransfer.setData("text/plain", tab.id);
                }}
                onDragOver={(event) => {
                  if (!constructorMode) {
                    return;
                  }

                  event.preventDefault();
                  event.stopPropagation();

                  const rect = event.currentTarget.getBoundingClientRect();
                  const position =
                    event.clientX < rect.left + rect.width / 2 ? "before" : "after";

                  dropPositionRef.current = position;
                  setDragOverTabId(tab.id);
                  setDragOverPosition(position);
                }}
                onDragLeave={() => {
                  setDragOverTabId((current) => (current === tab.id ? null : current));
                }}
                onDrop={(event) => {
                  if (!constructorMode) {
                    return;
                  }

                  event.preventDefault();
                  event.stopPropagation();

                  const sourceKey = event.dataTransfer.getData("text/plain");

                  setDragOverTabId(null);
                  handleTabReorder(sourceKey, tab.id, dropPositionRef.current || "before");
                }}
                onDragEnd={() => {
                  setDragOverTabId(null);
                }}
              >
                {constructorMode ? (
                  <span
                    className="object-plan-view__work-tab-handle"
                    aria-hidden="true"
                    data-plan-constructor-handle="true"
                  >
                    <GripVertical size={12} />
                  </span>
                ) : null}

                {isEditing ? (
                  <PlanPreviewInlineRenameInput
                    className="object-plan-view__work-tab-label-input"
                    value={tab.label}
                    ariaLabel={`Название вкладки ${tab.label}`}
                    onCommit={(nextLabel) => handleTabRenameCommit(tab.id, nextLabel)}
                    onCancel={() => setEditingTabId(null)}
                  />
                ) : (
                  <span className="object-plan-view__work-tab-label">{tab.label}</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div
        className="object-plan-view__work-content"
        role="tabpanel"
        aria-label={activeTabLabel}
      >
        <PlanTabContent
          tabId={activeTab}
          infoPanel={infoPanel}
          runtimeEntityId={runtimeEntityId}
          objectTypeKey={objectTypeKey}
          tenantId={tenantId}
          catalog={catalog}
          entity={selectedNode?.entity ?? null}
          relationsState={relationsState}
          onOpenRelatedEntity={onOpenRelatedEntity}
        />
      </div>

      <PlanPreviewContextMenu
        open={Boolean(tabContextMenu)}
        position={tabContextMenu?.position}
        actions={tabContextMenu?.actions || []}
        onSelectAction={handleTabMenuAction}
        onClose={() => setTabContextMenu(null)}
      />
    </section>
  );
}
