export const DESIGNER_OBJECT_VIEW_HEADER_EVENT =
  "yasnopro:designer-object-view:header";

/**
 * Publishes active object view context for DesignerShell breadcrumbs (Studio data route).
 * @param {{
 *   objectTypeId?: string,
 *   activeAdapterType?: string,
 *   activeAdapterLabel?: string,
 *   activeRepresentationKey?: string,
 *   activeRepresentationName?: string,
 * } | null} detail
 */
export function publishDesignerObjectViewHeader(detail) {
  window.dispatchEvent(
    new CustomEvent(DESIGNER_OBJECT_VIEW_HEADER_EVENT, { detail: detail ?? null }),
  );
}

export function clearDesignerObjectViewHeader() {
  publishDesignerObjectViewHeader(null);
}
