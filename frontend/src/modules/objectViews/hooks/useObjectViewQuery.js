import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { getPublishedCatalog } from "../../designer/api/runtimeCatalogApi";
import { getApiErrorMessage } from "../../designer/api/platformApiClient";
import { runtimeReadGateway } from "../../runtimeReadGateway";
import { buildPublishedViewRaw } from "../services/buildPublishedViewRaw";
import { mapObjectViewQueryToRuntimeParams } from "../services/mapObjectViewQueryToRuntimeParams";
import { getPrimarySortState } from "../services/sortRulesUtils";
import { isRuntimeProjectionValid } from "../services/projectionUtils";

const DEFAULT_LIMIT = 20;

function buildFilterSignature(contract, session) {
  return JSON.stringify({
    conditions: contract?.query?.filters?.conditions || [],
    activeQuickFilterId: session?.activeQuickFilterId ?? null,
  });
}

function buildSortSignature(contract) {
  return JSON.stringify(contract?.query?.sort?.rules || []);
}

/**
 * Runtime fetch orchestration for Object Views.
 */
export default function useObjectViewQuery({
  tenantId,
  objectTypeKey,
  viewKey = null,
  pageSize = DEFAULT_LIMIT,
  effectiveContract = null,
  sessionState = null,
}) {
  const limit = pageSize;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [offset, setOffset] = useState(0);

  const [catalog, setCatalog] = useState(null);
  const [projection, setProjection] = useState(null);
  const [projectionValid, setProjectionValid] = useState(false);
  const [publishedViewRaw, setPublishedViewRaw] = useState(null);
  const [publishedObjectView, setPublishedObjectView] = useState(null);
  const [listResult, setListResult] = useState(null);
  const [metaReady, setMetaReady] = useState(false);

  const loadRequestRef = useRef(0);
  const skipNextPagingLoadRef = useRef(false);
  const projectionRef = useRef(projection);
  const offsetRef = useRef(offset);
  const effectiveContractRef = useRef(effectiveContract);

  projectionRef.current = projection;
  offsetRef.current = offset;
  effectiveContractRef.current = effectiveContract;

  const filterSignature = useMemo(
    () => buildFilterSignature(effectiveContract, sessionState),
    [effectiveContract, sessionState],
  );

  const sortSignature = useMemo(
    () => buildSortSignature(effectiveContract),
    [effectiveContract],
  );

  const tableSort = useMemo(
    () => getPrimarySortState(effectiveContract?.query?.sort?.rules || []),
    [effectiveContract],
  );

  const loadRows = useCallback(
    async ({ offsetSnapshot, projectionSnapshot } = {}) => {
      if (!objectTypeKey) {
        setError("Object type key не определён");
        setListResult(null);
        setLoading(false);
        return;
      }

      const requestId = loadRequestRef.current + 1;
      loadRequestRef.current = requestId;

      setLoading(true);
      setError("");

      const activeOffset = offsetSnapshot ?? offsetRef.current;
      const contract = effectiveContractRef.current;

      const runtimeParams = mapObjectViewQueryToRuntimeParams({
        contract,
        pagination: { limit, offset: activeOffset },
        session: sessionState || {},
      });

      try {
        const gatewayResponse = await runtimeReadGateway.getObjectList({
          tenantId,
          objectTypeKey,
          viewKey,
          ...runtimeParams,
        });

        if (loadRequestRef.current !== requestId) {
          return;
        }

        setListResult(gatewayResponse);
      } catch (err) {
        if (loadRequestRef.current !== requestId) {
          return;
        }

        setListResult(null);
        setError(
          getApiErrorMessage(
            err,
            "Не удалось загрузить runtime entities. Проверьте publish catalog.",
          ),
        );
      } finally {
        if (loadRequestRef.current === requestId) {
          setLoading(false);
        }
      }
    },
    [objectTypeKey, tenantId, viewKey, limit, sessionState],
  );

  const reload = useCallback(async () => {
    await loadRows();
  }, [loadRows]);

  useEffect(() => {
    let cancelled = false;

    setMetaReady(false);
    setOffset(0);
    setCatalog(null);
    setProjection(null);
    setProjectionValid(false);
    setPublishedViewRaw(null);
    setPublishedObjectView(null);
    setListResult(null);

    if (!objectTypeKey) {
      setError("Object type key не определён");
      setLoading(false);
      return undefined;
    }

    (async () => {
      setLoading(true);
      setError("");

      let nextProjection = null;

      try {
        const projectionResponse = await runtimeReadGateway.getProjection({
          tenantId,
          objectTypeKey,
          viewKey,
        });

        nextProjection = projectionResponse?.projection;
        const nextPublishedViewRaw = buildPublishedViewRaw(projectionResponse);
        const nextObjectView =
          projectionResponse?.objectView ||
          projectionResponse?.object_view ||
          nextPublishedViewRaw?.settings_json?.objectView ||
          null;

        setPublishedViewRaw(nextPublishedViewRaw);
        setPublishedObjectView(
          nextObjectView && typeof nextObjectView === "object"
            ? nextObjectView
            : null,
        );

        if (isRuntimeProjectionValid(nextProjection)) {
          setProjection(nextProjection);
          setProjectionValid(true);
        } else {
          setProjection(null);
          setProjectionValid(false);
          nextProjection = null;
        }
      } catch (projectionError) {
        setProjection(null);
        setProjectionValid(false);
        nextProjection = null;
        if (!cancelled) {
          setError(
            getApiErrorMessage(
              projectionError,
              "Не удалось загрузить projection опубликованного представления.",
            ),
          );
        }
      }

      try {
        const catalogResponse = await getPublishedCatalog(tenantId);
        if (!cancelled) {
          setCatalog(catalogResponse);
        }
      } catch {
        if (!cancelled) {
          setCatalog(null);
        }
      }

      if (cancelled) {
        return;
      }

      skipNextPagingLoadRef.current = true;

      await loadRows({
        projectionSnapshot: nextProjection,
        offsetSnapshot: 0,
      });

      if (!cancelled) {
        setMetaReady(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [tenantId, objectTypeKey, viewKey, loadRows]);

  useEffect(() => {
    if (!metaReady || !objectTypeKey) {
      return;
    }

    if (skipNextPagingLoadRef.current) {
      skipNextPagingLoadRef.current = false;
      return;
    }

    loadRows({
      offsetSnapshot: offset,
    });
  }, [offset, metaReady, objectTypeKey, loadRows]);

  useEffect(() => {
    if (!metaReady || !objectTypeKey) {
      return;
    }

    setOffset(0);
    skipNextPagingLoadRef.current = true;

    loadRows({
      offsetSnapshot: 0,
    });
  }, [filterSignature, sortSignature, metaReady, objectTypeKey, loadRows]);

  const resetOffset = useCallback(() => {
    setOffset(0);
  }, []);

  const goToPreviousPage = useCallback(() => {
    setOffset((current) => Math.max(0, current - limit));
  }, [limit]);

  const goToNextPage = useCallback(() => {
    setOffset((current) => current + limit);
  }, [limit]);

  return {
    loading,
    error,
    catalog,
    projection,
    projectionValid,
    publishedViewRaw,
    publishedObjectView,
    listResult,
    tableSort,
    offset,
    setOffset,
    resetOffset,
    metaReady,
    reload,
    goToPreviousPage,
    goToNextPage,
    pageSize: limit,
  };
}
