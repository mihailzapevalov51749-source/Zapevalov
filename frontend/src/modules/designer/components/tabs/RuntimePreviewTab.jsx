import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";

import { ObjectViewHost } from "../../../objectViews";
import { useObjectTypePreviewTab } from "../../context/ObjectTypePreviewTabContext";
import StudioPreviewContextBlock from "../preview/StudioPreviewContextBlock";
import { resolveObjectViewTabStatusPresentation } from "../../utils/resolveObjectViewTabStatusPresentation";
import { resolveObjectViewTypeLabel } from "../../utils/resolveObjectViewTypeLabel";
import { resolveObjectViewUsagePaths } from "../../utils/resolveObjectViewUsagePaths";

import "../../styles/designerPagesRegistry.css";
import "../../styles/designerPreviewContext.css";

export default function RuntimePreviewTab({
  tenantId,
  objectTypeId,
  objectType = null,
  objectTypeKey,
  catalogVersion = null,
  hasMenuPlacement = false,
  onSchemaChanged = null,
}) {
  const { objectTypeId: routeObjectTypeId } = useParams();
  const resolvedObjectTypeId = objectTypeId || routeObjectTypeId;

  const {
    selectedView,
    selectedViewKey,
    loading: viewsLoading,
    error: viewsError,
    reloadViews,
  } = useObjectTypePreviewTab() || {};

  const [usagePaths, setUsagePaths] = useState([]);

  const typeLabel = useMemo(
    () => resolveObjectViewTypeLabel(selectedView?.view_type),
    [selectedView?.view_type],
  );

  const statusPresentation = useMemo(
    () =>
      resolveObjectViewTabStatusPresentation({
        view: selectedView,
        objectType,
        catalogVersion,
        hasMenuPlacement,
      }),
    [selectedView, objectType, catalogVersion, hasMenuPlacement],
  );

  useEffect(() => {
    let cancelled = false;

    const loadUsagePaths = async () => {
      if (!selectedView) {
        if (!cancelled) {
          setUsagePaths([]);
        }
        return;
      }

      const paths = await resolveObjectViewUsagePaths(
        tenantId,
        resolvedObjectTypeId,
      );

      if (!cancelled) {
        setUsagePaths(paths);
      }
    };

    void loadUsagePaths();

    return () => {
      cancelled = true;
    };
  }, [
    tenantId,
    resolvedObjectTypeId,
    selectedView?.id,
    catalogVersion,
    hasMenuPlacement,
  ]);

  return (
    <div className="designer-preview-tab">
      {selectedView ? (
        <div className="designer-preview-tab__header">
          <div className="designer-preview-tab__view-meta">
            <span className="designer-preview-tab__view-name">{selectedView.name}</span>
            <span className="designer-badge">{typeLabel}</span>
            {statusPresentation.label ? (
              <span className={statusPresentation.className}>
                {statusPresentation.label}
              </span>
            ) : null}
          </div>

          {viewsError ? (
            <p className="designer-preview-tab__error">{viewsError}</p>
          ) : null}

          <StudioPreviewContextBlock usagePaths={usagePaths} />
        </div>
      ) : viewsError ? (
        <p className="designer-preview-tab__error">{viewsError}</p>
      ) : null}

      <div className="designer-preview-tab__surface">
        {selectedViewKey ? (
          <ObjectViewHost
            tenantId={tenantId}
            objectTypeId={resolvedObjectTypeId}
            objectTypeKey={objectTypeKey}
            viewKey={selectedViewKey}
            pageSize={20}
            mode="studio-preview"
            minHeight={280}
            showToolbar
            onSchemaChanged={async () => {
              await onSchemaChanged?.();
              await reloadViews?.();
            }}
          />
        ) : (
          <div className="designer-preview-tab__empty">
            {viewsLoading
              ? "Загрузка вкладок…"
              : "Добавьте вкладку в разделе «Вкладки», чтобы открыть предпросмотр."}
          </div>
        )}
      </div>
    </div>
  );
}
