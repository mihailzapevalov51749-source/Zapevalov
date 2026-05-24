import { findNavigationItemsByPageId } from "../../../portal/utils/portalPageUtils";

import { updateExistingTableTitleInList } from "./existingTablesListState";
import { isUniversalTableNavigationItem } from "./resolvePrimaryTableId";

function normalizePageId(value) {
  const normalized = String(value ?? "").trim();
  return /^\d+$/.test(normalized) ? normalized : "";
}

function isDedicatedUniversalTablePageId(navigation, pageId) {
  const normalizedPageId = normalizePageId(pageId);
  if (!normalizedPageId) return false;

  const navItems = findNavigationItemsByPageId(navigation, normalizedPageId);

  return navItems.some((navItem) => isUniversalTableNavigationItem(navItem));
}

export async function syncUniversalTableTitleAcrossUi({
  tableId,
  title,
  pageId,
  pageData,
  navigation,
  updateNavigationItem,
  updatePage,
  onPageTitleDraft,
  onPageDataUpdate,
  activeNavigationItem,
  dedicatedPageId,
}) {
  const normalizedTitle = String(title || "").trim();

  if (!tableId || !normalizedTitle) return;

  updateExistingTableTitleInList(tableId, normalizedTitle);

  const relatedPageIds = new Set();
  const normalizedPageId = normalizePageId(pageId);
  const normalizedDedicatedPageId = normalizePageId(dedicatedPageId);

  if (
    normalizedPageId &&
    isDedicatedUniversalTablePageId(navigation, normalizedPageId)
  ) {
    relatedPageIds.add(normalizedPageId);
  }

  if (
    normalizedDedicatedPageId &&
    isDedicatedUniversalTablePageId(navigation, normalizedDedicatedPageId)
  ) {
    relatedPageIds.add(normalizedDedicatedPageId);
  }

  const isViewingDedicatedTablePage =
    isUniversalTableNavigationItem(activeNavigationItem);

  if (isViewingDedicatedTablePage) {
    onPageTitleDraft?.(normalizedTitle);
  }

  for (const relatedPageId of relatedPageIds) {
    const navItems = findNavigationItemsByPageId(navigation, relatedPageId);

    for (const navItem of navItems) {
      if (!isUniversalTableNavigationItem(navItem)) {
        continue;
      }

      await updateNavigationItem(navItem.id, { title: normalizedTitle });
    }

    if (typeof updatePage !== "function") {
      continue;
    }

    const isCurrentLoadedPage =
      pageData?.page?.id &&
      String(pageData.page.id) === String(relatedPageId);

    if (isCurrentLoadedPage) {
      const savedPage = await updatePage(pageData.page.id, {
        title: normalizedTitle,
      });

      onPageDataUpdate?.(savedPage);

      if (isViewingDedicatedTablePage) {
        onPageTitleDraft?.(savedPage?.title || normalizedTitle);
      }

      continue;
    }

    await updatePage(relatedPageId, { title: normalizedTitle });
  }
}
