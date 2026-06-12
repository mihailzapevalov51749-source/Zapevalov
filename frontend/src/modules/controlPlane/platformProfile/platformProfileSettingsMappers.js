import { createDefaultPlatformProfileSettings } from "./platformProfileSettingsModel.js";

export function mapApiGeneralToPlatformSettings(apiGeneral = {}) {
  return {
    platformName: apiGeneral.platform_name || "",
    platformShortName: apiGeneral.platform_short_name || "",
    description: apiGeneral.description || "",
    timezone: apiGeneral.timezone || "",
    dateFormat: apiGeneral.date_format || "",
    timeFormat: apiGeneral.time_format || "",
    weekStartDay: apiGeneral.week_start_day || "",
    defaultLanguage: apiGeneral.default_language || "",
    updatedAt: apiGeneral.updated_at || null,
  };
}

export function mapPlatformSettingsToProfile(apiGeneral = {}) {
  const defaults = createDefaultPlatformProfileSettings();
  const mapped = mapApiGeneralToPlatformSettings(apiGeneral);

  return {
    ...defaults,
    general: {
      ...defaults.general,
      name: mapped.platformName || defaults.general.name,
      shortName: mapped.platformShortName || defaults.general.shortName,
      description: mapped.description ?? defaults.general.description,
      timezone: mapped.timezone || defaults.general.timezone,
      dateFormat: mapped.dateFormat || defaults.general.dateFormat,
      timeFormat: mapped.timeFormat || defaults.general.timeFormat,
      weekStart: mapped.weekStartDay || defaults.general.weekStart,
      language: mapped.defaultLanguage || defaults.general.language,
    },
    localization: {
      ...defaults.localization,
      timezone: mapped.timezone || defaults.localization.timezone,
      dateFormat: mapped.dateFormat || defaults.localization.dateFormat,
      timeFormat: mapped.timeFormat || defaults.localization.timeFormat,
      weekStart: mapped.weekStartDay || defaults.localization.weekStart,
      language: mapped.defaultLanguage || defaults.localization.language,
    },
    branding: {
      ...defaults.branding,
      uiName: mapped.platformName || defaults.branding.uiName,
    },
    systemInfo: {
      ...defaults.systemInfo,
      updatedAt: mapped.updatedAt
        ? String(mapped.updatedAt)
        : defaults.systemInfo.updatedAt,
    },
    updatedAt: mapped.updatedAt,
  };
}

export function mapFormToApiGeneralUpdate(form = {}) {
  return {
    platform_name: String(form.platformName || "").trim(),
    platform_short_name: String(form.platformShortName || "").trim(),
    description: String(form.description || "").trim() || null,
    timezone: form.timezone,
    date_format: form.dateFormat,
    time_format: form.timeFormat,
    week_start_day: form.weekStartDay,
    default_language: form.defaultLanguage,
  };
}

export function mapPlatformSettingsToForm(settings = {}) {
  return {
    platformName: settings.platformName || "",
    platformShortName: settings.platformShortName || "",
    description: settings.description || "",
    timezone: settings.timezone || "",
    dateFormat: settings.dateFormat || "",
    timeFormat: settings.timeFormat || "",
    weekStartDay: settings.weekStartDay || "",
    defaultLanguage: settings.defaultLanguage || "",
  };
}
