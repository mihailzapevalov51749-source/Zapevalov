import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { mergeEffectiveContract } from "../services/mergeEffectiveContract";
import { resolveCardLayoutPersistenceContract } from "../services/resolveCardLayoutPersistenceContract";

import { ObjectEntityCardModal } from "../../objectEntities";
import PlatformQuickCreateForm from "../../../shared/quickCreate/PlatformQuickCreateForm";
import useObjectEntityCard from "../../objectEntities/hooks/useObjectEntityCard";
import { resolveEntityCardLayoutForRender } from "../../objectEntities/services/resolveEntityCardPresentationLayout";
import { resolveObjectTypeTitleFieldKey } from "../services/tableColumnOrder";
import {
  openFileViewer,
  REOPEN_OBJECT_ENTITY_CARD_EVENT,
} from "../../../shared/files/openFileViewer";
import { getFileName, getFileUrl } from "../../../shared/fieldTypes/file/fileUtils";
import useWorkspaceFileViewerState from "../../../shared/files/hooks/useWorkspaceFileViewerState";
import { getColumnPresentationKey } from "../services/columnPresentationUtils";
import {
  findCatalogObjectType,
  getObjectTypeFields,
} from "./services/adapters/ObjectTypeTableAdapter";
import { YasiiSurfaceContextProvider } from "../../../yasii/context/YasiiSurfaceContext.jsx";
import { EMBEDDED_SURFACE_IDS } from "../../../yasii/embedded/embeddedSurfaceTypes.js";
import {
  formatRegistryFilterConditions,
  formatRegistrySortRules,
  resolvePlatformDashboardUserId,
} from "../../../yasii/hostContextBuilders.js";

import {
  ViewEnginePagination,
  ViewEngineTable,
} from "../../../shared/viewEngine/table";

import useObjectViewDirtyGuard from "../hooks/useObjectViewDirtyGuard";
import ObjectTableCreateViewDialog from "./components/ObjectTableCreateViewDialog";
import ObjectTableViewsBar from "./components/ObjectTableViewsBar";
import ObjectTableViewSettingsPanel from "./viewSettings/ObjectTableViewSettingsPanel";
import useObjectTableInlineEdit from "./hooks/useObjectTableInlineEdit";
import { resolveTableRepresentationContract } from "./viewSettings/resolveTableRepresentationContract";
import { resolveOfficeTableViewActions } from "../services/resolveOfficeTableViewActions";
import ObjectTableViewSettingsFiltersModal from "./viewSettings/ObjectTableViewSettingsFiltersModal";
import { countActiveFilterConditions } from "../services/savedFilterUtils";
import {
  readHiddenViewKeys,
  writeHiddenViewKeys,
} from "./representations/objectTableRepresentationsPrefs";
import useObjectTableColumns from "./hooks/useObjectTableColumns";
import useRelationTableEnrichment from "./hooks/useRelationTableEnrichment";
import useObjectTableHierarchyRows from "./hooks/useObjectTableHierarchyRows";
import useObjectTableSelection from "./hooks/useObjectTableSelection";
import ObjectTableBulkActionsBar from "./components/ObjectTableBulkActionsBar";
import ObjectTableFieldsVisibilityPanel from "./components/ObjectTableFieldsVisibilityPanel";
import useObjectEntityDelete from "./hooks/useObjectEntityDelete";
import useObjectEntitiesBulkDelete from "./hooks/useObjectEntitiesBulkDelete";
import ObjectEntityDeleteConfirmModal from "./components/ObjectEntityDeleteConfirmModal";
import ObjectEntityDeleteScenarioModal from "./components/ObjectEntityDeleteScenarioModal";
import { applyObjectTableDisplayPositions } from "./services/applyObjectTableDisplayPositions";
import {
  hasHierarchySubtasksFeature,
  resolvePrimaryHierarchySubtaskRelationKey,
} from "../../../shared/relation/hierarchyRelationProfile.js";
import {
  formatCreateChildMenuLabel,
  resolveHierarchyLabelsFromCatalog,
} from "../../../shared/relation/hierarchyLabels.js";
import useObjectTableSort from "./hooks/useObjectTableSort";
import { resolveRelationTableColumns } from "../services/resolveRelationTableColumns";
import { resolveRelatedEntityCardOpenArgs } from "./openRelatedEntityFromTable";
import { getStoredCurrentUserId } from "./preferences/objectTableUserViewsStorage";
import {
  loadColumnWidths,
  resolveColumnWidthsViewKey,
  saveColumnWidth,
} from "./services/objectTableColumnWidthsStorage";
import { mapColumnWidthsToTableKeys } from "./services/mapColumnWidthsToTableKeys";

import "../../../shared/viewEngine/viewEngineTable.css";

const DEFAULT_VIEW_LABEL = "Таблица";

function getTableFileId(file) {
  return file?.id || file?.file_id || file?.fileId || null;
}

function getTableFileMime(file) {
  return (
    file?.mime_type ||
    file?.mimeType ||
    file?.file_type ||
    file?.fileType ||
    ""
  );
}

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
  allowOfficeUserPersistence = false,
  representationsPrefsScopeKey = null,
  isTableBaseStateActive = false,
  publishedTableViewKey = "default_table",
  onSelectTableBaseState = null,
  viewDefinitionsForCardLayout = [],
  onCardLayoutSaved = null,
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

  const entityCardEnabled = Boolean(tenantId && objectTypeKey);

  const inlineEdit = useObjectTableInlineEdit({
    tenantId,
    objectTypeKey,
    enabled: entityCardEnabled,
    onEntityUpdated: () => query.reload?.(),
  });

  const titleFieldKey = useMemo(() => {
    const objectType = findCatalogObjectType(query.catalog, objectTypeKey);
    const fieldKeys = effectiveContract?.projection?.fieldKeys || [];
    const runtimeProjection =
      query.projectionValid && query.projection ? query.projection : null;

    const publishedViewKey = isTableBaseStateActive
      ? String(publishedTableViewKey || "default_table").trim()
      : String(activeViewKey || publishedTableViewKey || "default_table").trim();

    return (
      resolveObjectTypeTitleFieldKey(objectType, fieldKeys, {
        publishedViewKey,
        runtimeProjection,
      }) ||
      effectiveContract?.projection?.titleFieldKey ||
      resolvedContract?.projection?.titleFieldKey ||
      null
    );
  }, [
    query.catalog,
    query.projection,
    query.projectionValid,
    objectTypeKey,
    activeViewKey,
    isTableBaseStateActive,
    publishedTableViewKey,
    effectiveContract?.projection?.titleFieldKey,
    effectiveContract?.projection?.fieldKeys,
    resolvedContract?.projection?.titleFieldKey,
  ]);

  const cardLayoutPersistenceContract = useMemo(
    () =>
      resolveCardLayoutPersistenceContract({
        effectiveContract,
        resolvedContract,
        publishedTableViewKey,
        isTableBaseStateActive,
        viewDefinitions: viewDefinitionsForCardLayout,
      }),
    [
      effectiveContract,
      resolvedContract,
      publishedTableViewKey,
      isTableBaseStateActive,
      viewDefinitionsForCardLayout,
    ],
  );

  const entityCardLayout = useMemo(
    () =>
      resolveEntityCardLayoutForRender({
        effectiveCardLayout: effectiveContract?.presentation?.card,
        persistenceCardLayout: cardLayoutPersistenceContract?.presentation?.card,
        catalog: query.catalog,
        objectTypeKey,
        publishedViewKey: isTableBaseStateActive
          ? publishedTableViewKey
          : activeViewKey || publishedTableViewKey,
      }),
    [
      effectiveContract?.presentation?.card,
      cardLayoutPersistenceContract?.presentation?.card,
      query.catalog,
      objectTypeKey,
      isTableBaseStateActive,
      publishedTableViewKey,
      activeViewKey,
    ],
  );

  const hierarchyTableActionsRef = useRef({
    expandRow: () => {},
    reloadEdges: async () => {},
  });

  const handleEntityDeleted = useCallback(async () => {
    query.resetOffset?.();
    await query.reload?.();
    await hierarchyTableActionsRef.current.reloadEdges();
  }, [query]);

  const entityDelete = useObjectEntityDelete({
    tenantId,
    objectTypeKey,
    onDeleted: handleEntityDeleted,
  });

  const entityCard = useObjectEntityCard({
    tenantId,
    objectTypeKey,
    catalog: query.catalog,
    listItems: query.listResult?.items || [],
    titleFieldKey,
    enabled: entityCardEnabled,
    onSaved: async (entity, meta) => {
      if (meta?.created) {
        if (meta?.subtaskLinked && meta?.parentEntityId) {
          hierarchyTableActionsRef.current.expandRow(meta.parentEntityId);
        }

        await handleEntityCreated();
        await hierarchyTableActionsRef.current.reloadEdges();
        return;
      }

      await handleEntitySaved();
      await hierarchyTableActionsRef.current.reloadEdges();
    },
  });

  const { isWorkspaceFileOpen } = useWorkspaceFileViewerState();

  useEffect(() => {
    function handleReopenCard(event) {
      const detail = event.detail || {};
      const entityId = String(
        detail.entityId || detail.entity_id || detail.runtime_entity_id || "",
      ).trim();
      const relatedObjectTypeKey = String(
        detail.objectTypeKey || detail.object_type_key || objectTypeKey || "",
      ).trim();

      if (!entityId) {
        return;
      }

      if (entityCard.isOpen) {
        return;
      }

      void entityCard.openCard(entityId, {
        objectTypeKey: relatedObjectTypeKey || objectTypeKey,
      });
    }

    window.addEventListener(REOPEN_OBJECT_ENTITY_CARD_EVENT, handleReopenCard);

    return () => {
      window.removeEventListener(REOPEN_OBJECT_ENTITY_CARD_EVENT, handleReopenCard);
    };
  }, [entityCard.isOpen, entityCard.openCard, objectTypeKey]);

  const tableSurfaceRef = useRef(null);

  const objectTypeLabel = useMemo(() => {
    const objectType = findCatalogObjectType(query.catalog, objectTypeKey);
    return String(objectType?.name || objectTypeKey || "");
  }, [query.catalog, objectTypeKey]);
  const [isViewSettingsPanelOpen, setIsViewSettingsPanelOpen] = useState(false);
  const [settingsViewKey, setSettingsViewKey] = useState(null);
  const [settingsExpandedKey, setSettingsExpandedKey] = useState(null);
  const [isFiltersEditorOpen, setIsFiltersEditorOpen] = useState(false);
  const [filtersEditorSavedFilterId, setFiltersEditorSavedFilterId] = useState(null);
  const [isFieldsVisibilityPanelOpen, setIsFieldsVisibilityPanelOpen] = useState(false);
  const [fieldsVisibilityAnchorRect, setFieldsVisibilityAnchorRect] = useState(null);
  const fieldsVisibilityButtonRef = useRef(null);
  const [visibilityRevision, setVisibilityRevision] = useState(0);
  /** Optimistic widths until session/effectiveContract catches up (Universal Table override pattern). */
  const [committedColumnWidths, setCommittedColumnWidths] = useState({});
  const [storedColumnWidths, setStoredColumnWidths] = useState({});
  const settingsPanelAnchorRef = useRef(null);
  const [settingsPanelAnchor, setSettingsPanelAnchor] = useState(null);
  const [cardSettingsSaving, setCardSettingsSaving] = useState(false);

  const objectCardSurfaceContext = useMemo(() => {
    const cardModel = entityCard.cardModel;
    const cardObjectTypeKey = String(cardModel?.objectTypeKey ?? objectTypeKey ?? "").trim();
    const cardObjectType = findCatalogObjectType(query.catalog, cardObjectTypeKey);
    const cardObjectTypeId = String(
      cardObjectType?.id
      ?? cardObjectType?.object_type_id
      ?? cardObjectTypeKey
      ?? "",
    ).trim();
    const cardObjectTypeName = String(cardObjectType?.name ?? objectTypeLabel ?? cardObjectTypeKey).trim() || "Объект";
    const entityId = String(cardModel?.entityId ?? "").trim();
    const activeTab = String(entityCard.initialContext?.tab ?? "main").trim() || "main";
    const objectTitle = String(cardModel?.title ?? "").trim() || "Без названия";
    const objectStatus = String(cardModel?.status ?? "").trim();
    const objectOwner = String(
      cardModel?.rawEntity?.owner_name
      ?? cardModel?.rawEntity?.owner
      ?? cardModel?.rawEntity?.owner_id
      ?? "",
    ).trim();
    const objectCreatedAt = String(cardModel?.createdAt ?? "").trim();
    const selectedScope = entityId
      ? `object-card:${cardObjectTypeId || cardObjectTypeKey}:${entityId}:${activeTab}`
      : "object-card";

    return {
      surfaceId: EMBEDDED_SURFACE_IDS.OBJECT_CARD,
      contextData: {
        tenantId: String(tenantId ?? "0"),
        userId: resolvePlatformDashboardUserId(),
        objectTypeId: cardObjectTypeId,
        objectTypeName: cardObjectTypeName,
        objectId: entityId,
        objectTitle,
        activeTab,
        selectedScope,
        metadata: {
          objectStatus,
          objectOwner,
          objectCreatedAt,
        },
      },
      inputPlaceholder: "Спросите ЯСИИ о текущем объекте...",
    };
  }, [
    entityCard.cardModel,
    entityCard.initialContext?.tab,
    objectTypeKey,
    objectTypeLabel,
    query.catalog,
    tenantId,
  ]);

  const canConfigureEntityCard =
    entityCardEnabled &&
    allowDesignerPersistence &&
    Boolean(cardLayoutPersistenceContract?.meta?.viewId);

  const handleSaveCardLayout = useCallback(
    async (layout) => {
      if (!sessionApi || !persistenceApi || !cardLayoutPersistenceContract) {
        return false;
      }

      setCardSettingsSaving(true);

      try {
        sessionApi.setCardLayout(layout);

        const contractToSave = mergeEffectiveContract(cardLayoutPersistenceContract, {
          cardLayout: layout,
        });

        const result = await persistenceApi.saveView(contractToSave);

        if (!result?.ok) {
          return false;
        }

        sessionApi.markSaved();
        await onRefreshViews?.();
        await onCardLayoutSaved?.();
        return true;
      } finally {
        setCardSettingsSaving(false);
      }
    },
    [
      sessionApi,
      persistenceApi,
      cardLayoutPersistenceContract,
      onRefreshViews,
      onCardLayoutSaved,
    ],
  );

  const [isGuardSaveAsOpen, setIsGuardSaveAsOpen] = useState(false);

  const activeViewDisplayName = useMemo(() => {
    return (
      String(effectiveContract?.name || resolvedContract?.name || "").trim() ||
      "Представление"
    );
  }, [effectiveContract?.name, resolvedContract?.name]);

  const dirtyGuard = useObjectViewDirtyGuard({
    isDirty: sessionApi?.isDirty,
    isBaseStateActive: isTableBaseStateActive,
    viewName: activeViewDisplayName,
    onSave,
    onReset: sessionApi?.resetSession,
    onRequestSaveAsNew: () => setIsGuardSaveAsOpen(true),
    saving: persistenceApi?.saving,
  });

  const handleGuardedSelectTableBaseState = useCallback(() => {
    dirtyGuard.runGuarded(() => {
      onSelectTableBaseState?.();
    });
  }, [dirtyGuard, onSelectTableBaseState]);

  const contractForColumns = effectiveContract || resolvedContract;

  const tableData = useObjectTableColumns({
    query,
    contract: contractForColumns,
    objectTypeKey,
    viewKey: activeViewKey,
    publishedTableViewKey,
    isAllMode: isTableBaseStateActive,
  });

  const relationTableColumns = useMemo(
    () =>
      resolveRelationTableColumns(
        tableData.columns,
        query.catalog,
        objectTypeKey,
      ),
    [tableData.columns, query.catalog, objectTypeKey],
  );

  const relationTable = useRelationTableEnrichment({
    tenantId,
    rows: tableData.rows,
    columns: tableData.columns,
    relationColumns: relationTableColumns,
    enabled:
      Boolean(tenantId) &&
      relationTableColumns.length > 0 &&
      !query.loading &&
      tableData.rows.length > 0,
  });

  const hierarchyViewKey = isTableBaseStateActive
    ? String(publishedTableViewKey || "default_table").trim()
    : String(activeViewKey || publishedTableViewKey || "default_table").trim();

  const hierarchyTable = useObjectTableHierarchyRows({
    tenantId,
    objectTypeKey,
    viewKey: hierarchyViewKey,
    catalog: query.catalog,
    flatRows: relationTable.enrichedRows,
    enabled: mode !== "studio-preview",
  });

  useEffect(() => {
    hierarchyTableActionsRef.current = {
      expandRow: hierarchyTable.expandRow,
      reloadEdges: hierarchyTable.reloadEdges,
    };
  }, [hierarchyTable.expandRow, hierarchyTable.reloadEdges]);

  const displayRows = useMemo(
    () =>
      applyObjectTableDisplayPositions({
        rows: hierarchyTable.displayRows,
        sourceRows: relationTable.enrichedRows,
        treeEnabled: hierarchyTable.treeEnabled,
        parentByChild: hierarchyTable.parentByChild,
      }),
    [
      hierarchyTable.displayRows,
      hierarchyTable.treeEnabled,
      hierarchyTable.parentByChild,
      relationTable.enrichedRows,
    ],
  );

  const visibleRowIds = useMemo(
    () => displayRows.map((row) => row?.id).filter(Boolean),
    [displayRows],
  );

  const tableSelection = useObjectTableSelection(visibleRowIds);

  const bulkEntityDelete = useObjectEntitiesBulkDelete({
    tenantId,
    objectTypeKey,
    onDeleted: handleEntityDeleted,
    onClearSelection: tableSelection.clearSelection,
  });

  const handleBulkDeleteClick = useCallback(() => {
    void bulkEntityDelete.beginBulkDelete(tableSelection.selectedIds);
  }, [bulkEntityDelete.beginBulkDelete, tableSelection.selectedIds]);

  const deleteConfirmOpen =
    entityDelete.confirmOpen || bulkEntityDelete.confirmOpen;
  const deleteScenarioOpen =
    entityDelete.scenarioOpen || bulkEntityDelete.scenarioOpen;
  const isBulkDeleteFlowActive =
    bulkEntityDelete.confirmOpen || bulkEntityDelete.scenarioOpen;

  const rowSelection = useMemo(
    () =>
      showSelectionColumn && mode !== "studio-preview"
        ? {
            isSelected: tableSelection.isSelected,
            onToggleRow: tableSelection.toggleSelection,
            headerChecked: tableSelection.headerChecked,
            headerIndeterminate: tableSelection.headerIndeterminate,
            onToggleAllVisible: tableSelection.toggleAllVisible,
          }
        : null,
    [
      mode,
      showSelectionColumn,
      tableSelection.headerChecked,
      tableSelection.headerIndeterminate,
      tableSelection.isSelected,
      tableSelection.toggleAllVisible,
      tableSelection.toggleSelection,
    ],
  );

  const handleOpenRelatedEntityFromTable = useCallback(
    ({ entityId, objectTypeKey: relatedObjectTypeKey }) => {
      const openArgs = resolveRelatedEntityCardOpenArgs({
        entityId,
        relatedObjectTypeKey,
        fallbackObjectTypeKey: objectTypeKey,
        enabled: entityCardEnabled,
      });

      if (!openArgs) {
        return;
      }

      void entityCard.openCard(openArgs.entityId, {
        objectTypeKey: openArgs.objectTypeKey,
      });
    },
    [entityCard.openCard, entityCardEnabled, objectTypeKey],
  );

  const registryFieldLabels = useMemo(() => {
    const labels = {};

    for (const column of tableData.columns) {
      const key = String(column?.key ?? "").trim();
      if (!key) {
        continue;
      }

      labels[key] = String(column?.label ?? key).trim() || key;
    }

    const objectType = findCatalogObjectType(query.catalog, objectTypeKey);

    for (const field of getObjectTypeFields(objectType)) {
      const key = String(field?.key ?? "").trim();
      if (!key) {
        continue;
      }

      labels[key] = String(field?.name || field?.label || key).trim() || key;
    }

    return labels;
  }, [query.catalog, objectTypeKey, tableData.columns]);

  const registrySurfaceContext = useMemo(() => {
    const objectType = findCatalogObjectType(query.catalog, objectTypeKey);
    const registryId = String(
      objectType?.id
      ?? objectType?.object_type_id
      ?? objectTypeKey
      ?? "",
    ).trim();
    const registryName = String(objectType?.name ?? objectTypeLabel ?? objectTypeKey).trim() || "Реестр";
    const viewId = String(
      activeViewKey
      ?? effectiveContract?.meta?.viewId
      ?? effectiveContract?.key
      ?? "default",
    ).trim();
    const viewName = String(
      effectiveContract?.name
      ?? activeViewContract?.name
      ?? DEFAULT_VIEW_LABEL,
    ).trim();
    const filterLines = formatRegistryFilterConditions(
      effectiveContract?.query?.filters?.conditions || [],
      registryFieldLabels,
    );
    const sortLines = formatRegistrySortRules(
      effectiveContract?.query?.sort?.rules || [],
      registryFieldLabels,
    );
    const recordCount = Number(tableData.pagination?.total ?? 0);
    const visibleColumns = tableData.columns
      .map((column) => String(column?.label ?? "").trim())
      .filter(Boolean)
      .join("|");
    const selectedScope = `registry:${registryId || registryName}:${viewId}`;

    return {
      surfaceId: EMBEDDED_SURFACE_IDS.REGISTRY,
      contextData: {
        tenantId: String(tenantId ?? "0"),
        userId: resolvePlatformDashboardUserId(),
        registryId,
        registryName,
        viewId,
        viewName,
        selectedCount: 0,
        activeFilters: filterLines.length ? filterLines.join("; ") : "",
        activeSorts: sortLines.length ? sortLines.join("; ") : "",
        searchQuery: "",
        selectedScope,
        metadata: {
          recordCount: String(recordCount),
          visibleColumns,
        },
      },
      inputPlaceholder: "Спросите ЯСИИ о текущем реестре...",
    };
  }, [
    activeViewContract?.name,
    activeViewKey,
    effectiveContract,
    objectTypeKey,
    objectTypeLabel,
    query.catalog,
    registryFieldLabels,
    tableData.columns,
    tableData.pagination?.total,
    tenantId,
  ]);

  const yasiiSurfaceContext = entityCard.isOpen
    ? objectCardSurfaceContext
    : registrySurfaceContext;

  const { toggleColumnSort } = useObjectTableSort({
    effectiveContract,
    patchSession: sessionApi?.patchSession,
  });

  const handleToggleSort = (columnKey) => {
    toggleColumnSort(columnKey);
    query.resetOffset?.();
  };

  const rowNumberOffset = tableData.pagination?.offset ?? 0;

  const handleBeginDeleteEntity = useCallback(
    ({ entityId, entityTitle = "" } = {}) => {
      void entityDelete.beginDelete({ entityId, entityTitle });
    },
    [entityDelete.beginDelete],
  );

  const hierarchyRelationKey = useMemo(
    () => resolvePrimaryHierarchySubtaskRelationKey(query.catalog, objectTypeKey),
    [query.catalog, objectTypeKey],
  );

  const hierarchyLabels = useMemo(
    () =>
      resolveHierarchyLabelsFromCatalog(
        query.catalog,
        objectTypeKey,
        hierarchyRelationKey,
      ),
    [query.catalog, objectTypeKey, hierarchyRelationKey],
  );

  const createChildMenuLabel = useMemo(
    () => formatCreateChildMenuLabel(hierarchyLabels.child),
    [hierarchyLabels.child],
  );

  const canCreateSubtaskFromRow = useMemo(
    () =>
      createEntityEnabled &&
      hasHierarchySubtasksFeature(query.catalog, objectTypeKey) &&
      Boolean(hierarchyRelationKey),
    [createEntityEnabled, query.catalog, objectTypeKey, hierarchyRelationKey],
  );

  const handleCreateSubtaskFromRow = useCallback(
    ({ entityId } = {}) => {
      const parentEntityId = String(entityId || "").trim();

      if (!parentEntityId || !hierarchyRelationKey) {
        return;
      }

      entityCard.beginCreateSubtask(hierarchyRelationKey, {
        parentEntityId,
      });
    },
    [entityCard.beginCreateSubtask, hierarchyRelationKey],
  );

  const rowActionsEnabled =
    createEntityEnabled &&
    mode !== "studio-preview" &&
    !inlineEdit.isInlineEditMode;

  const tableRendererContext = useMemo(
    () => ({
      onOpenRelatedEntity: handleOpenRelatedEntityFromTable,
      onBeginDeleteEntity: handleBeginDeleteEntity,
      rowActions: rowActionsEnabled
        ? {
            enabled: true,
            canCreateSubtask: canCreateSubtaskFromRow,
            canDelete: true,
            titleFieldKey,
            createChildMenuLabel,
            onCreateSubtask: handleCreateSubtaskFromRow,
            onBeginDeleteEntity: handleBeginDeleteEntity,
          }
        : null,
      hierarchyTree: hierarchyTable.treeEnabled
        ? {
            enabled: true,
            onToggleRowExpanded: hierarchyTable.toggleRowExpanded,
          }
        : null,
      onOpenFile: (file, meta = {}) => {
        const fileUrl = getFileUrl(file);
        const fileId = getTableFileId(file);

        if (!fileUrl && !fileId) {
          return;
        }

        const entityId = meta?.row?.id ?? meta?.row?.entityId ?? null;
        const fieldKey = meta?.fieldKey || meta?.column?.key || null;

        openFileViewer({
          fileId: fileId ? String(fileId) : undefined,
          fileUrl: fileUrl || undefined,
          fileName: getFileName(file),
          mimeType: getTableFileMime(file),
          sourceType: "object_entity_attachment",
          sourceId: entityId ? String(entityId) : "",
          returnContext: {
            type: "object_entity_card",
            tenantId,
            objectTypeKey,
            entityId,
          },
          context: {
            tenantId,
            objectTypeKey,
            entityId,
            entity_type: "file",
            field_key: fieldKey,
            fieldKey,
          },
        });
      },
    }),
    [
      handleOpenRelatedEntityFromTable,
      handleBeginDeleteEntity,
      handleCreateSubtaskFromRow,
      canCreateSubtaskFromRow,
      createChildMenuLabel,
      rowActionsEnabled,
      titleFieldKey,
      hierarchyTable.treeEnabled,
      hierarchyTable.toggleRowExpanded,
      inlineEdit.isInlineEditMode,
      objectTypeKey,
      tenantId,
    ],
  );

  const activeFilterCount = useMemo(() => {
    return countActiveFilterConditions(
      effectiveContract,
      sessionApi?.activeQuickFilterId,
    );
  }, [effectiveContract, sessionApi?.activeQuickFilterId]);

  const handleCreateView = async (payload) => {
    const result = await onCreateView?.(payload);

    if (result?.ok) {
      sessionApi?.markSaved?.();
      dirtyGuard.completeSaveAsNew?.();
      setIsGuardSaveAsOpen(false);
    }

    return result;
  };

  const handleCloseGuardSaveAs = useCallback(() => {
    setIsGuardSaveAsOpen(false);
    dirtyGuard.cancelPendingNavigation?.();
  }, [dirtyGuard]);

  const handleApplyFilters = () => {
    query.resetOffset?.();
  };

  const handleOpenFiltersEditor = useCallback((savedFilterId = null) => {
    setFiltersEditorSavedFilterId(savedFilterId);
    setIsFiltersEditorOpen(true);
  }, []);

  const handleDeleteSavedFilterFromSettings = useCallback(
    (filterId) => {
      sessionApi?.deleteSavedFilter?.(filterId);
      query.resetOffset?.();
    },
    [sessionApi, query],
  );

  const handleEditSavedFilterFromSettings = useCallback(
    (filterId) => {
      handleOpenFiltersEditor(filterId);
    },
    [handleOpenFiltersEditor],
  );

  const handleCloseFiltersEditor = useCallback(() => {
    setIsFiltersEditorOpen(false);
    setFiltersEditorSavedFilterId(null);
  }, []);

  const isActiveViewHidden = useMemo(() => {
    const hidden = readHiddenViewKeys(objectTypeKey, representationsPrefsScopeKey);
    return hidden.includes(String(activeViewKey));
  }, [objectTypeKey, representationsPrefsScopeKey, activeViewKey, visibilityRevision]);

  const openViewSettings = useCallback(
    (section = null, anchorEl = null, viewKey = null) => {
      const resolvedAnchor =
        anchorEl || settingsPanelAnchorRef.current || null;
      const resolvedViewKey =
        String(viewKey || activeViewKey || "").trim() || null;

      setSettingsPanelAnchor(resolvedAnchor);
      setSettingsViewKey(resolvedViewKey);
      setSettingsExpandedKey(section || null);
      setIsViewSettingsPanelOpen(true);
    },
    [activeViewKey],
  );

  const closeViewSettings = useCallback(() => {
    setIsViewSettingsPanelOpen(false);
    setSettingsViewKey(null);
    setSettingsExpandedKey(null);
    setSettingsPanelAnchor(null);
  }, []);

  const handleToggleActiveViewVisibility = useCallback(() => {
    const key = String(activeViewKey || "").trim();

    if (!key) {
      return;
    }

    const hidden = new Set(
      readHiddenViewKeys(objectTypeKey, representationsPrefsScopeKey).map(String),
    );

    if (hidden.has(key)) {
      hidden.delete(key);
    } else {
      hidden.add(key);
    }

    writeHiddenViewKeys(objectTypeKey, Array.from(hidden), representationsPrefsScopeKey);
    setVisibilityRevision((value) => value + 1);
  }, [activeViewKey, objectTypeKey, representationsPrefsScopeKey]);

  const settingsRepresentationContract = useMemo(() => {
    const representationKey = String(
      settingsViewKey || activeViewKey || "",
    ).trim();

    const fromViews = resolveTableRepresentationContract(
      views,
      representationKey,
      null,
    );

    if (fromViews) {
      return fromViews;
    }

    if (String(resolvedContract?.key || "").trim() === representationKey) {
      return resolvedContract;
    }

    if (String(activeViewContract?.key || "").trim() === representationKey) {
      return activeViewContract;
    }

    return fromViews;
  }, [
    views,
    settingsViewKey,
    activeViewKey,
    resolvedContract,
    activeViewContract,
  ]);

  const settingsPanelActionContract = useMemo(
    () =>
      settingsRepresentationContract ||
      effectiveContract ||
      resolvedContract ||
      null,
    [
      settingsRepresentationContract,
      effectiveContract,
      resolvedContract,
    ],
  );

  const settingsPanelViewActions = useMemo(() => {
    if (!allowOfficeUserPersistence) {
      return viewActions;
    }

    return resolveOfficeTableViewActions(settingsPanelActionContract, {
      tenantId,
      objectTypeKey,
    });
  }, [
    allowOfficeUserPersistence,
    viewActions,
    settingsPanelActionContract,
    tenantId,
    objectTypeKey,
  ]);

  const settingsPanelCanSave = useMemo(() => {
    if (!allowOfficeUserPersistence) {
      return canSave;
    }

    return settingsPanelActionContract?.meta?.isUserView === true;
  }, [allowOfficeUserPersistence, canSave, settingsPanelActionContract]);

  const handleOpenViewSettingsForKey = useCallback(
    (viewKey, anchorEl = null) => {
      const normalized =
        String(viewKey || activeViewKey || "").trim() || String(activeViewKey);

      if (
        isViewSettingsPanelOpen &&
        String(settingsViewKey) === normalized
      ) {
        closeViewSettings();
        return;
      }

      // Opening settings must not switch active view or trigger dirty-guard.
      openViewSettings(null, anchorEl, normalized);
    },
    [
      activeViewKey,
      closeViewSettings,
      isViewSettingsPanelOpen,
      openViewSettings,
      settingsViewKey,
    ],
  );

  const isSettingsPanelForActiveView = useMemo(() => {
    const settingsKey = String(settingsViewKey || activeViewKey || "").trim();
    const currentKey = String(activeViewKey || "").trim();

    return Boolean(settingsKey) && settingsKey === currentKey;
  }, [settingsViewKey, activeViewKey]);

  const settingsPanelEffectiveContract = useMemo(() => {
    if (isSettingsPanelForActiveView) {
      return effectiveContract;
    }

    return settingsRepresentationContract || effectiveContract;
  }, [
    isSettingsPanelForActiveView,
    effectiveContract,
    settingsRepresentationContract,
  ]);

  const settingsPanelIsDirty = useMemo(
    () => isSettingsPanelForActiveView && Boolean(sessionApi?.isDirty),
    [isSettingsPanelForActiveView, sessionApi?.isDirty],
  );

  const handleDeleteRepresentation = useCallback(async () => {
    const target =
      settingsRepresentationContract ||
      settingsPanelActionContract ||
      effectiveContract;

    return onDelete?.(target);
  }, [
    onDelete,
    settingsRepresentationContract,
    settingsPanelActionContract,
    effectiveContract,
  ]);

  const handleSetDefaultForView = useCallback(
    (view) => {
      onSetDefault?.(view?.contract);
    },
    [onSetDefault],
  );

  const columnWidthsScope = useMemo(
    () => ({
      tenantId,
      objectTypeKey,
      viewKey: resolveColumnWidthsViewKey(
        activeViewKey,
        effectiveContract?.key,
      ),
      userId: getStoredCurrentUserId(),
      contract: effectiveContract,
    }),
    [
      tenantId,
      objectTypeKey,
      activeViewKey,
      effectiveContract?.key,
      effectiveContract,
    ],
  );

  const columnWidthsStorageToken = useMemo(
    () =>
      [
        columnWidthsScope.tenantId,
        columnWidthsScope.objectTypeKey,
        columnWidthsScope.viewKey,
        columnWidthsScope.userId,
      ].join(":"),
    [columnWidthsScope],
  );

  useEffect(() => {
    setStoredColumnWidths(loadColumnWidths(columnWidthsScope));
    setCommittedColumnWidths({});
  }, [columnWidthsStorageToken, columnWidthsScope]);

  const columnWidths = useMemo(() => {
    const contractWidths = effectiveContract?.presentation?.table?.columnWidths;

    if (!contractWidths || typeof contractWidths !== "object") {
      return mapColumnWidthsToTableKeys(tableData.columns, {
        ...storedColumnWidths,
        ...committedColumnWidths,
      });
    }

    const mergedByFieldKey = {
      ...contractWidths,
      ...storedColumnWidths,
    };

    return {
      ...mapColumnWidthsToTableKeys(tableData.columns, mergedByFieldKey),
      ...committedColumnWidths,
    };
  }, [
    effectiveContract?.presentation?.table?.columnWidths,
    storedColumnWidths,
    tableData.columns,
    committedColumnWidths,
  ]);

  useEffect(() => {
    const contractWidths = effectiveContract?.presentation?.table?.columnWidths;

    if (!contractWidths || typeof contractWidths !== "object") {
      return;
    }

    setCommittedColumnWidths((prev) => {
      if (!Object.keys(prev).length) {
        return prev;
      }

      const next = { ...prev };
      let changed = false;

      for (const column of tableData.columns) {
        const columnKey = String(column?.key || "").trim();
        const presentationKey = getColumnPresentationKey(column);

        if (!columnKey || !presentationKey || next[columnKey] == null) {
          continue;
        }

        const persistedWidth = Number(
          storedColumnWidths[presentationKey] ?? contractWidths[presentationKey],
        );
        const committedWidth = Number(next[columnKey]);

        if (
          Number.isFinite(persistedWidth) &&
          Number.isFinite(committedWidth) &&
          Math.abs(persistedWidth - committedWidth) < 0.5
        ) {
          delete next[columnKey];
          changed = true;
        }
      }

      return changed ? next : prev;
    });
  }, [
    effectiveContract?.presentation?.table?.columnWidths,
    storedColumnWidths,
    tableData.columns,
  ]);

  const handleToggleFieldsVisibilityPanel = useCallback(() => {
    setIsFieldsVisibilityPanelOpen((open) => {
      if (open) {
        return false;
      }

      const button = fieldsVisibilityButtonRef.current;

      if (button) {
        setFieldsVisibilityAnchorRect(button.getBoundingClientRect());
      }

      return true;
    });
  }, []);

  const handleCloseFieldsVisibilityPanel = useCallback(() => {
    setIsFieldsVisibilityPanelOpen(false);
  }, []);

  const handleTableSurfaceClick = useCallback(
    (event) => {
      if (!entityCardEnabled || inlineEdit.isInlineEditMode) {
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
        target.closest("[data-view-engine-row-menu]") ||
        target.closest("[data-view-engine-row-menu-button]") ||
        target.closest("[data-view-engine-table-action]") ||
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

      const rowId = displayRows[rowIndex]?.id;

      if (!rowId) {
        return;
      }

      entityCard.openCard(rowId);
    },
    [displayRows, entityCard, entityCardEnabled, inlineEdit.isInlineEditMode],
  );

  const resolveColumnResizeFieldKey = useCallback(
    (columnKey) => {
      const presentationKey = String(columnKey || "").trim();

      if (!presentationKey) {
        return null;
      }

      const column = tableData.columns.find((item) => item.key === presentationKey);

      return getColumnPresentationKey(column);
    },
    [tableData.columns],
  );

  const handleColumnResize = useCallback(
    (columnKey, width) => {
      const normalizedColumnKey = String(columnKey || "").trim();
      const numericWidth = Number(width);
      const fieldKey = resolveColumnResizeFieldKey(normalizedColumnKey);

      if (!normalizedColumnKey || !fieldKey || !Number.isFinite(numericWidth)) {
        return;
      }

      setCommittedColumnWidths((prev) => {
        const previous = Number(prev[normalizedColumnKey]);

        if (
          Number.isFinite(previous) &&
          Math.abs(previous - numericWidth) < 0.5
        ) {
          return prev;
        }

        return {
          ...prev,
          [normalizedColumnKey]: numericWidth,
        };
      });

      sessionApi?.setColumnWidth?.(fieldKey, numericWidth);
    },
    [resolveColumnResizeFieldKey, sessionApi],
  );

  const handleColumnResizeEnd = useCallback(
    (columnKey, width) => {
      const normalizedColumnKey = String(columnKey || "").trim();
      const fieldKey = resolveColumnResizeFieldKey(normalizedColumnKey);
      const numericWidth = Number(width);

      if (
        normalizedColumnKey &&
        fieldKey &&
        Number.isFinite(numericWidth) &&
        numericWidth > 0
      ) {
        setCommittedColumnWidths((prev) => {
          const previous = Number(prev[normalizedColumnKey]);

          if (
            Number.isFinite(previous) &&
            Math.abs(previous - numericWidth) < 0.5
          ) {
            return prev;
          }

          return {
            ...prev,
            [normalizedColumnKey]: numericWidth,
          };
        });

        sessionApi?.setColumnWidth?.(fieldKey, numericWidth);
        saveColumnWidth(columnWidthsScope, fieldKey, numericWidth);
        setStoredColumnWidths((prev) => ({
          ...prev,
          [fieldKey]: numericWidth,
        }));
        sessionApi?.flushPresentationColumnWidths?.();
        return;
      }

      sessionApi?.flushPresentationColumnWidths?.();
    },
    [columnWidthsScope, resolveColumnResizeFieldKey, sessionApi],
  );

  return (
    <YasiiSurfaceContextProvider value={yasiiSurfaceContext}>
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
            objectTypeKey={objectTypeKey}
            representationsPrefsScopeKey={representationsPrefsScopeKey}
            catalog={query.catalog}
            onSelectView={onSelectView}
            onOpenFilters={() => handleOpenFiltersEditor(null)}
            onToggleInlineEdit={inlineEdit.toggleInlineEditMode}
            isInlineEditMode={inlineEdit.isInlineEditMode}
            onOpenViewSettingsForKey={handleOpenViewSettingsForKey}
            onSetDefaultView={handleSetDefaultForView}
            isViewSettingsOpen={isViewSettingsPanelOpen}
            settingsPanelAnchorRef={settingsPanelAnchorRef}
            visibilityRevision={visibilityRevision}
            isTableBaseStateActive={isTableBaseStateActive}
            onSelectTableBaseState={handleGuardedSelectTableBaseState}
            activeFilterCount={activeFilterCount}
            canCreateEntity={entityCard.canCreate && createEntityEnabled}
            onCreateEntity={entityCard.openCreateCard}
            creatingEntity={entityCard.isCreateMode && entityCard.submitting}
            onRefresh={query.reload}
            refreshing={query.loading}
            loading={definitionsLoading}
            isDirty={sessionApi?.isDirty}
            canSave={canSave}
            saving={persistenceApi?.saving}
            saveError={persistenceApi?.saveError}
            onCreateView={handleCreateView}
            creating={creating}
            createError={createError}
            dirtyGuard={dirtyGuard}
            quickFilters={sessionApi?.quickFilters}
            activeQuickFilterId={sessionApi?.activeQuickFilterId}
            defaultQuickFilterId={
              effectiveContract?.query?.filters?.defaultQuickFilterId
            }
            onSelectQuickFilter={onSelectQuickFilter}
          />

          <ObjectTableCreateViewDialog
            open={isGuardSaveAsOpen}
            onClose={handleCloseGuardSaveAs}
            onCreate={handleCreateView}
            creating={creating}
            createError={createError}
          />
        </div>
      ) : null}

      <ObjectTableViewSettingsPanel
        open={isViewSettingsPanelOpen}
        onClose={closeViewSettings}
        anchorEl={settingsPanelAnchor}
        initialExpandedKey={settingsExpandedKey}
        activeViewContract={activeViewContract}
        representationContract={settingsRepresentationContract}
        activeViewKey={settingsViewKey || activeViewKey}
        effectiveContract={settingsPanelEffectiveContract}
        catalog={query.catalog}
        objectTypeKey={objectTypeKey}
        sessionApi={sessionApi}
        onSave={onSave}
        onCreateView={handleCreateView}
        creating={creating}
        createError={createError}
        canSave={settingsPanelCanSave && isSettingsPanelForActiveView}
        canCustomizeLayout={Boolean(
          settingsPanelCanSave ||
            allowDesignerPersistence ||
            allowOfficeUserPersistence,
        )}
        isDirty={settingsPanelIsDirty}
        saving={persistenceApi?.saving}
        saveError={persistenceApi?.saveError}
        canRename={settingsPanelViewActions.canRename}
        canDuplicate={settingsPanelViewActions.canDuplicate}
        canDelete={settingsPanelViewActions.canDelete}
        canSetDefault={settingsPanelViewActions.canSetDefault}
        onRename={(newName) =>
          onRename?.(newName, settingsRepresentationContract)
        }
        onDuplicate={onDuplicate}
        onDelete={handleDeleteRepresentation}
        onSetDefault={() => onSetDefault?.(settingsRepresentationContract)}
        isViewHidden={isActiveViewHidden}
        onToggleViewVisibility={handleToggleActiveViewVisibility}
        actionLoading={persistenceApi?.actionLoading}
        actionError={persistenceApi?.actionError}
        onOpenFiltersEditor={handleOpenFiltersEditor}
        onEditSavedFilter={handleEditSavedFilterFromSettings}
        onDeleteSavedFilter={handleDeleteSavedFilterFromSettings}
      />

      <ObjectTableViewSettingsFiltersModal
        open={isFiltersEditorOpen}
        onClose={handleCloseFiltersEditor}
        canCustomizeLayout={Boolean(
          canSave || allowDesignerPersistence || allowOfficeUserPersistence,
        )}
        effectiveContract={effectiveContract}
        catalog={query.catalog}
        objectTypeKey={objectTypeKey}
        sessionApi={sessionApi}
        onApplied={handleApplyFilters}
        savedFilters={effectiveContract?.query?.filters?.savedFilters || []}
        initialSavedFilterId={filtersEditorSavedFilterId}
      />

      <ObjectTableFieldsVisibilityPanel
        open={isFieldsVisibilityPanelOpen}
        anchorRect={fieldsVisibilityAnchorRect}
        anchorRef={fieldsVisibilityButtonRef}
        onClose={handleCloseFieldsVisibilityPanel}
        canCustomizeLayout={Boolean(
          canSave || allowDesignerPersistence || allowOfficeUserPersistence,
        )}
        effectiveContract={effectiveContract}
        catalog={query.catalog}
        objectTypeKey={objectTypeKey}
        sessionApi={sessionApi}
      />

      <ObjectTableBulkActionsBar
        selectedCount={tableSelection.selectedCount}
        onClearSelection={tableSelection.clearSelection}
        onDelete={handleBulkDeleteClick}
        deleting={bulkEntityDelete.isBusy}
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
          rows={displayRows}
          loading={query.loading}
          error={query.error}
          sort={tableData.sort}
          onToggleColumnSort={handleToggleSort}
          rendererContext={tableRendererContext}
          minHeight={minHeight}
          enableColumnResize={!inlineEdit.isInlineEditMode}
          columnWidths={columnWidths}
          onColumnResize={handleColumnResize}
          onColumnResizeEnd={handleColumnResizeEnd}
          showSelectionColumn={showSelectionColumn}
          rowSelection={rowSelection}
          showRowNumberColumn={false}
          rowNumberOffset={rowNumberOffset}
          isInlineEditMode={inlineEdit.isInlineEditMode}
          onCellChange={inlineEdit.handleCellChange}
          className="view-engine-table-root--hosted"
          titleFieldVisibility={{
            isOpen: isFieldsVisibilityPanelOpen,
            buttonRef: fieldsVisibilityButtonRef,
            onToggle: handleToggleFieldsVisibilityPanel,
          }}
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

        <PlatformQuickCreateForm
          open={entityCard.quickCreate?.open}
          onClose={entityCard.quickCreate?.close}
          onSubmit={entityCard.quickCreate?.submit}
          modalKey={entityCard.quickCreate?.modalKey}
          title={entityCard.quickCreate?.title}
          objectTypeLabel={entityCard.quickCreate?.objectTypeLabel}
          fields={entityCard.quickCreate?.fields || []}
          formValues={entityCard.quickCreate?.formValues || {}}
          onFieldChange={entityCard.quickCreate?.setFieldValue}
          fieldErrors={entityCard.quickCreate?.fieldErrors || {}}
          submitting={entityCard.quickCreate?.submitting}
          submitError={entityCard.quickCreate?.submitError}
          submitLabel={entityCard.quickCreate?.submitLabel}
        />

        <ObjectEntityDeleteConfirmModal
          open={deleteConfirmOpen}
          mode={isBulkDeleteFlowActive ? "bulk" : "single"}
          entityTitle={entityDelete.target?.entityTitle}
          bulkCount={bulkEntityDelete.aggregate?.selectedCount ?? 0}
          deleting={entityDelete.deleting || bulkEntityDelete.deleting}
          error={
            isBulkDeleteFlowActive ? bulkEntityDelete.error : entityDelete.error
          }
          onCancel={
            isBulkDeleteFlowActive
              ? bulkEntityDelete.cancelDelete
              : entityDelete.cancelDelete
          }
          onConfirm={
            isBulkDeleteFlowActive
              ? bulkEntityDelete.confirmSimpleDelete
              : entityDelete.confirmSimpleDelete
          }
        />

        <ObjectEntityDeleteScenarioModal
          open={deleteScenarioOpen}
          mode={isBulkDeleteFlowActive ? "bulk" : "single"}
          aggregate={bulkEntityDelete.aggregate}
          descendantCount={
            entityDelete.preview?.descendant_count ??
            entityDelete.preview?.descendantCount ??
            0
          }
          hierarchyLabels={
            entityDelete.preview?.hierarchy_labels ??
            entityDelete.preview?.hierarchyLabels ??
            hierarchyLabels
          }
          deleting={entityDelete.deleting || bulkEntityDelete.deleting}
          error={
            isBulkDeleteFlowActive ? bulkEntityDelete.error : entityDelete.error
          }
          onCancel={
            isBulkDeleteFlowActive
              ? bulkEntityDelete.cancelDelete
              : entityDelete.cancelDelete
          }
          onConfirm={
            isBulkDeleteFlowActive
              ? bulkEntityDelete.confirmScenarioDelete
              : entityDelete.confirmScenarioDelete
          }
        />

        <ObjectEntityCardModal
          open={entityCard.isOpen}
          suspendOverlayVisibility={isWorkspaceFileOpen}
          mode="edit"
          cardModel={entityCard.cardModel}
          formValues={entityCard.formValues}
          fieldErrors={entityCard.fieldErrors}
          onFieldChange={entityCard.updateFieldValue}
          onClose={entityCard.closeCard}
          onSave={entityCard.save}
          submitting={entityCard.submitting}
          submitError={entityCard.submitError}
          initialContext={entityCard.initialContext}
          catalog={query.catalog}
          onEntityUpdated={entityCard.refreshEntity}
          cardLayout={entityCardLayout}
          canConfigureCard={canConfigureEntityCard}
          onSaveCardLayout={canConfigureEntityCard ? handleSaveCardLayout : null}
          cardSettingsSaving={cardSettingsSaving}
          onOpenRelatedEntity={({ entityId, objectTypeKey: relatedObjectTypeKey }) => {
            void entityCard.openCard(entityId, {
              objectTypeKey: relatedObjectTypeKey || objectTypeKey,
            });
          }}
          onBeginCreateSubtask={entityCard.beginCreateSubtask}
          subtasksReloadToken={entityCard.subtasksReloadToken}
        />
    </div>
    </YasiiSurfaceContextProvider>
  );
}
