import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import * as designerApi from "../../designer/api/designerApi";
import { getPublishedCatalog } from "../../designer/api/runtimeCatalogApi";
import { getApiErrorMessage } from "../../designer/api/platformApiClient";
import { buildObjectViewPayload } from "../services/buildObjectViewPayload";
import { generateViewKey } from "../services/generateViewKey";
import { logPlanDebug } from "../plan/planViewDebug.js";
import { normalizeObjectViewDefinition } from "../services/normalizeObjectViewDefinition";
import { normalizePresentationCard } from "../services/contractGuards";
import { hasUsableCardLayout } from "../../objectEntities/services/resolveEntityCardPresentationLayout";
import {
  isTableViewDefinition,
  resolveActiveObjectTabView,
  resolveActiveTableView,
} from "../services/resolveActiveView";
import { mergePublishedAndUserTableViews } from "../table/preferences/mergePublishedAndUserTableViews";
import {
  createUserTableViewRemote,
  fetchUserTableViewsState,
} from "../table/preferences/objectTableUserViewsRemote";
import {
  getStoredCurrentUserId,
  reapplyUserViewMeta,
} from "../table/preferences/objectTableUserViewsStorage";
import { resolveOfficeDefaultViewKey } from "../table/preferences/resolveOfficeDefaultView";
import {
  canApplyOfficeDefaultUserView,
  hasExplicitOfficeRepresentationRequest,
  isFixedObjectTabSelection,
  resolveInitialOfficeSelectedViewKey,
  resolveOfficeObjectTabSelectionKey,
  shouldApplyRequestedRepresentationSelection,
} from "../services/objectTabKeys";
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

function hasExplicitDesignerRequestedViewKey(requestedViewKey) {
  const normalizedRequested = String(requestedViewKey || "").trim();

  return Boolean(
    normalizedRequested &&
      normalizedRequested !== "default_table" &&
      !isTableBaseStateKey(normalizedRequested),
  );
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
  /** @deprecated Studio/designer only — not Office user representation key */
  requestedViewKey = null,
  /** Office: explicit user representation key from route/UI (never object tab key) */
  requestedRepresentationKey = null,
  /** Office/Portal: published object tab key (e.g. architecture plan tab) */
  requestedObjectTabKey = null,
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
  const [officeUserViewState, setOfficeUserViewState] = useState(null);
  const userManuallySelectedViewRef = useRef(
    isOfficeUserViews
      ? hasExplicitOfficeRepresentationRequest(requestedRepresentationKey) ||
          isFixedObjectTabSelection(requestedObjectTabKey)
      : hasExplicitDesignerRequestedViewKey(requestedViewKey),
  );
  const initialDefaultAppliedRef = useRef(false);
  const [selectedViewKey, setSelectedViewKey] = useState(() => {
    if (isOfficeUserViews && objectTypeKey && tenantId) {
      if (hasExplicitOfficeRepresentationRequest(requestedRepresentationKey)) {
        return resolveInitialOfficeSelectedViewKey({
          requestedRepresentationKey,
        });
      }

      return resolveOfficeObjectTabSelectionKey(requestedObjectTabKey);
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
        const catalog = await getPublishedCatalog(tenantId, { cacheBust: true });
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

      for (const item of publishedObjectTabViews) {
        const raw = item.raw;
        if (String(raw?.view_type || "").trim().toLowerCase() !== "plan") {
          continue;
        }

        logPlanDebug("PLAN_PUBLISH_CONTRACT", {
          view_type: raw?.view_type,
          view_key: raw?.key,
          objectView_plan: raw?.settings_json?.objectView?.presentation?.plan ?? null,
          hierarchyRelationKey:
            item.contract?.presentation?.plan?.hierarchyRelationKey ?? null,
        });
      }

      let tableViews = publishedObjectTabViews.filter((item) =>
        isTableViewDefinition(item.raw),
      );

      if (isOfficeUserViews && objectTypeKey) {
        const userState = await fetchUserTableViewsState(
          {
            tenantId,
            userId: getStoredCurrentUserId(),
            objectTypeKey,
          },
          { pageSize },
        );

        setOfficeUserViewState(userState);
        tableViews = mergePublishedAndUserTableViews(list, userState, { pageSize });
      } else {
        setOfficeUserViewState(null);
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
    if (isOfficeUserViews) {
      return;
    }

    const normalized = String(requestedViewKey || "").trim();

    if (!normalized) {
      return;
    }

    if (normalized === "default_table") {
      userManuallySelectedViewRef.current = true;
      setSelectedViewKey(TABLE_BASE_STATE_KEY);
      return;
    }

    userManuallySelectedViewRef.current = true;
    setSelectedViewKey(normalized);
  }, [requestedViewKey, isOfficeUserViews]);

  useEffect(() => {
    if (!isOfficeUserViews) {
      return;
    }

    if (hasExplicitOfficeRepresentationRequest(requestedRepresentationKey)) {
      return;
    }

    const nextTabSelection = resolveOfficeObjectTabSelectionKey(requestedObjectTabKey);

    setSelectedViewKey((current) => {
      if (current === nextTabSelection) {
        return current;
      }

      userManuallySelectedViewRef.current = !isTableBaseStateKey(nextTabSelection);
      return nextTabSelection;
    });
  }, [isOfficeUserViews, requestedObjectTabKey, requestedRepresentationKey]);

  useEffect(() => {
    if (
      !shouldApplyRequestedRepresentationSelection({
        requestedRepresentationKey,
        isOfficeUserViews,
      })
    ) {
      return;
    }

    const normalized = String(requestedRepresentationKey || "").trim();

    userManuallySelectedViewRef.current = true;
    setSelectedViewKey(
      isTableBaseStateKey(normalized) ? TABLE_BASE_STATE_KEY : normalized,
    );
  }, [requestedRepresentationKey, isOfficeUserViews]);

  useEffect(() => {
    const defaultKey = resolveOfficeDefaultViewKey(officeUserViewState);

    if (
      !canApplyOfficeDefaultUserView({
        isOfficeUserViews,
        loading,
        userManuallySelected: userManuallySelectedViewRef.current,
        initialDefaultApplied: initialDefaultAppliedRef.current,
        defaultKey,
        requestedObjectTabKey,
      })
    ) {
      if (
        isOfficeUserViews &&
        !loading &&
        !userManuallySelectedViewRef.current &&
        !initialDefaultAppliedRef.current &&
        officeUserViewState != null &&
        !defaultKey
      ) {
        initialDefaultAppliedRef.current = true;
      }

      return;
    }

    initialDefaultAppliedRef.current = true;
    setSelectedViewKey(defaultKey);
  }, [isOfficeUserViews, loading, officeUserViewState, requestedObjectTabKey]);

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

    const tabLookupSource = tabLookupViews.length ? tabLookupViews : fallbackViews;
    const tabMatch = resolveActiveObjectTabView(tabLookupViews, selectedViewKey);

    if (tabMatch) {
      return tabMatch;
    }

    if (isFixedObjectTabSelection(selectedViewKey)) {
      return null;
    }

    // Office user table representations live in merged `views`, not only tabLookupViews.
    const lookupViews = fallbackViews.length ? fallbackViews : tabLookupSource;

    return resolveActiveTableView(lookupViews, selectedViewKey);
  }, [fallbackViews, tabLookupViews, selectedViewKey]);

  const resolvedContract = useMemo(() => {
    if (isTableBaseStateKey(selectedViewKey)) {
      const baseContract = normalizeObjectViewDefinition(null, {
        viewKey: TABLE_BASE_STATE_KEY,
        pageSize,
        projection: runtimeProjection,
        isPublished: definitionSource === "published",
      });

      const publishedKey = String(publishedTableViewKey || "default_table").trim();
      const lookupViews = tabLookupViews.length ? tabLookupViews : fallbackViews;
      const publishedTableView = lookupViews.find(
        (item) => String(item?.contract?.key || "").trim() === publishedKey,
      );
      const publishedCard = publishedTableView?.contract?.presentation?.card;

      if (!hasUsableCardLayout(publishedCard)) {
        return baseContract;
      }

      return {
        ...baseContract,
        presentation: {
          ...baseContract.presentation,
          card: normalizePresentationCard(publishedCard),
        },
      };
    }

    if (!activeView?.contract) {
      if (isFixedObjectTabSelection(selectedViewKey)) {
        const fixedTabMatch = resolveActiveObjectTabView(
          tabLookupViews,
          selectedViewKey,
        );

        if (fixedTabMatch?.contract) {
          return fixedTabMatch.contract;
        }
      }

      return normalizeObjectViewDefinition(null, {
        viewKey: TABLE_BASE_STATE_KEY,
        pageSize,
        projection: runtimeProjection,
      });
    }

    if (activeView.contract?.meta?.isUserView === true) {
      return activeView.contract;
    }

    if (runtimeProjection && definitionSource === "published") {
      return reapplyUserViewMeta(
        normalizeObjectViewDefinition(activeView.raw, {
          viewKey: activeView.contract.key,
          pageSize,
          projection: runtimeProjection,
          isPublished: true,
        }),
        activeView.contract,
      );
    }

    if (runtimeProjection && !activeView.raw?.settings_json?.objectView) {
      return reapplyUserViewMeta(
        normalizeObjectViewDefinition(activeView.raw, {
          viewKey: activeView.contract.key,
          pageSize,
          projection: runtimeProjection,
        }),
        activeView.contract,
      );
    }

    return activeView.contract;
  }, [
    activeView,
    pageSize,
    runtimeProjection,
    definitionSource,
    selectedViewKey,
    publishedTableViewKey,
    tabLookupViews,
    fallbackViews,
  ]);

  const selectView = useCallback((viewKey) => {
    const normalized = String(viewKey || "").trim();
    if (!normalized) {
      return;
    }
    userManuallySelectedViewRef.current = true;
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

          const created = await createUserTableViewRemote(
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
            { pageSize },
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
      : String(selectedViewKey || resolvedContract?.key || "").trim() ||
        TABLE_BASE_STATE_KEY,
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
