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
import { useDesignerShell } from "../context/DesignerShellContext";
import { getObjectTypeAppearanceFields } from "../../../shared/icons/iconFileUtils";
import { dispatchDesignerNavigationReload } from "../utils/navigationReload";
import { resolveObjectTypeLifecycleState } from "../utils/objectTypeLifecycleState";

export default function ObjectTypeWorkspacePage() {
  const { tenantId } = useDesignerShell();
  const navigate = useNavigate();
  const { objectTypeId, tab } = useParams();

  const [objectType, setObjectType] = useState(null);
  const [catalogVersion, setCatalogVersion] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [publishing, setPublishing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isDraftDirty, setIsDraftDirty] = useState(false);
  /** Placeholder until backend exposes draft vs published revision. */
  const [needsPublish, setNeedsPublish] = useState(true);
  const [hasPublishedBaseline, setHasPublishedBaseline] = useState(false);
  const generalSaveRef = useRef(null);
  const [generalSaveReady, setGeneralSaveReady] = useState(false);
  const [appearanceDraft, setAppearanceDraft] = useState({
    icon_type: null,
    icon_file_url: null,
    color: null,
  });
  const [menuDialogOpen, setMenuDialogOpen] = useState(false);
  const [menuPublishMessage, setMenuPublishMessage] = useState("");

  const loadWorkspace = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [objectTypeData, catalogInfo] = await Promise.all([
        designerApi.getObjectType(tenantId, objectTypeId),
        runtimeCatalogApi.getCatalogVersion(tenantId).catch(() => null),
      ]);

      setObjectType(objectTypeData);
      setAppearanceDraft(getObjectTypeAppearanceFields(objectTypeData));
      setCatalogVersion(catalogInfo?.catalog_version ?? null);
      setIsDraftDirty(false);
      const hasCatalog = Boolean(catalogInfo?.catalog_version);
      setHasPublishedBaseline(hasCatalog);
      setNeedsPublish(!hasCatalog);
    } catch (err) {
      setError(getApiErrorMessage(err, "Не удалось загрузить Object Type"));
    } finally {
      setLoading(false);
    }
  }, [tenantId, objectTypeId]);

  useEffect(() => {
    loadWorkspace();
  }, [loadWorkspace]);

  const handleObjectTypeSaved = useCallback((updated) => {
    setObjectType(updated);
    setAppearanceDraft(getObjectTypeAppearanceFields(updated));
    dispatchDesignerNavigationReload();
  }, []);

  const handlePublish = () => {
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

      setHasPublishedBaseline(true);
      setNeedsPublish(false);
      setMenuPublishMessage(
        "Каталог опубликован. Объект доступен в Runtime Preview и размещён в меню Студии.",
      );

      try {
        const objectTypeData = await designerApi.getObjectType(tenantId, objectTypeId);
        setObjectType(objectTypeData);
        setAppearanceDraft(getObjectTypeAppearanceFields(objectTypeData));
      } catch {
        // workspace meta refresh is best-effort
      }
    },
    [tenantId, objectTypeId],
  );

  const lifecycle = useMemo(
    () =>
      resolveObjectTypeLifecycleState({
        isDirty: isDraftDirty,
        needsPublish,
        hasPublishedBaseline,
      }),
    [isDraftDirty, needsPublish, hasPublishedBaseline],
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
      setNeedsPublish(true);
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
    tabContent = <FieldsTab tenantId={tenantId} objectTypeId={objectTypeId} />;
  } else if (tab === "relations") {
    tabContent = (
      <RelationsTab
        tenantId={tenantId}
        objectTypeId={objectTypeId}
        objectType={objectType}
      />
    );
  } else if (tab === "views") {
    tabContent = <ViewsTab tenantId={tenantId} objectTypeId={objectTypeId} />;
  } else if (tab === "runtime-preview") {
    tabContent = (
      <RuntimePreviewTab
        key={`runtime-preview-${objectType.key}-${catalogVersion ?? "none"}`}
        tenantId={tenantId}
        objectTypeKey={objectType.key}
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
          onDeleteObject={handleDeleteObject}
        />
      }
    >
      {tabContent}
    </ObjectTypeWorkspace>
    </>
  );
}
