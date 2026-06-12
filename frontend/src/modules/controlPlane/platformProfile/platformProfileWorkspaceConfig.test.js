import assert from "node:assert/strict";
import test from "node:test";

import { buildControlPlanePlatformProfilePath } from "../config/controlPlanePaths.js";
import {
  PLATFORM_PROFILE_DEFAULT_TAB_SLUG,
  PLATFORM_PROFILE_HOME_SECTIONS,
  PLATFORM_PROFILE_WORKSPACE_TABS,
  resolvePlatformProfileWorkspaceTab,
} from "./platformProfileWorkspaceConfig.js";
import { PLATFORM_PROFILE_SETTINGS_DOMAIN } from "./platformProfileSettingsModel.js";

test("platform profile workspace opens general tab by default", () => {
  assert.equal(PLATFORM_PROFILE_WORKSPACE_TABS.length, 8);
  assert.equal(PLATFORM_PROFILE_WORKSPACE_TABS[0].slug, "general");
  assert.equal(PLATFORM_PROFILE_WORKSPACE_TABS[2].slug, "platform-owner");
  assert.equal(
    PLATFORM_PROFILE_WORKSPACE_TABS.some((tab) => tab.slug === "localization"),
    false,
  );
  assert.equal(PLATFORM_PROFILE_DEFAULT_TAB_SLUG, "general");
  assert.equal(resolvePlatformProfileWorkspaceTab().slug, "general");
  assert.equal(resolvePlatformProfileWorkspaceTab("general").label, "Общие настройки");
  assert.equal(
    PLATFORM_PROFILE_WORKSPACE_TABS.some((tab) => tab.slug === "home"),
    false,
  );
});

test("platform profile home sections map to tab routes", () => {
  assert.equal(PLATFORM_PROFILE_HOME_SECTIONS.length, 8);
  assert.equal(
    PLATFORM_PROFILE_HOME_SECTIONS[0].tabSlug,
    "general",
  );
  assert.match(
    buildControlPlanePlatformProfilePath("general"),
    /\/control-plane\/platform-profile\/general$/,
  );
});

test("platform profile settings domain is isolated from tenant settings", () => {
  assert.equal(PLATFORM_PROFILE_SETTINGS_DOMAIN, "platform_profile_settings");
});
