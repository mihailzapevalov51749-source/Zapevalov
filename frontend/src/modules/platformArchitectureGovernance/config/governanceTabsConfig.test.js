import assert from "node:assert/strict";

import test from "node:test";

import {
  DEFAULT_GOVERNANCE_TAB,
  GOVERNANCE_TABS,
  resolveGovernanceTab,
} from "./governanceTabsConfig.js";

test("governance tabs include four primary views", () => {
  assert.equal(GOVERNANCE_TABS.length, 4);
  assert.equal(DEFAULT_GOVERNANCE_TAB, "overview");
  assert.equal(resolveGovernanceTab("adr"), "adr");
  assert.equal(resolveGovernanceTab("unknown"), "overview");
});
