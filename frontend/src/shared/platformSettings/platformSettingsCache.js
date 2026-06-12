import { DEFAULT_PLATFORM_SETTINGS } from "./platformSettingsConstants.js";

export const PLATFORM_SETTINGS_UPDATED_EVENT = "yasnopro:platform-settings-updated";

let cache = { ...DEFAULT_PLATFORM_SETTINGS };

const listeners = new Set();

export function getPlatformSettingsCache() {
  return cache;
}

export function setPlatformSettingsCache(next) {
  cache = {
    ...DEFAULT_PLATFORM_SETTINGS,
    ...next,
  };

  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent(PLATFORM_SETTINGS_UPDATED_EVENT, {
        detail: cache,
      }),
    );
  }

  listeners.forEach((listener) => {
    listener(cache);
  });
}

export function subscribePlatformSettings(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
