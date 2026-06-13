export function buildEmbeddedScopeKey(surfaceId, contextData = {}) {
  const tenantId = String(contextData.tenantId ?? "").trim();
  const widgetId = String(contextData.widgetId ?? contextData.viewId ?? "").trim();
  const selectedScope = String(
    contextData.selectedScope ?? contextData.scope ?? contextData.objectId ?? "",
  ).trim();

  return `${tenantId}:${String(surfaceId ?? "")}:${widgetId}:${selectedScope}`;
}
