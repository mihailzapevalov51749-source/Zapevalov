/**
 * Builds a designer-like view row from runtime projection API response.
 *
 * @param {Record<string, unknown> | null | undefined} projectionResponse
 */
export function buildPublishedViewRaw(projectionResponse) {
  if (!projectionResponse || typeof projectionResponse !== "object") {
    return null;
  }

  const publishedView = projectionResponse.view;
  const objectView =
    projectionResponse.objectView ||
    projectionResponse.object_view ||
    null;

  if (publishedView && typeof publishedView === "object") {
    const settings =
      publishedView.settings_json && typeof publishedView.settings_json === "object"
        ? { ...publishedView.settings_json }
        : {};

    if (objectView && typeof objectView === "object" && !settings.objectView) {
      settings.objectView = objectView;
    }

    const filtersJson =
      publishedView.filters_json && typeof publishedView.filters_json === "object"
        ? publishedView.filters_json
        : projectionResponse.filtersJson ||
          projectionResponse.filters_json ||
          {};

    return {
      id: publishedView.id ?? null,
      key: publishedView.key,
      name: publishedView.name,
      view_type: publishedView.view_type,
      is_default: publishedView.is_default,
      is_system: publishedView.is_system,
      settings_json: settings,
      filters_json: filtersJson,
      layout_json:
        publishedView.layout_json && typeof publishedView.layout_json === "object"
          ? publishedView.layout_json
          : {},
    };
  }

  if (!objectView || typeof objectView !== "object") {
    return null;
  }

  const viewKey = String(
    projectionResponse.view_key || projectionResponse.viewKey || objectView.key || "",
  ).trim();

  if (!viewKey) {
    return null;
  }

  return {
    id: null,
    key: viewKey,
    name: String(objectView.name || viewKey),
    view_type: String(objectView.viewType || "table"),
    is_default: false,
    is_system: false,
    settings_json: {
      objectView,
      projection: projectionResponse.projection || null,
    },
    filters_json:
      projectionResponse.filtersJson ||
      projectionResponse.filters_json ||
      {},
    layout_json: {},
  };
}
