export const BROWSER_TITLE_FALLBACK = "YasnoPro";
export const BROWSER_TITLE_SEPARATOR = " — ";

/**
 * Browser tab title: "{pageTitle} — {scopeName}".
 * @param {string | null | undefined} pageTitle
 * @param {string | null | undefined} scopeName
 */
export function buildBrowserTitle(pageTitle, scopeName) {
  const normalizedPageTitle = String(pageTitle || "").trim();
  const normalizedScopeName = String(scopeName || "").trim();

  if (normalizedPageTitle && normalizedScopeName) {
    return `${normalizedPageTitle}${BROWSER_TITLE_SEPARATOR}${normalizedScopeName}`;
  }
  if (normalizedScopeName) {
    return normalizedScopeName;
  }
  if (normalizedPageTitle) {
    return normalizedPageTitle;
  }
  return BROWSER_TITLE_FALLBACK;
}
