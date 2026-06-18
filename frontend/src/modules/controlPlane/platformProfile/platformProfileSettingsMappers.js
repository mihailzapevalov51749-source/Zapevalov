import { createDefaultPlatformProfileSettings } from "./platformProfileSettingsModel.js";

export function mapApiGeneralToPlatformSettings(apiGeneral = {}) {
  return {
    platformName: apiGeneral.platform_name || "",
    platformShortName: apiGeneral.platform_short_name || "",
    publicSlug: apiGeneral.public_slug || "",
    publicSlugLocked: Boolean(apiGeneral.public_slug_locked),
    publicUrl: apiGeneral.public_url || "",
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
      publicSlug: mapped.publicSlug || defaults.general.publicSlug || "",
      publicSlugLocked: mapped.publicSlugLocked,
      publicUrl: mapped.publicUrl || "",
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
    public_slug: String(form.publicSlug || "").trim(),
    public_slug_locked: Boolean(form.publicSlugLocked),
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
    publicSlug: settings.publicSlug || "",
    publicSlugLocked: Boolean(settings.publicSlugLocked),
    description: settings.description || "",
    timezone: settings.timezone || "",
    dateFormat: settings.dateFormat || "",
    timeFormat: settings.timeFormat || "",
    weekStartDay: settings.weekStartDay || "",
    defaultLanguage: settings.defaultLanguage || "",
  };
}
