import { useCallback, useMemo, useRef, useState } from "react";

import { mergeEffectiveContract } from "../services/mergeEffectiveContract";

import { ObjectEntityCardModal } from "../../objectEntities";
import useObjectEntityCard from "../../objectEntities/hooks/useObjectEntityCard";
import ObjectCreateEntityDialog from "../entity/ObjectCreateEntityDialog";
import useObjectViewCreateEntity from "../hooks/useObjectViewCreateEntity";
import { getColumnPresentationKey } from "../services/columnPresentationUtils";
import { findCatalogObjectType } from "./services/adapters/ObjectTypeTableAdapter";

import {
  ViewEnginePagination,
  ViewEngineTable,
} from "../../../shared/viewEngine/table";

import useObjectViewDirtyGuard from "../hooks/useObjectViewDirtyGuard";
import ObjectTableColumnVisibilityPanel from "./components/ObjectTableColumnVisibilityPanel";
import ObjectTableFiltersModal from "./components/ObjectTableFiltersModal";
import ObjectTableCreateQuickFilterDialog from "./components/ObjectTableCreateQuickFilterDialog";
import ObjectTableViewsBar from "./components/ObjectTableViewsBar";
import useObjectTableColumns from "./hooks/useObjectTableColumns";
import useObjectTableSort from "./hooks/useObjectTableSort";

import "../../../shared/viewEngine/viewEngineTable.css";

const DEFAULT_VIEW_LABEL = "Таблица";

/**
 * Table view adapter — wires query + contracts → ViewEngineTable.
 */
export default function ObjectTableView({
  tenantId = null,
  mode = "data",
  query,
  views = [],
  activeViewKey,
  activeViewContract,
  onSelectView,
  resolvedContract,
  effectiveContract,
  sessionApi,
  persistenceApi,
  onSave,
  canSave = false,
  onCreateView,
  creating = false,
  createError = "",
  viewActions = {},
  onRename,
  onDuplicate,
  onDelete,
  onSetDefault,
  onSelectQuickFilter,
  objectTypeKey,
  viewLabel = DEFAULT_VIEW_LABEL,
  minHeight = 320,
  showToolbar = true,
  showSelectionColumn = true,
  showRowNumberColumn = true,
  definitionsLoading = false,
  definitionsError = "",
  onRefreshViews = null,
  allowDesignerPersistence = false,
}) {
  void viewLabel;

  const createEntityEnabled =
    mode !== "studio-preview" && Boolean(tenantId && objectTypeKey && query.catalog);

  const handleEntityCreated = useCallback(async () => {
    query.resetOffset?.();
    await query.reload?.();
  }, [query]);

  const handleEntitySaved = useCallback(async () => {
    await query.reload?.();
  }, [query]);

  const entityCardEnabled =
    mode !== "studio-preview" && Boolean(tenantId && objectTypeKey);

  const titleFieldKey =
    effectiveContract?.projection?.titleFieldKey ||
    resolvedContract?.projection?.titleFieldKey ||
    null;

  const entityCard = useObjectEntityCard({
    tenantId,
    objectTypeKey,
    catalog: query.catalog,
    listItems: query.listResult?.items || [],
    titleFieldKey,
    enabled: entityCardEnabled,
    onSaved: handleEntitySaved,
    mode: "edit",
  });

  const tableSurfaceRef = useRef(null);

  const createEntity = useObjectViewCreateEntity({
    tenantId,
    objectTypeKey,
    catalog: query.catalog,
    enabled: createEntityEnabled,
    onCreated: handleEntityCreated,
  });

  const objectTypeLabel = useMemo(() => {
    const objectType = findCatalogObjectType(query.catalog, objectTypeKey);
    return String(objectType?.name || objectTypeKey || "");
  }, [query.catalog, objectTypeKey]);

  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [isColumnsPanelOpen, setIsColumnsPanelOpen] = useState(false);
  const [isQuickFilterDialogOpen, setIsQuickFilterDialogOpen] = useState(false);
  const [cardSettingsSaving, setCardSettingsSaving] = useState(false);

  const canConfigureEntityCard =
    entityCardEnabled &&
    allowDesignerPersistence &&
    Boolean(effectiveContract?.meta?.viewId) &&
    mode !== "studio-preview";

  const handleSaveCardLayout = useCallback(
    async (layout) => {
      if (!sessionApi || !persistenceApi || !resolvedContract) {
        return false;
      }

      setCardSettingsSaving(true);

      try {
        sessionApi.setCardLayout(layout);

        const contractToSave = mergeEffectiveContract(resolvedContract, {
          ...sessionApi.sessionDelta,
          cardLayout: layout,
        });

        const result = await persistenceApi.saveView(contractToSave);

        if (!result?.ok) {
          return false;
        }

        sessionApi.markSaved();
        await onRefreshViews?.();
        return true;
      } finally {
        setCardSettingsSaving(false);
      }
    },
    [sessionApi, persistenceApi, resolvedContract, onRefreshViews],
  );

  const dirtyGuard = useObjectViewDirtyGuard({
    isDirty: sessionApi?.isDirty,
    onSave,
    onReset: sessionApi?.resetSession,
    saving: persistenceApi?.saving,
  });

  const contractForColumns = effectiveContract || resolvedContract;

  const tableData = useObjectTableColumns({
    query,
    contract: contractForColumns,
    objectTypeKey,
    viewKey: activeViewKey,
  });

  const { toggleColumnSort } = useObjectTableSort({
    effectiveContract,
    patchSession: sessionApi?.patchSession,
  });

  const handleToggleSort = (columnKey) => {
    toggleColumnSort(columnKey);
    query.resetOffset?.();
  };

  const rowNumberOffset = tableData.pagination?.offset ?? 0;

  const activeFilterCount = useMemo(() => {
    return effectiveContract?.query?.filters?.conditions?.length || 0;
  }, [effectiveContract]);

  const canCreateQuickFilter = useMemo(() => {
    return (sessionApi?.currentFilterConditions || []).length > 0;
  }, [sessionApi?.currentFilterConditions]);

  const handleCreateView = async (payload) => {
    const result = await onCreateView?.(payload);

    if (result?.ok) {
      sessionApi?.markSaved?.();
    }

    return result;
  };

  const handleCreateQuickFilter = ({ label }) => {
    const result = sessionApi?.createQuickFilterFromCurrent?.({ label });

    if (result?.ok !== false) {
      setIsQuickFilterDialogOpen(false);
    }

    return result;
  };

  const handleApplyFilters = () => {
    query.resetOffset?.();
  };

  const handleSaveColumnsPanel = useCallback(async () => {
    const saved = await onSave?.();

    if (saved !== false) {
      setIsColumnsPanelOpen(false);
    }
  }, [onSave]);

  const columnWidths = useMemo(() => {
    return effectiveContract?.presentation?.table?.columnWidths || {};
  }, [effectiveContract]);

  const handleTableSurfaceClick = useCallback(
    (event) => {
      if (!entityCardEnabled) {
        return;
      }

      const target = event.target;

      if (!(target instanceof Element)) {
        return;
      }

      if (
        target.closest(".view-engine-table-selection-cell") ||
        target.closest(".view-engine-table-checkbox") ||
        target.closest(".view-engine-table-resize-handle") ||
        target.closest(".view-engine-table-sort-btn") ||
        target.closest("button") ||
        target.closest("a") ||
        target.closest("input") ||
        target.closest("select") ||
        target.closest("textarea")
      ) {
        return;
      }

      const rowElement = target.closest(".view-engine-table-row");

      if (!rowElement || !tableSurfaceRef.current?.contains(rowElement)) {
        return;
      }

      const rowElements = tableSurfaceRef.current.querySelectorAll(
        ".view-engine-table-row",
      );
      const rowIndex = Array.from(rowElements).indexOf(rowElement);

      if (rowIndex < 0) {
        return;
      }

      const rowId = tableData.rows[rowIndex]?.id;

      if (!rowId) {
        return;
      }

      entityCard.openCard(rowId);
    },
    [entityCard, entityCardEnabled, tableData.rows],
  );

  const handleColumnResize = useCallback(
    (columnKey, width) => {
      const presentationKey = String(columnKey || "").trim();

      if (!presentationKey) {
        return;
      }

      const column = tableData.columns.find((item) => item.key === presentationKey);
      const fieldKey = getColumnPresentationKey(column);

      if (!fieldKey) {
        return;
      }

      sessionApi?.setColumnWidth?.(fieldKey, width);
    },
    [tableData.columns, sessionApi],
  );

  return (
    <div className="view-engine-hosted-table">
      {definitionsError ? (
        <div className="designer-error" style={{ marginBottom: 8 }}>
          {definitionsError}
        </div>
      ) : null}

      {entityCard.openError ? (
        <div
          className="designer-error"
          style={{
            marginBottom: 8,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <span>{entityCard.openError}</span>
          <button
            type="button"
            className="designer-btn designer-btn--ghost"
            onClick={entityCard.clearOpenError}
          >
            Закрыть
          </button>
        </div>
      ) : null}

      {showToolbar ? (
        <div className="view-engine-hosted-table__chrome">
          <ObjectTableViewsBar
            views={views}
            activeViewKey={activeViewKey}
            activeViewContract={activeViewContract}
            onSelectView={onSelectView}
            onOpenFilters={() => setIsFiltersOpen(true)}
            onOpenColumns={() => setIsColumnsPanelOpen(true)}
            isColumnsPanelOpen={isColumnsPanelOpen}
            activeFilterCount={activeFilterCount}
            canCreateEntity={createEntity.canCreate}
            onCreateEntity={createEntity.openDialog}
            creatingEntity={createEntity.submitting}
            onRefresh={query.reload}
            refreshing={query.loading}
            loading={definitionsLoading}
            isDirty={sessionApi?.isDirty}
            canSave={canSave}
            saving={persistenceApi?.saving}
            saveError={persistenceApi?.saveError}
            onSave={onSave}
            onReset={sessionApi?.resetSession}
            onCreateView={handleCreateView}
            creating={creating}
            createError={createError}
            dirtyGuard={dirtyGuard}
            canRename={viewActions.canRename}
            canDuplicate={viewActions.canDuplicate}
            canDelete={viewActions.canDelete}
            canSetDefault={viewActions.canSetDefault}
            onRename={onRename}
            onDuplicate={onDuplicate}
            onDelete={onDelete}
            onSetDefault={onSetDefault}
            actionLoading={persistenceApi?.actionLoading}
            actionError={persistenceApi?.actionError}
            quickFilters={sessionApi?.quickFilters}
            activeQuickFilterId={sessionApi?.activeQuickFilterId}
            defaultQuickFilterId={
              effectiveContract?.query?.filters?.defaultQuickFilterId
            }
            canCreateQuickFilter={canCreateQuickFilter}
            onSelectQuickFilter={onSelectQuickFilter}
            onOpenCreateQuickFilter={() => setIsQuickFilterDialogOpen(true)}
          />

          <ObjectTableCreateQuickFilterDialog
            open={isQuickFilterDialogOpen}
            onClose={() => setIsQuickFilterDialogOpen(false)}
            onCreate={handleCreateQuickFilter}
          />
        </div>
      ) : null}

      <ObjectTableFiltersModal
        open={isFiltersOpen}
        onClose={() => setIsFiltersOpen(false)}
        effectiveContract={effectiveContract}
        catalog={query.catalog}
        objectTypeKey={objectTypeKey}
        sessionApi={sessionApi}
        onApplied={handleApplyFilters}
      />

      <ObjectTableColumnVisibilityPanel
        open={isColumnsPanelOpen}
        onClose={() => setIsColumnsPanelOpen(false)}
        onSave={handleSaveColumnsPanel}
        canSave={canSave}
        isDirty={sessionApi?.isDirty}
        saving={persistenceApi?.saving}
        saveError={persistenceApi?.saveError}
        effectiveContract={effectiveContract}
        catalog={query.catalog}
        objectTypeKey={objectTypeKey}
        sessionApi={sessionApi}
      />

      <div
        ref={tableSurfaceRef}
        className={[
          "view-engine-hosted-table__surface",
          entityCard.isOpen ? "view-engine-hosted-table__surface--entity-card-open" : "",
        ]
          .filter(Boolean)
          .join(" ")}
        onClick={handleTableSurfaceClick}
      >
        <ViewEngineTable
          columns={tableData.columns}
          rows={tableData.rows}
          loading={query.loading}
          error={query.error}
          sort={tableData.sort}
          onToggleColumnSort={handleToggleSort}
          minHeight={minHeight}
          enableColumnResize
          columnWidths={columnWidths}
          onColumnResize={handleColumnResize}
          showSelectionColumn={showSelectionColumn}
          showRowNumberColumn={showRowNumberColumn}
          rowNumberOffset={rowNumberOffset}
          className="view-engine-table-root--hosted"
        />
      </div>

      {!query.loading && !query.error ? (
        <div className="view-engine-hosted-table__footer">
          <ViewEnginePagination
            pagination={tableData.pagination}
            onPrevious={query.goToPreviousPage}
            onNext={query.goToNextPage}
          />
        </div>
      ) : null}

      <ObjectCreateEntityDialog
        open={createEntity.isDialogOpen}
        onClose={createEntity.closeDialog}
        onSubmit={createEntity.submit}
        fields={createEntity.creatableFields}
        formValues={createEntity.formValues}
        onFieldChange={createEntity.setFieldValue}
        fieldErrors={createEntity.fieldErrors}
        submitting={createEntity.submitting}
        submitError={createEntity.submitError}
        objectTypeLabel={objectTypeLabel}
      />

      <ObjectEntityCardModal
        open={entityCard.isOpen}
        mode={entityCard.mode}
        cardModel={entityCard.cardModel}
        formValues={entityCard.formValues}
        fieldErrors={entityCard.fieldErrors}
        onFieldChange={entityCard.setFieldValue}
        onClose={entityCard.closeCard}
        onSave={entityCard.save}
        submitting={entityCard.submitting}
        submitError={entityCard.submitError}
        initialContext={entityCard.initialContext}
        catalog={query.catalog}
        onEntityUpdated={entityCard.refreshEntity}
        cardLayout={effectiveContract?.presentation?.card}
        canConfigureCard={canConfigureEntityCard}
        onSaveCardLayout={canConfigureEntityCard ? handleSaveCardLayout : null}
        cardSettingsSaving={cardSettingsSaving}
        onOpenRelatedEntity={({ entityId, objectTypeKey: relatedObjectTypeKey }) => {
          void entityCard.openCard(entityId, {
            objectTypeKey: relatedObjectTypeKey || objectTypeKey,
          });
        }}
      />
    </div>
  );
}
