export const PORTAL_OBJECT_VIEW_HEADER_EVENT =
  "yasnopro:portal-object-view:header";

/**
 * Publishes active object view context for Office portal object breadcrumbs.
 * @param {{
 *   objectTypeId?: string,
 *   objectTypeKey?: string,
 *   activeAdapterType?: string,
 *   activeAdapterLabel?: string,
 *   activeRepresentationKey?: string,
 *   activeRepresentationName?: string,
 * } | null} detail
 */
export function publishPortalObjectViewHeader(detail) {
  window.dispatchEvent(
    new CustomEvent(PORTAL_OBJECT_VIEW_HEADER_EVENT, { detail: detail ?? null }),
  );
}

export function clearPortalObjectViewHeader() {
  publishPortalObjectViewHeader(null);
}
