import { platformApiClient } from "../../api/authenticatedApiClient";

const homePageIdByPortal = new Map();

async function fetchPortalHomePageId(normalizedPortalId) {
  const { data } = await platformApiClient.get(`/pages/portal/${normalizedPortalId}`);
  const pages = Array.isArray(data) ? data : [];
  const homePage =
    pages.find((page) => page?.is_home === true) ||
    pages.find((page) => page?.isHome === true) ||
    pages[0];
  const pageId = Number(homePage?.id);
  return Number.isFinite(pageId) && pageId > 0 ? pageId : null;
}

function readCachedHomePageId(normalizedPortalId, { strict = false } = {}) {
  if (!homePageIdByPortal.has(normalizedPortalId)) {
    return undefined;
  }

  const cached = homePageIdByPortal.get(normalizedPortalId);
  if (!Number.isFinite(cached) || cached <= 0) {
    return undefined;
  }

  if (strict && normalizedPortalId !== 1 && cached === 1) {
    return undefined;
  }

  return cached;
}

export async function resolvePortalHomePageId(portalId) {
  const normalizedPortalId = Number(portalId);
  if (!Number.isFinite(normalizedPortalId) || normalizedPortalId <= 0) {
    return 1;
  }

  const cached = readCachedHomePageId(normalizedPortalId);
  if (cached != null) {
    return cached;
  }

  try {
    const pageId = await fetchPortalHomePageId(normalizedPortalId);
    const resolvedPageId = pageId ?? 1;
    homePageIdByPortal.set(normalizedPortalId, resolvedPageId);
    return resolvedPageId;
  } catch {
    return 1;
  }
}

export async function resolvePortalHomePageIdStrict(portalId) {
  const normalizedPortalId = Number(portalId);
  if (!Number.isFinite(normalizedPortalId) || normalizedPortalId <= 0) {
    return null;
  }

  const cached = readCachedHomePageId(normalizedPortalId, { strict: true });
  if (cached != null) {
    return cached;
  }

  try {
    const pageId = await fetchPortalHomePageId(normalizedPortalId);
    if (pageId != null) {
      homePageIdByPortal.set(normalizedPortalId, pageId);
    }
    return pageId;
  } catch {
    return null;
  }
}

/**
 * @param {number | string} portalId
 * @param {{ strict?: boolean }} [options]
 * @returns {Promise<string | null>}
 */
export async function resolvePortalHomePagePath(portalId, options = {}) {
  const strict = options.strict === true;
  const normalizedPortalId = Number(portalId);
  if (!Number.isFinite(normalizedPortalId) || normalizedPortalId <= 0) {
    return strict ? null : `/portal/1/page/1`;
  }

  const pageId = strict
    ? await resolvePortalHomePageIdStrict(normalizedPortalId)
    : await resolvePortalHomePageId(normalizedPortalId);

  if (pageId == null) {
    return null;
  }

  return `/portal/${normalizedPortalId}/page/${pageId}`;
}

export function peekPortalHomePagePath(portalId) {
  const normalizedPortalId = Number(portalId);
  if (!Number.isFinite(normalizedPortalId) || normalizedPortalId <= 0) {
    return null;
  }

  const cached = readCachedHomePageId(normalizedPortalId, { strict: true });
  if (cached == null) {
    return null;
  }

  return `/portal/${normalizedPortalId}/page/${cached}`;
}

export function primePortalHomePageCache(portalId, pageId) {
  const normalizedPortalId = Number(portalId);
  const normalizedPageId = Number(pageId);
  if (
    !Number.isFinite(normalizedPortalId) ||
    normalizedPortalId <= 0 ||
    !Number.isFinite(normalizedPageId) ||
    normalizedPageId <= 0
  ) {
    return;
  }

  homePageIdByPortal.set(normalizedPortalId, normalizedPageId);
}

export function clearPortalHomePageCache(portalId = null) {
  if (portalId == null) {
    homePageIdByPortal.clear();
    return;
  }

  const normalizedPortalId = Number(portalId);
  if (Number.isFinite(normalizedPortalId) && normalizedPortalId > 0) {
    homePageIdByPortal.delete(normalizedPortalId);
  }
}
