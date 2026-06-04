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
import ObjectTableCreateQuickFilterDialog from "./components/ObjectTableCreateQuickFilterDialog";
import ObjectTableViewsBar from "./components/ObjectTableViewsBar";
import ObjectTableViewSettingsPanel from "./viewSettings/ObjectTableViewSettingsPanel";
import useObjectTableInlineEdit from "./hooks/useObjectTableInlineEdit";
import { resolveTableRepresentationContract } from "./viewSettings/resolveTableRepresentationContract";
import ObjectTableViewSettingsFiltersModal from "./viewSettings/ObjectTableViewSettingsFiltersModal";
import {
  readHiddenViewKeys,
  writeHiddenViewKeys,
} from "./representations/objectTableRepresentationsPrefs";
import useObjectTableColumns from "./hooks/useObjectTableColumns";
import useRelationTableEnrichment from "./hooks/useRelationTableEnrichment";
import useObjectTableSort from "./hooks/useObjectTableSort";
import { resolveRelationTableColumns } from "../services/resolveRelationTableColumns";
import { resolveRelatedEntityCardOpenArgs } from "./openRelatedEntityFromTable";

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

  const entityCard = useObjectEntityCard({
    tenantId,
    objectTypeKey,
    catalog: query.catalog,
    listItems: query.listResult?.items || [],
    titleFieldKey,
    enabled: entityCardEnabled,
    onSaved: async (entity, meta) => {
      if (meta?.created) {
        await handleEntityCreated();
        return;
      }

      await handleEntitySaved();
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
  const [visibilityRevision, setVisibilityRevision] = useState(0);
  /** Optimistic widths until session/effectiveContract catches up (Universal Table override pattern). */
  const [committedColumnWidths, setCommittedColumnWidths] = useState({});
  const settingsPanelAnchorRef = useRef(null);
  const [settingsPanelAnchor, setSettingsPanelAnchor] = useState(null);
  const [isQuickFilterDialogOpen, setIsQuickFilterDialogOpen] = useState(false);
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

  const displayRows = relationTable.enrichedRows;

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

  const tableRendererContext = useMemo(
    () => ({
      onOpenRelatedEntity: handleOpenRelatedEntityFromTable,
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
    [handleOpenRelatedEntityFromTable, objectTypeKey, tenantId],
  );

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

      if (normalized && normalized !== String(activeViewKey)) {
        dirtyGuard.runGuarded(() => {
          onSelectView?.(normalized);
          openViewSettings(null, anchorEl, normalized);
        });
        return;
      }

      openViewSettings(null, anchorEl, normalized);
    },
    [
      activeViewKey,
      closeViewSettings,
      dirtyGuard,
      isViewSettingsPanelOpen,
      onSelectView,
      openViewSettings,
      settingsViewKey,
    ],
  );

  const columnWidths = useMemo(() => {
    const contractWidths = effectiveContract?.presentation?.table?.columnWidths;

    if (!contractWidths || typeof contractWidths !== "object") {
      return {};
    }

    const byColumnKey = { ...contractWidths };

    for (const column of tableData.columns) {
      const presentationKey = getColumnPresentationKey(column);
      const columnKey = String(column?.key || "").trim();

      if (
        presentationKey &&
        columnKey &&
        contractWidths[presentationKey] != null
      ) {
        byColumnKey[columnKey] = contractWidths[presentationKey];
      }
    }

    return {
      ...byColumnKey,
      ...committedColumnWidths,
    };
  }, [
    effectiveContract?.presentation?.table?.columnWidths,
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

        const contractWidth = Number(contractWidths[presentationKey]);
        const committedWidth = Number(next[columnKey]);

        if (
          Number.isFinite(contractWidth) &&
          Number.isFinite(committedWidth) &&
          Math.abs(contractWidth - committedWidth) < 0.5
        ) {
          delete next[columnKey];
          changed = true;
        }
      }

      return changed ? next : prev;
    });
  }, [effectiveContract?.presentation?.table?.columnWidths, tableData.columns]);

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
    [entityCard, entityCardEnabled, inlineEdit.isInlineEditMode, tableData.rows],
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
      const contractWidths =
        effectiveContract?.presentation?.table?.columnWidths || {};

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

        sessionApi?.flushPresentationColumnWidths?.({
          ...contractWidths,
          [fieldKey]: numericWidth,
        });
        return;
      }

      sessionApi?.flushPresentationColumnWidths?.();
    },
    [effectiveContract, resolveColumnResizeFieldKey, sessionApi],
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
            onOpenFilters={() => openViewSettings("filters")}
            onToggleInlineEdit={inlineEdit.toggleInlineEditMode}
            isInlineEditMode={inlineEdit.isInlineEditMode}
            onOpenViewSettingsForKey={handleOpenViewSettingsForKey}
            isViewSettingsOpen={isViewSettingsPanelOpen}
            settingsPanelAnchorRef={settingsPanelAnchorRef}
            visibilityRevision={visibilityRevision}
            isTableBaseStateActive={isTableBaseStateActive}
            onSelectTableBaseState={onSelectTableBaseState}
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

      <ObjectTableViewSettingsPanel
        open={isViewSettingsPanelOpen}
        onClose={closeViewSettings}
        anchorEl={settingsPanelAnchor}
        initialExpandedKey={settingsExpandedKey}
        activeViewContract={activeViewContract}
        representationContract={settingsRepresentationContract}
        activeViewKey={settingsViewKey || activeViewKey}
        effectiveContract={effectiveContract}
        catalog={query.catalog}
        objectTypeKey={objectTypeKey}
        sessionApi={sessionApi}
        onSave={onSave}
        onCreateView={handleCreateView}
        creating={creating}
        createError={createError}
        canSave={canSave}
        canCustomizeLayout={Boolean(
          canSave || allowDesignerPersistence || allowOfficeUserPersistence,
        )}
        isDirty={sessionApi?.isDirty}
        saving={persistenceApi?.saving}
        saveError={persistenceApi?.saveError}
        canRename={viewActions.canRename}
        canDuplicate={viewActions.canDuplicate}
        canDelete={viewActions.canDelete}
        canSetDefault={viewActions.canSetDefault}
        onRename={(newName) =>
          onRename?.(newName, settingsRepresentationContract)
        }
        onDuplicate={onDuplicate}
        onDelete={onDelete}
        onSetDefault={onSetDefault}
        isViewHidden={isActiveViewHidden}
        onToggleViewVisibility={handleToggleActiveViewVisibility}
        actionLoading={persistenceApi?.actionLoading}
        actionError={persistenceApi?.actionError}
        onOpenFiltersEditor={() => setIsFiltersEditorOpen(true)}
      />

      <ObjectTableViewSettingsFiltersModal
        open={isFiltersEditorOpen}
        onClose={() => setIsFiltersEditorOpen(false)}
        canCustomizeLayout={canSave}
        effectiveContract={effectiveContract}
        catalog={query.catalog}
        objectTypeKey={objectTypeKey}
        sessionApi={sessionApi}
        onApplied={handleApplyFilters}
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
          showRowNumberColumn={showRowNumberColumn}
          rowNumberOffset={rowNumberOffset}
          isInlineEditMode={inlineEdit.isInlineEditMode}
          onCellChange={inlineEdit.handleCellChange}
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
