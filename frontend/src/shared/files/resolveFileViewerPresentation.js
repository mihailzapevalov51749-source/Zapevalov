export const FILE_VIEWER_PRESENTATION_WORKSPACE = "workspace";
export const FILE_VIEWER_PRESENTATION_OVERLAY = "overlay";

/**
 * @param {Record<string, unknown>} payload
 * @returns {"workspace" | "overlay"}
 */
export function resolveFileViewerPresentation(payload = {}) {
  const explicit = String(payload.presentation || "").trim().toLowerCase();

  if (
    explicit === FILE_VIEWER_PRESENTATION_WORKSPACE ||
    explicit === FILE_VIEWER_PRESENTATION_OVERLAY
  ) {
    return explicit;
  }

  const sourceType = String(
    payload.sourceType || payload.source_type || "",
  ).trim();

  if (sourceType === "object_entity_attachment") {
    return FILE_VIEWER_PRESENTATION_WORKSPACE;
  }

  return FILE_VIEWER_PRESENTATION_OVERLAY;
}
