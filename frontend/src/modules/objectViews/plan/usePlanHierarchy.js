import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { resolvePlanTreeHierarchyRelationKey } from "../../../shared/relation/resolvePlanTreeHierarchyRelationKey.js";
import { buildHierarchyEdgeMaps } from "../table/services/buildHierarchyEdgeMaps.js";
import { buildPlanTree } from "./buildPlanTree.js";
import { buildPlanPreviewMock } from "./buildPlanPreviewMock.js";
import { applyPlanEntityPatches } from "./applyPlanEntityPatches.js";
import { fetchPlanTree } from "./planTreeApi.js";
import {
  buildPlanTreeCacheKey,
  getCachedPlanTree,
  invalidatePlanTreeCache,
  setCachedPlanTree,
} from "./planTreeCache.js";

function findCatalogRelation(catalog, relationKey) {
  const relations = Array.isArray(catalog?.relations) ? catalog.relations : [];
  const normalizedKey = String(relationKey ?? "").trim();

  return (
    relations.find((item) => String(item?.key ?? "").trim() === normalizedKey) ||
    null
  );
}

/**
 * Loads plan tree via bulk backend endpoint (entities + hierarchy edges).
 */
const EMPTY_PLAN_TREE = Object.freeze({
  roots: [],
  nodesById: new Map(),
  hasHierarchy: false,
  hasCycle: false,
});

export default function usePlanHierarchy({
  tenantId,
  catalog = null,
  objectTypeKey = null,
  viewKey = null,
  planPresentation = null,
  titleFieldKey = null,
  statusFieldKey = null,
  statusField = null,
  progressFieldKey = null,
  previewMode = false,
  enabled = true,
  entityPatches = null,
}) {
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

  const cacheKey = useMemo(
    () =>
      buildPlanTreeCacheKey({
        tenantId,
        objectTypeKey,
        viewKey,
        relationKey: hierarchyRelationKey,
      }),
    [tenantId, objectTypeKey, viewKey, hierarchyRelationKey],
  );

  const [payload, setPayload] = useState(() =>
    previewMode || !enabled ? null : getCachedPlanTree(cacheKey),
  );
  const [loading, setLoading] = useState(() => {
    if (!enabled || previewMode) {
      return false;
    }

    return !getCachedPlanTree(cacheKey);
  });
  const [revalidating, setRevalidating] = useState(false);
  const [hierarchyError, setHierarchyError] = useState("");
  const requestIdRef = useRef(0);

  const instances = useMemo(
    () => (Array.isArray(payload?.instances) ? payload.instances : []),
    [payload],
  );
  const planTreeItems = useMemo(() => {
    const base = Array.isArray(payload?.entities) ? payload.entities : [];
    return applyPlanEntityPatches(base, entityPatches);
  }, [payload, entityPatches]);
  const rootAnchorId = payload?.anchorEntityId ?? null;

  const loadPlanTree = useCallback(
    async ({ background = false, invalidateCache = false } = {}) => {
      if (!enabled || previewMode) {
        setPayload(null);
        setHierarchyError("");
        setLoading(false);
        setRevalidating(false);
        return;
      }

      if (!tenantId || !objectTypeKey || !viewKey || !hierarchyRelationKey) {
        setPayload(null);
        setHierarchyError("");
        setLoading(false);
        setRevalidating(false);
        return;
      }

      if (invalidateCache) {
        invalidatePlanTreeCache({
          tenantId,
          objectTypeKey,
          viewKey,
          relationKey: hierarchyRelationKey,
        });
      }

      const cached = !invalidateCache ? getCachedPlanTree(cacheKey) : null;

      if (cached) {
        setPayload(cached);
        setLoading(false);
      } else if (!background) {
        setLoading(true);
      }

      if (background || cached) {
        setRevalidating(true);
      }

      const requestId = requestIdRef.current + 1;
      requestIdRef.current = requestId;
      setHierarchyError("");

      try {
        const nextPayload = await fetchPlanTree(
          tenantId,
          objectTypeKey,
          viewKey,
          hierarchyRelationKey,
        );

        if (requestIdRef.current !== requestId) {
          return;
        }

        setPayload(nextPayload);
        setCachedPlanTree(cacheKey, nextPayload);
      } catch (loadError) {
        if (requestIdRef.current !== requestId) {
          return;
        }

        if (!cached) {
          setPayload(null);
        }

        setHierarchyError(
          loadError instanceof Error
            ? loadError.message
            : "Не удалось загрузить план",
        );
      } finally {
        if (requestIdRef.current === requestId) {
          setLoading(false);
          setRevalidating(false);
        }
      }
    },
    [
      enabled,
      previewMode,
      tenantId,
      objectTypeKey,
      viewKey,
      hierarchyRelationKey,
      cacheKey,
    ],
  );

  useEffect(() => {
    if (!enabled || previewMode) {
      setPayload(null);
      setLoading(false);
      setRevalidating(false);
      return;
    }

    const cached = getCachedPlanTree(cacheKey);

    if (cached) {
      setPayload(cached);
      setLoading(false);
      void loadPlanTree({ background: true });
      return;
    }

    void loadPlanTree({ background: false });
  }, [enabled, previewMode, cacheKey, loadPlanTree]);

  const relationDefinition = useMemo(
    () => findCatalogRelation(catalog, hierarchyRelationKey),
    [catalog, hierarchyRelationKey],
  );

  const treeReady = Boolean(payload) && !loading;

  const tree = useMemo(() => {
    if (!enabled) {
      return EMPTY_PLAN_TREE;
    }

    if (previewMode) {
      return buildPlanPreviewMock();
    }

    if (!treeReady) {
      return EMPTY_PLAN_TREE;
    }

    try {
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
        rootAnchorId,
      });
    } catch (buildError) {
      console.error("[PlanTree] Failed to build plan tree", buildError);
      return {
        ...EMPTY_PLAN_TREE,
        hasHierarchy: true,
        hasCycle: true,
      };
    }
  }, [
    enabled,
    previewMode,
    treeReady,
    planTreeItems,
    instances,
    catalog,
    objectTypeKey,
    planPresentation,
    titleFieldKey,
    statusFieldKey,
    statusField,
    progressFieldKey,
    rootAnchorId,
  ]);

  const edgeMaps = useMemo(
    () => buildHierarchyEdgeMaps(instances, relationDefinition),
    [instances, relationDefinition],
  );

  const reload = useCallback(
    (options = {}) =>
      loadPlanTree({
        background: Boolean(options.background),
        invalidateCache: options.invalidateCache !== false,
      }),
    [loadPlanTree],
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
    planEntityCount: !enabled ? 0 : planTreeItems.length,
    planTreeEntityCount: !enabled ? 0 : planTreeItems.length,
    planTreeRootCount: tree.roots.length,
    loading,
    revalidating,
    treeReady,
    error: enabled ? hierarchyError : "",
    reload,
    rootAnchorId,
    ...edgeMaps,
  };
}
