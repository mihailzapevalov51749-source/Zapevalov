import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";

import { getApiErrorMessage } from "../api/platformApiClient";
import * as designerApi from "../api/designerApi";
import * as runtimeCatalogApi from "../api/runtimeCatalogApi";
import ObjectTypeWorkspace from "../components/objectTypes/ObjectTypeWorkspace";
import ObjectTypePublishToMenuDialog from "../components/objectTypes/ObjectTypePublishToMenuDialog";
import ObjectTypeWorkspaceHeader from "../components/objectTypes/ObjectTypeWorkspaceHeader";
import FieldsTab from "../components/tabs/FieldsTab";
import GeneralTab from "../components/tabs/GeneralTab";
import RelationsTab from "../components/tabs/RelationsTab";
import RuntimePreviewTab from "../components/tabs/RuntimePreviewTab";
import ViewsTab from "../components/tabs/ViewsTab";
import { DEFAULT_DESIGNER_TAB, isValidDesignerTab } from "../constants/tabs";
import { ObjectTypePreviewTabProvider } from "../context/ObjectTypePreviewTabContext";
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

export default function ObjectTypeWorkspacePage() {
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
  const [hasMenuPlacement, setHasMenuPlacement] = useState(false);
  const [catalogVersion, setCatalogVersion] = useState(null);
  const generalSaveRef = useRef(null);
  const [generalSaveReady, setGeneralSaveReady] = useState(false);
  const [appearanceDraft, setAppearanceDraft] = useState({
    icon_type: null,
    icon_file_url: null,
    color: null,
  });
  const [menuDialogOpen, setMenuDialogOpen] = useState(false);
  const [menuPublishMessage, setMenuPublishMessage] = useState("");

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

  const handleSchemaChanged = useCallback(async () => {
    try {
      const objectTypeData = await designerApi.getObjectType(tenantId, objectTypeId);
      setObjectType(objectTypeData);
    } catch (err) {
      console.warn("[ObjectTypeWorkspacePage] Failed to reload object type after schema change", err);
    }
  }, [tenantId, objectTypeId]);

  const lifecycle = useMemo(
    () =>
      resolveObjectTypeLifecycleState({
        isDirty: isDraftDirty,
        objectType,
        catalogVersion,
        hasMenuPlacement,
      }),
    [catalogVersion, hasMenuPlacement, isDraftDirty, objectType],
  );

  const handleUpdatePublication = useCallback(async () => {
    setPublishing(true);
    setMenuPublishMessage("");

    try {
      if (isDraftDirty && generalSaveRef.current) {
        await generalSaveRef.current();
        setIsDraftDirty(false);
      }

      const publishResult = await designerApi.publishCatalog(tenantId);
      setCatalogVersion(publishResult?.catalog_version ?? null);

      const objectTypeData = await designerApi.getObjectType(tenantId, objectTypeId);
      setObjectType(objectTypeData);
      setAppearanceDraft(await resolveAppearanceDraft(objectTypeData));

      dispatchDesignerNavigationReload();
      dispatchPortalNavigationReload();

      setMenuPublishMessage(
        "Публикация обновлена. Данные объекта синхронизированы, размещение в меню не изменилось.",
      );
    } catch (err) {
      window.alert(getApiErrorMessage(err, "Не удалось обновить публикацию"));
    } finally {
      setPublishing(false);
    }
  }, [isDraftDirty, objectTypeId, resolveAppearanceDraft, tenantId]);

  const handlePublish = useCallback(() => {
    if (lifecycle.publishAction === "update-catalog") {
      handleUpdatePublication();
      return;
    }

    setMenuPublishMessage("");
    setMenuDialogOpen(true);
  }, [handleUpdatePublication, lifecycle.publishAction]);

  const handleManagePublication = () => {
    setMenuPublishMessage("");
    setMenuDialogOpen(true);
  };

  const handleBeforePublish = useCallback(async () => {
    if (!isDraftDirty || !generalSaveRef.current) {
      return;
    }

    await generalSaveRef.current();
    setIsDraftDirty(false);
  }, [isDraftDirty]);

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
        "Каталог опубликован. Объект доступен в предпросмотре и размещён в меню.",
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

  const handleDeleteObject = async () => {
    if (!objectType) {
      return;
    }

    if (objectType.is_system) {
      window.alert("Системный объект нельзя удалить");
      return;
    }

    const confirmed = window.confirm(
      `Удалить объект «${objectType.name}»?\n\nОбъект будет удалён из Designer. Это действие нельзя отменить.`,
    );

    if (!confirmed) {
      return;
    }

    setDeleting(true);

    try {
      await designerApi.deleteObjectType(tenantId, objectTypeId);
      dispatchDesignerNavigationReload();
      navigate(`/designer/tenant/${tenantId}/object-types`);
    } catch (err) {
      window.alert(getApiErrorMessage(err, "Не удалось удалить объект"));
    } finally {
      setDeleting(false);
    }
  };

  const handleHeaderSave = async () => {
    if (!generalSaveRef.current) {
      return;
    }

    setSaving(true);

    try {
      await generalSaveRef.current();
      setIsDraftDirty(false);
    } catch (err) {
      window.alert(getApiErrorMessage(err, "Не удалось сохранить"));
    } finally {
      setSaving(false);
    }
  };

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
        onSchemaChanged={handleSchemaChanged}
      />
    );
  } else if (tab === "runtime-preview") {
    tabContent = (
      <RuntimePreviewTab
        key={`runtime-preview-${objectType.key}-${catalogVersion ?? "none"}`}
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
      {menuPublishMessage ? (
        <div className="designer-publish-dialog__success" role="status">
          {menuPublishMessage}
        </div>
      ) : null}
      <ObjectTypePreviewTabProvider tenantId={tenantId} objectTypeId={objectTypeId}>
        <ObjectTypeWorkspace
          header={
            <ObjectTypeWorkspaceHeader
              objectType={headerObjectType}
              lifecycle={lifecycle}
              saving={saving}
              publishing={publishing}
              saveAvailable={tab === "general" && generalSaveReady}
              saveDisabled={!isDraftDirty && lifecycle.saveVariant === "neutral"}
              deleting={deleting}
              onSave={handleHeaderSave}
              onPublish={handlePublish}
              onManagePublication={handleManagePublication}
              showManagePublication={Boolean(hasMenuPlacement)}
              onDeleteObject={handleDeleteObject}
            />
          }
        >
          {tabContent}
        </ObjectTypeWorkspace>
      </ObjectTypePreviewTabProvider>
    </>
  );
}
