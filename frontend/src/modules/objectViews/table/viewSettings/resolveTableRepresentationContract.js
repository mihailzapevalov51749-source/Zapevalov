/**
 * Контракт Table Representation по ключу из списка views.
 * Не использует Object View tab label («Таблица») при несовпадении ключа.
 */
export function resolveTableRepresentationContract(
  views = [],
  viewKey = "",
  fallbackContract = null,
) {
  const normalizedKey = String(viewKey || "").trim();

  if (!normalizedKey) {
    return fallbackContract;
  }

  for (const item of views) {
    if (!item) {
      continue;
    }

    const contract = item?.contract || item;
    const contractKey = String(contract?.key || "").trim();
    const contractViewId = String(contract?.meta?.viewId || "").trim();

    if (contractKey === normalizedKey || contractViewId === normalizedKey) {
      return contract;
    }
  }

  const fallbackKey = String(fallbackContract?.key || "").trim();

  if (fallbackContract && fallbackKey === normalizedKey) {
    return fallbackContract;
  }

  return null;
}
