import { useCallback, useEffect, useState } from "react";
import { Navigate, useParams } from "react-router-dom";

import { getApiErrorMessage } from "../api/platformApiClient";
import * as designerApi from "../api/designerApi";
import * as runtimeCatalogApi from "../api/runtimeCatalogApi";
import ObjectTypeWorkspace from "../components/objectTypes/ObjectTypeWorkspace";
import ObjectTypeWorkspaceHeader from "../components/objectTypes/ObjectTypeWorkspaceHeader";
import FieldsTab from "../components/tabs/FieldsTab";
import GeneralTab from "../components/tabs/GeneralTab";
import RelationsTab from "../components/tabs/RelationsTab";
import RuntimePreviewTab from "../components/tabs/RuntimePreviewTab";
import ViewsTab from "../components/tabs/ViewsTab";
import { DEFAULT_DESIGNER_TAB, isValidDesignerTab } from "../constants/tabs";
import { useDesignerShell } from "../context/DesignerShellContext";

export default function ObjectTypeWorkspacePage() {
  const { tenantId } = useDesignerShell();
  const { objectTypeId, tab } = useParams();

  const [objectType, setObjectType] = useState(null);
  const [catalogVersion, setCatalogVersion] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [publishing, setPublishing] = useState(false);

  const loadWorkspace = useCallback(async () => {
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
      setError(getApiErrorMessage(err, "Не удалось загрузить Object Type"));
    } finally {
      setLoading(false);
    }
  }, [tenantId, objectTypeId]);

  useEffect(() => {
    loadWorkspace();
  }, [loadWorkspace]);

  const handlePublish = async () => {
    setPublishing(true);

    try {
      await designerApi.publishCatalog(tenantId);
      const catalogInfo = await runtimeCatalogApi.getCatalogVersion(tenantId);
      setCatalogVersion(catalogInfo.catalog_version);
      window.alert("Catalog опубликован");
    } catch (err) {
      window.alert(getApiErrorMessage(err, "Не удалось опубликовать catalog"));
    } finally {
      setPublishing(false);
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

  let tabContent = null;

  if (tab === "general") {
    tabContent = (
      <GeneralTab
        tenantId={tenantId}
        objectTypeId={objectTypeId}
        objectType={objectType}
        onSaved={setObjectType}
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
      <RuntimePreviewTab tenantId={tenantId} objectTypeKey={objectType.key} />
    );
  }

  return (
    <ObjectTypeWorkspace
      header={
        <ObjectTypeWorkspaceHeader
          objectType={objectType}
          catalogVersion={catalogVersion}
          publishing={publishing}
          onPublish={handlePublish}
        />
      }
    >
      {tabContent}
    </ObjectTypeWorkspace>
  );
}
