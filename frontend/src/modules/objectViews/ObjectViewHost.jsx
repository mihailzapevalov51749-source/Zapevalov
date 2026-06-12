import { useCallback, useEffect, useMemo, useState } from "react";

import {
  canAccessDesigner,
  getStoredCurrentUser,
} from "../designer/constants/designerRoles";
import useObjectViewDefinitions from "./hooks/useObjectViewDefinitions";
import useObjectTableUserViewPersistence from "./hooks/useObjectTableUserViewPersistence";
import useObjectViewPersistence from "./hooks/useObjectViewPersistence";
import useObjectViewQuery from "./hooks/useObjectViewQuery";
import useObjectViewSession from "./hooks/useObjectViewSession";
import useObjectRuntimeContextActions from "./hooks/useObjectRuntimeContextActions";
import {
  resolveObjectTabDisplayLabel,
  resolveObjectTabRouteKey,
} from "./services/resolveObjectTabDisplayLabel";
import { syncObjectViewContractWithCatalog } from "./services/syncProjectionWithCatalogFields";
import { normalizeObjectViewDefinition } from "./services/normalizeObjectViewDefinition";
import {
  resolveDesignerTableViewActions,
  resolveOfficeTableViewActions,
} from "./services/resolveOfficeTableViewActions";
import { buildOfficeTableRepresentationsPrefsScopeKey } from "./table/representations/objectTableRepresentationsPrefs";
import { getStoredCurrentUserId } from "./table/preferences/objectTableUserViewsStorage";
import {
  buildTableBaseStateContract,
  filterRepresentationSlotViews,
  isTableBaseStateKey,
  TABLE_BASE_STATE_KEY,
} from "./table/preferences/tableBaseState";
import { logPlanDebug } from "./plan/planViewDebug.js";
import { resolvePlanPresentationFromContract } from "./plan/planViewContract.js";
import ObjectTableView from "./table/ObjectTableView";
import ObjectPlanView, {
  PlanViewLoadingState,
} from "./plan/ObjectPlanView.jsx";
import ObjectQuickFormView from "./quickForm/ObjectQuickFormView.jsx";
import {
  isPlanContractMismatch,
  isPlanViewType,
  resolvePlanAdapterContract,
} from "./services/resolvePlanAdapterContract.js";
import { useObjectTypePreviewTab } from "../designer/context/ObjectTypePreviewTabContext.jsx";

const UNSUPPORTED_VIEW_PLACEHOLDER_STYLE = {
  padding: 24,
  color: "#64748b",
  fontSize: 14,
  background: "#f8fafc",
  borderRadius: 12,
  border: "1px solid #e2e8f0",
};

const OBJECT_VIEW_HOST_TABLE_LAYOUT_STYLE = {
  display: "flex",
  flexDirection: "column",
  flex: 1,
  minHeight: 0,
  minWidth: 0,
  width: "100%",
  overflow: "hidden",
};

/**
 * Universal Object View host — routes by viewType to adapters.
 */
export default function ObjectViewHost({
  tenantId,
  objectTypeId = null,
  objectTypeKey,
  /** Object tab key from Studio (e.g. default_table) — not user representation key */
  objectTabKey = null,
  /** Office: explicit user representation key from route/UI */
  requestedRepresentationKey = null,
  /** @deprecated Use objectTabKey — kept for Studio/runtime callers */
  viewKey = null,
  viewType = "table",
  mode = "data",
  source = null,
  pageSize = 20,
  className = "",
  viewLabel,
  minHeight = 320,
  showToolbar = true,
  showSelectionColumn = true,
  showRowNumberColumn = true,
  onActiveViewContextChange = null,
  onSchemaChanged = null,
  studioViewDraftSettingsJson = null,
  planPreviewEditor: planPreviewEditorProp = null,
  studioPreviewCatalog = null,
}) {
  const [publishedViewRaw, setPublishedViewRaw] = useState(null);
  const [runtimeCatalog, setRuntimeCatalog] = useState(null);
  const previewTabContext = useObjectTypePreviewTab();
  const planPreviewEditor =
    planPreviewEditorProp ??
    (mode === "studio-preview" ? previewTabContext?.planPreviewEditor ?? null : null);

  const isOfficeRuntime = source === "portal";
  const resolvedObjectTabKey = objectTabKey ?? viewKey;

  const allowDesignerApi = useMemo(() => {
    if (isOfficeRuntime) {
      return false;
    }

    return canAccessDesigner(getStoredCurrentUser());
  }, [isOfficeRuntime]);

  const officePrefsScopeKey = useMemo(() => {
    if (!isOfficeRuntime) {
      return null;
    }

    return buildOfficeTableRepresentationsPrefsScopeKey({
      tenantId,
      userId: getStoredCurrentUserId(),
      objectTypeKey,
    });
  }, [isOfficeRuntime, tenantId, objectTypeKey]);

  const definitions = useObjectViewDefinitions({
    tenantId,
    objectTypeId,
    objectTypeKey,
    requestedRepresentationKey: isOfficeRuntime ? requestedRepresentationKey : null,
    requestedViewKey: isOfficeRuntime ? null : resolvedObjectTabKey,
    requestedObjectTabKey: isOfficeRuntime ? resolvedObjectTabKey : null,
    pageSize,
    mode,
    source,
    allowDesignerApi,
    publishedViewRaw,
  });

  const isBaseStateActive = isTableBaseStateKey(definitions.activeViewKey);

  const representationSlotViews = useMemo(
    () =>
      filterRepresentationSlotViews(definitions.views, {
        officeMode: isOfficeRuntime,
      }),
    [definitions.views, isOfficeRuntime],
  );

  const runtimeQueryViewKey = useMemo(() => {
    if (isBaseStateActive) {
      return definitions.publishedTableViewKey || "default_table";
    }

    return definitions.activeViewKey;
  }, [
    isBaseStateActive,
    definitions.publishedTableViewKey,
    definitions.activeViewKey,
  ]);

  const effectiveQueryPageSize = Math.min(Math.max(Number(pageSize) || 20, 1), 200);

  const draftAwareResolvedContract = useMemo(() => {
    if (
      mode !== "studio-preview" ||
      !studioViewDraftSettingsJson ||
      !definitions.activeView?.raw
    ) {
      return definitions.resolvedContract;
    }

    const syntheticRaw = {
      ...definitions.activeView.raw,
      settings_json: studioViewDraftSettingsJson,
    };

    return normalizeObjectViewDefinition(syntheticRaw, {
      viewKey: definitions.activeView.contract?.key,
      pageSize: effectiveQueryPageSize,
    });
  }, [
    mode,
    studioViewDraftSettingsJson,
    definitions.activeView,
    definitions.resolvedContract,
    effectiveQueryPageSize,
  ]);

  const catalogSyncedResolvedContract = useMemo(
    () =>
      syncObjectViewContractWithCatalog(
        draftAwareResolvedContract,
        runtimeCatalog,
        objectTypeKey,
        {
          publishedViewKey: definitions.publishedTableViewKey,
          studioPreviewMode: mode === "studio-preview",
        },
      ),
    [
      draftAwareResolvedContract,
      runtimeCatalog,
      objectTypeKey,
      definitions.publishedTableViewKey,
      mode,
    ],
  );

  const resolvedContractForSession = useMemo(() => {
    if (!isBaseStateActive) {
      return catalogSyncedResolvedContract;
    }

    if (!runtimeCatalog) {
      return catalogSyncedResolvedContract;
    }

    return syncObjectViewContractWithCatalog(
      buildTableBaseStateContract(runtimeCatalog, objectTypeKey, pageSize, {
        publishedViewKey: definitions.publishedTableViewKey,
      }),
      runtimeCatalog,
      objectTypeKey,
      {
        publishedViewKey: definitions.publishedTableViewKey,
        studioPreviewMode: mode === "studio-preview",
      },
    );
  }, [
    isBaseStateActive,
    catalogSyncedResolvedContract,
    runtimeCatalog,
    objectTypeKey,
    pageSize,
    definitions.publishedTableViewKey,
  ]);

  const presentationPrefsScope = useMemo(
    () => ({
      tenantId,
      userId: getStoredCurrentUserId(),
      objectTypeKey,
    }),
    [tenantId, objectTypeKey],
  );

  const session = useObjectViewSession({
    resolvedContract: resolvedContractForSession,
    activeViewKey: definitions.activeViewKey,
    presentationPrefsScope,
    persistUserViewOnPresentationChange: false,
    catalog: runtimeCatalog,
    objectTypeKey,
  });

  useEffect(() => {
    if (!session.isDirty) {
      return undefined;
    }

    function handleBeforeUnload(event) {
      event.preventDefault();
      event.returnValue = "";
    }

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [session.isDirty]);

  const resolvedViewTypeForQuery = String(
    viewType ||
      definitions.resolvedContract?.viewType ||
      definitions.viewType ||
      "table",
  )
    .trim()
    .toLowerCase();

  const query = useObjectViewQuery({
    tenantId,
    objectTypeKey,
    viewKey: runtimeQueryViewKey,
    pageSize: effectiveQueryPageSize,
    effectiveContract: session.effectiveContract,
    sessionState: session.sessionState,
    previewMode: mode === "studio-preview",
    previewCatalogOverride: mode === "studio-preview" ? studioPreviewCatalog : null,
  });

  useEffect(() => {
    if (query.catalog) {
      setRuntimeCatalog(query.catalog);
    }
  }, [query.catalog]);

  useEffect(() => {
    if (query.publishedViewRaw) {
      setPublishedViewRaw(query.publishedViewRaw);
    }
  }, [query.publishedViewRaw]);

  const studioPersistence = useObjectViewPersistence({ tenantId });
  const officePersistence = useObjectTableUserViewPersistence({
    tenantId,
    objectTypeKey,
    userId: getStoredCurrentUserId(),
  });
  const persistence = isOfficeRuntime ? officePersistence : studioPersistence;

  const activeContract = session.effectiveContract || resolvedContractForSession;

  const planAdapterResolution = useMemo(
    () =>
      resolvePlanAdapterContract({
        viewType,
        objectTabKey: resolvedObjectTabKey,
        contract: catalogSyncedResolvedContract,
        tabLookupViews: definitions.tabLookupViews,
        runtimeCatalog,
        objectTypeKey,
        publishedTableViewKey: definitions.publishedTableViewKey,
        studioPreviewMode: mode === "studio-preview",
        activeViewKey: definitions.activeViewKey,
      }),
    [
      viewType,
      resolvedObjectTabKey,
      catalogSyncedResolvedContract,
      definitions.tabLookupViews,
      definitions.publishedTableViewKey,
      definitions.activeViewKey,
      runtimeCatalog,
      objectTypeKey,
      mode,
    ],
  );

  const planAdapterContract = planAdapterResolution.contract;

  useEffect(() => {
    if (!isOfficeRuntime || !isPlanViewType(viewType) || definitions.loading) {
      return;
    }

    const planPresentation = resolvePlanPresentationFromContract(planAdapterContract);

    logPlanDebug("PLAN_OFFICE_CONTRACT", {
      objectTypeKey,
      objectTabKey: resolvedObjectTabKey,
      viewType,
      selectedViewKey: definitions.activeViewKey,
      resolvedContractKey: planAdapterContract?.key ?? null,
      resolvedContractViewType: planAdapterContract?.viewType ?? null,
      hierarchyRelationKey: planPresentation.hierarchyRelationKey,
      recovered: planAdapterResolution.recovered,
      blocked: planAdapterResolution.blocked,
    });

    if (
      import.meta.env.DEV &&
      isPlanContractMismatch({
        viewType,
        objectTabKey: resolvedObjectTabKey,
        contract: catalogSyncedResolvedContract,
        activeViewKey: definitions.activeViewKey,
      }) &&
      !planAdapterResolution.recovered
    ) {
      console.warn(
        "[ObjectViewHost] Blocked Plan render: viewType=plan but resolvedContract is not a plan view",
        {
          objectTypeKey,
          objectTabKey: resolvedObjectTabKey,
          selectedViewKey: definitions.activeViewKey,
          resolvedContractKey: catalogSyncedResolvedContract?.key,
          resolvedContractViewType: catalogSyncedResolvedContract?.viewType,
        },
      );
    }
  }, [
    isOfficeRuntime,
    viewType,
    definitions.loading,
    definitions.activeViewKey,
    objectTypeKey,
    resolvedObjectTabKey,
    planAdapterContract,
    catalogSyncedResolvedContract,
    planAdapterResolution.recovered,
    planAdapterResolution.blocked,
  ]);

  const resolvedViewType = useMemo(() => {
    if (isPlanViewType(viewType)) {
      return "plan";
    }

    return String(
      viewType ||
        catalogSyncedResolvedContract?.viewType ||
        definitions.viewType ||
        "table",
    )
      .trim()
      .toLowerCase();
  }, [
    viewType,
    catalogSyncedResolvedContract?.viewType,
    definitions.viewType,
  ]);

  const isPlanViewContractPending =
    isPlanViewType(viewType) && definitions.loading;

  const objectTabRouteKey = useMemo(
    () =>
      resolveObjectTabRouteKey({
        routeViewKey: resolvedObjectTabKey,
        publishedTableViewKey: definitions.publishedTableViewKey,
      }),
    [resolvedObjectTabKey, definitions.publishedTableViewKey],
  );

  const activeObjectTabLabel = useMemo(
    () =>
      resolveObjectTabDisplayLabel({
        objectTabKey: objectTabRouteKey,
        catalog: runtimeCatalog,
        objectTypeKey,
        tabLookupViews: definitions.tabLookupViews,
        fallbackLabel: viewLabel,
      }),
    [
      objectTabRouteKey,
      runtimeCatalog,
      objectTypeKey,
      definitions.tabLookupViews,
      viewLabel,
    ],
  );

  useObjectRuntimeContextActions({
    tenantId,
    objectTypeKey,
    objectName: activeObjectTabLabel || viewLabel || "Объект",
    query,
    resolvedContract: catalogSyncedResolvedContract,
    effectiveContract: session.effectiveContract,
    viewKey: definitions.activeViewKey,
    publishedTableViewKey: definitions.publishedTableViewKey,
    isTableBaseStateActive: isBaseStateActive,
    previewMode: mode === "studio-preview",
    enabled: Boolean(objectTypeKey) && !definitions.loading,
    sessionActiveQuickFilterId: session.activeQuickFilterId,
  });

  useEffect(() => {
    if (typeof onActiveViewContextChange !== "function") {
      return;
    }

    const activeRepresentationName = String(
      activeContract?.name ||
        catalogSyncedResolvedContract?.name ||
        definitions.resolvedContract?.name ||
        "",
    ).trim();

    onActiveViewContextChange({
      objectTypeId,
      objectTypeKey,
      activeAdapterType: resolvedViewType,
      activeAdapterLabel: activeObjectTabLabel,
      activeObjectTabKey: objectTabRouteKey,
      activeRepresentationKey: definitions.activeViewKey,
      activeRepresentationName,
    });
  }, [
    onActiveViewContextChange,
    objectTypeId,
    objectTypeKey,
    resolvedViewType,
    activeObjectTabLabel,
    objectTabRouteKey,
    activeContract?.name,
    catalogSyncedResolvedContract?.name,
    definitions.resolvedContract?.name,
    definitions.activeViewKey,
  ]);

  const activeMeta =
    session.effectiveContract?.meta || catalogSyncedResolvedContract?.meta;

  const canSave = isOfficeRuntime
    ? activeMeta?.isUserView === true
    : allowDesignerApi &&
      Boolean(activeMeta?.viewId);

  const viewActions = useMemo(() => {
    const contract = session.effectiveContract || definitions.resolvedContract;

    if (isOfficeRuntime) {
      return resolveOfficeTableViewActions(contract, {
        tenantId,
        objectTypeKey,
      });
    }

    return resolveDesignerTableViewActions(contract, {
      allowDesignerApi,
      tenantId,
      objectTypeId,
      objectTypeKey,
    });
  }, [
    session.effectiveContract,
    definitions.resolvedContract,
    tenantId,
    objectTypeId,
    objectTypeKey,
    allowDesignerApi,
    isOfficeRuntime,
  ]);

  const notifySchemaChanged = useCallback(async () => {
    try {
      await onSchemaChanged?.();
    } catch (err) {
      console.warn(
        "[ObjectViewHost] Failed to reload object type after view change",
        err,
      );
    }
  }, [onSchemaChanged]);

  const handleSave = useCallback(async () => {
    if (!canSave || !session.effectiveContract) {
      return false;
    }

    const savedQuickFilterId =
      session.effectiveContract.query?.filters?.defaultQuickFilterId ?? null;

    const result = await persistence.saveView(session.effectiveContract, {
      columnWidthsBaseline:
        catalogSyncedResolvedContract?.presentation?.table?.columnWidths,
    });

    if (!result.ok) {
      return false;
    }

    await definitions.refreshViews();
    session.markSaved();

    if (savedQuickFilterId) {
      session.setActiveQuickFilter(savedQuickFilterId);
    }

    if (allowDesignerApi) {
      await notifySchemaChanged();
    }

    return true;
  }, [
    canSave,
    session,
    persistence,
    definitions,
    notifySchemaChanged,
    allowDesignerApi,
  ]);

  const handleCreateView = useCallback(
    async ({ name, copyCurrent }) => {
      const result = await definitions.createView({
        name,
        copyCurrent,
        effectiveContract: session.effectiveContract,
        resolvedContract: catalogSyncedResolvedContract,
      });

      if (result?.ok && allowDesignerApi) {
        await notifySchemaChanged();
      }

      return result;
    },
    [
      definitions,
      session.effectiveContract,
      catalogSyncedResolvedContract,
      notifySchemaChanged,
      allowDesignerApi,
    ],
  );

  const handleRename = useCallback(
    async (newName, representationContract = null) => {
      const contract = representationContract || definitions.resolvedContract;
      const result = await persistence.renameView(contract, newName);

      if (!result.ok) {
        return false;
      }

      await definitions.refreshViews();

      if (allowDesignerApi) {
        await notifySchemaChanged();
      }

      return true;
    },
    [persistence, definitions, notifySchemaChanged, allowDesignerApi],
  );

  const handleDuplicate = useCallback(async () => {
    const result = await definitions.duplicateView({
      effectiveContract: session.effectiveContract,
    });

    if (result?.ok) {
      session.markSaved();

      if (allowDesignerApi) {
        await notifySchemaChanged();
      }
    }

    return result?.ok === true;
  }, [definitions, session, notifySchemaChanged, allowDesignerApi]);

  const handleDelete = useCallback(async (representationContract = null) => {
    const actionContract =
      representationContract ||
      session.effectiveContract ||
      definitions.resolvedContract;
    const userViewId = actionContract?.meta?.userViewId;
    const viewId = actionContract?.meta?.viewId;

    if (isOfficeRuntime) {
      if (!userViewId) {
        return false;
      }
    } else if (!viewId) {
      return false;
    }

    const deletedKey = String(actionContract?.key || "").trim();
    const isDeletingActiveView =
      deletedKey === String(definitions.activeViewKey || "").trim();

    const result = isOfficeRuntime
      ? await persistence.deleteView(userViewId)
      : await persistence.deleteView(viewId);

    if (!result.ok) {
      return false;
    }

    const refreshed = await definitions.refreshViews();

    if (!isDeletingActiveView) {
      if (allowDesignerApi) {
        await notifySchemaChanged();
      }

      return true;
    }

    session.markSaved();

    const remaining = (refreshed || []).filter(
      (item) => String(item.contract?.key) !== deletedKey,
    );

    const nextView =
      remaining.find((item) => item.contract?.meta?.isDefault) || remaining[0];

    if (nextView?.contract?.key) {
      definitions.selectView(nextView.contract.key);
    } else {
      definitions.selectView(TABLE_BASE_STATE_KEY);
    }

    if (allowDesignerApi) {
      await notifySchemaChanged();
    }

    return true;
  }, [
    definitions,
    persistence,
    session,
    notifySchemaChanged,
    allowDesignerApi,
    isOfficeRuntime,
  ]);

  const handleSetDefault = useCallback(
    async (contract) => {
      const target = contract || definitions.resolvedContract;

      if (!target || target.meta?.isDefault === true) {
        return true;
      }

      const result = await persistence.setDefaultView(target);

      if (!result.ok) {
        return false;
      }

      await definitions.refreshViews();

      if (target.key) {
        definitions.selectView(target.key);
      }

      if (allowDesignerApi) {
        await notifySchemaChanged();
      }

      return true;
    },
    [persistence, definitions, notifySchemaChanged, allowDesignerApi],
  );

  const handleSelectQuickFilter = useCallback(
    (filterId) => {
      const normalized =
        filterId == null || filterId === "" ? null : String(filterId);
      const current = session.activeQuickFilterId;

      session.setActiveQuickFilter(
        normalized && current === normalized ? null : normalized,
      );
      query.resetOffset?.();
    },
    [session, query],
  );

  const handleSelectTableBaseState = useCallback(() => {
    session.setActiveQuickFilter?.(null);

    if (isBaseStateActive) {
      query.resetOffset?.();
      return;
    }

    definitions.selectView(TABLE_BASE_STATE_KEY);
    query.resetOffset?.();
  }, [definitions, isBaseStateActive, session, query]);

  const rootClassName = ["object-view-host", className]
    .filter(Boolean)
    .join(" ");

  if (resolvedViewType === "plan") {
    if (isPlanViewContractPending) {
      return (
        <div
          className={rootClassName}
          data-object-view-host="plan"
          data-runtime-source={source || undefined}
          style={OBJECT_VIEW_HOST_TABLE_LAYOUT_STYLE}
        >
          <PlanViewLoadingState minHeight={minHeight} />
        </div>
      );
    }

    return (
      <div
        className={rootClassName}
        data-object-view-host="plan"
        data-runtime-source={source || undefined}
        style={OBJECT_VIEW_HOST_TABLE_LAYOUT_STYLE}
      >
        <ObjectPlanView
          tenantId={tenantId}
          objectTypeId={objectTypeId}
          mode={mode}
          query={query}
          resolvedContract={planAdapterContract}
          objectTypeKey={objectTypeKey}
          minHeight={minHeight}
          planPreviewEditor={planPreviewEditor}
        />
      </div>
    );
  }

  if (resolvedViewType === "quick_form") {
    const previewCatalog =
      mode === "studio-preview" && studioPreviewCatalog
        ? studioPreviewCatalog
        : runtimeCatalog;

    return (
      <div
        className={rootClassName}
        data-object-view-host="quick_form"
        data-runtime-source={source || undefined}
        style={OBJECT_VIEW_HOST_TABLE_LAYOUT_STYLE}
      >
        <ObjectQuickFormView
          tenantId={tenantId}
          objectTypeKey={objectTypeKey}
          catalog={previewCatalog}
          resolvedContract={catalogSyncedResolvedContract}
          mode={mode}
          minHeight={minHeight}
        />
      </div>
    );
  }

  if (resolvedViewType === "table") {
    return (
      <div
        className={rootClassName}
        data-object-view-host="table"
        data-runtime-source={source || undefined}
        style={OBJECT_VIEW_HOST_TABLE_LAYOUT_STYLE}
      >
        <ObjectTableView
          tenantId={tenantId}
          mode={mode}
          query={query}
          views={representationSlotViews}
          activeViewKey={definitions.activeViewKey}
          publishedTableViewKey={definitions.publishedTableViewKey}
          isTableBaseStateActive={isBaseStateActive}
          onSelectTableBaseState={handleSelectTableBaseState}
          activeViewContract={activeContract}
          onSelectView={definitions.selectView}
          resolvedContract={catalogSyncedResolvedContract}
          effectiveContract={session.effectiveContract}
          sessionApi={session}
          persistenceApi={persistence}
          onSave={handleSave}
          canSave={canSave}
          onCreateView={handleCreateView}
          creating={definitions.creating}
          createError={definitions.createError}
          viewActions={viewActions}
          onRename={handleRename}
          onDuplicate={handleDuplicate}
          onDelete={handleDelete}
          onSetDefault={handleSetDefault}
          onSelectQuickFilter={handleSelectQuickFilter}
          objectTypeKey={objectTypeKey}
          viewLabel={viewLabel}
          minHeight={minHeight}
          showToolbar={showToolbar}
          showSelectionColumn={showSelectionColumn}
          showRowNumberColumn={showRowNumberColumn}
          definitionsLoading={definitions.loading}
          definitionsError={definitions.error}
          onRefreshViews={definitions.refreshViews}
          allowDesignerPersistence={allowDesignerApi}
          allowOfficeUserPersistence={isOfficeRuntime}
          representationsPrefsScopeKey={officePrefsScopeKey}
          viewDefinitionsForCardLayout={definitions.views}
          onCardLayoutSaved={allowDesignerApi ? notifySchemaChanged : null}
        />
      </div>
    );
  }

  return (
    <div className={rootClassName} data-object-view-host="unsupported">
      <div style={UNSUPPORTED_VIEW_PLACEHOLDER_STYLE}>
        Тип представления <strong>{resolvedViewType}</strong> пока не
        поддерживается.
      </div>
    </div>
  );
}
