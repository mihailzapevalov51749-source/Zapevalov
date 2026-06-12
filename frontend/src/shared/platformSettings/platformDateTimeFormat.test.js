import assert from "node:assert/strict";
import test from "node:test";

import {
  formatPlatformDate,
  formatPlatformDateTime,
  formatPlatformLastLogin,
} from "./platformDateTimeFormat.js";
import { setPlatformSettingsCache } from "./platformSettingsCache.js";

test("formatPlatformDateTime respects platform date and time formats", () => {
  setPlatformSettingsCache({
    dateFormat: "YYYY-MM-DD",
    timeFormat: "12 часов (02:30 PM)",
  });

  const value = "2026-06-11T11:30:00Z";
  const formatted = formatPlatformDateTime(value);

  assert.match(formatted, /^2026-06-11 /);
  assert.match(formatted, /(AM|PM)$/);
});

test("formatPlatformLastLogin keeps today label", () => {
  setPlatformSettingsCache({
    dateFormat: "DD.MM.YYYY",
    timeFormat: "24 часа (14:30)",
  });

  const now = new Date();
  const iso = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
      10,
      15,
      0,
    ),
  ).toISOString();

  assert.match(formatPlatformLastLogin(iso), /^Сегодня,/);
});

test("formatPlatformDate uses DMY by default", () => {
  setPlatformSettingsCache({
    dateFormat: "DD.MM.YYYY",
    timeFormat: "24 часа (14:30)",
  });

  assert.equal(formatPlatformDate("2026-06-11T00:00:00Z"), "11.06.2026");
});
