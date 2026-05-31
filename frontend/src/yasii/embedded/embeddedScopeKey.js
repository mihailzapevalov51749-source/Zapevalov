export function buildEmbeddedScopeKey(surfaceId, contextData = {}) {
  const widgetId = String(contextData.widgetId ?? contextData.viewId ?? "").trim();
  const selectedScope = String(
    contextData.selectedScope ?? contextData.scope ?? contextData.objectId ?? "",
  ).trim();

  return `${String(surfaceId ?? "")}:${widgetId}:${selectedScope}`;
}
