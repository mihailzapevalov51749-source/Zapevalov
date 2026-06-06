import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { resolveExpandableHierarchyRowIds } from "./resolveExpandableHierarchyRowIds.js";

describe("resolveExpandableHierarchyRowIds", () => {
  it("returns parent ids with children on the current flat row set", () => {
    const childrenByParent = new Map([
      ["parent-1", ["child-1", "child-2"]],
      ["parent-off-page", ["orphan-child"]],
      ["leaf-parent", []],
    ]);

    const result = resolveExpandableHierarchyRowIds({
      childrenByParent,
      flatRowIds: ["parent-1", "child-1", "child-2", "leaf"],
    });

    assert.deepEqual(result, ["parent-1"]);
  });

  it("works when the tree is fully collapsed and only roots are visible", () => {
    const childrenByParent = new Map([
      ["root-a", ["child-a"]],
      ["root-b", ["child-b"]],
    ]);

    const result = resolveExpandableHierarchyRowIds({
      childrenByParent,
      flatRowIds: ["root-a", "child-a", "root-b", "child-b"],
    });

    assert.deepEqual(result, ["root-a", "root-b"]);
  });
});
