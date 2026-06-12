import assert from "node:assert/strict";
import test from "node:test";

import {
  mapApiGeneralToPlatformSettings,
  mapFormToApiGeneralUpdate,
  mapPlatformSettingsToProfile,
} from "./platformProfileSettingsMappers.js";

test("mapApiGeneralToPlatformSettings maps backend payload", () => {
  const mapped = mapApiGeneralToPlatformSettings({
    platform_name: "ЯсноПро",
    platform_short_name: "ЯП",
    description: "Описание",
    timezone: "(UTC+03:00) Москва",
    date_format: "DD.MM.YYYY",
    time_format: "24 часа (14:30)",
    week_start_day: "Понедельник",
    default_language: "Русский",
  });

  assert.equal(mapped.platformName, "ЯсноПро");
  assert.equal(mapped.platformShortName, "ЯП");
  assert.equal(mapped.defaultLanguage, "Русский");
});

test("mapFormToApiGeneralUpdate sends snake_case payload", () => {
  const payload = mapFormToApiGeneralUpdate({
    platformName: "ЯсноПро",
    platformShortName: "ЯП",
    description: "",
    timezone: "(UTC+03:00) Москва",
    dateFormat: "DD.MM.YYYY",
    timeFormat: "24 часа (14:30)",
    weekStartDay: "Понедельник",
    defaultLanguage: "Русский",
  });

  assert.equal(payload.platform_name, "ЯсноПро");
  assert.equal(payload.default_language, "Русский");
  assert.equal(payload.description, null);
});

test("mapPlatformSettingsToProfile fills general section", () => {
  const profile = mapPlatformSettingsToProfile({
    platform_name: "Test",
    platform_short_name: "T",
    description: "Desc",
    timezone: "(UTC+00:00) UTC",
    date_format: "YYYY-MM-DD",
    time_format: "12 часов (02:30 PM)",
    week_start_day: "Вторник",
    default_language: "English",
  });

  assert.equal(profile.general.name, "Test");
  assert.equal(profile.general.weekStart, "Вторник");
  assert.equal(profile.localization.language, "English");
});
