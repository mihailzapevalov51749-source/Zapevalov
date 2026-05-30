/**
 * @param {Array<{ contract: import('./objectViewContract').ObjectViewContract, raw?: Record<string, unknown> }>} tableViews
 * @param {string | null | undefined} requestedViewKey
 */
export function resolveActiveTableView(tableViews, requestedViewKey) {
  const views = Array.isArray(tableViews) ? tableViews : [];

  if (!views.length) {
    return null;
  }

  const normalizedRequested = String(requestedViewKey || "").trim();

  if (normalizedRequested) {
    const match = views.find(
      (item) => String(item.contract?.key) === normalizedRequested,
    );
    if (match) {
      return match;
    }
  }

  const defaultFlag = views.find((item) => item.contract?.meta?.isDefault);
  if (defaultFlag) {
    return defaultFlag;
  }

  const defaultTable = views.find(
    (item) => String(item.contract?.key) === "default_table",
  );
  if (defaultTable) {
    return defaultTable;
  }

  return views[0];
}

/**
 * @param {unknown} rawView
 */
export function isTableViewDefinition(rawView) {
  const viewType = String(
    rawView?.view_type || rawView?.viewType || "table",
  ).toLowerCase();

  return viewType === "table";
}
