import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { listRelationInstancesByKey } from "../../../../api/runtimeRelationsApi.js";
import { resolveConfiguredHierarchyRelationKey } from "../../../../shared/relation/resolveConfiguredHierarchyRelationKey.js";
import { hasHierarchySubtasksFeature } from "../../../../shared/relation/hierarchyRelationProfile.js";
import { ensurePlanTreeRootOrder } from "../../plan/planTreeRootOrderApi.js";
import { logPlanTreeApiError } from "../../plan/planTreeMoveDebug.js";
import { buildHierarchyEdgeMaps } from "../services/buildHierarchyEdgeMaps.js";
import { buildObjectTableHierarchyDisplayRows } from "../services/buildObjectTableHierarchyDisplayRows.js";
import { resolveExpandableHierarchyRowIds } from "../services/resolveExpandableHierarchyRowIds.js";
import useObjectTableHierarchyExpanded from "./useObjectTableHierarchyExpanded.js";

function findCatalogRelation(catalog, relationKey) {
  const relations = Array.isArray(catalog?.relations) ? catalog.relations : [];
  const normalizedKey = String(relationKey ?? "").trim();

  return (
    relations.find((item) => String(item?.key ?? "").trim() === normalizedKey) ||
    null
  );
}

/**
 * Between flat table rows and ViewEngineTable: batch hierarchy edges → nested display rows.
 */
export default function useObjectTableHierarchyRows({
  tenantId,
  objectTypeKey,
  viewKey,
  catalog,
  flatRows = [],
  enabled = true,
  previewMode = false,
  previewHierarchyInstances = null,
  preferHierarchySiblingOrder = true,
}) {
  const hierarchyRelationKey = useMemo(
    () => resolveConfiguredHierarchyRelationKey(catalog, objectTypeKey),
    [catalog, objectTypeKey],
  );

  const treeEnabled =
    enabled &&
    Boolean(tenantId) &&
    Boolean(objectTypeKey) &&
    hasHierarchySubtasksFeature(catalog, objectTypeKey) &&
    Boolean(hierarchyRelationKey);

  const flatRowIds = useMemo(
    () => (Array.isArray(flatRows) ? flatRows : []).map((row) => String(row.id)),
    [flatRows],
  );

  const {
    expandedRowIds,
    toggleRowExpanded,
    expandRow,
    expandAll,
    collapseAll,
  } = useObjectTableHierarchyExpanded({
    tenantId,
    objectTypeKey,
    viewKey,
    rowIds: flatRowIds,
    enabled: treeEnabled,
  });

  const [instances, setInstances] = useState([]);
  const [rootAnchorId, setRootAnchorId] = useState(null);
  const [edgesLoading, setEdgesLoading] = useState(false);
  const [edgesError, setEdgesError] = useState("");
  const rootOrderEnsureKeyRef = useRef("");

  useEffect(() => {
    setRootAnchorId(null);
    rootOrderEnsureKeyRef.current = "";
  }, [objectTypeKey, hierarchyRelationKey]);

  const relationDefinition = useMemo(
    () => findCatalogRelation(catalog, hierarchyRelationKey),
    [catalog, hierarchyRelationKey],
  );

  const loadEdges = useCallback(async () => {
    if (!treeEnabled || !hierarchyRelationKey) {
      setInstances([]);
      setRootAnchorId(null);
      setEdgesError("");
      return;
    }

    if (previewMode) {
      setInstances(
        Array.isArray(previewHierarchyInstances) ? previewHierarchyInstances : [],
      );
      setEdgesError("");
      setEdgesLoading(false);
      return;
    }

    setEdgesLoading(true);
    setEdgesError("");

    try {
      let items = await listRelationInstancesByKey(
        tenantId,
        hierarchyRelationKey,
      );
      items = Array.isArray(items) ? items : [];

      const ensureKey = `${objectTypeKey}:${hierarchyRelationKey}`;

      if (objectTypeKey && rootOrderEnsureKeyRef.current !== ensureKey) {
        const ensureUrl = `/runtime/plan-tree/tenants/${tenantId}/object-types/${objectTypeKey}/hierarchy/${hierarchyRelationKey}/ensure-root-order`;

        try {
          const ensured = await ensurePlanTreeRootOrder(
            tenantId,
            objectTypeKey,
            hierarchyRelationKey,
          );
          const anchorId = String(ensured?.anchorEntityId ?? "").trim();

          if (anchorId) {
            setRootAnchorId(anchorId);
            rootOrderEnsureKeyRef.current = ensureKey;
          }

          items = await listRelationInstancesByKey(tenantId, hierarchyRelationKey);
          items = Array.isArray(items) ? items : [];
        } catch (ensureError) {
          logPlanTreeApiError({
            url: ensureUrl,
            method: "POST",
            payload: null,
            response: ensureError?.response?.data,
            error: ensureError,
          });
        }
      }

      setInstances(items);
    } catch (error) {
      setInstances([]);
      setEdgesError(
        error instanceof Error ? error.message : "Не удалось загрузить иерархию",
      );
    } finally {
      setEdgesLoading(false);
    }
  }, [
    treeEnabled,
    tenantId,
    objectTypeKey,
    hierarchyRelationKey,
    previewMode,
    previewHierarchyInstances,
  ]);

  useEffect(() => {
    void loadEdges();
  }, [loadEdges, previewHierarchyInstances]);

  const { parentByChild, childrenByParent } = useMemo(
    () => buildHierarchyEdgeMaps(instances, relationDefinition),
    [instances, relationDefinition],
  );

  const expandableRowIds = useMemo(
    () =>
      treeEnabled
        ? resolveExpandableHierarchyRowIds({
            childrenByParent,
            flatRowIds: flatRowIds,
          })
        : [],
    [treeEnabled, childrenByParent, flatRowIds],
  );

  const displayRows = useMemo(() => {
    if (!treeEnabled) {
      return flatRows;
    }

    return buildObjectTableHierarchyDisplayRows({
      flatRows,
      parentByChild,
      childrenByParent,
      expandedRowIds,
      rootAnchorId,
      preferHierarchySiblingOrder,
    });
  }, [
    treeEnabled,
    flatRows,
    parentByChild,
    childrenByParent,
    expandedRowIds,
    rootAnchorId,
    preferHierarchySiblingOrder,
  ]);

  return {
    treeEnabled,
    hierarchyRelationKey,
    displayRows,
    parentByChild,
    childrenByParent,
    rootAnchorId,
    expandableRowIds,
    edgesLoading,
    edgesError,
    reloadEdges: loadEdges,
    expandedRowIds,
    toggleRowExpanded,
    expandRow,
    expandAll,
    collapseAll,
  };
}
