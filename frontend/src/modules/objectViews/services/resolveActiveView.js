/**
 * Stable identity for Office/Designer view rows (never compare by display name).
 *
 * @param {{ id?: string, key?: string, viewKey?: string, view_key?: string, contract?: { key?: string, meta?: { userViewId?: string, viewId?: string | number } } } | null | undefined} view
 */
export function getViewIdentity(view) {
  if (!view) {
    return "";
  }

  const contract = view.contract || view;
  const meta = contract?.meta || view?.meta;

  const candidates = [
    contract?.key,
    view.key,
    view.viewKey,
    view.view_key,
    meta?.userViewId,
    meta?.viewId,
    view.id,
  ];

  for (const candidate of candidates) {
    const normalized = String(candidate ?? "").trim();

    if (normalized) {
      return normalized;
    }
  }

  return "";
}

/**
 * Resolve any object tab view (table, plan, card, …) by stable tab key.
 *
 * @param {Array<{ contract?: import('./objectViewContract').ObjectViewContract, raw?: Record<string, unknown> }>} tabViews
 * @param {string | null | undefined} requestedViewKey
 */
export function resolveActiveObjectTabView(tabViews, requestedViewKey) {
  const views = Array.isArray(tabViews) ? tabViews : [];
  const normalizedRequested = String(requestedViewKey || "").trim();

  if (!normalizedRequested || !views.length) {
    return null;
  }

  return (
    views.find((item) => {
      const contractKey = String(item?.contract?.key || item?.raw?.key || "").trim();
      return contractKey === normalizedRequested;
    }) || null
  );
}

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
    const match = views.find((item) => {
      const contractKey = String(item.contract?.key || "").trim();
      const userViewId = String(item.contract?.meta?.userViewId || "").trim();

      return (
        contractKey === normalizedRequested || userViewId === normalizedRequested
      );
    });

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
