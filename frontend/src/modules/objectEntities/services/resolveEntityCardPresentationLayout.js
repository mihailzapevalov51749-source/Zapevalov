import { findCatalogObjectType } from "../../objectViews/table/services/adapters/ObjectTypeTableAdapter";

/**
 * Reads presentation.card from a catalog/runtime view row (settings_json.objectView first).
 *
 * @param {Record<string, unknown> | null | undefined} view
 * @returns {Record<string, unknown> | null}
 */
export function extractCardLayoutFromCatalogView(view) {
  if (!view || typeof view !== "object") {
    return null;
  }

  const topPresentation = view.presentation || view.config?.presentation;
  const topCard = topPresentation?.card;
  if (topCard && typeof topCard === "object") {
    return topCard;
  }

  const settings =
    view.settings_json && typeof view.settings_json === "object"
      ? view.settings_json
      : view.settingsJson && typeof view.settingsJson === "object"
        ? view.settingsJson
        : null;

  const objectView =
    settings?.objectView && typeof settings.objectView === "object"
      ? settings.objectView
      : null;

  const card = objectView?.presentation?.card;
  return card && typeof card === "object" ? card : null;
}

/** @param {unknown} card */
export function hasUsableCardLayout(card) {
  return (
    card &&
    typeof card === "object" &&
    Array.isArray(card.sections) &&
    card.sections.length > 0
  );
}

/**
 * Resolves card layout for render: session/view contract first, then Studio persistence view, then published catalog.
 *
 * @param {{
 *   effectiveCardLayout?: Record<string, unknown> | null,
 *   persistenceCardLayout?: Record<string, unknown> | null,
 *   catalog?: Record<string, unknown> | null,
 *   objectTypeKey?: string | null,
 *   publishedViewKey?: string | null,
 * }} [params]
 * @returns {Record<string, unknown> | null}
 */
export function resolveEntityCardLayoutForRender({
  effectiveCardLayout = null,
  persistenceCardLayout = null,
  catalog = null,
  objectTypeKey = null,
  publishedViewKey = "default_table",
} = {}) {
  if (hasUsableCardLayout(effectiveCardLayout)) {
    return effectiveCardLayout;
  }

  if (hasUsableCardLayout(persistenceCardLayout)) {
    return persistenceCardLayout;
  }

  return resolveEntityCardPresentationLayout({
    effectiveCardLayout: null,
    catalog,
    objectTypeKey,
    publishedViewKey,
  });
}

/**
 * Card layout for entity modal: active view contract first, then published table view.
 *
 * @param {{
 *   effectiveCardLayout?: Record<string, unknown> | null,
 *   catalog?: Record<string, unknown> | null,
 *   objectTypeKey?: string | null,
 *   publishedViewKey?: string | null,
 * }} [params]
 * @returns {Record<string, unknown> | null}
 */
export function resolveEntityCardPresentationLayout({
  effectiveCardLayout = null,
  catalog = null,
  objectTypeKey = null,
  publishedViewKey = "default_table",
} = {}) {
  if (hasUsableCardLayout(effectiveCardLayout)) {
    return effectiveCardLayout;
  }

  const objectType = findCatalogObjectType(catalog, objectTypeKey);
  const views = Array.isArray(objectType?.views) ? objectType.views : [];
  const key = String(publishedViewKey || "default_table").trim();

  const preferredView =
    views.find((view) => String(view?.key || "").trim() === key) ||
    views.find((view) => view?.is_default === true || view?.isDefault === true) ||
    views[0] ||
    null;

  if (!preferredView) {
    return null;
  }

  return extractCardLayoutFromCatalogView(preferredView);
}
