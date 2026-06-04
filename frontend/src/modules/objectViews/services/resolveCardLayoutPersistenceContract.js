/**
 * Resolves the view contract used to persist card layout in Studio.
 * Table base state «Все» has no viewId; card layout is stored on the published table view.
 *
 * @param {{
 *   effectiveContract?: import('./objectViewContract').ObjectViewContract | null,
 *   resolvedContract?: import('./objectViewContract').ObjectViewContract | null,
 *   publishedTableViewKey?: string | null,
 *   isTableBaseStateActive?: boolean,
 *   viewDefinitions?: Array<{ contract?: import('./objectViewContract').ObjectViewContract }>,
 * }} [params]
 * @returns {import('./objectViewContract').ObjectViewContract | null}
 */
export function resolveCardLayoutPersistenceContract({
  effectiveContract = null,
  resolvedContract = null,
  publishedTableViewKey = "default_table",
  isTableBaseStateActive = false,
  viewDefinitions = [],
} = {}) {
  if (effectiveContract?.meta?.viewId) {
    return effectiveContract;
  }

  if (resolvedContract?.meta?.viewId) {
    return resolvedContract;
  }

  if (!isTableBaseStateActive) {
    return null;
  }

  const publishedKey = String(publishedTableViewKey || "default_table").trim();
  const definitions = Array.isArray(viewDefinitions) ? viewDefinitions : [];

  const byPublishedKey = definitions.find(
    (item) => String(item?.contract?.key || "").trim() === publishedKey,
  );
  if (byPublishedKey?.contract?.meta?.viewId) {
    return byPublishedKey.contract;
  }

  const defaultFlagged = definitions.find(
    (item) => item?.contract?.meta?.isDefault === true,
  );
  if (defaultFlagged?.contract?.meta?.viewId) {
    return defaultFlagged.contract;
  }

  const withViewId = definitions.find((item) => item?.contract?.meta?.viewId);
  return withViewId?.contract || null;
}
