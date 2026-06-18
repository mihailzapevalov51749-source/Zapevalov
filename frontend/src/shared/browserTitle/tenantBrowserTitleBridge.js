export const TENANT_BROWSER_PAGE_TITLE_EVENT = "yasnopro:tenant-browser-page-title";

let currentPageTitle = null;

function normalizePageTitle(value) {
  const normalized = String(value || "").trim();
  return normalized || null;
}

export function publishTenantBrowserPageTitle(pageTitle) {
  currentPageTitle = normalizePageTitle(pageTitle);
  if (typeof window === "undefined") {
    return currentPageTitle;
  }

  window.dispatchEvent(
    new CustomEvent(TENANT_BROWSER_PAGE_TITLE_EVENT, {
      detail: { pageTitle: currentPageTitle },
    }),
  );
  return currentPageTitle;
}

export function clearTenantBrowserPageTitle() {
  return publishTenantBrowserPageTitle(null);
}

export function peekTenantBrowserPageTitle() {
  return currentPageTitle;
}
