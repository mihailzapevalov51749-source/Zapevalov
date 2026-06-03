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
import { mergePublishedAndUserTableViews } from "../table/preferences/mergePublishedAndUserTableViews";
import {
  createUserTableView,
  getStoredCurrentUserId,
  loadUserTableViewsState,
} from "../table/preferences/objectTableUserViewsStorage";
import {
  isTableBaseStateKey,
  TABLE_BASE_STATE_KEY,
} from "../table/preferences/tableBaseState";

function resolvePublishedTableViewKey(rawViews) {
  const list = Array.isArray(rawViews) ? rawViews : [];
  const tableViews = list.filter((item) => item && isTableViewDefinition(item));

  const defaultTable = tableViews.find(
    (item) => String(item?.key) === "default_table",
  );
  if (defaultTable?.key) {
    return String(defaultTable.key);
  }

  const flaggedDefault = tableViews.find(
    (item) => item?.is_default === true || item?.isDefault === true,
  );
  if (flaggedDefault?.key) {
    return String(flaggedDefault.key);
  }

  if (tableViews[0]?.key) {
    return String(tableViews[0].key);
  }

  return "default_table";
}

function resolveInitialOfficeViewKey({ tenantId, objectTypeKey, requestedViewKey }) {
  const normalizedRequested = String(requestedViewKey || "").trim();

  if (
    normalizedRequested &&
    normalizedRequested !== "default_table" &&
    !isTableBaseStateKey(normalizedRequested)
  ) {
    return normalizedRequested;
  }

  const userState = loadUserTableViewsState({
    tenantId,
    userId: getStoredCurrentUserId(),
    objectTypeKey,
  });

  const defaultKey = userState.defaultViewKey;

  if (
    defaultKey &&
    userState.views.some((view) => view.key === defaultKey)
  ) {
    return defaultKey;
  }

  return TABLE_BASE_STATE_KEY;
}

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

  const isOfficeUserViews = source === "portal" && definitionSource === "published";

  const [views, setViews] = useState([]);
  const [tabLookupViews, setTabLookupViews] = useState([]);
  const [loading, setLoading] = useState(
    Boolean(tenantId && (objectTypeId || objectTypeKey)),
  );
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [publishedTableViewKey, setPublishedTableViewKey] = useState("default_table");
  const [selectedViewKey, setSelectedViewKey] = useState(() => {
    if (source === "portal" && objectTypeKey && tenantId) {
      return resolveInitialOfficeViewKey({
        tenantId,
        objectTypeKey,
        requestedViewKey,
      });
    }

    const normalized = String(requestedViewKey || "").trim();

    if (normalized === "default_table") {
      return TABLE_BASE_STATE_KEY;
    }

    return normalized || TABLE_BASE_STATE_KEY;
  });

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

      const publishedObjectTabViews = list
        .filter((item) => item && item.key && item.is_active !== false)
        .map((raw) => ({
          raw,
          contract: normalizeObjectViewDefinition(raw, {
            viewKey: raw?.key,
            pageSize,
            isPublished: definitionSource === "published",
          }),
        }));

      setTabLookupViews(publishedObjectTabViews);
      setPublishedTableViewKey(resolvePublishedTableViewKey(list));

      let tableViews = publishedObjectTabViews.filter((item) =>
        isTableViewDefinition(item.raw),
      );

      if (isOfficeUserViews && objectTypeKey) {
        const userState = loadUserTableViewsState({
          tenantId,
          userId: getStoredCurrentUserId(),
          objectTypeKey,
        });

        tableViews = mergePublishedAndUserTableViews(list, userState, { pageSize });
      }

      setViews(tableViews);
      return tableViews;
    } catch (err) {
      setViews([]);
      setTabLookupViews([]);
      setError(getApiErrorMessage(err, "Не удалось загрузить представления"));
      return [];
    } finally {
      setLoading(false);
    }
  }, [
    tenantId,
    objectTypeId,
    objectTypeKey,
    pageSize,
    definitionSource,
    isOfficeUserViews,
  ]);

  useEffect(() => {
    refreshViews();
  }, [refreshViews]);

  useEffect(() => {
    const normalized = String(requestedViewKey || "").trim();

    if (!normalized) {
      return;
    }

    if (normalized === "default_table") {
      setSelectedViewKey(TABLE_BASE_STATE_KEY);
      return;
    }

    setSelectedViewKey(normalized);
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
    if (isTableBaseStateKey(selectedViewKey)) {
      return null;
    }

    const lookupViews = tabLookupViews.length ? tabLookupViews : fallbackViews;

    return resolveActiveTableView(lookupViews, selectedViewKey);
  }, [tabLookupViews, fallbackViews, selectedViewKey]);

  const resolvedContract = useMemo(() => {
    if (isTableBaseStateKey(selectedViewKey)) {
      return normalizeObjectViewDefinition(null, {
        viewKey: TABLE_BASE_STATE_KEY,
        pageSize,
        projection: runtimeProjection,
      });
    }

    if (!activeView?.contract) {
      return normalizeObjectViewDefinition(null, {
        viewKey: TABLE_BASE_STATE_KEY,
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
  }, [activeView, pageSize, runtimeProjection, definitionSource, selectedViewKey]);

  const selectView = useCallback((viewKey) => {
    const normalized = String(viewKey || "").trim();
    if (!normalized) {
      return;
    }
    setSelectedViewKey(normalized);
  }, []);

  const createView = useCallback(
    async ({ name, copyCurrent = false, effectiveContract, resolvedContract }) => {
      const trimmedName = String(name || "").trim();
      if (!trimmedName) {
        return { ok: false, reason: "empty_name" };
      }

      if (!tenantId) {
        return { ok: false, reason: "missing_context" };
      }

      if (!isOfficeUserViews && !objectTypeId) {
        return { ok: false, reason: "missing_context" };
      }

      if (isOfficeUserViews && !objectTypeKey) {
        return { ok: false, reason: "missing_context" };
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
            isPublished: true,
            isUserView: true,
            viewId: null,
            userViewId: null,
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

        if (isOfficeUserViews) {
          contract.meta = {
            ...contract.meta,
            isUserView: true,
            isSystem: false,
            isPublished: true,
            viewId: null,
            userViewId: null,
          };

          const created = createUserTableView(
            {
              tenantId,
              userId: getStoredCurrentUserId(),
              objectTypeKey,
            },
            {
              name: trimmedName,
              contract,
              sourcePublishedKey: copyCurrent
                ? String(resolvedContract?.key || effectiveContract?.key || "")
                : null,
            },
          );

          if (!created.ok) {
            return created;
          }

          await refreshViews();
          selectView(created.contract.key);

          return {
            ok: true,
            contract: created.contract,
            raw: created.record,
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
      objectTypeKey,
      isOfficeUserViews,
      views,
      pageSize,
      refreshViews,
      selectView,
      resolvedContract,
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
    activeViewKey: isTableBaseStateKey(selectedViewKey)
      ? TABLE_BASE_STATE_KEY
      : resolvedContract.key,
    publishedTableViewKey,
    tabLookupViews,
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
