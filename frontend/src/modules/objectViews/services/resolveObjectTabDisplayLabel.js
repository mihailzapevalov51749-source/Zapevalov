import { isTableBaseStateKey } from "../table/preferences/tableBaseState";
import { findCatalogObjectType } from "../table/services/adapters/ObjectTypeTableAdapter";

/** Keys that must never appear as object tab titles in UI. */
export const INTERNAL_OBJECT_TAB_DISPLAY_KEYS = new Set([
  "__table_all__",
  "table_all",
  "all",
]);

/**
 * Published/designer view rows for lookup ({ raw } or catalog view).
 */
export function getObjectTypeTableViewsFromCatalog(catalog, objectTypeKey) {
  const objectType = findCatalogObjectType(catalog, objectTypeKey);
  const views = objectType?.views;

  return Array.isArray(views) ? views : [];
}

function readViewRowLabel(row) {
  if (!row || typeof row !== "object") {
    return "";
  }

  const raw = row.raw && typeof row.raw === "object" ? row.raw : row;
  const contract = row.contract && typeof row.contract === "object" ? row.contract : null;

  const candidates = [
    raw.title,
    raw.name,
    raw.label,
    contract?.name,
    contract?.title,
    contract?.label,
  ];

  for (const candidate of candidates) {
    const normalized = String(candidate ?? "").trim();

    if (!normalized) {
      continue;
    }

    if (INTERNAL_OBJECT_TAB_DISPLAY_KEYS.has(normalized)) {
      continue;
    }

    return normalized;
  }

  return "";
}

/**
 * Resolves route object tab key (e.g. default_table) — never active representation key.
 */
export function resolveObjectTabRouteKey({
  routeViewKey = null,
  publishedTableViewKey = "default_table",
} = {}) {
  const routeKey = String(routeViewKey || "").trim();

  if (routeKey && !isTableBaseStateKey(routeKey)) {
    return routeKey;
  }

  const publishedKey = String(publishedTableViewKey || "").trim();

  if (publishedKey && !isTableBaseStateKey(publishedKey)) {
    return publishedKey;
  }

  return "default_table";
}

/**
 * Display name for Object View tab (Studio name: «Сказка»), not table representation.
 *
 * @param {{
 *   objectTabKey: string,
 *   catalog?: object | null,
 *   objectTypeKey?: string | null,
 *   tabLookupViews?: Array<object>,
 *   fallbackLabel?: string | null,
 * }} params
 */
export function resolveObjectTabDisplayLabel({
  objectTabKey,
  catalog = null,
  objectTypeKey = null,
  tabLookupViews = [],
  fallbackLabel = null,
}) {
  const key = String(objectTabKey || "").trim();

  if (!key || isTableBaseStateKey(key)) {
    return String(fallbackLabel || "Таблица").trim();
  }

  const lookupRows = [
    ...(Array.isArray(tabLookupViews) ? tabLookupViews : []),
    ...getObjectTypeTableViewsFromCatalog(catalog, objectTypeKey).map((raw) => ({
      raw,
    })),
  ];

  const match = lookupRows.find((row) => {
    const raw = row?.raw || row;
    const contract = row?.contract;
    const rowKey = String(raw?.key ?? contract?.key ?? "").trim();

    return rowKey === key;
  });

  const label = readViewRowLabel(match);

  if (label) {
    return label;
  }

  const fallback = String(fallbackLabel ?? "").trim();

  if (fallback && !INTERNAL_OBJECT_TAB_DISPLAY_KEYS.has(fallback)) {
    return fallback;
  }

  if (!INTERNAL_OBJECT_TAB_DISPLAY_KEYS.has(key)) {
    return key;
  }

  return "Таблица";
}
