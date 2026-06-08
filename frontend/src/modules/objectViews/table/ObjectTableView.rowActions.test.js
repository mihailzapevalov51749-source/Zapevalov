import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";

describe("ObjectTableView row actions", () => {
  it("enables row menu for delete even without hierarchy relations", () => {
    const source = readFileSync(
      new URL("./ObjectTableView.jsx", import.meta.url),
      "utf8",
    );

    assert.match(source, /const canDeleteFromRow = !isPreviewMode/);
    assert.match(
      source,
      /rowActionsEnabled[\s\S]*canDeleteFromRow[\s\S]*canCreateSubtaskFromRow/,
    );
    assert.doesNotMatch(
      source,
      /const rowActionsEnabled =\s*\n\s*canCreateSubtaskFromRow &&/,
    );
    assert.match(source, /canCreateSubtask: canCreateSubtaskFromRow/);
    assert.match(source, /canDelete: !isPreviewMode/);
    assert.match(source, /placementKey: "row_menu"/);
    assert.match(source, /runtimePlacedActions: runtimeRowMenuActions/);
    assert.match(source, /hasRuntimeRowMenuActions/);
  });
});
