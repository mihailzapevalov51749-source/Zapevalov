import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";

describe("ObjectTableView studio preview parity", () => {
  it("uses the same ViewEngine render path with preview-only restrictions", () => {
    const source = readFileSync(
      new URL("./ObjectTableView.jsx", import.meta.url),
      "utf8",
    );

    assert.match(source, /const isPreviewMode = mode === "studio-preview"/);
    assert.match(source, /enabled: hierarchyDataEnabled/);
    assert.doesNotMatch(source, /enabled: mode !== "studio-preview"/);
    assert.match(source, /disabled: true/);
    assert.match(source, /readOnly: isPreviewMode/);
    assert.match(source, /previewShowCreateButton/);
    assert.match(source, /previewMode: isPreviewMode/);
    assert.match(source, /!isPreviewMode &&[\s\S]*relationTableColumns/);
    assert.match(source, /previewHierarchyInstances: query\.previewHierarchyInstances/);
  });
});
