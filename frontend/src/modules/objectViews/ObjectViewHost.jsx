import { useCallback, useEffect, useMemo, useState } from "react";

import {
  canAccessDesigner,
  getStoredCurrentUser,
} from "../designer/constants/designerRoles";
import useObjectViewDefinitions from "./hooks/useObjectViewDefinitions";
import useObjectViewPersistence from "./hooks/useObjectViewPersistence";
import useObjectViewQuery from "./hooks/useObjectViewQuery";
import useObjectViewSession from "./hooks/useObjectViewSession";
import { syncObjectViewContractWithCatalog } from "./services/syncProjectionWithCatalogFields";
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
}) {
  const [publishedViewRaw, setPublishedViewRaw] = useState(null);
  const [runtimeCatalog, setRuntimeCatalog] = useState(null);

  const allowDesignerApi = useMemo(() => {
    if (source === "portal") {
      return false;
    }

    return canAccessDesigner(getStoredCurrentUser());
  }, [source]);

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

  const catalogSyncedResolvedContract = useMemo(
    () =>
      syncObjectViewContractWithCatalog(
        definitions.resolvedContract,
        runtimeCatalog,
        objectTypeKey,
      ),
    [definitions.resolvedContract, runtimeCatalog, objectTypeKey],
  );

  const session = useObjectViewSession({
    resolvedContract: catalogSyncedResolvedContract,
    activeViewKey: definitions.activeViewKey,
  });

  const query = useObjectViewQuery({
    tenantId,
    objectTypeKey,
    viewKey: definitions.activeViewKey,
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

  const persistence = useObjectViewPersistence({ tenantId });

  const activeContract = session.effectiveContract || catalogSyncedResolvedContract;

  const resolvedViewType = String(
    viewType || catalogSyncedResolvedContract?.viewType || definitions.viewType || "table",
  )
    .trim()
    .toLowerCase();

  const activeAdapterLabel = String(
    definitions.resolvedContract?.name ||
      catalogSyncedResolvedContract?.name ||
      viewLabel ||
      "",
  ).trim();

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
      activeAdapterLabel,
      activeRepresentationKey: definitions.activeViewKey,
      activeRepresentationName,
    });
  }, [
    onActiveViewContextChange,
    objectTypeId,
    objectTypeKey,
    resolvedViewType,
    activeAdapterLabel,
    activeContract?.name,
    catalogSyncedResolvedContract?.name,
    definitions.resolvedContract?.name,
    viewLabel,
    definitions.activeViewKey,
  ]);

  const canSave = allowDesignerApi && Boolean(
    session.effectiveContract?.meta?.viewId ||
      catalogSyncedResolvedContract?.meta?.viewId,
  );

  const viewActions = useMemo(() => {
    const viewId = definitions.resolvedContract?.meta?.viewId;
    const isSystem = definitions.resolvedContract?.meta?.isSystem === true;
    const isDefault = definitions.resolvedContract?.meta?.isDefault === true;

    return {
      canRename: allowDesignerApi && Boolean(viewId) && !isSystem,
      canDuplicate: allowDesignerApi && Boolean(tenantId && objectTypeId),
      canDelete: allowDesignerApi && Boolean(viewId) && !isSystem,
      canSetDefault: allowDesignerApi && Boolean(viewId) && !isDefault && !isSystem,
    };
  }, [definitions.resolvedContract, tenantId, objectTypeId, allowDesignerApi]);

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

    return true;
  }, [canSave, session, persistence, definitions]);

  const handleCreateView = useCallback(
    async ({ name, copyCurrent }) => {
      return definitions.createView({
        name,
        copyCurrent,
        effectiveContract: session.effectiveContract,
        resolvedContract: catalogSyncedResolvedContract,
      });
    },
    [definitions, session.effectiveContract, catalogSyncedResolvedContract],
  );

  const handleRename = useCallback(
    async (newName) => {
      const result = await persistence.renameView(
        definitions.resolvedContract,
        newName,
      );

      if (!result.ok) {
        return false;
      }

      await definitions.refreshViews();
      return true;
    },
    [persistence, definitions],
  );

  const handleDuplicate = useCallback(async () => {
    const result = await definitions.duplicateView({
      effectiveContract: session.effectiveContract,
    });

    if (result?.ok) {
      session.markSaved();
    }

    return result?.ok === true;
  }, [definitions, session]);

  const handleDelete = useCallback(async () => {
    const viewId = definitions.resolvedContract?.meta?.viewId;

    if (!viewId) {
      return false;
    }

    const deletedKey = definitions.activeViewKey;
    const result = await persistence.deleteView(viewId);

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
    }

    return true;
  }, [definitions, persistence, session]);

  const handleSetDefault = useCallback(async () => {
    const result = await persistence.setDefaultView(definitions.resolvedContract);

    if (!result.ok) {
      return false;
    }

    await definitions.refreshViews();
    return true;
  }, [persistence, definitions]);

  const handleSelectQuickFilter = useCallback(
    (filterId) => {
      session.setActiveQuickFilter(filterId);
      query.resetOffset?.();
    },
    [session, query],
  );

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
          views={definitions.views}
          activeViewKey={definitions.activeViewKey}
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
