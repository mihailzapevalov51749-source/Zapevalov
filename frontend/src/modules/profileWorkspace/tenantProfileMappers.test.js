import assert from "node:assert/strict";
import test from "node:test";

import { resolveStudioTenantIdFromPath } from "../admin/config/tenantAdminPaths.js";
import {
  buildTenantProfileContextValue,
  mapFormToPortalGeneralUpdate,
  mapPortalToLicenseInfo,
  mapPortalToProfileSettings,
} from "./tenantProfileMappers.js";

test("mapPortalToProfileSettings uses portal fields without mock general defaults", () => {
  const profile = mapPortalToProfileSettings({
    id: 99,
    name: "Rozetka Demo",
    code: "ooo_rozetka",
    short_name: "Розетка",
    description: "Demo tenant",
    template_version: "3.1.0",
    tenant_status: "active",
    timezone: "(UTC+00:00) UTC",
    date_format: "YYYY-MM-DD",
    time_format: "12 часов (02:30 PM)",
    week_start_day: "Воскресенье",
    default_language: "English",
  });

  assert.equal(profile.general.name, "Rozetka Demo");
  assert.equal(profile.general.shortName, "Розетка");
  assert.equal(profile.general.description, "Demo tenant");
  assert.equal(profile.general.timezone, "(UTC+00:00) UTC");
  assert.equal(profile.general.dateFormat, "YYYY-MM-DD");
  assert.equal(profile.general.timeFormat, "12 часов (02:30 PM)");
  assert.equal(profile.general.weekStart, "Воскресенье");
  assert.equal(profile.general.language, "English");
  assert.equal(profile.branding.uiName, "Rozetka Demo");
  assert.equal(profile.systemInfo.version, "3.1.0");
});

test("mapPortalToProfileSettings tolerates null and undefined portal", () => {
  assert.doesNotThrow(() => mapPortalToProfileSettings(null));
  assert.doesNotThrow(() => mapPortalToProfileSettings(undefined));

  const fromNull = mapPortalToProfileSettings(null);
  assert.equal(fromNull.general.name, "");
  assert.equal(fromNull.general.shortName, "");
  assert.equal(fromNull.general.description, "");
  assert.equal(fromNull.general.timezone, "");
});

test("mapFormToPortalGeneralUpdate maps tenant form to API payload", () => {
  const payload = mapFormToPortalGeneralUpdate({
    platformName: "Acme",
    platformShortName: "acme",
    description: "About",
    timezone: "(UTC+03:00) Москва",
    dateFormat: "DD.MM.YYYY",
    timeFormat: "24 часа (14:30)",
    weekStartDay: "Понедельник",
    defaultLanguage: "Русский",
  });

  assert.deepEqual(payload, {
    name: "Acme",
    short_name: "acme",
    description: "About",
    timezone: "(UTC+03:00) Москва",
    date_format: "DD.MM.YYYY",
    time_format: "24 часа (14:30)",
    week_start_day: "Понедельник",
    default_language: "Русский",
  });
});

test("buildTenantProfileContextValue enables editing when portal is loaded", () => {
  const value = buildTenantProfileContextValue({
    tenantId: 1,
    portal: { id: 1, name: "Acme", code: "acme" },
    isLoading: false,
    loadError: "",
    isSaving: false,
    refresh: async () => null,
    saveGeneralSettings: async () => null,
  });

  assert.equal(value.canEditGeneral, true);
  assert.equal(value.settings.platformName, "Acme");
  assert.equal(typeof value.saveGeneralSettings, "function");
});

test("buildTenantProfileContextValue tolerates loading state with null portal", () => {
  assert.doesNotThrow(() =>
    buildTenantProfileContextValue({
      tenantId: 1,
      portal: null,
      isLoading: true,
      loadError: "",
      isSaving: false,
      refresh: async () => null,
      saveGeneralSettings: async () => null,
    }),
  );

  const value = buildTenantProfileContextValue({
    tenantId: 1,
    portal: null,
    isLoading: true,
    loadError: "",
    isSaving: false,
    refresh: async () => null,
    saveGeneralSettings: async () => null,
  });

  assert.equal(value.isLoading, true);
  assert.equal(value.tenantId, 1);
  assert.equal(value.labels.platformName, "Название компании");
  assert.equal(value.settings.platformName, "");
  assert.equal(value.canEditGeneral, false);
});

test("resolveStudioTenantIdFromPath reads tenant id from administration settings route", () => {
  assert.equal(
    resolveStudioTenantIdFromPath("/designer/tenant/1/administration/settings/general"),
    1,
  );
  assert.equal(
    resolveStudioTenantIdFromPath("/designer/tenant/21/administration/settings/branding"),
    21,
  );
});

test("mapPortalToLicenseInfo is read-only snapshot", () => {
  const license = mapPortalToLicenseInfo({
    tenant_status: "active",
  });

  assert.equal(license.readOnly, true);
  assert.equal(license.status, "active");
  assert.equal(license.type, "—");
});

test("mapPortalToLicenseInfo tolerates null portal", () => {
  const license = mapPortalToLicenseInfo(null);

  assert.equal(license.readOnly, true);
  assert.equal(license.status, "—");
});
