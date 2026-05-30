import { ObjectViewHost } from "../objectViews";

const DEFAULT_VIEW_LABEL = "Таблица";

/**
 * @deprecated Prefer ObjectViewHost directly.
 * Compatibility wrapper for existing entry points.
 */
export default function ObjectTypeDataTableView({
  tenantId,
  objectTypeId = null,
  objectTypeKey,
  viewKey = null,
  viewLabel = DEFAULT_VIEW_LABEL,
  limit = 20,
  minHeight = 320,
  viewsSettingsPath = null,
  showToolbar = true,
  showSelectionColumn = true,
  showRowNumberColumn = true,
  mode = "data",
}) {
  void viewsSettingsPath;

  return (
    <ObjectViewHost
      tenantId={tenantId}
      objectTypeId={objectTypeId ?? null}
      objectTypeKey={objectTypeKey}
      viewKey={viewKey}
      viewType="table"
      mode={mode}
      pageSize={limit}
      viewLabel={viewLabel}
      minHeight={minHeight}
      showToolbar={showToolbar}
      showSelectionColumn={showSelectionColumn}
      showRowNumberColumn={showRowNumberColumn}
    />
  );
}
