import assert from "node:assert/strict";
import test from "node:test";

import {
  formatPlatformLastLogin,
  mergePlatformUserWithSessionProfile,
  normalizePlatformUser,
  resolvePlatformOwner,
  resolvePlatformRoleKeyFromLegacy,
  resolveUserAvatarUrl,
} from "./platformUserUtils.js";

test("maps legacy superadmin to platform_owner", () => {
  assert.equal(resolvePlatformRoleKeyFromLegacy("superadmin"), "platform_owner");
  assert.equal(resolvePlatformRoleKeyFromLegacy("admin"), "platform_administrator");
});

test("normalizes platform user with login timestamps", () => {
  const user = normalizePlatformUser(
    {
      id: 1,
      full_name: "Михаил Запевалов",
      email: "michael@yasnopro.ru",
      role_name: "superadmin",
      role_id: 4,
      is_active: true,
      last_login_at: "2026-06-10T06:15:00Z",
      created_at: "2025-01-01T10:00:00Z",
    },
    [{ id: 4, name: "superadmin" }],
  );

  assert.equal(user.platformRoleKey, "platform_owner");
  assert.ok(user.platformPermissions.includes("control_plane"));
});

test("hidden platform users are excluded from normalization", () => {
  const hidden = normalizePlatformUser(
    {
      id: 99,
      email: "bootstrap@yasnopro.dev",
      is_hidden_user: true,
      role_name: "superadmin",
    },
    [],
  );

  assert.equal(hidden, null);
});

test("tenant-scoped users are excluded from platform users normalization", () => {
  const tenantUser = normalizePlatformUser(
    {
      id: 100,
      email: "admin@company.ru",
      tenant_id: 14,
      role_name: "company_superadmin",
    },
    [],
  );

  assert.equal(tenantUser, null);
});

test("resolvePlatformOwner prefers platform_owner role", () => {
  const users = [
    normalizePlatformUser({ id: 2, role_name: "admin" }, []),
    normalizePlatformUser({ id: 1, role_name: "superadmin" }, []),
  ];

  assert.equal(resolvePlatformOwner(users)?.id, 1);
});

test("resolveUserAvatarUrl uses shared avatar fields", () => {
  assert.equal(
    resolveUserAvatarUrl({ avatarUrl: "https://example.com/a.png" }),
    "https://example.com/a.png",
  );
  assert.equal(
    resolveUserAvatarUrl({ avatar_url: "https://example.com/b.png" }),
    "https://example.com/b.png",
  );
});

test("mergePlatformUserWithSessionProfile reuses session avatar", () => {
  const merged = mergePlatformUserWithSessionProfile(
    { id: 1, full_name: "Owner", avatar_url: "" },
    { id: 1, avatar_url: "https://example.com/owner.png" },
  );

  assert.equal(merged.avatar_url, "https://example.com/owner.png");
});

test("formatPlatformLastLogin handles today label", () => {
  const now = new Date();
  const iso = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    9,
    15,
  ).toISOString();

  assert.match(formatPlatformLastLogin(iso), /^Сегодня,/);
});
