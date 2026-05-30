import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { getApiErrorMessage } from "../api/platformApiClient";
import * as designerApi from "../api/designerApi";
import * as runtimeCatalogApi from "../api/runtimeCatalogApi";
import { useDesignerShell } from "../context/DesignerShellContext";
import { ObjectViewHost } from "../../objectViews";
import ObjectTypeIcon from "../../../shared/icons/ObjectTypeIcon";
import { getObjectTypeAppearanceFields } from "../../../shared/icons/iconFileUtils";
import {
  clearDesignerObjectViewHeader,
  publishDesignerObjectViewHeader,
} from "../utils/designerObjectViewHeaderBridge";

const DEFAULT_VIEW_KEY = "default_table";
const DEFAULT_VIEW_LABEL = "Таблица";

export default function ObjectTypeDataPage() {
  const { tenantId } = useDesignerShell();
  const { objectTypeId } = useParams();

  const [objectType, setObjectType] = useState(null);
  const [catalogVersion, setCatalogVersion] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const settingsPath = `/designer/tenant/${tenantId}/object-types/${objectTypeId}/general`;

  const loadPage = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [objectTypeData, catalogInfo] = await Promise.all([
        designerApi.getObjectType(tenantId, objectTypeId),
        runtimeCatalogApi.getCatalogVersion(tenantId).catch(() => null),
      ]);

      setObjectType(objectTypeData);
      setCatalogVersion(catalogInfo?.catalog_version ?? null);
    } catch (err) {
      setObjectType(null);
      setCatalogVersion(null);
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
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 16,
          marginBottom: 16,
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
          />
        </div>
      ) : null}
    </div>
  );
}
