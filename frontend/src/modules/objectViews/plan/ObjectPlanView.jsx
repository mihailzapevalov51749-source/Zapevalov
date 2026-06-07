import { useCallback, useEffect, useMemo, useState } from "react";

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
import {
  resolvePlanHierarchyRelation,
} from "./planHierarchyRelation.js";
import usePlanHierarchy from "./usePlanHierarchy.js";
import PlanViewShell from "./PlanViewShell.jsx";
import PlanTreePanel from "./PlanTreePanel.jsx";
import PlanWorkArea from "./PlanWorkArea.jsx";
import usePlanTreePanelResize from "./usePlanTreePanelResize.js";
import PlanViewEmptyState from "./PlanViewEmptyState.jsx";
import PlanViewMissingRelationEmptyState from "./PlanViewMissingRelationEmptyState.jsx";
import { resolvePlanStatusField } from "./planFieldUtils.js";
import { reparentPlanNode } from "./planHierarchyMove.js";
import { resolveFirstVisiblePlanTabKey } from "./planLayoutSettings.js";
import { PLAN_TREE_EMPTY_FALLBACK_MESSAGE } from "./planEmptyStateMessages.js";
import { logPlanDebug } from "./planViewDebug.js";

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



  const hierarchyRelationKey = String(planPresentation?.hierarchyRelationKey || "").trim();

  const catalog = query?.catalog ?? null;

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

  const [movingNodeId, setMovingNodeId] = useState(null);

  const [moveError, setMoveError] = useState("");

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

  const {
    tree,
    loading,
    error,
    planEntityCount,
    hierarchyInstances,
    reload: reloadHierarchy,
  } = usePlanHierarchy({
    tenantId,
    catalog,
    objectTypeKey,
    items,
    planPresentation,
    titleFieldKey,
    statusFieldKey,
    statusField,
    previewMode,
    enabled: hierarchyEnabled,
  });

  const entityCard = useObjectEntityCard({
    tenantId,
    objectTypeKey,
    catalog,
    listItems: items,
    titleFieldKey,
    enabled: Boolean(tenantId && objectTypeKey && !previewMode),
    onSaved: async (entity, meta) => {
      await query?.reload?.();
      await reloadHierarchy();

      if (meta?.created) {
        const createdId = String(entity?.id ?? "").trim();

        if (createdId) {
          setSelectedNodeId(createdId);
        }
      }
    },
  });

  const handleCreateRootRecord = useCallback(() => {
    if (previewMode || !entityCard.canCreate) {
      return;
    }

    entityCard.openCreateCard();
  }, [previewMode, entityCard.canCreate, entityCard.openCreateCard]);



  useEffect(() => {

    const expandable = collectExpandableNodeIds(tree.roots);

    setExpandedNodeIds(new Set(expandable));

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



  const handleReparentNode = useCallback(

    async (nodeId, newParentId) => {

      if (previewMode) {

        return;

      }



      setMovingNodeId(nodeId);

      setMoveError("");



      try {

        await reparentPlanNode({

          tenantId,

          relationKey: hierarchyRelationKey,

          relationDefinition: hierarchyRelation,

          instances: hierarchyInstances,

          nodeId,

          newParentId,

        });



        await refreshPlanData();



        if (newParentId) {

          setExpandedNodeIds((previous) => {

            const next = new Set(previous);

            next.add(newParentId);

            return next;

          });

        }

      } catch (reparentError) {

        setMoveError(

          reparentError instanceof Error

            ? reparentError.message

            : "Не удалось переместить запись",

        );

      } finally {

        setMovingNodeId(null);

      }

    },

    [

      previewMode,

      tenantId,

      hierarchyRelationKey,

      hierarchyRelation,

      hierarchyInstances,

      refreshPlanData,

    ],

  );



  const handleContextMenuAction = useCallback(
    async (actionId, nodeId) => {
      const normalizedId = String(nodeId || "").trim();
      const node = tree.nodesById.get(normalizedId);

      if (!normalizedId || !node || previewMode) {
        return;
      }

      if (actionId === "create" || actionId === "create_task") {
        if (hierarchyRelationKey) {
          entityCard.beginCreateSubtask(hierarchyRelationKey, {
            parentEntityId: normalizedId,
          });
        } else {
          entityCard.openCreateCard();
        }
        return;
      }

      if (actionId === "rename") {
        void entityCard.openCard(normalizedId);
        return;
      }

      if (actionId === "duplicate") {
        const entityValues =
          node.entity?.values && typeof node.entity.values === "object"
            ? { ...node.entity.values }
            : {};

        try {
          const created = await runtimeWriteGateway.createEntity({
            tenantId,
            objectTypeKey,
            values: entityValues,
          });

          const createdId = String(created?.id ?? created?.entity_id ?? "").trim();

          if (createdId && node.parentId) {
            await reparentPlanNode({
              tenantId,
              relationKey: hierarchyRelationKey,
              relationDefinition: hierarchyRelation,
              instances: hierarchyInstances,
              nodeId: createdId,
              newParentId: node.parentId,
            });
          }

          await refreshPlanData();

          if (createdId) {
            setSelectedNodeId(createdId);
          }
        } catch (duplicateError) {
          setMoveError(
            duplicateError instanceof Error
              ? duplicateError.message
              : "Не удалось дублировать запись",
          );
        }

        return;
      }

      if (actionId === "delete") {
        const confirmed = window.confirm("Удалить запись из плана?");

        if (!confirmed) {
          return;
        }

        try {
          await deleteRuntimeEntity(tenantId, objectTypeKey, normalizedId);
          await refreshPlanData();
          setSelectedNodeId(null);
        } catch (deleteError) {
          setMoveError(
            deleteError instanceof Error
              ? deleteError.message
              : "Не удалось удалить запись",
          );
        }
      }
    },
    [
      tree.nodesById,
      previewMode,
      hierarchyRelationKey,
      entityCard,
      tenantId,
      objectTypeKey,
      hierarchyRelation,
      hierarchyInstances,
      refreshPlanData,
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

            onReparentNode={handleReparentNode}

            onContextMenuAction={handleContextMenuAction}

            onCreateRoot={handleCreateRootRecord}

            canCreate={entityCard.canCreate}

            isDataEmpty={showPlanDataEmpty}

            previewMode={previewMode}

            emptyMessage={treeEmptyMessage}

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


