import assert from "node:assert/strict";
import test from "node:test";

import {
  formatGlobalStatusCompactLabel,
  formatGlobalStatusLabel,
  normalizeGlobalUser,
  resolveGlobalUserDisplayName,
} from "./globalUserUtils.js";

test("resolveGlobalUserDisplayName falls back to email", () => {
  assert.equal(resolveGlobalUserDisplayName({ full_name: "Иван" }), "Иван");
  assert.equal(resolveGlobalUserDisplayName({ email: "user@example.com" }), "user@example.com");
});

test("normalizeGlobalUser keeps global account fields", () => {
  const user = normalizeGlobalUser({
    id: 7,
    email: "user@example.com",
    full_name: null,
    is_active: false,
    global_status: "blocked",
    companies_count: 2,
  });

  assert.equal(user.display_name, "user@example.com");
  assert.equal(user.companies_count, 2);
  assert.equal(formatGlobalStatusLabel(user.global_status, user.is_active), "Заблокирован");
});

test("normalizeGlobalUser preserves avatar fields for PlatformUserAvatar", () => {
  const user = normalizeGlobalUser({
    id: 3,
    email: "user@example.com",
    avatar_url: "/media/avatars/user.png",
    avatar_settings: { scale: 1.2, offset_x: 4, offset_y: -2 },
  });

  assert.equal(user.avatar_url, "/media/avatars/user.png");
  assert.equal(user.avatar_settings.scale, 1.2);
  assert.equal(user.avatar_settings.offset_x, 4);
  assert.equal(user.avatar_settings.offset_y, -2);
});

test("formatGlobalStatusCompactLabel prefixes status with dot", () => {
  assert.equal(formatGlobalStatusCompactLabel("active", true), "● Активен");
  assert.equal(formatGlobalStatusCompactLabel("blocked", false), "● Заблокирован");
});
