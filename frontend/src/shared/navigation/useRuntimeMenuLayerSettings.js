import { useCallback, useEffect, useMemo, useState } from "react";

import {
  fetchTenantRuntimeMenuSettings,
  fetchUserMenuPreferences,
  putTenantRuntimeMenuSetting,
  putTenantRuntimeMenuSettingsBulk,
  putUserMenuPreference,
  putUserMenuPreferencesBulk,
  resetUserMenuPreferences,
} from "../../modules/navigation/api/runtimeMenuSettingsApi.js";
import {
  applyUserMenuPreferencesToTree,
  buildMoveTenantSettingsPayload,
  buildMovePreferencesPayload,
  buildTenantMenuSettingPayload,
  buildUserMenuPreferencePayload,
  mergeTenantSettingsState,
  resolveCanonicalTenantSettingsKeys,
  sanitizeLegacyTenantSettingsForItems,
  sanitizeTenantSettingsByKey,
  sanitizeUserPreferencesByKey,
  tenantSettingsToItemMap,
  userPreferencesToItemMap,
} from "./mergeRuntimeMenuLayers.js";
import {
  applySystemMenuSettingsToTree,
  sortNavigationTreeBySortOrder,
} from "./applySystemMenuSettingsToTree.js";
import { readSystemMenuSettings } from "../uiStorage/systemMenuSettingsStorage.js";

function normalizeLoadedTenantSettings(navigationItems, tenantSettings) {
  const resolved = resolveCanonicalTenantSettingsKeys(
    navigationItems,
    tenantSettings || {},
  );
  return sanitizeTenantSettingsByKey(navigationItems, resolved);
}

export function useRuntimeMenuLayerSettings({
  tenantId,
  navigationItems = [],
  enabled = true,
  applyUserPreferences = false,
  loadUserPreferences = false,
}) {
  const [tenantSettingsByKey, setTenantSettingsByKey] = useState({});
  const [userPreferencesByKey, setUserPreferencesByKey] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState(null);

  const reload = useCallback(async () => {
    if (!enabled || !tenantId) {
      setTenantSettingsByKey({});
      setUserPreferencesByKey({});
      return;
    }

    setIsLoading(true);
    setLoadError(null);

    try {
      const tenantSettings = await fetchTenantRuntimeMenuSettings(tenantId);
      const userPreferences = loadUserPreferences
        ? await fetchUserMenuPreferences(tenantId)
        : {};

      const hasTenantApiSettings = Object.keys(tenantSettings || {}).length > 0;
      if (!hasTenantApiSettings) {
        const legacyLocal = readSystemMenuSettings(tenantId);
        setTenantSettingsByKey(
          sanitizeLegacyTenantSettingsForItems(navigationItems, legacyLocal || {}),
        );
      } else {
        setTenantSettingsByKey(
          normalizeLoadedTenantSettings(navigationItems, tenantSettings || {}),
        );
      }

      setUserPreferencesByKey(
        loadUserPreferences
          ? sanitizeUserPreferencesByKey(navigationItems, userPreferences || {})
          : {},
      );
    } catch (error) {
      console.error("Failed to load runtime menu layer settings:", error);
      setLoadError(error);
      setTenantSettingsByKey(
        sanitizeLegacyTenantSettingsForItems(
          navigationItems,
          readSystemMenuSettings(tenantId) || {},
        ),
      );
      setUserPreferencesByKey({});
    } finally {
      setIsLoading(false);
    }
  }, [enabled, tenantId, navigationItems, loadUserPreferences]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const tenantSettingsByItemId = useMemo(
    () => tenantSettingsToItemMap(navigationItems, tenantSettingsByKey),
    [navigationItems, tenantSettingsByKey],
  );

  const userPreferencesByItemId = useMemo(
    () =>
      applyUserPreferences
        ? userPreferencesToItemMap(navigationItems, userPreferencesByKey)
        : {},
    [applyUserPreferences, navigationItems, userPreferencesByKey],
  );

  const applyMenuLayers = useCallback(
    (tree = []) => {
      const withTenant = applySystemMenuSettingsToTree(tree, tenantSettingsByItemId);
      if (!applyUserPreferences) {
        return sortNavigationTreeBySortOrder(withTenant);
      }

      const withUser = applyUserMenuPreferencesToTree(withTenant, {
        userPrefsByItemId: userPreferencesByItemId,
        tenantSettingsByItemId: tenantSettingsByItemId,
      });
      return sortNavigationTreeBySortOrder(withUser);
    },
    [tenantSettingsByItemId, userPreferencesByItemId, applyUserPreferences],
  );

  const saveTenantMenuItem = useCallback(
    async (item, data) => {
      if (!tenantId) {
        return null;
      }

      const built = buildTenantMenuSettingPayload(item, data);
      if (!built?.itemKey) {
        return null;
      }

      const saved = await putTenantRuntimeMenuSetting(tenantId, built.itemKey, built.payload);
      setTenantSettingsByKey((current) =>
        mergeTenantSettingsState(current, {
          [built.itemKey]: saved,
        }),
      );
      return saved;
    },
    [tenantId],
  );

  const saveUserMenuItem = useCallback(
    async (item, data) => {
      if (!tenantId) {
        return null;
      }

      const built = buildUserMenuPreferencePayload(item, data);
      if (!built?.itemKey) {
        return null;
      }

      const saved = await putUserMenuPreference(tenantId, built.itemKey, built.payload);
      setUserPreferencesByKey((current) => ({
        ...current,
        [built.itemKey]: saved,
      }));
      return saved;
    },
    [tenantId],
  );

  const saveTenantMove = useCallback(
    async (itemsPayload, rootItems) => {
      if (!tenantId) {
        return {};
      }

      const settings = buildMoveTenantSettingsPayload(itemsPayload, rootItems);
      if (!Object.keys(settings).length) {
        return tenantSettingsByKey;
      }

      const saved = await putTenantRuntimeMenuSettingsBulk(tenantId, settings);
      setTenantSettingsByKey((current) =>
        normalizeLoadedTenantSettings(
          rootItems,
          mergeTenantSettingsState(current, saved),
        ),
      );
      return saved;
    },
    [tenantId],
  );

  const saveUserMove = useCallback(
    async (itemsPayload, rootItems) => {
      if (!tenantId) {
        return {};
      }

      const preferences = buildMovePreferencesPayload(itemsPayload, rootItems);
      if (!Object.keys(preferences).length) {
        return userPreferencesByKey;
      }

      const saved = await putUserMenuPreferencesBulk(tenantId, preferences);
      setUserPreferencesByKey((current) =>
        mergeTenantSettingsState(current, saved),
      );
      return saved;
    },
    [tenantId],
  );

  const resetUserPreferences = useCallback(async () => {
    if (!tenantId) {
      return;
    }

    await resetUserMenuPreferences(tenantId);
    setUserPreferencesByKey({});
  }, [tenantId]);

  const applyLocalUserPreferencesMove = useCallback((preferencesMap = {}) => {
    if (!preferencesMap || typeof preferencesMap !== "object") {
      return;
    }

    setUserPreferencesByKey((current) => {
      const next = { ...current };

      Object.entries(preferencesMap).forEach(([itemKey, payload]) => {
        if (!itemKey || !payload || typeof payload !== "object") {
          return;
        }

        next[itemKey] = {
          ...(current[itemKey] && typeof current[itemKey] === "object"
            ? current[itemKey]
            : {}),
          item_key: itemKey,
          ...payload,
        };
      });

      return next;
    });
  }, []);

  return {
    isLoading,
    loadError,
    reload,
    tenantSettingsByKey,
    userPreferencesByKey,
    tenantSettingsByItemId,
    userPreferencesByItemId,
    applyMenuLayers,
    saveTenantMenuItem,
    saveUserMenuItem,
    saveTenantMove,
    saveUserMove,
    resetUserPreferences,
    applyLocalUserPreferencesMove,
  };
}
