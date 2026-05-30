import { useCallback, useEffect, useMemo, useState } from "react";

import * as designerApi from "../../designer/api/designerApi";
import { getPublishedCatalog } from "../../designer/api/runtimeCatalogApi";
import { getApiErrorMessage } from "../../designer/api/platformApiClient";
import { buildObjectViewPayload } from "../services/buildObjectViewPayload";
import { generateViewKey } from "../services/generateViewKey";
import { normalizeObjectViewDefinition } from "../services/normalizeObjectViewDefinition";
import {
  isTableViewDefinition,
  resolveActiveTableView,
} from "../services/resolveActiveView";

function cloneContract(contract) {
  return JSON.parse(JSON.stringify(contract));
}

function resolveDefinitionSource({
  objectTypeId,
  mode,
  source = null,
  allowDesignerApi = true,
}) {
  if (mode === "published-runtime" || mode === "runtime") {
    return "published";
  }

  if (source === "portal") {
    return "published";
  }

  if (!allowDesignerApi) {
    return "published";
  }

  if (objectTypeId && (mode === "data" || mode === "studio-preview")) {
    return "designer";
  }

  if (objectTypeId) {
    return "designer";
  }

  return "published";
}

/**
 * Loads designer view definitions and resolves active table view contract.
 */
export default function useObjectViewDefinitions({
  tenantId,
  objectTypeId = null,
  objectTypeKey = null,
  requestedViewKey = null,
  pageSize = 20,
  mode = "data",
  source = null,
  allowDesignerApi = true,
  runtimeProjection = null,
  publishedViewRaw = null,
}) {
  const definitionSource = resolveDefinitionSource({
    objectTypeId,
    mode,
    source,
    allowDesignerApi,
  });

  const [views, setViews] = useState([]);
  const [loading, setLoading] = useState(
    Boolean(tenantId && (objectTypeId || objectTypeKey)),
  );
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [selectedViewKey, setSelectedViewKey] = useState(
    requestedViewKey || null,
  );

  const refreshViews = useCallback(async () => {
    if (!tenantId) {
      setViews([]);
      setLoading(false);
      return;
    }

    if (definitionSource === "designer" && !objectTypeId) {
      setViews([]);
      setLoading(false);
      return;
    }

    if (definitionSource === "published" && !objectTypeKey) {
      setViews([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      let list = [];

      if (definitionSource === "designer") {
        const rawList = await designerApi.listViews(tenantId, objectTypeId);
        list = Array.isArray(rawList) ? rawList : [];
      } else {
        const catalog = await getPublishedCatalog(tenantId);
        const objectType = (catalog?.object_types || []).find(
          (item) => item?.key === objectTypeKey,
        );
        list = Array.isArray(objectType?.views) ? objectType.views : [];
      }

      const tableViews = list
        .filter((item) => item && isTableViewDefinition(item))
        .map((raw) => ({
          raw,
          contract: normalizeObjectViewDefinition(raw, {
            viewKey: raw?.key,
            pageSize,
            isPublished: definitionSource === "published",
          }),
        }));

      setViews(tableViews);
      return tableViews;
    } catch (err) {
      setViews([]);
      setError(getApiErrorMessage(err, "Не удалось загрузить представления"));
      return [];
    } finally {
      setLoading(false);
    }
  }, [tenantId, objectTypeId, objectTypeKey, pageSize, definitionSource]);

  useEffect(() => {
    refreshViews();
  }, [refreshViews]);

  useEffect(() => {
    if (requestedViewKey) {
      setSelectedViewKey(requestedViewKey);
    }
  }, [requestedViewKey]);

  const fallbackViews = useMemo(() => {
    if (views.length) {
      return views;
    }

    if (publishedViewRaw) {
      const publishedContract = normalizeObjectViewDefinition(publishedViewRaw, {
        viewKey: publishedViewRaw?.key || requestedViewKey || "default_table",
        pageSize,
        projection: runtimeProjection,
        isPublished: true,
      });

      return [{ raw: publishedViewRaw, contract: publishedContract }];
    }

    const fallbackContract = normalizeObjectViewDefinition(null, {
      viewKey: requestedViewKey || "default_table",
      pageSize,
      projection: runtimeProjection,
      isPublished: definitionSource === "published",
    });

    return [{ raw: null, contract: fallbackContract }];
  }, [
    views,
    requestedViewKey,
    pageSize,
    runtimeProjection,
    publishedViewRaw,
    definitionSource,
  ]);

  const activeView = useMemo(() => {
    return resolveActiveTableView(fallbackViews, selectedViewKey);
  }, [fallbackViews, selectedViewKey]);

  const resolvedContract = useMemo(() => {
    if (!activeView?.contract) {
      return normalizeObjectViewDefinition(null, {
        viewKey: "default_table",
        pageSize,
        projection: runtimeProjection,
      });
    }

    if (runtimeProjection && definitionSource === "published") {
      return normalizeObjectViewDefinition(activeView.raw, {
        viewKey: activeView.contract.key,
        pageSize,
        projection: runtimeProjection,
        isPublished: true,
      });
    }

    if (runtimeProjection && !activeView.raw?.settings_json?.objectView) {
      return normalizeObjectViewDefinition(activeView.raw, {
        viewKey: activeView.contract.key,
        pageSize,
        projection: runtimeProjection,
      });
    }

    return activeView.contract;
  }, [activeView, pageSize, runtimeProjection, definitionSource]);

  const selectView = useCallback((viewKey) => {
    const normalized = String(viewKey || "").trim();
    if (!normalized) {
      return;
    }
    setSelectedViewKey(normalized);
  }, []);

  const createView = useCallback(
    async ({ name, copyCurrent = false, effectiveContract, resolvedContract }) => {
      if (!tenantId || !objectTypeId) {
        return { ok: false, reason: "missing_context" };
      }

      const trimmedName = String(name || "").trim();
      if (!trimmedName) {
        return { ok: false, reason: "empty_name" };
      }

      setCreating(true);
      setCreateError("");

      try {
        const existingKeys = views.map((item) => item.contract?.key).filter(Boolean);
        const nextKey = generateViewKey(trimmedName, existingKeys);

        let contract;

        if (copyCurrent && effectiveContract) {
          contract = cloneContract(effectiveContract);
          contract.key = nextKey;
          contract.name = trimmedName;
          contract.viewType = "table";
          contract.meta = {
            ...contract.meta,
            isSystem: false,
            isDefault: false,
            isPublished: false,
            viewId: null,
            draftRevision: null,
          };
        } else {
          const projectionSource = resolvedContract || effectiveContract;
          contract = normalizeObjectViewDefinition(null, {
            viewKey: nextKey,
            pageSize,
            projection: projectionSource?.projection
              ? {
                  visible_fields: projectionSource.projection.fieldKeys,
                  field_order: projectionSource.projection.fieldOrder,
                  title_field: projectionSource.projection.titleFieldKey,
                }
              : null,
          });
          contract.key = nextKey;
          contract.name = trimmedName;
          contract.viewType = "table";
          contract.query = {
            ...contract.query,
            filters: {
              ...contract.query.filters,
              conditions: [],
            },
            sort: {
              rules: [],
            },
          };
          contract.presentation = {
            table: {
              hiddenFieldKeys: [],
              columnOrder: [],
              columnWidths: {},
              density: "compact",
            },
          };
        }

        const payload = buildObjectViewPayload(contract, { mode: "create" });
        const created = await designerApi.createView(
          tenantId,
          objectTypeId,
          payload,
        );

        const createdContract = normalizeObjectViewDefinition(created, {
          viewKey: created?.key || nextKey,
          pageSize,
        });

        await refreshViews();
        selectView(createdContract.key);

        return { ok: true, contract: createdContract, raw: created };
      } catch (err) {
        const message = getApiErrorMessage(
          err,
          "Не удалось создать представление",
        );
        setCreateError(message);
        return { ok: false, reason: "api_error", message };
      } finally {
        setCreating(false);
      }
    },
    [
      tenantId,
      objectTypeId,
      views,
      pageSize,
      refreshViews,
      selectView,
    ],
  );

  const duplicateView = useCallback(
    async ({ effectiveContract }) => {
      if (!effectiveContract) {
        return { ok: false, reason: "missing_contract" };
      }

      const sourceName = String(effectiveContract.name || effectiveContract.key);
      const copyName = `${sourceName} копия`;

      return createView({
        name: copyName,
        copyCurrent: true,
        effectiveContract: cloneContract(effectiveContract),
        resolvedContract,
      });
    },
    [createView, resolvedContract],
  );

  return {
    views: fallbackViews,
    activeView,
    activeViewKey: resolvedContract.key,
    resolvedContract,
    viewType: resolvedContract.viewType || "table",
    loading,
    error,
    selectView,
    refreshViews,
    createView,
    duplicateView,
    creating,
    createError,
    hasPersistedViews: views.length > 0,
  };
}
