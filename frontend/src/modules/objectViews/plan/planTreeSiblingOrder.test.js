import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildAppendSiblingOrder,
  sortPlanHierarchySiblingIds,
} from "./planTreeSiblingOrder.js";

describe("planTreeSiblingOrder", () => {
  it("sorts siblings by relation instance created_at ascending", () => {
    const instanceByChildId = new Map([
      ["b", { created_at: "2026-01-02T00:00:00.000Z" }],
      ["a", { created_at: "2026-01-01T00:00:00.000Z" }],
      ["c", { created_at: "2026-01-03T00:00:00.000Z" }],
    ]);

    const sorted = sortPlanHierarchySiblingIds(["b", "c", "a"], { instanceByChildId });
    assert.deepEqual(sorted, ["a", "b", "c"]);
  });

  it("appends a new child id to the end of sibling order", () => {
    assert.deepEqual(buildAppendSiblingOrder(["a", "b"], "c"), ["a", "b", "c"]);
    assert.deepEqual(buildAppendSiblingOrder(["a", "c", "b"], "c"), ["a", "b", "c"]);
  });
});
