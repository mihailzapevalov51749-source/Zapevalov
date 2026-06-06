import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { resolveTitleFieldDisplayNumber } from "./resolveTitleFieldDisplayNumber.js";

describe("resolveTitleFieldDisplayNumber", () => {
  it("prefers hierarchyNumber when tree is enabled", () => {
    const value = resolveTitleFieldDisplayNumber(
      {
        hierarchy: { hierarchyNumber: "2.1" },
        positionNumber: "5",
      },
      { hierarchyTreeEnabled: true },
    );

    assert.equal(value, "2.1");
  });

  it("falls back to positionNumber when hierarchyNumber is missing", () => {
    const value = resolveTitleFieldDisplayNumber(
      { positionNumber: "3", displayPosition: "4" },
      { hierarchyTreeEnabled: true },
    );

    assert.equal(value, "3");
  });

  it("uses positionNumber in flat mode", () => {
    const value = resolveTitleFieldDisplayNumber(
      {
        hierarchy: { hierarchyNumber: "2.1" },
        positionNumber: "2",
      },
      { hierarchyTreeEnabled: false },
    );

    assert.equal(value, "2");
  });
});
