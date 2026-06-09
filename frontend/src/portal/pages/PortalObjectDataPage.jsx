import { useCallback, useEffect, useMemo, useState } from "react";

import { getApiErrorMessage } from "../../modules/designer/api/platformApiClient";
import * as runtimeCatalogApi from "../../modules/designer/api/runtimeCatalogApi";
import { ObjectViewHost } from "../../modules/objectViews";
import { mergeObjectTypeAppearance } from "../../shared/icons/iconFileUtils";
import ObjectExcelImportHost from "../../shared/objectPlatform/objectExcelImport/ObjectExcelImportHost";
import PortalObjectRuntimeHeader from "../components/PortalObjectRuntimeHeader";
import {
  findPublishedObjectTab,
  resolveDefaultPublishedObjectTabKey,
  resolvePublishedObjectTabs,
} from "../services/resolvePublishedObjectTabs";
import { PORTAL_NAVIGATION_RELOAD_EVENT } from "../../shared/navigation/navigationReload";
import {
  clearPortalObjectViewHeader,
  publishPortalObjectViewHeader,
} from "../utils/portalObjectViewHeaderBridge";
import {
  PAGE_LAYOUT_PAGE_TYPE,
  PAGE_LAYOUT_TOOLBAR_ZONE,
  resolvePageLayoutContract,
} from "../../shared/appShell/pageLayoutContract";
import { useRegisterPageLayoutContract } from "../../shared/appShell/pageLayoutContract/PageLayoutContractContext.jsx";
import { useGlobalWorkspaceTabs } from "../../shared/workspaceTabs/GlobalWorkspaceTabsProvider";
import { useLocation } from "react-router-dom";

async function resolveObjectTypeFromPublishedCatalog(tenantId, objectTypeRef) {
  const ref = String(objectTypeRef ?? "").trim();
  if (!ref) {
    return null;
  }

  const catalog = await runtimeCatalogApi.getPublishedCatalog(tenantId, {
    cacheBust: true,
  });
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
  navigationAppearance = null,
  activeObjectTabKey = null,
  fixedObjectTabKey = null,
  hideObjectTabBar = false,
  syncObjectTabRoute = false,
  onNavigateObjectTab = null,
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
    const handleCatalogReload = () => {
      loadPage();
    };

    window.addEventListener(PORTAL_NAVIGATION_RELOAD_EVENT, handleCatalogReload);

    return () => {
      window.removeEventListener(PORTAL_NAVIGATION_RELOAD_EVENT, handleCatalogReload);
    };
  }, [loadPage]);

  useEffect(() => {
    return () => {
      clearPortalObjectViewHeader();
    };
  }, []);

  const objectTabs = useMemo(
    () => resolvePublishedObjectTabs(objectType),
    [objectType],
  );

  const resolvedObjectTabKey = useMemo(() => {
    const fixedKey = String(fixedObjectTabKey || "").trim();
    if (fixedKey) {
      return fixedKey;
    }
    return resolveDefaultPublishedObjectTabKey(objectTabs, activeObjectTabKey);
  }, [objectTabs, activeObjectTabKey, fixedObjectTabKey]);

  const activeObjectTab = useMemo(() => {
    const publishedTab = findPublishedObjectTab(objectTabs, resolvedObjectTabKey);

    if (publishedTab) {
      return publishedTab;
    }

    const fixedKey = String(fixedObjectTabKey || "").trim();

    if (!fixedKey || fixedKey !== resolvedObjectTabKey) {
      return null;
    }

    const views = Array.isArray(objectType?.views) ? objectType.views : [];
    const rawView = views.find(
      (view) =>
        String(view?.key ?? "").trim() === fixedKey &&
        view?.is_active !== false &&
        view?.isActive !== false,
    );

    if (!rawView) {
      return null;
    }

    const viewType = String(rawView?.view_type || rawView?.viewType || "table")
      .trim()
      .toLowerCase();

    return {
      key: fixedKey,
      name: String(rawView?.name || rawView?.title || fixedKey).trim(),
      viewType,
      isDefault: Boolean(rawView?.is_default ?? rawView?.isDefault),
      sortOrder: Number(rawView?.sort_order ?? rawView?.sortOrder ?? 0),
      isActive: true,
      menuInTab: false,
    };
  }, [objectTabs, resolvedObjectTabKey, fixedObjectTabKey, objectType?.views]);

  const location = useLocation();
  const { currentDescriptor } = useGlobalWorkspaceTabs();

  const pageLayoutContract = useMemo(
    () =>
      resolvePageLayoutContract(location, currentDescriptor, {
        pageType:
          activeObjectTab?.viewType === "plan"
            ? PAGE_LAYOUT_PAGE_TYPE.OBJECT_PLAN
            : PAGE_LAYOUT_PAGE_TYPE.OBJECT_RUNTIME,
        title: objectType?.name || currentDescriptor?.title,
        toolbarZoneId: PAGE_LAYOUT_TOOLBAR_ZONE.APP_HEADER,
        canMinimize: true,
        context: {
          objectTypeKey: objectType?.key,
          objectTypeName: objectType?.name,
          viewKey: resolvedObjectTabKey,
        },
      }),
    [
      location.pathname,
      location.search,
      location.hash,
      currentDescriptor,
      activeObjectTab?.viewType,
      objectType?.name,
      objectType?.key,
      resolvedObjectTabKey,
    ],
  );

  useRegisterPageLayoutContract(pageLayoutContract);

  useEffect(() => {
    if (!objectType || loading) {
      return;
    }

    publishPortalObjectViewHeader({
      tenantId,
      objectTypeId: objectType.id,
      objectTypeKey: objectType.key,
      objectName: objectType.name || "Объект",
      activeObjectTabKey: resolvedObjectTabKey,
      menuInTab: activeObjectTab?.menuInTab === true,
      hideObjectTabBar: hideObjectTabBar || Boolean(fixedObjectTabKey),
    });
  }, [
    objectType,
    loading,
    tenantId,
    resolvedObjectTabKey,
    activeObjectTab?.menuInTab,
    hideObjectTabBar,
    fixedObjectTabKey,
  ]);

  useEffect(() => {
    if (
      fixedObjectTabKey ||
      !syncObjectTabRoute ||
      !onNavigateObjectTab ||
      loading ||
      !objectType
    ) {
      return;
    }

    const routeTabKey = String(activeObjectTabKey || "").trim();

    if (routeTabKey && routeTabKey === resolvedObjectTabKey) {
      return;
    }

    if (!resolvedObjectTabKey) {
      return;
    }

    onNavigateObjectTab(resolvedObjectTabKey, { replace: true });
  }, [
    syncObjectTabRoute,
    onNavigateObjectTab,
    loading,
    objectType,
    activeObjectTabKey,
    fixedObjectTabKey,
    resolvedObjectTabKey,
  ]);

  const handleSelectObjectTab = useCallback(
    (nextTabKey) => {
      if (hideObjectTabBar || fixedObjectTabKey) {
        return;
      }
      const normalized = String(nextTabKey || "").trim();

      if (!normalized || normalized === resolvedObjectTabKey) {
        return;
      }

      onNavigateObjectTab?.(normalized);
    },
    [fixedObjectTabKey, hideObjectTabBar, resolvedObjectTabKey, onNavigateObjectTab],
  );

  const handleActiveViewContextChange = useCallback(
    (context) => {
      publishPortalObjectViewHeader({
        tenantId,
        objectTypeId: objectType?.id,
        objectTypeKey: objectType?.key,
        objectName: objectType?.name || "Объект",
        activeAdapterType: context?.activeAdapterType,
        activeAdapterLabel: context?.activeAdapterLabel,
        activeObjectTabKey: resolvedObjectTabKey,
        activeRepresentationKey: context?.activeRepresentationKey,
        activeRepresentationName: context?.activeRepresentationName,
        menuInTab: activeObjectTab?.menuInTab === true,
        hideObjectTabBar: hideObjectTabBar || Boolean(fixedObjectTabKey),
      });
    },
    [
      tenantId,
      objectType?.id,
      objectType?.key,
      objectType?.name,
      resolvedObjectTabKey,
      activeObjectTab?.menuInTab,
      hideObjectTabBar,
      fixedObjectTabKey,
    ],
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

  const appearance = mergeObjectTypeAppearance(objectType, navigationAppearance);
  const objectTypeKey = objectType?.key;
  const objectTypeId = objectType?.id;
  const catalogPublished = catalogVersion != null;
  const activeViewType = activeObjectTab?.viewType || "table";
  const activeViewLabel = activeObjectTab?.name || "Таблица";

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
      <PortalObjectRuntimeHeader
        objectName={objectType?.name || "Объект"}
        tenantId={tenantId}
        objectTypeKey={objectTypeKey}
        objectTypeId={objectTypeId}
        iconType={appearance.icon_type}
        iconFileUrl={appearance.icon_file_url}
        color={appearance.color}
        tabs={hideObjectTabBar || fixedObjectTabKey ? [] : objectTabs}
        activeTab={activeObjectTab}
        activeTabKey={resolvedObjectTabKey}
        onSelectTab={hideObjectTabBar || fixedObjectTabKey ? null : handleSelectObjectTab}
      />

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
      ) : catalogPublished && resolvedObjectTabKey ? (
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
            key={`portal-object-${objectTypeKey}-${catalogVersion}-${resolvedObjectTabKey}`}
            tenantId={tenantId}
            objectTypeId={objectTypeId}
            objectTypeKey={objectTypeKey}
            objectTabKey={resolvedObjectTabKey}
            viewType={activeViewType}
            mode="data"
            viewLabel={activeViewLabel}
            pageSize={20}
            minHeight={320}
            source={source}
            onActiveViewContextChange={handleActiveViewContextChange}
          />
        </div>
      ) : catalogPublished ? (
        <div
          style={{
            padding: 16,
            borderRadius: 12,
            background: "#f8fafc",
            border: "1px solid #e2e8f0",
            color: "#64748b",
            fontSize: 14,
          }}
        >
          У объекта нет опубликованных вкладок. Добавьте вкладки в Studio и опубликуйте
          объект.
        </div>
      ) : null}

      <ObjectExcelImportHost />
    </div>
  );
}
