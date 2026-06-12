import test from "node:test";
import assert from "node:assert/strict";

import {
  buildSystemPlatformRoles,
  resolveLegacyPlatformPermissions,
  resolvePlatformRoleTypeLabel,
  sanitizeRoleKey,
} from "./platformRoleModel.js";

test("buildSystemPlatformRoles includes six system roles", () => {
  const roles = buildSystemPlatformRoles();
  assert.equal(roles.length, 6);
  assert.deepEqual(
    roles.map((role) => role.key),
    [
      "platform_owner",
      "platform_administrator",
      "platform_developer",
      "release_manager",
      "support",
      "auditor",
    ],
  );
});

test("resolvePlatformRoleTypeLabel marks system roles", () => {
  const owner = buildSystemPlatformRoles()[0];
  assert.equal(resolvePlatformRoleTypeLabel(owner), "Системная");
});

test("sanitizeRoleKey normalizes custom role codes", () => {
  assert.equal(sanitizeRoleKey(" Custom Role "), "custom_role");
  assert.equal(sanitizeRoleKey("Администратор платформы"), "administrator_platformy");
});

test("platform owner receives all legacy contour permissions", () => {
  const owner = buildSystemPlatformRoles()[0];
  const permissions = resolveLegacyPlatformPermissions(owner);
  assert.ok(permissions.includes("control_plane"));
  assert.ok(permissions.includes("clients"));
  assert.ok(permissions.includes("event_journal"));
});
