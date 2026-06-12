import {
  PLATFORM_PROFILE_SETTINGS_DOMAIN,
  createDefaultPlatformProfileSettings,
} from "./platformProfileSettingsModel.js";

export const PLATFORM_PROFILE_SETTINGS_STORAGE_KEY = "yasnopro_platform_profile_settings_v1";

export function loadPlatformProfileSettings() {
  if (typeof window === "undefined") {
    return createDefaultPlatformProfileSettings();
  }

  try {
    const raw = window.localStorage.getItem(PLATFORM_PROFILE_SETTINGS_STORAGE_KEY);
    if (!raw) {
      return createDefaultPlatformProfileSettings();
    }

    const parsed = JSON.parse(raw);
    if (!parsed || parsed.domain !== PLATFORM_PROFILE_SETTINGS_DOMAIN) {
      return createDefaultPlatformProfileSettings();
    }

    return {
      ...createDefaultPlatformProfileSettings(),
      ...parsed,
    };
  } catch {
    return createDefaultPlatformProfileSettings();
  }
}

export function savePlatformProfileSettings(nextSettings) {
  if (typeof window === "undefined") {
    return nextSettings;
  }

  const payload = {
    ...createDefaultPlatformProfileSettings(),
    ...nextSettings,
    domain: PLATFORM_PROFILE_SETTINGS_DOMAIN,
    updatedAt: new Date().toISOString(),
  };

  window.localStorage.setItem(
    PLATFORM_PROFILE_SETTINGS_STORAGE_KEY,
    JSON.stringify(payload),
  );

  return payload;
}
