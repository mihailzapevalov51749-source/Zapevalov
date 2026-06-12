import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";

import { getApiErrorMessage } from "../api/platformApiClient";
import * as designerApi from "../api/designerApi";
import * as runtimeCatalogApi from "../api/runtimeCatalogApi";
import ObjectTypeWorkspace from "../components/objectTypes/ObjectTypeWorkspace";
import ObjectTypeDeleteConfirmModal from "../components/objectTypes/ObjectTypeDeleteConfirmModal";
import ObjectTypePublishToMenuDialog from "../components/objectTypes/ObjectTypePublishToMenuDialog";
import ObjectTypeWorkspaceHeader from "../components/objectTypes/ObjectTypeWorkspaceHeader";
import FieldsTab from "../components/tabs/FieldsTab";
import GeneralTab from "../components/tabs/GeneralTab";
import RelationsTab from "../components/tabs/RelationsTab";
import ObjectActionsTab from "../components/tabs/ObjectActionsTab";
import ObjectRulesTab from "../components/tabs/ObjectRulesTab";
import RuntimePreviewTab from "../components/tabs/RuntimePreviewTab";
import ViewsTab from "../components/tabs/ViewsTab";
import { DEFAULT_DESIGNER_TAB, isValidDesignerTab } from "../constants/tabs";
import { ObjectTypePreviewTabProvider } from "../context/ObjectTypePreviewTabContext";
import { PlanViewStudioProvider } from "../context/PlanViewStudioContext";
import { useDesignerShell } from "../context/DesignerShellContext";
import { mergeObjectTypeAppearance } from "../../../shared/icons/iconFileUtils";
import { navigationService } from "../../navigation/services/navigationService";
import { detectObjectTypeMenuPlacement } from "../utils/detectObjectTypeMenuPlacement";
import { findObjectTypeNavigationItem } from "../utils/objectTypePublishState";
import {
  dispatchDesignerNavigationReload,
  dispatchPortalNavigationReload,
} from "../utils/navigationReload";
import { resolveObjectTypeLifecycleState } from "../utils/objectTypeLifecycleState";
import { dispatchDesignerObjectSchemaChanged } from "../utils/designerObjectSchemaChanged";
import { logPlanDebug } from "../../objectViews/plan/planViewDebug.js";
import {
  PAGE_LAYOUT_PAGE_TYPE,
  PAGE_LAYOUT_TOOLBAR_ZONE,
  useResolvedPageLayoutContract,
} from "../../../shared/appShell/pageLayoutContract";
import { usePlatformConfirm } from "../../../shared/platformModal";
import { showPlatformNotification } from "../../../shared/platformNotification/PlatformNotification";

export default function ObjectTypeWorkspacePage() {
  useResolvedPageLayoutContract({
    pageType: PAGE_LAYOUT_PAGE_TYPE.STUDIO_OBJECT,
    toolbarZoneId: PAGE_LAYOUT_TOOLBAR_ZONE.APP_HEADER,
    canMinimize: true,
  });

  const platformConfirm = usePlatformConfirm();
  const { tenantId } = useDesignerShell();
  const navigate = useNavigate();
  const { objectTypeId, tab } = useParams();

  const [objectType, setObjectType] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [publishing, setPublishing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isDraftDirty, setIsDraftDirty] = useState(false);
  const [schemaRevision, setSchemaRevision] = useState(0);
  const [studioStatusMessage, setStudioStatusMessage] = useState("");
  const [hasMenuPlacement, setHasMenuPlacement] = useState(false);
  const [catalogVersion, setCatalogVersion] = useState(null);
  const generalSaveRef = useRef(null);
  const tableViewsSaveRef = useRef(null);
  const planViewsSaveRef = useRef(null);
  const [generalSaveReady, setGeneralSaveReady] = useState(false);
  const [tableViewsDirty, setTableViewsDirty] = useState(false);
  const [planViewsDirty, setPlanViewsDirty] = useState(false);
  const isViewsDirty = tableViewsDirty || planViewsDirty;
  const [appearanceDraft, setAppearanceDraft] = useState({
    icon_type: null,
    icon_file_url: null,
    color: null,
  });
  const [menuDialogOpen, setMenuDialogOpen] = useState(false);
  const [menuPublishMessage, setMenuPublishMessage] = useState("");
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletePreviewLoading, setDeletePreviewLoading] = useState(false);
  const [deletePreview, setDeletePreview] = useState(null);

  const resolveAppearanceDraft = useCallback(
    async (objectTypeData) => {
      let navigationItem = null;

      try {
        const runtimeTree = await navigationService.getTree(tenantId, {
          scope: "runtime",
          mode: "runtime",
        });
        navigationItem = findObjectTypeNavigationItem(runtimeTree, objectTypeId);
      } catch {
        navigationItem = null;
      }

      return mergeObjectTypeAppearance(objectTypeData, navigationItem);
    },
    [tenantId, objectTypeId],
  );

  const loadWorkspace = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [objectTypeData, catalogInfo] = await Promise.all([
        designerApi.getObjectType(tenantId, objectTypeId),
        runtimeCatalogApi.getCatalogVersion(tenantId).catch(() => null),
      ]);

      const nextCatalogVersion = catalogInfo?.catalog_version ?? null;
      const menuPlaced = await detectObjectTypeMenuPlacement(tenantId, objectTypeId);

      setObjectType(objectTypeData);
      setAppearanceDraft(await resolveAppearanceDraft(objectTypeData));
      setCatalogVersion(nextCatalogVersion);
      setHasMenuPlacement(menuPlaced);
      setIsDraftDirty(false);
    } catch (err) {
      setError(getApiErrorMessage(err, "Не удалось загрузить Object Type"));
    } finally {
      setLoading(false);
    }
  }, [resolveAppearanceDraft, tenantId, objectTypeId]);

  useEffect(() => {
    loadWorkspace();
  }, [loadWorkspace]);

  const handleObjectTypeSaved = useCallback(
    async (updated) => {
      setObjectType(updated);
      setAppearanceDraft(await resolveAppearanceDraft(updated));
      dispatchDesignerNavigationReload();
    },
    [resolveAppearanceDraft],
  );

  const handleSchemaChanged = useCallback(async (options = {}) => {
    try {
      const objectTypeData = await designerApi.getObjectType(tenantId, objectTypeId);
      setObjectType(objectTypeData);
      setSchemaRevision((value) => value + 1);
      dispatchDesignerObjectSchemaChanged({
        tenantId,
        objectTypeId,
        viewKey: options?.viewKey ?? null,
      });
    } catch (err) {
      console.warn("[ObjectTypeWorkspacePage] Failed to reload object type after schema change", err);
    }
  }, [tenantId, objectTypeId]);

  const registerPlanViewsSave = useCallback((saveFn) => {
    planViewsSaveRef.current = saveFn;
  }, []);

  const registerTableViewsSave = useCallback((saveFn) => {
    tableViewsSaveRef.current = saveFn;
  }, []);

  const lifecycle = useMemo(
    () =>
      resolveObjectTypeLifecycleState({
        isDirty: isDraftDirty || isViewsDirty,
        objectType,
        catalogVersion,
        hasMenuPlacement,
      }),
    [catalogVersion, hasMenuPlacement, isDraftDirty, isViewsDirty, objectType],
  );

  const handleUpdatePublication = useCallback(async () => {
    setPublishing(true);
    setMenuPublishMessage("");

    const hadPublishedBefore = Boolean(objectType?.last_published_at || objectType?.lastPublishedAt);

    try {
      if (planViewsSaveRef.current) {
        await planViewsSaveRef.current({ flushBeforePublish: true });
      }

      if (tableViewsDirty && tableViewsSaveRef.current) {
        await tableViewsSaveRef.current();
      } else if (
        isViewsDirty &&
        !tableViewsDirty &&
        !planViewsDirty &&
        !planViewsSaveRef.current
      ) {
        await platformConfirm({
          title: "Сначала сохраните вкладки",
          message:
            "Есть несохранённые изменения вкладок. Сохраните их перед публикацией.",
          confirmLabel: "Понятно",
          cancelLabel: "Закрыть",
          variant: "warning",
        });
        return;
      }

      if (isDraftDirty && generalSaveRef.current) {
        await generalSaveRef.current();
        setIsDraftDirty(false);
      }

      const publishResult = await designerApi.publishCatalog(tenantId);

      logPlanDebug("PLAN_PUBLISH_SNAPSHOT", {
        catalogVersion: publishResult?.catalog_version ?? null,
        tenantId,
        objectTypeId,
      });

      setCatalogVersion(publishResult?.catalog_version ?? null);

      const objectTypeData = await designerApi.getObjectType(tenantId, objectTypeId);
      setObjectType(objectTypeData);
      setAppearanceDraft(await resolveAppearanceDraft(objectTypeData));

      dispatchDesignerNavigationReload();
      dispatchPortalNavigationReload();

      const menuPlaced = await detectObjectTypeMenuPlacement(tenantId, objectTypeId);
      setHasMenuPlacement(menuPlaced);

      if (!hadPublishedBefore && !menuPlaced) {
        setMenuPublishMessage("");
        setMenuDialogOpen(true);
      } else {
        setMenuPublishMessage(
          hadPublishedBefore
            ? "Публикация обновлена. Данные объекта синхронизированы."
            : "Каталог опубликован. Объект доступен в Runtime, связях, вкладках пространств и на страницах.",
        );
      }
      setStudioStatusMessage("");
    } catch (err) {
      showPlatformNotification({
        message: getApiErrorMessage(err, "Не удалось обновить публикацию"),
        variant: "warning",
      });
    } finally {
      setPublishing(false);
    }
  }, [
    isDraftDirty,
    isViewsDirty,
    planViewsDirty,
    platformConfirm,
    tableViewsDirty,
    objectType,
    objectTypeId,
    resolveAppearanceDraft,
    tenantId,
  ]);

  const handleManagePublication = useCallback(() => {
    setMenuPublishMessage("");
    setMenuDialogOpen(true);
  }, []);

  const handlePublish = useCallback(() => {
    if (
      lifecycle.publishAction === "update-catalog" ||
      lifecycle.publishAction === "publish-catalog"
    ) {
      handleUpdatePublication();
    }
  }, [handleUpdatePublication, lifecycle.publishAction]);

  const handleBeforePublish = useCallback(async () => {
    if (planViewsSaveRef.current) {
      await planViewsSaveRef.current({ flushBeforePublish: true });
    }

    if (tableViewsDirty && tableViewsSaveRef.current) {
      await tableViewsSaveRef.current();
    }

    if (!isDraftDirty || !generalSaveRef.current) {
      return;
    }

    await generalSaveRef.current();
    setIsDraftDirty(false);
  }, [isDraftDirty, tableViewsDirty]);

  const handleMenuPlacementSuccess = useCallback(
    async ({ catalogVersion: nextCatalogVersion } = {}) => {
      if (nextCatalogVersion != null) {
        setCatalogVersion(nextCatalogVersion);
      } else {
        try {
          const catalogInfo = await runtimeCatalogApi.getCatalogVersion(tenantId);
          setCatalogVersion(catalogInfo?.catalog_version ?? null);
        } catch {
          // ignore refresh errors
        }
      }

      setHasMenuPlacement(true);
      setMenuPublishMessage(
        "Каталог опубликован. Размещение в меню обновлено.",
      );

      try {
        const [objectTypeData, menuPlaced] = await Promise.all([
          designerApi.getObjectType(tenantId, objectTypeId),
          detectObjectTypeMenuPlacement(tenantId, objectTypeId),
        ]);
        setObjectType(objectTypeData);
        setAppearanceDraft(await resolveAppearanceDraft(objectTypeData));
        setHasMenuPlacement(menuPlaced);
      } catch {
        setHasMenuPlacement(true);
      }
    },
    [objectTypeId, resolveAppearanceDraft, tenantId],
  );

  const handleRenameObject = useCallback(() => {
    navigate(`/designer/tenant/${tenantId}/object-types/${objectTypeId}/general`);
  }, [navigate, objectTypeId, tenantId]);

  const handleDuplicateObject = useCallback(() => {
    showPlatformNotification({
      message: "Дублирование объекта будет доступно в следующем релизе.",
      variant: "info",
    });
  }, []);

  const handleOpenDeleteModal = useCallback(async () => {
    if (!objectType) {
      return;
    }

    if (objectType.is_system) {
      await platformConfirm({
        title: "Удаление недоступно",
        message: "Системный объект нельзя удалить",
        confirmLabel: "Понятно",
        cancelLabel: "Закрыть",
        variant: "warning",
      });
      return;
    }

    setDeleteModalOpen(true);
    setDeletePreview(null);
    setDeletePreviewLoading(true);

    try {
      const preview = await designerApi.getObjectTypeDeletePreview(tenantId, objectTypeId);
      setDeletePreview(preview);
    } catch (err) {
      setDeleteModalOpen(false);
      showPlatformNotification({
        message: getApiErrorMessage(err, "Не удалось проверить использование объекта"),
        variant: "warning",
      });
    } finally {
      setDeletePreviewLoading(false);
    }
  }, [objectType, objectTypeId, platformConfirm, tenantId]);

  const handleCloseDeleteModal = useCallback(() => {
    if (deleting) {
      return;
    }
    setDeleteModalOpen(false);
    setDeletePreview(null);
    setDeletePreviewLoading(false);
  }, [deleting]);

  const handleConfirmDeleteObject = async () => {
    if (!objectType || objectType.is_system) {
      return;
    }

    setDeleting(true);

    try {
      await designerApi.deleteObjectType(tenantId, objectTypeId);
      dispatchDesignerNavigationReload();
      dispatchPortalNavigationReload();
      setDeleteModalOpen(false);
      setDeletePreview(null);
      navigate(`/designer/tenant/${tenantId}/object-types`);
    } catch (err) {
      showPlatformNotification({
        message: getApiErrorMessage(err, "Не удалось удалить объект"),
        variant: "warning",
      });
    } finally {
      setDeleting(false);
    }
  };

  const handleHeaderSave = async () => {
    setStudioStatusMessage("");

    if (isViewsDirty) {
      setSaving(true);

      try {
        if (planViewsDirty && planViewsSaveRef.current) {
          await planViewsSaveRef.current();
        } else if (tableViewsDirty && tableViewsSaveRef.current) {
          await tableViewsSaveRef.current();
        }
      } catch (err) {
        showPlatformNotification({
          message: getApiErrorMessage(err, "Не удалось сохранить"),
          variant: "warning",
        });
      } finally {
        setSaving(false);
      }
      return;
    }

    if (isDraftDirty && generalSaveRef.current) {
      setSaving(true);

      try {
        await generalSaveRef.current();
        setIsDraftDirty(false);
      } catch (err) {
        showPlatformNotification({
          message: getApiErrorMessage(err, "Не удалось сохранить"),
          variant: "warning",
        });
      } finally {
        setSaving(false);
      }
      return;
    }

    if (lifecycle.needsPublish) {
      setSaving(true);

      try {
        await handleSchemaChanged();
        setStudioStatusMessage(
          "Изменения сохранены в Studio. Опубликуйте каталог, когда закончите настройку.",
        );
      } catch (err) {
        showPlatformNotification({
          message: getApiErrorMessage(err, "Не удалось обновить состояние Studio"),
          variant: "warning",
        });
      } finally {
        setSaving(false);
      }
    }
  };

  const canSaveGeneralDraft = tab === "general" && generalSaveReady && isDraftDirty;
  const canSaveViewsDraft = isViewsDirty;
  const hasStudioUnpublishedChanges = Boolean(lifecycle.needsPublish);
  const headerSaveAvailable =
    canSaveGeneralDraft || canSaveViewsDraft || hasStudioUnpublishedChanges;
  const headerSaveDisabled =
    !canSaveGeneralDraft &&
    !canSaveViewsDraft &&
    !hasStudioUnpublishedChanges &&
    lifecycle.saveVariant === "neutral";

  if (!isValidDesignerTab(tab)) {
    return (
      <Navigate
        to={`/designer/tenant/${tenantId}/object-types/${objectTypeId}/${DEFAULT_DESIGNER_TAB}`}
        replace
      />
    );
  }

  if (loading) {
    return <div className="designer-loading">Загрузка workspace...</div>;
  }

  if (error) {
    return <div className="designer-error">{error}</div>;
  }

  const headerObjectType = objectType
    ? {
        ...objectType,
        icon_type: appearanceDraft.icon_type,
        icon_file_url: appearanceDraft.icon_file_url,
        color: appearanceDraft.color,
      }
    : objectType;

  let tabContent = null;

  if (tab === "general") {
    tabContent = (
      <GeneralTab
        tenantId={tenantId}
        objectTypeId={objectTypeId}
        objectType={objectType}
        onSaved={handleObjectTypeSaved}
        onDirtyChange={setIsDraftDirty}
        onIconChange={(next) =>
          setAppearanceDraft((prev) => ({
            ...prev,
            icon_type: next.icon_type,
            icon_file_url: next.icon_file_url,
          }))
        }
        onColorChange={(nextColor) =>
          setAppearanceDraft((prev) => ({ ...prev, color: nextColor }))
        }
        registerSave={(saveFn) => {
          generalSaveRef.current = saveFn;
          setGeneralSaveReady(Boolean(saveFn));
        }}
      />
    );
  } else if (tab === "fields") {
    tabContent = (
      <FieldsTab
        tenantId={tenantId}
        objectTypeId={objectTypeId}
        objectType={objectType}
        onSchemaChanged={handleSchemaChanged}
      />
    );
  } else if (tab === "relations") {
    tabContent = (
      <RelationsTab
        tenantId={tenantId}
        objectTypeId={objectTypeId}
        objectType={objectType}
        onSchemaChanged={handleSchemaChanged}
      />
    );
  } else if (tab === "views") {
    tabContent = (
      <ViewsTab
        tenantId={tenantId}
        objectTypeId={objectTypeId}
        objectTypeName={objectType?.name || objectType?.key || ""}
        objectTypeKey={objectType?.key || ""}
        onSchemaChanged={handleSchemaChanged}
        registerSave={registerTableViewsSave}
        onDirtyChange={setTableViewsDirty}
      />
    );
  } else if (tab === "actions") {
    tabContent = (
      <ObjectActionsTab
        tenantId={tenantId}
        objectTypeId={objectTypeId}
        objectTypeKey={objectType?.key || ""}
        onSchemaChanged={handleSchemaChanged}
      />
    );
  } else if (tab === "rules") {
    tabContent = (
      <ObjectRulesTab
        tenantId={tenantId}
        objectTypeKey={objectType?.key || ""}
      />
    );
  } else if (tab === "runtime-preview") {
    tabContent = (
      <RuntimePreviewTab
        key={`runtime-preview-${objectType.key}-${catalogVersion ?? "none"}-${schemaRevision}`}
        tenantId={tenantId}
        objectTypeId={objectTypeId}
        objectType={objectType}
        objectTypeKey={objectType.key}
        catalogVersion={catalogVersion}
        hasMenuPlacement={hasMenuPlacement}
        isDraftDirty={isDraftDirty}
        onSchemaChanged={handleSchemaChanged}
      />
    );
  }

  return (
    <>
      <ObjectTypePublishToMenuDialog
        open={menuDialogOpen}
        tenantId={tenantId}
        objectType={headerObjectType}
        onClose={() => setMenuDialogOpen(false)}
        onBeforePublish={handleBeforePublish}
        onPublishingChange={setPublishing}
        onSuccess={handleMenuPlacementSuccess}
      />
      <ObjectTypeDeleteConfirmModal
        open={deleteModalOpen}
        objectName={deletePreview?.name || objectType?.name}
        internalCounts={deletePreview?.internal_counts || []}
        externalWarnings={deletePreview?.external_warnings || []}
        loading={deletePreviewLoading}
        isSubmitting={deleting}
        onClose={handleCloseDeleteModal}
        onConfirm={handleConfirmDeleteObject}
      />
      {menuPublishMessage ? (
        <div className="designer-publish-dialog__success" role="status">
          {menuPublishMessage}
        </div>
      ) : null}
      {studioStatusMessage ? (
        <div className="designer-publish-dialog__success" role="status">
          {studioStatusMessage}
        </div>
      ) : null}
      <ObjectTypePreviewTabProvider tenantId={tenantId} objectTypeId={objectTypeId}>
        <PlanViewStudioProvider
          tenantId={tenantId}
          objectTypeId={objectTypeId}
          objectTypeKey={objectType?.key || ""}
          onSchemaChanged={handleSchemaChanged}
          onDirtyChange={setPlanViewsDirty}
          registerSave={registerPlanViewsSave}
        >
        <ObjectTypeWorkspace
          header={
            <ObjectTypeWorkspaceHeader
              objectType={headerObjectType}
              lifecycle={lifecycle}
              saving={saving}
              publishing={publishing}
              saveAvailable={headerSaveAvailable}
              saveDisabled={headerSaveDisabled}
              showUnpublishedChanges={hasStudioUnpublishedChanges}
              deleting={deleting}
              onSave={handleHeaderSave}
              onPublish={handlePublish}
              onManagePublication={handleManagePublication}
              showManagePublication={Boolean(lifecycle.needsMenuPlacement)}
              onRenameObject={handleRenameObject}
              onDuplicateObject={handleDuplicateObject}
              onDeleteObject={handleOpenDeleteModal}
            />
          }
        >
          {tabContent}
        </ObjectTypeWorkspace>
        </PlanViewStudioProvider>
      </ObjectTypePreviewTabProvider>
    </>
  );
}
