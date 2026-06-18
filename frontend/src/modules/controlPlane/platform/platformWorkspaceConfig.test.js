import assert from "node:assert/strict";
import test from "node:test";

import { buildControlPlanePlatformPath } from "../config/controlPlanePaths.js";
import {
  PLATFORM_WORKSPACE_DEFAULT_TAB_SLUG,
  PLATFORM_WORKSPACE_TABS,
  resolvePlatformWorkspaceTab,
} from "./platformWorkspaceConfig.js";

test("platform workspace opens overview tab by default", () => {
  assert.equal(PLATFORM_WORKSPACE_TABS.length, 9);
  assert.equal(PLATFORM_WORKSPACE_TABS[0].slug, "overview");
  assert.equal(PLATFORM_WORKSPACE_TABS[1].slug, "environments");
  assert.equal(PLATFORM_WORKSPACE_TABS[1].label, "Среды");
  assert.equal(PLATFORM_WORKSPACE_DEFAULT_TAB_SLUG, "overview");
  assert.equal(resolvePlatformWorkspaceTab().slug, "overview");
  assert.equal(resolvePlatformWorkspaceTab("environments").label, "Среды");
  assert.equal(resolvePlatformWorkspaceTab("modules").label, "Модули платформы");
});

test("platform workspace tabs map to canonical routes", () => {
  assert.match(
    buildControlPlanePlatformPath("environments"),
    /\/control-plane\/platform\/environments$/,
  );
  assert.match(
    buildControlPlanePlatformPath("modules"),
    /\/control-plane\/platform\/modules$/,
  );
  assert.match(
    buildControlPlanePlatformPath("module-configuration-diffs"),
    /\/control-plane\/platform\/module-configuration-diffs$/,
  );
});
