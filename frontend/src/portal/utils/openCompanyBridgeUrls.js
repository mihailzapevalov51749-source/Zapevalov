export function normalizeBaseUrl(value) {
  return String(value || "").trim().replace(/\/$/, "");
}

export function buildCompanyPortalPath(catalogItem) {
  if (!catalogItem || typeof catalogItem !== "object") {
    return null;
  }

  const portalId = Number(catalogItem.portal_id ?? catalogItem.id);
  const homePageId = Number(catalogItem.home_page_id);

  if (!Number.isFinite(portalId) || portalId <= 0) {
    return null;
  }
  if (!Number.isFinite(homePageId) || homePageId <= 0) {
    return null;
  }

  return `/portal/${portalId}/page/${homePageId}`;
}

export function buildSessionBridgeEntryUrl({
  frontendBaseUrl,
  bridgeTicket,
  redirectPath,
}) {
  const base = normalizeBaseUrl(frontendBaseUrl);
  const ticket = String(bridgeTicket || "").trim();
  const redirect = String(redirectPath || "").trim();

  if (!base || !ticket || !redirect.startsWith("/")) {
    return null;
  }

  const params = new URLSearchParams({
    ticket,
    redirect,
  });

  return `${base}/auth/session-bridge-entry?${params.toString()}`;
}

export function buildCompanyOpenUrl(catalogItem) {
  if (!catalogItem || typeof catalogItem !== "object") {
    return null;
  }

  const openUrl = String(catalogItem.open_url || "").trim();
  if (openUrl) {
    return openUrl;
  }

  const portalPath = buildCompanyPortalPath(catalogItem);
  const frontendBaseUrl = normalizeBaseUrl(catalogItem.frontend_base_url);
  if (!portalPath || !frontendBaseUrl) {
    return null;
  }

  return `${frontendBaseUrl}${portalPath}`;
}
