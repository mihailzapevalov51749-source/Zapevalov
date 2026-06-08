/** @typedef {import('node:test').TestContext} TestContext */
import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { DESIGNER_TAB_IDS, DESIGNER_TABS } from "./tabs.js";

describe("designer tabs", () => {
  it("includes actions and rules before runtime preview", () => {
    const ids = DESIGNER_TABS.map((tab) => tab.id);
    const viewsIndex = ids.indexOf("views");
    const actionsIndex = ids.indexOf("actions");
    const rulesIndex = ids.indexOf("rules");
    const previewIndex = ids.indexOf("runtime-preview");

    assert.ok(viewsIndex >= 0);
    assert.ok(actionsIndex > viewsIndex);
    assert.ok(rulesIndex > actionsIndex);
    assert.ok(previewIndex > rulesIndex);
  });

  it("validates new tab ids", () => {
    assert.equal(DESIGNER_TAB_IDS.includes("actions"), true);
    assert.equal(DESIGNER_TAB_IDS.includes("rules"), true);
  });
});
