/** @typedef {{ menuInTab: boolean }} ObjectTabSettings */

export const DEFAULT_OBJECT_TAB_SETTINGS = {
  menuInTab: false,
};

/**
 * @param {unknown} value
 * @returns {Record<string, unknown>}
 */
export function parseViewSettingsJson(value) {
  if (value == null) {
    return {};
  }

  if (typeof value === "string") {
    const trimmed = value.trim();

    if (!trimmed) {
      return {};
    }

    try {
      const parsed = JSON.parse(trimmed);
      return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
    } catch {
      return {};
    }
  }

  return typeof value === "object" && !Array.isArray(value) ? { ...value } : {};
}

/**
 * @param {Record<string, unknown> | null | undefined} view
 */
export function readViewSettingsJsonFromPublishedView(view) {
  if (!view || typeof view !== "object") {
    return {};
  }

  const raw = view.settings_json ?? view.settingsJson ?? null;
  return parseViewSettingsJson(raw);
}

/**
 * @param {Record<string, unknown> | null | undefined} settingsJson
 * @returns {ObjectTabSettings}
 */
export function readObjectTabSettings(settingsJson) {
  const settings = parseViewSettingsJson(settingsJson);
  const raw =
    settings.tabSettings && typeof settings.tabSettings === "object"
      ? settings.tabSettings
      : settings.objectTabSettings && typeof settings.objectTabSettings === "object"
        ? settings.objectTabSettings
        : settings.tab_settings && typeof settings.tab_settings === "object"
          ? settings.tab_settings
          : {};

  return {
    menuInTab: Boolean(raw.menuInTab ?? raw.menu_in_tab),
  };
}

/**
 * @param {Record<string, unknown> | null | undefined} settingsJson
 * @param {Partial<ObjectTabSettings>} tabSettings
 */
export function mergeObjectTabSettingsIntoViewSettings(settingsJson, tabSettings) {
  const settings = parseViewSettingsJson(settingsJson);
  const current = readObjectTabSettings(settings);
  const next = {
    ...current,
    ...(tabSettings && typeof tabSettings === "object" ? tabSettings : {}),
  };

  return {
    ...settings,
    tabSettings: {
      menuInTab: Boolean(next.menuInTab),
    },
  };
}
