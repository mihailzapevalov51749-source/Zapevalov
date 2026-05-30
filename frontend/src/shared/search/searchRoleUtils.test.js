import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { SEARCH_MODES } from "./searchScopes.js";
import {
  canUseHeaderSearch,
  isCrossModeSearchUser,
  resolveRequestedSearchDomains,
} from "./searchRoleUtils.js";

describe("searchRoleUtils", () => {
  it("detects admin and superadmin cross-mode users", () => {
    assert.equal(isCrossModeSearchUser({ role: "admin" }), true);
    assert.equal(isCrossModeSearchUser({ role: "superadmin" }), true);
    assert.equal(isCrossModeSearchUser({ role: "user" }), false);
  });

  it("resolves requested domains for runtime admin", () => {
    assert.deepEqual(
      resolveRequestedSearchDomains(SEARCH_MODES.RUNTIME, { role: "admin" }),
      ["runtime", "designer"],
    );
  });

  it("limits regular user to runtime only", () => {
    assert.deepEqual(
      resolveRequestedSearchDomains(SEARCH_MODES.RUNTIME, { role: "user" }),
      ["runtime"],
    );
  });

  it("enables designer header search only for admin roles", () => {
    assert.equal(canUseHeaderSearch(SEARCH_MODES.DESIGNER, { role: "admin" }), true);
    assert.equal(canUseHeaderSearch(SEARCH_MODES.DESIGNER, { role: "user" }), false);
    assert.equal(canUseHeaderSearch(SEARCH_MODES.RUNTIME, { role: "user" }), true);
  });
});
