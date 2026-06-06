import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { IMPORT_DEFAULT_CURRENT_USER_VALUE } from "./importDefaultValueConstants.js";
import { resolveImportDefaultUserId } from "./resolveImportDefaultUserId.js";

describe("resolveImportDefaultUserId", () => {
  it("resolves current user token from context", () => {
    const result = resolveImportDefaultUserId(IMPORT_DEFAULT_CURRENT_USER_VALUE, {
      currentUserId: 17,
    });

    assert.equal(result.ok, true);
    assert.equal(result.value, 17);
  });

  it("resolves explicit user id", () => {
    const result = resolveImportDefaultUserId(42);

    assert.equal(result.ok, true);
    assert.equal(result.value, 42);
  });
});
