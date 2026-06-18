import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const configSource = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "usersRolesWorkspaceConfig.js"),
  "utf8",
);

test("users roles workspace config declares three tabs in required order", () => {
  assert.match(configSource, /label: "Пользователи"/);
  assert.match(configSource, /label: "Роли"/);
  assert.match(configSource, /label: "Глобальные пользователи"/);

  const usersIndex = configSource.indexOf('slug: "users"');
  const rolesIndex = configSource.indexOf('slug: "roles"');
  const globalUsersIndex = configSource.indexOf('slug: "global-users"');

  assert.ok(usersIndex >= 0 && rolesIndex > usersIndex && globalUsersIndex > rolesIndex);
});

test("global users tab route stays inside users-roles workspace", () => {
  assert.match(configSource, /buildControlPlaneUsersRolesPath\("global-users"\)/);
  assert.match(configSource, /slug: "global-users"/);
});
