import { TENANT_GENERAL_SETTINGS_DEFAULTS } from "../admin/system/generalSettingsDefaults.js";

import {
  resolveSettingsLabels,
  SETTINGS_SCOPE_PLATFORM,
  SETTINGS_SCOPE_TENANT,
} from "../admin/system/settingsLabels.js";

import { mapApiOwnerToForm } from "../controlPlane/platformProfile/platformProfileOwnerMappers.js";

import { createDefaultPlatformProfileSettings } from "../controlPlane/platformProfile/platformProfileSettingsModel.js";



export function mapPortalSuperadminToOwnerForm(superadmin = null) {

  if (!superadmin) {

    return mapApiOwnerToForm(null);

  }



  return mapApiOwnerToForm({

    exists: true,

    user_id: superadmin.user_id,

    full_name: superadmin.full_name,

    email: superadmin.email,

    phone: superadmin.phone,

    position: superadmin.position,

    is_active: superadmin.is_active,

    avatar_url: superadmin.avatar_url,

    avatar_settings: superadmin.avatar_settings,

  });

}



export function mapPortalSuperadminToOwnerFormWithRole(superadmin = null) {

  const form = mapPortalSuperadminToOwnerForm(superadmin);

  return {

    ...form,

    roleLabel: superadmin?.role_label || "Суперадминистратор",

  };

}



export function mapPortalApiGeneralToSettings(portal = null) {

  const safePortal = portal ?? {};



  return {

    name: String(safePortal.name || "").trim(),

    shortName: String(safePortal.short_name || "").trim(),
    publicSlug: String(safePortal.public_slug || "").trim(),
    publicSlugLocked: Boolean(safePortal.public_slug_locked),
    publicUrl: safePortal.public_url || "",
    description: safePortal.description || "",

    timezone: safePortal.timezone || "",

    dateFormat: safePortal.date_format || "",

    timeFormat: safePortal.time_format || "",

    weekStart: safePortal.week_start_day || "",

    language: safePortal.default_language || "",

  };

}



export function mapPortalToFormSettings(portal = null) {

  const general = mapPortalApiGeneralToSettings(portal);



  return {

    platformName: general.name,

    platformShortName: general.shortName,
    publicSlug: general.publicSlug,
    publicSlugLocked: general.publicSlugLocked,
    description: general.description,

    timezone: general.timezone,

    dateFormat: general.dateFormat,

    timeFormat: general.timeFormat,

    weekStartDay: general.weekStart,

    defaultLanguage: general.language,

  };

}



export function mapFormToPortalGeneralUpdate(form = {}) {

  return {

    name: String(form.platformName || "").trim(),

    short_name: String(form.platformShortName || "").trim() || null,
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



export function mapPortalToProfileSettings(portal) {

  const safePortal = portal ?? {};

  const general = mapPortalApiGeneralToSettings(safePortal);

  const defaults = createDefaultPlatformProfileSettings();

  const tenantDefaults = TENANT_GENERAL_SETTINGS_DEFAULTS;



  return {

    ...defaults,

    general,

    branding: {

      ...defaults.branding,

      uiName: general.name,

    },

    systemInfo: {

      ...tenantDefaults.systemInfo,

      version: safePortal.template_version || tenantDefaults.systemInfo.version,

      updatedAt: safePortal.created_at

        ? String(safePortal.created_at)

        : tenantDefaults.systemInfo.updatedAt,

    },

    updatedAt: safePortal.created_at || null,

  };

}



export function mapPortalToLicenseInfo(portal) {

  const safePortal = portal ?? {};



  return {

    type: "—",

    status: safePortal.tenant_status || "—",

    expiresAt: null,

    limits: {

      users: "—",

      storage: "—",

    },

    usage: {

      users: "—",

      storage: "—",

    },

    readOnly: true,

  };

}



export function buildTenantProfileContextValue({

  tenantId,

  portal = null,

  isLoading = false,

  loadError = "",

  isSaving = false,

  refresh,

  saveGeneralSettings,

}) {

  const safePortal = portal ?? null;

  const profileSettings = mapPortalToProfileSettings(safePortal);

  const owner = mapPortalSuperadminToOwnerFormWithRole(safePortal?.company_superadmin);

  const license = mapPortalToLicenseInfo(safePortal);

  const formSettings = mapPortalToFormSettings(safePortal);



  return {

    mode: "tenant",

    tenantId,

    scope: SETTINGS_SCOPE_TENANT,

    labels: resolveSettingsLabels(SETTINGS_SCOPE_TENANT),

    profileSettings,

    owner,

    license,

    settings: formSettings,

    isLoading,

    isSaving,

    isSavingOwner: false,

    loadError,

    canEditGeneral: Boolean(safePortal) && !loadError,

    canEditOwner: false,

    canEditLicense: false,

    refresh,

    saveGeneralSettings,

    saveOwner: async () => {

      throw new Error("Изменение владельца компании выполняется через карточку компании");

    },

  };

}



export function buildPlatformProfileContextValue(platformState) {

  return {

    mode: "platform",

    tenantId: null,

    scope: SETTINGS_SCOPE_PLATFORM,

    labels: resolveSettingsLabels(SETTINGS_SCOPE_PLATFORM),

    profileSettings: platformState.profileSettings,

    owner: platformState.platformOwner,

    license: null,

    settings: platformState.settings,

    isLoading: platformState.isLoading,

    isSaving: platformState.isSaving,

    isSavingOwner: platformState.isSavingOwner,

    loadError: platformState.loadError,

    canEditGeneral: true,

    canEditOwner: true,

    canEditLicense: false,

    refresh: platformState.refresh,

    saveGeneralSettings: platformState.saveGeneralSettings,

    saveOwner: platformState.savePlatformOwner,

  };

}

