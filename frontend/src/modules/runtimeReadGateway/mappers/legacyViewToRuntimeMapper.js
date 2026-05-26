import { createProjectionResult } from "../contracts/runtimeReadContracts";

function pickLegacyView(viewsPayload, viewKey) {
  const views = Array.isArray(viewsPayload) ? viewsPayload : [];

  if (!views.length) {
    return null;
  }

  if (!viewKey) {
    return views[0];
  }

  return (
    views.find(
      (view) =>
        String(view?.key ?? "") === String(viewKey) ||
        String(view?.id ?? "") === String(viewKey),
    ) || views[0]
  );
}

export function mapLegacyViewToProjection({
  tenantId,
  objectTypeKey,
  viewKey,
  viewsPayload,
  warnings = [],
}) {
  const selectedView = pickLegacyView(viewsPayload, viewKey);
  const columns =
    selectedView?.settings?.visible_columns ||
    selectedView?.columns ||
    selectedView?.settings?.columns ||
    [];
  const normalizedColumns = Array.isArray(columns) ? columns : [];

  const projection = {
    visible_fields: normalizedColumns,
    field_order: normalizedColumns,
    title_field: null,
    default_sort: { field: "created_at", order: "desc" },
  };

  return createProjectionResult({
    source: "legacy_view",
    tenantId,
    objectTypeKey,
    viewKey,
    projection,
    warnings,
  });
}
