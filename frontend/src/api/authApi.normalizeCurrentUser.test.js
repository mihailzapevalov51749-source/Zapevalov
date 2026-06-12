import assert from "node:assert/strict";
import test from "node:test";

import { normalizeCurrentUser } from "./authApi.js";

test("normalizeCurrentUser preserves is_platform_owner flag", () => {
  const normalized = normalizeCurrentUser({
    id: 7,
    email: "owner@example.com",
    is_platform_owner: true,
  });

  assert.equal(normalized.is_platform_owner, true);
});

test("normalizeCurrentUser maps camelCase platform owner flag", () => {
  const normalized = normalizeCurrentUser({
    id: 7,
    isPlatformOwner: true,
  });

  assert.equal(normalized.is_platform_owner, true);
});
