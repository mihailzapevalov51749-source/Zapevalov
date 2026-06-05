import { useCallback, useEffect, useMemo, useState } from "react";

import { listRelationInstancesByKey } from "../../../../api/runtimeRelationsApi.js";
import {
  hasHierarchySubtasksFeature,
  resolvePrimaryHierarchySubtaskRelationKey,
} from "../../../../shared/relation/hierarchyRelationProfile.js";
import { buildHierarchyEdgeMaps } from "../services/buildHierarchyEdgeMaps.js";
import { buildObjectTableHierarchyDisplayRows } from "../services/buildObjectTableHierarchyDisplayRows.js";
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
}) {
  const hierarchyRelationKey = useMemo(
    () => resolvePrimaryHierarchySubtaskRelationKey(catalog, objectTypeKey),
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
  } = useObjectTableHierarchyExpanded({
    tenantId,
    objectTypeKey,
    viewKey,
    rowIds: flatRowIds,
    enabled: treeEnabled,
  });

  const [instances, setInstances] = useState([]);
  const [edgesLoading, setEdgesLoading] = useState(false);
  const [edgesError, setEdgesError] = useState("");

  const relationDefinition = useMemo(
    () => findCatalogRelation(catalog, hierarchyRelationKey),
    [catalog, hierarchyRelationKey],
  );

  const loadEdges = useCallback(async () => {
    if (!treeEnabled || !hierarchyRelationKey) {
      setInstances([]);
      setEdgesError("");
      return;
    }

    setEdgesLoading(true);
    setEdgesError("");

    try {
      const items = await listRelationInstancesByKey(
        tenantId,
        hierarchyRelationKey,
      );
      setInstances(Array.isArray(items) ? items : []);
    } catch (error) {
      setInstances([]);
      setEdgesError(
        error instanceof Error ? error.message : "Не удалось загрузить иерархию",
      );
    } finally {
      setEdgesLoading(false);
    }
  }, [treeEnabled, tenantId, hierarchyRelationKey]);

  useEffect(() => {
    void loadEdges();
  }, [loadEdges]);

  const { parentByChild, childrenByParent } = useMemo(
    () => buildHierarchyEdgeMaps(instances, relationDefinition),
    [instances, relationDefinition],
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
    });
  }, [
    treeEnabled,
    flatRows,
    parentByChild,
    childrenByParent,
    expandedRowIds,
  ]);

  return {
    treeEnabled,
    hierarchyRelationKey,
    displayRows,
    parentByChild,
    edgesLoading,
    edgesError,
    reloadEdges: loadEdges,
    expandedRowIds,
    toggleRowExpanded,
    expandRow,
  };
}
