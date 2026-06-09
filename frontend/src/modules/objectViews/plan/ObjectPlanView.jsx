import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import PlatformQuickCreateForm from "../../../shared/quickCreate/PlatformQuickCreateForm.jsx";
import { ObjectEntityCardModal } from "../../objectEntities";
import useObjectEntityCard from "../../objectEntities/hooks/useObjectEntityCard.js";
import { runtimeWriteGateway } from "../../runtimeWriteGateway/index.js";
import { deleteRuntimeEntity } from "../../runtimeWriteGateway/api/runtimeEntitiesApi.js";

import { resolvePlanPresentationFromContract } from "./planViewContract.js";
import {
  resolvePlanStatusFieldKeyFromProjection,
  resolvePlanTitleFieldKey,
} from "./resolvePlanProjectionFields.js";
import { resolvePlanHierarchyRelation } from "./planHierarchyRelation.js";
import { resolvePlanTreeHierarchyRelationKey } from "../../../shared/relation/resolvePlanTreeHierarchyRelationKey.js";
import usePlanHierarchy from "./usePlanHierarchy.js";
import PlanViewShell from "./PlanViewShell.jsx";
import PlanTreePanel from "./PlanTreePanel.jsx";
import PlanWorkArea from "./PlanWorkArea.jsx";
import usePlanTreePanelResize from "./usePlanTreePanelResize.js";
import PlanViewEmptyState from "./PlanViewEmptyState.jsx";
import PlanViewMissingRelationEmptyState from "./PlanViewMissingRelationEmptyState.jsx";
import { resolvePlanStatusField } from "./planFieldUtils.js";
import {
  isPlanTreeDescendant,
  movePlanTreeNode,
  reparentPlanNode,
} from "./planHierarchyMove.js";
import {
  buildPlanTreeMoveDescriptor,
  PLAN_TREE_DROP_POSITION,
  validatePlanTreeDrop,
} from "./planTreeDragDrop.js";
import { resolveEffectivePlanTreeParentId } from "./planTreeRootAnchor.js";
import { ensurePlanTreeRootOrder } from "./planTreeRootOrderApi.js";
import { duplicatePlanTreeNode } from "./duplicatePlanTreeNode.js";
import { executePlanTreeContextMenuAction } from "./executePlanTreeContextMenuAction.js";
import { resolveFirstVisiblePlanTabKey } from "./planLayoutSettings.js";
import { PLAN_TREE_EMPTY_FALLBACK_MESSAGE } from "./planEmptyStateMessages.js";
import { logPlanDebug } from "./planViewDebug.js";
import { applyPlanEntityPatches } from "./applyPlanEntityPatches.js";
import { resolvePlanInfoDisplayFields } from "./resolvePlanInfoDisplayFields.js";
import usePlanInfoFieldSave from "./usePlanInfoFieldSave.js";

import "./objectPlanView.css";



function collectExpandableNodeIds(nodes, acc = []) {

  for (const node of nodes || []) {

    if (node.children?.length) {

      acc.push(node.id);

      collectExpandableNodeIds(node.children, acc);

    }

  }

  return acc;

}



function PlanViewLoadingState({ minHeight = 320 }) {

  return (

    <div

      className="object-plan-view"

      data-object-view-host="plan"

      style={{ minHeight }}

    >

      <p className="object-plan-view__status">Загрузка плана…</p>

    </div>

  );

}



export default function ObjectPlanView({

  tenantId,

  objectTypeId = null,

  mode = "data",

  query,

  resolvedContract = null,

  objectTypeKey = null,

  minHeight = 320,

  planPreviewEditor = null,

}) {

  const previewMode = mode === "studio-preview";

  const planPresentation = useMemo(
    () => resolvePlanPresentationFromContract(resolvedContract),
    [resolvedContract],
  );

  const titleFieldKey = useMemo(
    () => resolvePlanTitleFieldKey(resolvedContract),
    [resolvedContract],
  );



  const catalog = query?.catalog ?? null;
  const configuredHierarchyRelationKey = String(
    planPresentation?.hierarchyRelationKey || "",
  ).trim();
  const hierarchyRelationKey = useMemo(
    () =>
      resolvePlanTreeHierarchyRelationKey(
        catalog,
        objectTypeKey,
        configuredHierarchyRelationKey,
      ),
    [catalog, objectTypeKey, configuredHierarchyRelationKey],
  );

  const hierarchyRelation = useMemo(
    () => resolvePlanHierarchyRelation(catalog, hierarchyRelationKey, objectTypeKey),
    [catalog, hierarchyRelationKey, objectTypeKey],
  );



  useEffect(() => {

    if (previewMode) {

      return;

    }



    logPlanDebug("PLAN_OFFICE_CONTRACT", {

      view_type: resolvedContract?.viewType,

      view_key: resolvedContract?.key,

      presentation_plan: resolvedContract?.presentation?.plan ?? null,

      hierarchyRelationKey,

      relation_found: Boolean(hierarchyRelation),

    });

  }, [

    previewMode,

    resolvedContract,

    hierarchyRelationKey,

    hierarchyRelation,

  ]);



  if (!hierarchyRelationKey) {

    return (

      <PlanViewEmptyState

        previewMode={previewMode}

        tenantId={tenantId}

        objectTypeId={objectTypeId}

        minHeight={minHeight}

      />

    );

  }



  return (

    <ObjectPlanViewConfigured

      tenantId={tenantId}

      objectTypeId={objectTypeId}

      mode={mode}

      query={query}

      resolvedContract={resolvedContract}

      objectTypeKey={objectTypeKey}

      minHeight={minHeight}

      planPresentation={planPresentation}

      titleFieldKey={titleFieldKey}

      hierarchyRelationKey={hierarchyRelationKey}

      hierarchyRelation={hierarchyRelation}

      planPreviewEditor={planPreviewEditor}

    />

  );

}



function ObjectPlanViewConfigured({

  tenantId,

  objectTypeId = null,

  mode = "data",

  query,

  resolvedContract = null,

  objectTypeKey = null,

  minHeight = 320,

  planPresentation,

  titleFieldKey,

  hierarchyRelationKey,

  hierarchyRelation = null,

  planPreviewEditor = null,

}) {

  const previewMode = mode === "studio-preview";



  const [selectedNodeId, setSelectedNodeId] = useState(null);

  const [expandedNodeIds, setExpandedNodeIds] = useState(() => new Set());
  const [entityPatches, setEntityPatches] = useState({});
  const initialExpansionAppliedRef = useRef(false);

  const [movingNodeId, setMovingNodeId] = useState(null);

  const [moveError, setMoveError] = useState("");

  const [planTreeCutNodeId, setPlanTreeCutNodeId] = useState(null);

  const [activeWorkTab, setActiveWorkTab] = useState("info");

  useEffect(() => {
    setActiveWorkTab((current) =>
      resolveFirstVisiblePlanTabKey(planPresentation?.planLayout, current),
    );
  }, [planPresentation?.planLayout]);

  const resizeScopeKey = `${objectTypeKey || "plan"}:${resolvedContract?.key || "view"}`;

  const { treePanelWidth, handleResizeStart } = usePlanTreePanelResize(resizeScopeKey);



  const items = useMemo(() => {

    const rawItems = query?.listResult?.items;

    return Array.isArray(rawItems) ? rawItems : [];

  }, [query?.listResult?.items]);

  const patchedItems = useMemo(
    () => applyPlanEntityPatches(items, entityPatches),
    [items, entityPatches],
  );

  const catalog = query?.catalog ?? null;

  const relationsLoading = !previewMode && Boolean(hierarchyRelationKey) && !catalog;

  const hierarchyEnabled = previewMode || Boolean(hierarchyRelation);

  const statusFieldKey = useMemo(
    () =>
      resolvePlanStatusFieldKeyFromProjection(
        catalog,
        objectTypeKey,
        resolvedContract?.projection,
      ),
    [catalog, objectTypeKey, resolvedContract?.projection],
  );

  const statusField = useMemo(
    () => resolvePlanStatusField(catalog, objectTypeKey, statusFieldKey),
    [catalog, objectTypeKey, statusFieldKey],
  );

  const planInfoDisplayFields = useMemo(
    () =>
      resolvePlanInfoDisplayFields({
        catalog,
        objectTypeKey,
        projection: resolvedContract?.projection,
      }),
    [catalog, objectTypeKey, resolvedContract?.projection],
  );

  const {
    tree,
    loading,
    error,
    planEntityCount,
    hierarchyInstances,
    rootAnchorId,
    reload: reloadHierarchy,
  } = usePlanHierarchy({
    tenantId,
    catalog,
    objectTypeKey,
    items: patchedItems,
    planPresentation,
    titleFieldKey,
    statusFieldKey,
    statusField,
    previewMode,
    enabled: hierarchyEnabled,
  });

  const handlePlanEntitySaved = useCallback(
    async (entity, meta) => {
      if (meta?.created) {
        const createdId = String(entity?.id ?? "").trim();
        const parentEntityId = String(meta?.parentEntityId ?? "").trim();
        const isRootCreate = !parentEntityId && !meta?.subtaskLinked;

        if (createdId && isRootCreate && hierarchyRelationKey) {
          let anchorId = String(rootAnchorId ?? "").trim();

          if (!anchorId && tenantId && objectTypeKey) {
            try {
              const ensured = await ensurePlanTreeRootOrder(
                tenantId,
                objectTypeKey,
                hierarchyRelationKey,
              );
              anchorId = String(ensured?.anchorEntityId ?? "").trim();
            } catch {
              // Bootstrap anchor id only; root link is skipped if unavailable.
            }
          }

          if (anchorId) {
            try {
              await reparentPlanNode({
                tenantId,
                relationKey: hierarchyRelationKey,
                relationDefinition: hierarchyRelation,
                instances: hierarchyInstances,
                nodeId: createdId,
                newParentId: anchorId,
              });
            } catch (linkError) {
              setMoveError(
                linkError instanceof Error
                  ? linkError.message
                  : "Запись создана, но не удалось добавить её в план",
              );
            }
          }
        }
      }

      await query?.reload?.();
      await reloadHierarchy();

      if (meta?.created) {
        const createdId = String(entity?.id ?? "").trim();

        if (createdId) {
          setSelectedNodeId(createdId);
        }
      }
    },
    [
      hierarchyInstances,
      hierarchyRelation,
      hierarchyRelationKey,
      objectTypeKey,
      query,
      reloadHierarchy,
      rootAnchorId,
      tenantId,
    ],
  );

  const entityCard = useObjectEntityCard({
    tenantId,
    objectTypeKey,
    catalog,
    listItems: items,
    titleFieldKey,
    enabled: Boolean(tenantId && objectTypeKey && !previewMode),
    onSaved: handlePlanEntitySaved,
  });

  const handleCreateRootRecord = useCallback(() => {
    if (previewMode || !entityCard.canCreate) {
      return;
    }

    entityCard.openCreateCard();
  }, [previewMode, entityCard.canCreate, entityCard.openCreateCard]);



  useEffect(() => {
    if (!tree.roots.length) {
      initialExpansionAppliedRef.current = false;
      return;
    }

    if (initialExpansionAppliedRef.current) {
      return;
    }

    setExpandedNodeIds(new Set(collectExpandableNodeIds(tree.roots)));
    initialExpansionAppliedRef.current = true;
  }, [tree.roots]);



  useEffect(() => {

    if (!tree.roots.length) {

      setSelectedNodeId(null);

      return;

    }



    if (!selectedNodeId || !tree.nodesById.has(selectedNodeId)) {

      setSelectedNodeId(tree.roots[0]?.id ?? null);

    }

  }, [tree.roots, tree.nodesById, selectedNodeId]);



  const selectedNode = selectedNodeId ? tree.nodesById.get(selectedNodeId) : null;

  const handleToggleExpand = useCallback((nodeId) => {

    setExpandedNodeIds((previous) => {

      const next = new Set(previous);

      if (next.has(nodeId)) {

        next.delete(nodeId);

      } else {

        next.add(nodeId);

      }

      return next;

    });

  }, []);



  const handleExpandAll = useCallback(() => {

    setExpandedNodeIds(new Set(collectExpandableNodeIds(tree.roots)));

  }, [tree.roots]);



  const handleCollapseAll = useCallback(() => {

    setExpandedNodeIds(new Set());

  }, []);



  const allExpandableNodeIds = useMemo(

    () => collectExpandableNodeIds(tree.roots),

    [tree.roots],

  );



  const isTreeFullyExpanded = useMemo(() => {

    if (!allExpandableNodeIds.length) {

      return false;

    }

    return allExpandableNodeIds.every((nodeId) => expandedNodeIds.has(nodeId));

  }, [allExpandableNodeIds, expandedNodeIds]);



  const handleToggleExpandAll = useCallback(() => {

    if (isTreeFullyExpanded) {

      handleCollapseAll();

      return;

    }

    handleExpandAll();

  }, [isTreeFullyExpanded, handleCollapseAll, handleExpandAll]);



  const refreshPlanData = useCallback(async () => {

    await query?.reload?.();

    await reloadHierarchy();

  }, [query, reloadHierarchy]);

  const handlePlanEntityPatched = useCallback((entityId, valuesPatch) => {
    setEntityPatches((previous) => ({
      ...previous,
      [entityId]: {
        ...(previous[entityId] || {}),
        ...valuesPatch,
      },
    }));
  }, []);

  const handlePlanFieldEntityUpdated = useCallback(
    async (entityId) => {
      const normalizedId = String(entityId || "").trim();

      await query?.reload?.();
      setEntityPatches((previous) => {
        if (!previous[normalizedId]) {
          return previous;
        }

        const next = { ...previous };
        delete next[normalizedId];
        return next;
      });
    },
    [query],
  );

  const planInfoFieldSave = usePlanInfoFieldSave({
    tenantId,
    objectTypeKey,
    entityId: selectedNodeId,
    displayFields: planInfoDisplayFields,
    enabled: Boolean(tenantId && objectTypeKey && !previewMode),
    previewMode,
    onEntityPatched: handlePlanEntityPatched,
    onEntityUpdated: handlePlanFieldEntityUpdated,
  });



  const handleMoveNode = useCallback(
    async (sourceId, dropTarget) => {
      if (previewMode) {
        return;
      }

      const hasResolvedDescriptor =
        dropTarget &&
        Number.isFinite(dropTarget.index) &&
        dropTarget.position;

      const descriptor = hasResolvedDescriptor
        ? {
            targetId: dropTarget.targetId ?? null,
            position: dropTarget.position,
            parentId: dropTarget.parentId ?? null,
            index: dropTarget.index,
          }
        : buildPlanTreeMoveDescriptor({
            sourceId,
            targetId: dropTarget?.targetId ?? null,
            position: dropTarget?.position,
            nodesById: tree.nodesById,
            roots: tree.roots,
            rootAnchorId,
          });
      const validation = validatePlanTreeDrop(sourceId, descriptor, tree.nodesById);

      if (!validation.valid || !descriptor) {
        return;
      }

      setMovingNodeId(sourceId);
      setMoveError("");

      try {
        await movePlanTreeNode({
          tenantId,
          relationKey: hierarchyRelationKey,
          relationDefinition: hierarchyRelation,
          instances: hierarchyInstances,
          nodesById: tree.nodesById,
          roots: tree.roots,
          rootAnchorId,
          sourceId,
          descriptor,
        });

        await refreshPlanData();

        if (
          descriptor.position === PLAN_TREE_DROP_POSITION.INSIDE &&
          descriptor.parentId
        ) {
          setExpandedNodeIds((previous) => {
            const next = new Set(previous);
            next.add(descriptor.parentId);
            return next;
          });
        }
      } catch (moveError) {
        setMoveError(
          moveError instanceof Error ? moveError.message : "Не удалось переместить запись",
        );
      } finally {
        setMovingNodeId(null);
      }
    },
    [
      previewMode,
      tree.nodesById,
      tree.roots,
      tenantId,
      hierarchyRelationKey,
      hierarchyRelation,
      hierarchyInstances,
      rootAnchorId,
      refreshPlanData,
    ],
  );



  const duplicatePlanNode = useCallback(
    async (sourceNode, newParentId = null) => {
      try {
        return await duplicatePlanTreeNode({
          sourceNode,
          newParentId,
          createEntity: (values) =>
            runtimeWriteGateway.createEntity({
              tenantId,
              objectTypeKey,
              values,
            }),
          reparentNode: String(newParentId ?? "").trim()
            ? (createdId, parentId) =>
                reparentPlanNode({
                  tenantId,
                  relationKey: hierarchyRelationKey,
                  relationDefinition: hierarchyRelation,
                  instances: hierarchyInstances,
                  nodeId: createdId,
                  newParentId: parentId,
                })
            : undefined,
          refreshTree: refreshPlanData,
          onCreated: setSelectedNodeId,
        });
      } catch (duplicateError) {
        setMoveError(
          duplicateError instanceof Error
            ? duplicateError.message
            : "Не удалось дублировать запись",
        );
        return null;
      }
    },
    [
      tenantId,
      objectTypeKey,
      hierarchyRelationKey,
      hierarchyRelation,
      hierarchyInstances,
      refreshPlanData,
    ],
  );

  const handleCreateChildNode = useCallback(
    (parentNodeId) => {
      const normalizedId = String(parentNodeId ?? "").trim();

      if (!normalizedId) {
        return;
      }

      if (hierarchyRelationKey) {
        entityCard.beginCreateSubtask(hierarchyRelationKey, {
          parentEntityId: normalizedId,
        });
        return;
      }

      entityCard.openCreateCard();
    },
    [hierarchyRelationKey, entityCard],
  );

  const handlePastePlanNode = useCallback(
    async (parentNodeId) => {
      const sourceId = String(planTreeCutNodeId ?? "").trim();

      if (!sourceId || previewMode) {
        return;
      }

      const logicalParentId = parentNodeId ? String(parentNodeId).trim() : null;
      const newParentId = resolveEffectivePlanTreeParentId(logicalParentId, rootAnchorId);

      if (newParentId === sourceId) {
        return;
      }

      if (newParentId && isPlanTreeDescendant(tree.nodesById, sourceId, newParentId)) {
        return;
      }

      try {
        await reparentPlanNode({
          tenantId,
          relationKey: hierarchyRelationKey,
          relationDefinition: hierarchyRelation,
          instances: hierarchyInstances,
          nodeId: sourceId,
          newParentId,
        });
        setPlanTreeCutNodeId(null);
        await refreshPlanData();
        setSelectedNodeId(sourceId);
      } catch (pasteError) {
        setMoveError(
          pasteError instanceof Error ? pasteError.message : "Не удалось вставить запись",
        );
      }
    },
    [
      planTreeCutNodeId,
      previewMode,
      tree.nodesById,
      tenantId,
      hierarchyRelationKey,
      hierarchyRelation,
      hierarchyInstances,
      rootAnchorId,
      refreshPlanData,
    ],
  );

  const handleContextMenuAction = useCallback(
    async (actionId, context) => {
      await executePlanTreeContextMenuAction({
        actionId,
        context,
        previewMode,
        handlers: {
          createRootNode: handleCreateRootRecord,
          createChildNode: handleCreateChildNode,
          pasteToTree: () => handlePastePlanNode(null),
          refreshTree: refreshPlanData,
          renameNode: (nodeId) => {
            void entityCard.openCard(nodeId);
          },
          openNodeProperties: (nodeId) => {
            void entityCard.openCard(nodeId);
          },
          cutNode: (nodeId) => {
            setPlanTreeCutNodeId(nodeId);
          },
          pasteToNode: handlePastePlanNode,
          duplicateNode: async (nodeId) => {
            const node = tree.nodesById.get(nodeId);

            if (!node) {
              return;
            }

            await duplicatePlanNode(node, node.parentId);
          },
          deleteNode: async (nodeId) => {
            const confirmed = window.confirm("Удалить запись из плана?");

            if (!confirmed) {
              return;
            }

            try {
              await deleteRuntimeEntity(tenantId, objectTypeKey, nodeId);
              await refreshPlanData();
              setSelectedNodeId(null);
            } catch (deleteError) {
              setMoveError(
                deleteError instanceof Error
                  ? deleteError.message
                  : "Не удалось удалить запись",
              );
            }
          },
        },
      });
    },
    [
      previewMode,
      handleCreateRootRecord,
      handleCreateChildNode,
      handlePastePlanNode,
      refreshPlanData,
      entityCard,
      tree.nodesById,
      duplicatePlanNode,
      tenantId,
      objectTypeKey,
    ],
  );

  const handleOpenRelatedEntity = useCallback(

    (entityId) => {

      const normalizedId = String(entityId ?? "").trim();

      if (!normalizedId) {

        return;

      }



      if (tree.nodesById.has(normalizedId)) {

        setSelectedNodeId(normalizedId);

        return;

      }



      void entityCard.openCard(normalizedId);

    },

    [tree.nodesById, entityCard.openCard],

  );



  const showPlanDataEmpty =

    !previewMode &&

    !relationsLoading &&

    hierarchyEnabled &&

    !loading &&

    !query?.loading &&

    !error &&

    !query?.error &&

    planEntityCount === 0;



  if (relationsLoading || query?.loading) {

    return <PlanViewLoadingState minHeight={minHeight} />;

  }



  if (!previewMode && catalog && !hierarchyRelation) {

    return (

      <PlanViewMissingRelationEmptyState

        relationKey={hierarchyRelationKey}

        previewMode={previewMode}

        tenantId={tenantId}

        objectTypeId={objectTypeId}

        minHeight={minHeight}

      />

    );

  }



  const treeEmptyMessage = previewMode
    ? "Демо-данные появятся после настройки полей"
    : PLAN_TREE_EMPTY_FALLBACK_MESSAGE;



  const statusSlot = (

    <>

      {loading ? (

        <p className="object-plan-view__status">Загрузка плана…</p>

      ) : null}

      {error ? <p className="object-plan-view__status object-plan-view__status--error">{error}</p> : null}

      {query?.error ? (

        <p className="object-plan-view__status object-plan-view__status--error">{query.error}</p>

      ) : null}

      {moveError ? (

        <p className="object-plan-view__status object-plan-view__status--error">{moveError}</p>

      ) : null}

    </>

  );



  return (

    <div

      className="object-plan-view"

      data-object-view-host="plan"

      style={{ minHeight }}

    >

      <PlanViewShell

        statusSlot={statusSlot}

        treePanelWidth={treePanelWidth}

        onResizeStart={handleResizeStart}

        treePanel={

          <PlanTreePanel

            roots={tree.roots}

            nodesById={tree.nodesById}

            selectedNodeId={selectedNodeId}

            expandedNodeIds={expandedNodeIds}

            isTreeFullyExpanded={isTreeFullyExpanded}

            onToggleExpandAll={handleToggleExpandAll}

            onSelectNode={setSelectedNodeId}

            onToggleExpand={handleToggleExpand}

            onMoveNode={handleMoveNode}

            onContextMenuAction={handleContextMenuAction}

            onCreateRoot={handleCreateRootRecord}

            canCreate={entityCard.canCreate}

            hasClipboard={Boolean(planTreeCutNodeId)}

            isDataEmpty={showPlanDataEmpty}

            previewMode={previewMode}

            emptyMessage={treeEmptyMessage}

            rootAnchorId={rootAnchorId}

          />

        }

        workArea={

          <PlanWorkArea
            activeTab={activeWorkTab}
            onActiveTabChange={setActiveWorkTab}
            selectedNode={selectedNode}
            resolvedContract={resolvedContract}
            planLayout={planPresentation?.planLayout}
            catalog={catalog}
            objectTypeKey={objectTypeKey}
            tenantId={tenantId}
            previewMode={previewMode}
            onOpenRelatedEntity={handleOpenRelatedEntity}
            planPreviewEditor={planPreviewEditor}
            onInfoFieldChange={planInfoFieldSave.handleFieldChange}
            canEditInfoFields={planInfoFieldSave.canEdit}
            infoSaveError={planInfoFieldSave.saveError}
          />

        }

      />



      {!previewMode ? (

        <PlatformQuickCreateForm

          open={entityCard.quickCreate?.open}

          onClose={entityCard.quickCreate?.close}

          onSubmit={entityCard.quickCreate?.submit}

          modalKey={entityCard.quickCreate?.modalKey}

          title={entityCard.quickCreate?.title}

          objectTypeLabel={entityCard.quickCreate?.objectTypeLabel}

          tenantId={entityCard.quickCreate?.tenantId}

          catalog={catalog}

          objectTypeKey={entityCard.quickCreate?.objectTypeKey}

          fields={entityCard.quickCreate?.fields || []}

          formValues={entityCard.quickCreate?.formValues || {}}

          onFieldChange={entityCard.quickCreate?.setFieldValue}

          fieldErrors={entityCard.quickCreate?.fieldErrors || {}}

          submitting={entityCard.quickCreate?.submitting}

          submitError={entityCard.quickCreate?.submitError}

          submitLabel={entityCard.quickCreate?.submitLabel}

          canCustomizeLayout

        />

      ) : null}



      {!previewMode ? (

        <ObjectEntityCardModal

          open={entityCard.isOpen}

          mode="edit"

          cardModel={entityCard.cardModel}

          formValues={entityCard.formValues}

          fieldErrors={entityCard.fieldErrors}

          onFieldChange={entityCard.updateFieldValue}

          onClose={entityCard.closeCard}

          onSave={entityCard.save}

          submitting={entityCard.submitting}

          submitError={entityCard.submitError}

          initialContext={entityCard.initialContext}

          catalog={catalog}

          onEntityUpdated={entityCard.refreshEntity}

          onOpenRelatedEntity={({ entityId, objectTypeKey: relatedObjectTypeKey }) => {

            void entityCard.openCard(entityId, {

              objectTypeKey: relatedObjectTypeKey || objectTypeKey,

            });

          }}

          onBeginCreateSubtask={entityCard.beginCreateSubtask}

          subtasksReloadToken={entityCard.subtasksReloadToken}

        />

      ) : null}

    </div>

  );

}


