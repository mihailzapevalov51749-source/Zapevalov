export const PORTAL_OBJECT_VIEW_HEADER_EVENT =
  "yasnopro:portal-object-view:header";

/**
 * Publishes active object view context for Office portal object breadcrumbs
 * and workspace tab menu placement (menuInTab).
 * @param {{
 *   tenantId?: number | string | null,
 *   objectTypeId?: string,
 *   objectTypeKey?: string,
 *   objectName?: string,
 *   activeAdapterType?: string,
 *   activeAdapterLabel?: string,
 *   activeObjectTabKey?: string,
 *   activeRepresentationKey?: string,
 *   activeRepresentationName?: string,
 *   menuInTab?: boolean,
 *   hideObjectTabBar?: boolean,
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
