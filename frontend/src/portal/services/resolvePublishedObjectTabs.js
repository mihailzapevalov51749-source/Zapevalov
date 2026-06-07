/**
 * Published Object Tabs (Studio → «Вкладки объекта») for Office runtime header.
 * Excludes table user representations and internal base-state keys.
 */

import { readObjectTabSettings, readViewSettingsJsonFromPublishedView } from "../../modules/objectViews/services/objectTabSettings";
import { INTERNAL_OBJECT_TAB_DISPLAY_KEYS } from "../../modules/objectViews/services/resolveObjectTabDisplayLabel";

function readTabLabel(view) {
  const candidates = [view?.name, view?.title, view?.label];

  for (const candidate of candidates) {
    const normalized = String(candidate ?? "").trim();

    if (!normalized || INTERNAL_OBJECT_TAB_DISPLAY_KEYS.has(normalized)) {
      continue;
    }

    return normalized;
  }

  return "";
}

function readTabKey(view) {
  return String(view?.key ?? "").trim();
}

/**
 * @param {object | null | undefined} objectType Published catalog object type row.
 * @returns {Array<{ key: string, name: string, viewType: string, isDefault: boolean, sortOrder: number, menuInTab: boolean }>}
 */
export function resolvePublishedObjectTabs(objectType) {
  const views = Array.isArray(objectType?.views) ? objectType.views : [];

  const tabs = views
    .map((view) => {
      const key = readTabKey(view);

      if (!key || INTERNAL_OBJECT_TAB_DISPLAY_KEYS.has(key)) {
        return null;
      }

      const name = readTabLabel(view);

      if (!name) {
        return null;
      }

      const viewSettingsJson = readViewSettingsJsonFromPublishedView(view);
      const menuInTab = readObjectTabSettings(viewSettingsJson).menuInTab;

      return {
        key,
        name,
        viewType: String(view?.view_type || view?.viewType || "table")
          .trim()
          .toLowerCase(),
        isDefault: Boolean(view?.is_default ?? view?.isDefault),
        sortOrder: Number(view?.sort_order ?? view?.sortOrder ?? 0),
        isActive: view?.is_active !== false && view?.isActive !== false,
        menuInTab,
      };
    })
    .filter(Boolean)
    .filter((tab) => tab.isActive);

  tabs.sort((left, right) => {
    if (left.sortOrder !== right.sortOrder) {
      return left.sortOrder - right.sortOrder;
    }

    return left.name.localeCompare(right.name, "ru");
  });

  return tabs;
}

/**
 * @param {ReturnType<typeof resolvePublishedObjectTabs>} tabs
 * @param {string | null | undefined} requestedKey
 */
export function resolveDefaultPublishedObjectTabKey(tabs, requestedKey = null) {
  const list = Array.isArray(tabs) ? tabs : [];
  const normalizedRequested = String(requestedKey || "").trim();

  if (normalizedRequested) {
    const match = list.find((tab) => tab.key === normalizedRequested);

    if (match) {
      return match.key;
    }
  }

  const defaultTab = list.find((tab) => tab.isDefault);

  if (defaultTab?.key) {
    return defaultTab.key;
  }

  return list[0]?.key || null;
}

/**
 * @param {ReturnType<typeof resolvePublishedObjectTabs>} tabs
 * @param {string | null | undefined} activeKey
 */
export function findPublishedObjectTab(tabs, activeKey) {
  const list = Array.isArray(tabs) ? tabs : [];
  const normalized = String(activeKey || "").trim();

  if (!normalized) {
    return null;
  }

  return list.find((tab) => tab.key === normalized) || null;
}
