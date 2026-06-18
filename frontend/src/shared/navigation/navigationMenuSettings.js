import { shouldApplySystemMenuSettings } from "./applySystemMenuSettingsToTree.js";
import { patchNavigationMenuSettings } from "./navigationMenuBlocks.js";
import {
  assignDistinctSortOrders,
  buildMovePreferencesPayload,
  buildMoveTenantSettingsPayload,
} from "./mergeRuntimeMenuLayers.js";
import {
  patchControlPlaneSystemMenuOrder,
  readControlPlaneSystemMenuSettings,
} from "../uiStorage/controlPlaneUiStorage.js";
import {
  getDesignerSystemMenuSettings,
  patchDesignerSystemMenuSettings,
  resolveDesignerSystemItemKey,
} from "../shell/sidebar/designerSystemMenuSettings.js";
import {
  readSystemMenuSettings,
  writeSystemMenuSettings,
} from "../uiStorage/systemMenuSettingsStorage.js";

async function loadRuntimeMenuSettingsApi() {
  return import("../../modules/navigation/api/runtimeMenuSettingsApi.js");
}

export function mapDesignerMenuSettingsToItemIds(rootItems = [], tenantId) {
  const designerSettings = getDesignerSystemMenuSettings(tenantId);
  const mapped = {};

  rootItems.forEach((item) => {
    const key = resolveDesignerSystemItemKey(item);
    if (!key) {
      return;
    }

    const itemSettings = designerSettings[key];
    if (!itemSettings || typeof itemSettings !== "object") {
      return;
    }

    mapped[String(item.id)] = itemSettings;
  });

  return mapped;
}

export function readNavigationMenuBlockSettings({
  menuProfile = "platform",
  tenantId = null,
  rootItems = [],
  tenantSettingsOverride = null,
} = {}) {
  if (menuProfile === "control-plane") {
    return readControlPlaneSystemMenuSettings();
  }

  const tenantSettings =
    tenantSettingsOverride ??
    (tenantId ? readSystemMenuSettings(tenantId) : {});

  if (menuProfile !== "designer") {
    return tenantSettings;
  }

  return {
    ...tenantSettings,
    ...mapDesignerMenuSettingsToItemIds(rootItems, tenantId),
  };
}

export async function persistNavigationMenuBlockMove({
  menuProfile = "platform",
  tenantId = null,
  itemsPayload = [],
  rootItems = [],
  reloadNavigation,
  preferenceScope = "tenant",
} = {}) {
  const normalizedItemsPayload = assignDistinctSortOrders(itemsPayload);
  const rootById = new Map(
    rootItems.map((item) => [String(item.id), item]),
  );

  if (menuProfile === "control-plane") {
    const settings = patchControlPlaneSystemMenuOrder(itemsPayload);
    return { settings, menuProfile };
  }

  const tenantEntries = [];
  const designerEntries = [];

  normalizedItemsPayload.forEach((entry) => {
    const itemId = String(entry?.id || "").trim();
    if (!itemId) {
      return;
    }

    const item = rootById.get(itemId);
    if (menuProfile === "designer" && itemId.startsWith("system-designer-")) {
      designerEntries.push({ entry, item: item || { id: itemId } });
      return;
    }

    tenantEntries.push(entry);
  });

  let tenantSettings = tenantId ? readSystemMenuSettings(tenantId) : {};
  if (tenantEntries.length > 0 && tenantId) {
    if (menuProfile === "platform") {
      const { putTenantRuntimeMenuSettingsBulk, putUserMenuPreferencesBulk } =
        await loadRuntimeMenuSettingsApi();
      if (preferenceScope === "user") {
        const preferences = buildMovePreferencesPayload(tenantEntries, rootItems);
        if (Object.keys(preferences).length > 0) {
          await putUserMenuPreferencesBulk(tenantId, preferences);
        }
      } else {
        const settings = buildMoveTenantSettingsPayload(tenantEntries, rootItems);
        if (Object.keys(settings).length > 0) {
          tenantSettings = await putTenantRuntimeMenuSettingsBulk(tenantId, settings);
        }
      }
    } else {
      tenantSettings = patchNavigationMenuSettings(tenantSettings, tenantEntries);
      writeSystemMenuSettings(tenantId, tenantSettings);
    }
  }

  if (designerEntries.length > 0 && tenantId) {
    await Promise.all(
      designerEntries.map(({ entry, item }) => {
        const itemKey = resolveDesignerSystemItemKey(item);
        if (!itemKey) {
          return Promise.resolve();
        }

        return patchDesignerSystemMenuSettings(tenantId, itemKey, {
          sort_order:
            typeof entry.sort_order === "number" && Number.isFinite(entry.sort_order)
              ? entry.sort_order
              : undefined,
          parent_id: entry.parent_id ?? null,
          block_id:
            typeof entry.block_id === "number" && Number.isFinite(entry.block_id)
              ? entry.block_id
              : undefined,
        });
      }),
    );
  }

  const customDbPayload = normalizedItemsPayload
    .filter((entry) => {
      const itemId = String(entry?.id || "").trim();
      if (!itemId) {
        return false;
      }

      if (menuProfile === "designer" && itemId.startsWith("system-designer-")) {
        return false;
      }

      const item = rootById.get(itemId);
      return item && !shouldApplySystemMenuSettings(item);
    })
    .map(({ id, parent_id, sort_order }) => ({
      id,
      parent_id: parent_id ?? null,
      sort_order,
    }));

  if (customDbPayload.length > 0 && tenantId) {
    const { navigationService } = await import(
      "../../modules/navigation/services/navigationService.js"
    );
    await navigationService.moveItems(tenantId, customDbPayload);
  }

  const didPersist =
    tenantEntries.length > 0 ||
    designerEntries.length > 0 ||
    customDbPayload.length > 0;

  if (didPersist && typeof reloadNavigation === "function") {
    await reloadNavigation();
  }

  return {
    settings: readNavigationMenuBlockSettings({
      menuProfile,
      tenantId,
      rootItems,
    }),
    menuProfile,
  };
}
