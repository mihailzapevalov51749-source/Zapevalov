import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  aggregateBulkDeletePreview,
  buildBulkDeleteConfirmMessage,
  sortBulkDeleteTargets,
} from "./objectEntityBulkDeletePresentation.js";

describe("objectEntityBulkDeletePresentation", () => {
  it("aggregates preview stats for bulk delete", () => {
    const aggregate = aggregateBulkDeletePreview(
      [
        { entityId: "a", preview: { has_hierarchy_children: false, descendant_count: 0 } },
        { entityId: "b", preview: { has_hierarchy_children: true, descendant_count: 3 } },
        { entityId: "c", preview: { has_hierarchy_children: true, descendant_count: 4 } },
        { entityId: "d", preview: { has_hierarchy_children: false, descendant_count: 0 } },
        { entityId: "e", preview: { has_hierarchy_children: false, descendant_count: 0 } },
      ],
      5,
    );

    assert.equal(aggregate.selectedCount, 5);
    assert.equal(aggregate.recordsWithChildren, 2);
    assert.equal(aggregate.totalChildren, 7);
    assert.equal(aggregate.hasChildren, true);
  });

  it("builds bulk confirm message", () => {
    assert.equal(
      buildBulkDeleteConfirmMessage(5),
      "Будут удалены выбранные записи: 5",
    );
  });

  it("sorts delete targets by descendant count descending", () => {
    const sorted = sortBulkDeleteTargets([
      { entityId: "leaf", preview: { descendant_count: 1 } },
      { entityId: "root", preview: { descendant_count: 5 } },
      { entityId: "mid", preview: { descendant_count: 3 } },
    ]);

    assert.deepEqual(
      sorted.map((entry) => entry.entityId),
      ["root", "mid", "leaf"],
    );
  });
});
