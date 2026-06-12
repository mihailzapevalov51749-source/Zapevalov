export function buildPageFullRequestParams(options = {}) {
  const params = {};

  if (options.officeAccess === true) {
    params.office_access = true;
  }

  const normalizedPortalId = Number(options.portalId);
  if (Number.isFinite(normalizedPortalId) && normalizedPortalId > 0) {
    params.portal_id = normalizedPortalId;
  }

  return params;
}
