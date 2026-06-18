import assert from "node:assert/strict";
import test from "node:test";

import { resolveProfileWorkspaceHostClass } from "./profileWorkspaceLayout.js";

test("resolveProfileWorkspaceHostClass detects studio admin settings host", () => {
  assert.equal(
    resolveProfileWorkspaceHostClass("/designer/tenant/1/administration/settings/general"),
    "profile-workspace--host-studio-admin",
  );
});

test("resolveProfileWorkspaceHostClass detects control plane platform profile host", () => {
  assert.equal(
    resolveProfileWorkspaceHostClass("/control-plane/platform-profile/general"),
    "profile-workspace--host-control-plane",
  );
});

test("resolveProfileWorkspaceHostClass returns empty class for unknown routes", () => {
  assert.equal(resolveProfileWorkspaceHostClass("/designer/tenant/1/administration/users"), "");
});
