import { useCallback, useEffect, useMemo, useState } from "react";

import { listRelationInstancesByKey } from "../../../api/runtimeRelationsApi.js";
import { buildHierarchyEdgeMaps } from "../table/services/buildHierarchyEdgeMaps.js";
import { buildPlanTree } from "./buildPlanTree.js";
import { buildPlanPreviewMock } from "./buildPlanPreviewMock.js";
import {
  collectHierarchyEntityIds,
  fetchPlanTreeEntitiesByIds,
  findMissingPlanEntityIds,
  indexPlanEntityItems,
  mergePlanEntityItems,
} from "./planTreeEntityItems.js";

function findCatalogRelation(catalog, relationKey) {
  const relations = Array.isArray(catalog?.relations) ? catalog.relations : [];
  const normalizedKey = String(relationKey ?? "").trim();

  return (
    relations.find((item) => String(item?.key ?? "").trim() === normalizedKey) ||
    null
  );
}

/**
 * Loads hierarchy edges for Plan view.
 *
 * Studio Preview (`previewMode`) uses mock tree data when hierarchyRelationKey is set.
 * Office uses published contract hierarchyRelationKey and runtime relation instances only.
 *
 * Plan tree entity payloads are merged from paginated query items plus hierarchy-only
 * entities loaded by id (Plan must not depend on table pagination).
 */
const EMPTY_PLAN_TREE = Object.freeze({
  roots: [],
  nodesById: new Map(),
  hasHierarchy: false,
});

export default function usePlanHierarchy({
  tenantId,
  catalog = null,
  objectTypeKey = null,
  items = [],
  planPresentation = null,
  titleFieldKey = null,
  statusFieldKey = null,
  statusField = null,
  progressFieldKey = null,
  previewMode = false,
  enabled = true,
}) {
  const hierarchyRelationKey = String(planPresentation?.hierarchyRelationKey || "").trim();

  const [instances, setInstances] = useState([]);
  const [hierarchyLoading, setHierarchyLoading] = useState(false);
  const [hierarchyError, setHierarchyError] = useState("");
  const [supplementaryItems, setSupplementaryItems] = useState([]);
  const [entitiesLoading, setEntitiesLoading] = useState(false);

  const loadInstances = useCallback(async () => {
    if (!enabled) {
      setInstances([]);
      setHierarchyError("");
      setHierarchyLoading(false);
      return;
    }

    if (previewMode) {
      setInstances([]);
      setHierarchyError("");
      setHierarchyLoading(false);
      return;
    }

    if (!tenantId || !hierarchyRelationKey) {
      setInstances([]);
      setHierarchyError("");
      return;
    }

    setHierarchyLoading(true);
    setHierarchyError("");

    try {
      const data = await listRelationInstancesByKey(tenantId, hierarchyRelationKey);
      setInstances(Array.isArray(data) ? data : []);
    } catch (loadError) {
      setInstances([]);
      setHierarchyError(
        loadError instanceof Error
          ? loadError.message
          : "Не удалось загрузить иерархию плана",
      );
    } finally {
      setHierarchyLoading(false);
    }
  }, [enabled, previewMode, tenantId, hierarchyRelationKey]);

  useEffect(() => {
    void loadInstances();
  }, [loadInstances]);

  const relationDefinition = useMemo(
    () => findCatalogRelation(catalog, hierarchyRelationKey),
    [catalog, hierarchyRelationKey],
  );

  useEffect(() => {
    if (!enabled || previewMode || !tenantId || !objectTypeKey || !hierarchyRelationKey) {
      setSupplementaryItems([]);
      setEntitiesLoading(false);
      return undefined;
    }

    if (!instances.length) {
      setSupplementaryItems([]);
      setEntitiesLoading(false);
      return undefined;
    }

    const hierarchyEntityIds = collectHierarchyEntityIds(instances, relationDefinition);
    const indexedItems = indexPlanEntityItems(items);
    const missingIds = findMissingPlanEntityIds(hierarchyEntityIds, indexedItems);

    if (!missingIds.length) {
      setSupplementaryItems([]);
      setEntitiesLoading(false);
      return undefined;
    }

    let cancelled = false;

    (async () => {
      setEntitiesLoading(true);

      try {
        const fetched = await fetchPlanTreeEntitiesByIds({
          tenantId,
          objectTypeKey,
          entityIds: missingIds,
        });

        if (!cancelled) {
          setSupplementaryItems(fetched);
        }
      } finally {
        if (!cancelled) {
          setEntitiesLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    enabled,
    previewMode,
    tenantId,
    objectTypeKey,
    hierarchyRelationKey,
    instances,
    relationDefinition,
    items,
  ]);

  const planTreeItems = useMemo(
    () => mergePlanEntityItems(items, supplementaryItems),
    [items, supplementaryItems],
  );

  const tree = useMemo(() => {
    if (!enabled) {
      return EMPTY_PLAN_TREE;
    }

    if (previewMode) {
      return buildPlanPreviewMock();
    }

    return buildPlanTree({
      items: planTreeItems,
      hierarchyInstances: instances,
      catalog,
      objectTypeKey,
      planPresentation,
      titleFieldKey,
      statusFieldKey,
      statusField,
      progressFieldKey,
    });
  }, [
    enabled,
    previewMode,
    planTreeItems,
    instances,
    catalog,
    objectTypeKey,
    planPresentation,
    titleFieldKey,
    statusFieldKey,
    statusField,
    progressFieldKey,
  ]);

  const edgeMaps = useMemo(
    () => buildHierarchyEdgeMaps(instances, relationDefinition),
    [instances, relationDefinition],
  );

  return {
    tree,
    hierarchyRelationKey,
    hierarchyInstances: instances,
    hierarchyInstanceCount: !enabled
      ? 0
      : previewMode
        ? tree.roots.length
        : instances.length,
    /** Office: paginated query items (before hierarchy merge). */
    planEntityCount: !enabled ? 0 : items.length,
    /** Office: items passed to buildPlanTree after hierarchy merge. */
    planTreeEntityCount: !enabled ? 0 : planTreeItems.length,
    planTreeRootCount: tree.roots.length,
    loading: enabled ? hierarchyLoading || entitiesLoading : false,
    error: enabled ? hierarchyError : "",
    reload: loadInstances,
    ...edgeMaps,
  };
}

