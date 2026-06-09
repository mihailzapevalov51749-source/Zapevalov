import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { getApiErrorMessage } from "../api/platformApiClient";
import * as designerApi from "../api/designerApi";
import * as runtimeCatalogApi from "../api/runtimeCatalogApi";
import { useDesignerShell } from "../context/DesignerShellContext";
import ObjectTypePublishToMenuDialog from "../components/objectTypes/ObjectTypePublishToMenuDialog";
import ObjectTypeWorkspaceHeader from "../components/objectTypes/ObjectTypeWorkspaceHeader";
import { ObjectViewHost } from "../../objectViews";
import ObjectTypeIcon from "../../../shared/icons/ObjectTypeIcon";
import { getObjectTypeAppearanceFields } from "../../../shared/icons/iconFileUtils";
import { detectObjectTypeMenuPlacement } from "../utils/detectObjectTypeMenuPlacement";
import {
  dispatchDesignerNavigationReload,
  dispatchPortalNavigationReload,
} from "../utils/navigationReload";
import {
  clearDesignerObjectViewHeader,
  publishDesignerObjectViewHeader,
} from "../utils/designerObjectViewHeaderBridge";
import { resolveObjectTypeLifecycleState } from "../utils/objectTypeLifecycleState";
import {
  PAGE_LAYOUT_PAGE_TYPE,
  PAGE_LAYOUT_TOOLBAR_ZONE,
  useResolvedPageLayoutContract,
} from "../../../shared/appShell/pageLayoutContract";

const DEFAULT_VIEW_KEY = "default_table";
const DEFAULT_VIEW_LABEL = "Таблица";

export default function ObjectTypeDataPage() {
  useResolvedPageLayoutContract({
    pageType: PAGE_LAYOUT_PAGE_TYPE.STUDIO_OBJECT_DATA,
    toolbarZoneId: PAGE_LAYOUT_TOOLBAR_ZONE.APP_HEADER,
    canMinimize: true,
  });

  const { tenantId } = useDesignerShell();
  const navigate = useNavigate();
  const { objectTypeId } = useParams();

  const [objectType, setObjectType] = useState(null);
  const [catalogVersion, setCatalogVersion] = useState(null);
  const [hasMenuPlacement, setHasMenuPlacement] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [publishing, setPublishing] = useState(false);
  const [menuDialogOpen, setMenuDialogOpen] = useState(false);
  const [menuPublishMessage, setMenuPublishMessage] = useState("");

  const settingsPath = `/designer/tenant/${tenantId}/object-types/${objectTypeId}/general`;

  const loadPage = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [objectTypeData, catalogInfo] = await Promise.all([
        designerApi.getObjectType(tenantId, objectTypeId),
        runtimeCatalogApi.getCatalogVersion(tenantId).catch(() => null),
      ]);

      const menuPlaced = await detectObjectTypeMenuPlacement(tenantId, objectTypeId);

      setObjectType(objectTypeData);
      setCatalogVersion(catalogInfo?.catalog_version ?? null);
      setHasMenuPlacement(menuPlaced);
    } catch (err) {
      setObjectType(null);
      setCatalogVersion(null);
      setHasMenuPlacement(false);
      setError(getApiErrorMessage(err, "Не удалось загрузить объект"));
    } finally {
      setLoading(false);
    }
  }, [tenantId, objectTypeId]);

  useEffect(() => {
    loadPage();
  }, [loadPage]);

  useEffect(() => {
    return () => {
      clearDesignerObjectViewHeader();
    };
  }, []);

  const handleSchemaChanged = useCallback(async () => {
    try {
      const objectTypeData = await designerApi.getObjectType(tenantId, objectTypeId);
      setObjectType(objectTypeData);
    } catch (err) {
      console.warn(
        "[ObjectTypeDataPage] Failed to reload object type after card layout save",
        err,
      );
    }
  }, [tenantId, objectTypeId]);

  const lifecycle = useMemo(
    () =>
      resolveObjectTypeLifecycleState({
        isDirty: false,
        objectType,
        catalogVersion,
        hasMenuPlacement,
      }),
    [objectType, catalogVersion, hasMenuPlacement],
  );

  const handleUpdatePublication = useCallback(async () => {
    setPublishing(true);
    setMenuPublishMessage("");

    const hadPublishedBefore = Boolean(objectType?.last_published_at || objectType?.lastPublishedAt);

    try {
      const publishResult = await designerApi.publishCatalog(tenantId);
      const nextCatalogVersion = publishResult?.catalog_version ?? null;
      setCatalogVersion(nextCatalogVersion);

      const objectTypeData = await designerApi.getObjectType(tenantId, objectTypeId);
      setObjectType(objectTypeData);

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
            ? "Публикация обновлена. Карточка и представления синхронизированы с Office."
            : "Каталог опубликован. Объект доступен в Runtime, связях, вкладках пространств и на страницах.",
        );
      }
    } catch (err) {
      window.alert(getApiErrorMessage(err, "Не удалось обновить публикацию"));
    } finally {
      setPublishing(false);
    }
  }, [objectType, objectTypeId, tenantId]);

  const handleManagePublication = useCallback(() => {
    setMenuPublishMessage("");
    setMenuDialogOpen(true);
  }, []);

  const handlePublish = useCallback(() => {
    if (
      lifecycle.publishAction === "update-catalog" ||
      lifecycle.publishAction === "publish-catalog"
    ) {
      void handleUpdatePublication();
    }
  }, [handleUpdatePublication, lifecycle.publishAction]);

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
        "Каталог опубликован. Объект доступен в Office и размещён в меню.",
      );

      try {
        const [objectTypeData, menuPlaced] = await Promise.all([
          designerApi.getObjectType(tenantId, objectTypeId),
          detectObjectTypeMenuPlacement(tenantId, objectTypeId),
        ]);
        setObjectType(objectTypeData);
        setHasMenuPlacement(menuPlaced);
      } catch {
        setHasMenuPlacement(true);
      }

      dispatchDesignerNavigationReload();
      dispatchPortalNavigationReload();
    },
    [objectTypeId, tenantId],
  );

  const handleActiveViewContextChange = useCallback(
    (context) => {
      publishDesignerObjectViewHeader({
        objectTypeId,
        activeAdapterType: context?.activeAdapterType,
        activeAdapterLabel: context?.activeAdapterLabel,
        activeRepresentationKey: context?.activeRepresentationKey,
        activeRepresentationName: context?.activeRepresentationName,
      });
    },
    [objectTypeId],
  );

  if (loading) {
    return <div className="designer-loading">Загрузка данных объекта...</div>;
  }

  if (error && !objectType) {
    return <div className="designer-error">{error}</div>;
  }

  const appearance = getObjectTypeAppearanceFields(objectType);
  const objectTypeKey = objectType?.key;
  const catalogPublished = catalogVersion != null;

  return (
    <div
      className="designer-object-data-page"
      style={{
        display: "flex",
        flexDirection: "column",
        flex: 1,
        minHeight: 0,
        minWidth: 0,
      }}
    >
      <ObjectTypePublishToMenuDialog
        open={menuDialogOpen}
        tenantId={tenantId}
        objectType={objectType}
        onClose={() => setMenuDialogOpen(false)}
        onPublishingChange={setPublishing}
        onSuccess={handleMenuPlacementSuccess}
      />

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 16,
          marginBottom: 12,
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
          <ObjectTypeIcon
            iconType={appearance.icon_type}
            iconFileUrl={appearance.icon_file_url}
            color={appearance.color}
            size={40}
            className="object-type-icon--header"
          />
          <div>
            <h2 style={{ margin: "0 0 6px", fontSize: 22, fontWeight: 800 }}>
              {objectType?.name || "Object Type"}
            </h2>
            <p style={{ margin: 0, color: "#64748b", fontSize: 13 }}>
              <code>{objectTypeKey || "—"}</code>
              {catalogPublished ? (
                <span style={{ marginLeft: 10 }}>catalog v{catalogVersion}</span>
              ) : null}
            </p>
            <p style={{ margin: "8px 0 0", color: "#475569", fontSize: 13 }}>
              Представление: <strong>{DEFAULT_VIEW_LABEL}</strong>{" "}
              <code>{DEFAULT_VIEW_KEY}</code>
            </p>
          </div>
        </div>

        <Link to={settingsPath} className="designer-btn">
          Настроить объект
        </Link>
      </div>

      {catalogPublished ? (
        <ObjectTypeWorkspaceHeader
          objectType={objectType}
          lifecycle={lifecycle}
          saving={false}
          publishing={publishing}
          saveAvailable={false}
          saveDisabled
          deleting={false}
          onSave={() => {}}
          onPublish={handlePublish}
          onManagePublication={handleManagePublication}
          showManagePublication={Boolean(lifecycle.needsMenuPlacement)}
          onRenameObject={() => navigate(settingsPath)}
          onDuplicateObject={() => window.alert("Дублирование объекта будет доступно в следующем релизе.")}
          onDeleteObject={() => navigate(settingsPath)}
        />
      ) : null}

      {menuPublishMessage ? (
        <div className="designer-publish-dialog__success" role="status" style={{ marginBottom: 12 }}>
          {menuPublishMessage}
        </div>
      ) : null}

      {!catalogPublished ? (
        <div className="designer-error" style={{ marginBottom: 16 }}>
          Опубликуйте объект, чтобы открыть рабочие данные. Catalog ещё не
          опубликован для tenant {tenantId}.
          <div style={{ marginTop: 12 }}>
            <Link to={settingsPath} className="designer-btn">
              Перейти к настройкам и опубликовать
            </Link>
          </div>
        </div>
      ) : null}

      {!objectTypeKey ? (
        <div className="designer-error">У объекта не задан key.</div>
      ) : catalogPublished ? (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            flex: 1,
            minHeight: 0,
            minWidth: 0,
          }}
        >
          <ObjectViewHost
            key={`object-data-${objectTypeKey}-${catalogVersion}`}
            tenantId={tenantId}
            objectTypeId={objectTypeId}
            objectTypeKey={objectTypeKey}
            viewKey={DEFAULT_VIEW_KEY}
            viewType="table"
            mode="data"
            viewLabel={DEFAULT_VIEW_LABEL}
            pageSize={20}
            minHeight={320}
            onActiveViewContextChange={handleActiveViewContextChange}
            onSchemaChanged={handleSchemaChanged}
          />
        </div>
      ) : null}
    </div>
  );
}
