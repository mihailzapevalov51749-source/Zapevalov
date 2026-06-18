import assert from "node:assert/strict";
import test from "node:test";

import {
  PROFILE_WORKSPACE_DEFAULT_TAB_SLUG,
  buildTenantProfileWorkspaceTabs,
  getProfileWorkspaceTabs,
  resolveProfileWorkspaceTab,
  TENANT_OWNER_TAB_SLUG,
} from "./profileWorkspaceConfig.js";
import { PROFILE_MODE_PLATFORM, PROFILE_MODE_TENANT } from "./profileMode.js";

test("platform profile workspace exposes eight tabs", () => {
  const tabs = getProfileWorkspaceTabs(PROFILE_MODE_PLATFORM);
  assert.equal(tabs.length, 8);
  assert.equal(tabs[0].slug, PROFILE_WORKSPACE_DEFAULT_TAB_SLUG);
  assert.equal(resolveProfileWorkspaceTab(PROFILE_MODE_PLATFORM, "general").label, "Общие настройки");
});

test("tenant studio settings mirror platform tab structure", () => {
  const tabs = buildTenantProfileWorkspaceTabs(42);
  assert.equal(tabs.length, 8);
  assert.deepEqual(
    tabs.map((tab) => tab.slug),
    [
      "general",
      "branding",
      TENANT_OWNER_TAB_SLUG,
      "notifications",
      "limits",
      "backup",
      "security",
      "behavior",
    ],
  );
  assert.equal(tabs[2].label, "Владелец компании");
  assert.equal(tabs.some((tab) => tab.slug === "license"), false);
  assert.equal(tabs.some((tab) => tab.slug === "localization"), false);
  assert.match(
    tabs[0].route,
    /\/designer\/tenant\/42\/administration\/settings\/general$/,
  );
});

test("tenant and platform tab configs stay isolated", () => {
  const platformSlugs = getProfileWorkspaceTabs(PROFILE_MODE_PLATFORM).map((tab) => tab.slug);
  const tenantSlugs = buildTenantProfileWorkspaceTabs(7).map((tab) => tab.slug);

  assert.equal(platformSlugs.includes("limits"), true);
  assert.equal(tenantSlugs.includes("limits"), true);
  assert.equal(tenantSlugs.includes("license"), false);
  assert.equal(platformSlugs.includes("license"), false);
});
