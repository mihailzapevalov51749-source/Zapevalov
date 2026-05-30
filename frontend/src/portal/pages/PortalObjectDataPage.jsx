import { useCallback, useEffect, useState } from "react";

import { getApiErrorMessage } from "../../modules/designer/api/platformApiClient";
import * as runtimeCatalogApi from "../../modules/designer/api/runtimeCatalogApi";
import { ObjectViewHost } from "../../modules/objectViews";
import ObjectTypeIcon from "../../shared/icons/ObjectTypeIcon";
import { getObjectTypeAppearanceFields } from "../../shared/icons/iconFileUtils";
import {
  clearPortalObjectViewHeader,
  publishPortalObjectViewHeader,
} from "../utils/portalObjectViewHeaderBridge";

const DEFAULT_VIEW_KEY = "default_table";
const DEFAULT_VIEW_LABEL = "Таблица";

async function resolveObjectTypeFromPublishedCatalog(tenantId, objectTypeRef) {
  const ref = String(objectTypeRef ?? "").trim();
  if (!ref) {
    return null;
  }

  const catalog = await runtimeCatalogApi.getPublishedCatalog(tenantId);
  const items = Array.isArray(catalog?.object_types) ? catalog.object_types : [];

  return (
    items.find((item) => String(item?.key ?? "") === ref) ||
    items.find((item) => String(item?.id ?? "") === ref) ||
    null
  );
}

export default function PortalObjectDataPage({
  tenantId,
  objectTypeRef,
  source = "portal",
}) {
  const [objectType, setObjectType] = useState(null);
  const [catalogVersion, setCatalogVersion] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadPage = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [objectTypeData, catalogInfo] = await Promise.all([
        resolveObjectTypeFromPublishedCatalog(tenantId, objectTypeRef),
        runtimeCatalogApi.getCatalogVersion(tenantId).catch(() => null),
      ]);

      if (!objectTypeData) {
        setObjectType(null);
        setCatalogVersion(null);
        setError("Тип объекта не найден");
        return;
      }

      setObjectType(objectTypeData);
      setCatalogVersion(catalogInfo?.catalog_version ?? null);
    } catch (err) {
      setObjectType(null);
      setCatalogVersion(null);
      setError(getApiErrorMessage(err, "Не удалось загрузить объект"));
    } finally {
      setLoading(false);
    }
  }, [tenantId, objectTypeRef]);

  useEffect(() => {
    loadPage();
  }, [loadPage]);

  useEffect(() => {
    return () => {
      clearPortalObjectViewHeader();
    };
  }, []);

  const handleActiveViewContextChange = useCallback(
    (context) => {
      publishPortalObjectViewHeader({
        objectTypeId: objectType?.id,
        objectTypeKey: objectType?.key,
        activeAdapterType: context?.activeAdapterType,
        activeAdapterLabel: context?.activeAdapterLabel,
        activeRepresentationKey: context?.activeRepresentationKey,
        activeRepresentationName: context?.activeRepresentationName,
      });
    },
    [objectType?.id, objectType?.key],
  );

  if (loading) {
    return (
      <div style={{ padding: 24, color: "#64748b", fontSize: 14 }}>
        Загрузка данных объекта...
      </div>
    );
  }

  if (error && !objectType) {
    return (
      <div
        style={{
          margin: 16,
          padding: 16,
          borderRadius: 12,
          background: "#fef2f2",
          color: "#b91c1c",
          fontSize: 14,
        }}
      >
        {error}
      </div>
    );
  }

  const appearance = getObjectTypeAppearanceFields(objectType);
  const objectTypeKey = objectType?.key;
  const objectTypeId = objectType?.id;
  const catalogPublished = catalogVersion != null;

  return (
    <div
      className="portal-object-data-page"
      data-runtime-source={source}
      style={{
        display: "flex",
        flexDirection: "column",
        flex: 1,
        minHeight: 0,
        minWidth: 0,
        padding: 0,
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          display: "flex",
          gap: 12,
          alignItems: "flex-start",
          marginBottom: 16,
          flexWrap: "wrap",
        }}
      >
        <ObjectTypeIcon
          iconType={appearance.icon_type}
          iconFileUrl={appearance.icon_file_url}
          color={appearance.color}
          size={40}
          className="object-type-icon--header"
        />
        <div>
          <h1 style={{ margin: "0 0 6px", fontSize: 22, fontWeight: 800 }}>
            {objectType?.name || "Объект"}
          </h1>
          <p style={{ margin: 0, color: "#64748b", fontSize: 13 }}>
            <code>{objectTypeKey || "—"}</code>
            {catalogPublished ? (
              <span style={{ marginLeft: 10 }}>catalog v{catalogVersion}</span>
            ) : null}
          </p>
        </div>
      </div>

      {!catalogPublished ? (
        <div
          style={{
            marginBottom: 16,
            padding: 16,
            borderRadius: 12,
            background: "#fffbeb",
            border: "1px solid #fde68a",
            color: "#92400e",
            fontSize: 14,
            lineHeight: 1.5,
          }}
        >
          Объект ещё не опубликован. Опубликуйте объект в Studio.
        </div>
      ) : null}

      {!objectTypeKey ? (
        <div
          style={{
            padding: 16,
            borderRadius: 12,
            background: "#fef2f2",
            color: "#b91c1c",
            fontSize: 14,
          }}
        >
          У объекта не задан key.
        </div>
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
            key={`portal-object-${objectTypeKey}-${catalogVersion}`}
            tenantId={tenantId}
            objectTypeId={objectTypeId}
            objectTypeKey={objectTypeKey}
            viewKey={DEFAULT_VIEW_KEY}
            viewType="table"
            mode="data"
            viewLabel={DEFAULT_VIEW_LABEL}
            pageSize={20}
            minHeight={320}
            source={source}
            onActiveViewContextChange={handleActiveViewContextChange}
          />
        </div>
      ) : null}
    </div>
  );
}
