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
import {
  resolveObjectTabDisplayLabel,
  resolveObjectTabRouteKey,
} from "./services/resolveObjectTabDisplayLabel";
import { syncObjectViewContractWithCatalog } from "./services/syncProjectionWithCatalogFields";
import { buildOfficeTableRepresentationsPrefsScopeKey } from "./table/representations/objectTableRepresentationsPrefs";
import { getStoredCurrentUserId } from "./table/preferences/objectTableUserViewsStorage";
import {
  buildTableBaseStateContract,
  filterRepresentationSlotViews,
  isTableBaseStateKey,
  TABLE_BASE_STATE_KEY,
} from "./table/preferences/tableBaseState";
import ObjectTableView from "./table/ObjectTableView";

const UNSUPPORTED_VIEW_PLACEHOLDER_STYLE = {
  padding: 24,
  color: "#64748b",
  fontSize: 14,
  background: "#f8fafc",
  borderRadius: 12,
  border: "1px solid #e2e8f0",
};

/**
 * Universal Object View host — routes by viewType to adapters.
 */
export default function ObjectViewHost({
  tenantId,
  objectTypeId = null,
  objectTypeKey,
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
}) {
  const [publishedViewRaw, setPublishedViewRaw] = useState(null);
  const [runtimeCatalog, setRuntimeCatalog] = useState(null);

  const isOfficeRuntime = source === "portal";

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
    requestedViewKey: viewKey,
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

  const catalogSyncedResolvedContract = useMemo(
    () =>
      syncObjectViewContractWithCatalog(
        definitions.resolvedContract,
        runtimeCatalog,
        objectTypeKey,
        { publishedViewKey: definitions.publishedTableViewKey },
      ),
    [
      definitions.resolvedContract,
      runtimeCatalog,
      objectTypeKey,
      definitions.publishedTableViewKey,
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
      { publishedViewKey: definitions.publishedTableViewKey },
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
    persistUserViewOnPresentationChange: isOfficeRuntime,
  });

  const query = useObjectViewQuery({
    tenantId,
    objectTypeKey,
    viewKey: runtimeQueryViewKey,
    pageSize,
    effectiveContract: session.effectiveContract,
    sessionState: session.sessionState,
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

  const resolvedViewType = String(
    viewType || catalogSyncedResolvedContract?.viewType || definitions.viewType || "table",
  )
    .trim()
    .toLowerCase();

  const objectTabRouteKey = useMemo(
    () =>
      resolveObjectTabRouteKey({
        routeViewKey: viewKey,
        publishedTableViewKey: definitions.publishedTableViewKey,
      }),
    [viewKey, definitions.publishedTableViewKey],
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
    const viewId = definitions.resolvedContract?.meta?.viewId;
    const userViewId = definitions.resolvedContract?.meta?.userViewId;
    const isUserView = definitions.resolvedContract?.meta?.isUserView === true;
    const isSystem = definitions.resolvedContract?.meta?.isSystem === true;
    const isDefault = definitions.resolvedContract?.meta?.isDefault === true;

    if (isOfficeRuntime) {
      return {
        canRename: isUserView && Boolean(userViewId),
        canDuplicate: Boolean(tenantId && objectTypeKey),
        canDelete: isUserView && Boolean(userViewId),
        canSetDefault: !isDefault,
      };
    }

    return {
      canRename: allowDesignerApi && Boolean(viewId) && !isSystem,
      canDuplicate: allowDesignerApi && Boolean(tenantId && objectTypeId),
      canDelete: allowDesignerApi && Boolean(viewId) && !isSystem,
      canSetDefault: allowDesignerApi && Boolean(viewId) && !isDefault && !isSystem,
    };
  }, [
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

    const result = await persistence.saveView(session.effectiveContract);

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

  const handleDelete = useCallback(async () => {
    const userViewId = definitions.resolvedContract?.meta?.userViewId;
    const viewId = definitions.resolvedContract?.meta?.viewId;

    if (isOfficeRuntime) {
      if (!userViewId) {
        return false;
      }
    } else if (!viewId) {
      return false;
    }

    const deletedKey = definitions.activeViewKey;
    const result = isOfficeRuntime
      ? await persistence.deleteView(userViewId)
      : await persistence.deleteView(viewId);

    if (!result.ok) {
      return false;
    }

    const refreshed = await definitions.refreshViews();
    session.markSaved();

    const remaining = (refreshed || []).filter(
      (item) => String(item.contract?.key) !== String(deletedKey),
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

  const handleSetDefault = useCallback(async () => {
    const result = await persistence.setDefaultView(definitions.resolvedContract);

    if (!result.ok) {
      return false;
    }

    await definitions.refreshViews();

    if (allowDesignerApi) {
      await notifySchemaChanged();
    }

    return true;
  }, [persistence, definitions, notifySchemaChanged, allowDesignerApi]);

  const handleSelectQuickFilter = useCallback(
    (filterId) => {
      session.setActiveQuickFilter(filterId);
      query.resetOffset?.();
    },
    [session, query],
  );

  const handleSelectTableBaseState = useCallback(() => {
    if (isBaseStateActive) {
      return;
    }

    definitions.selectView(TABLE_BASE_STATE_KEY);
    session.setActiveQuickFilter?.(null);
    query.resetOffset?.();
  }, [definitions, isBaseStateActive, session, query]);

  const rootClassName = ["object-view-host", className]
    .filter(Boolean)
    .join(" ");

  if (resolvedViewType === "table") {
    return (
      <div
        className={rootClassName}
        data-object-view-host="table"
        data-runtime-source={source || undefined}
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
