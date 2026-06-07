import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";

describe("Studio object view draft sync", () => {
  it("dispatches schema changed event and reloads preview context", () => {
    const schemaChangedSource = readFileSync(
      new URL("../../utils/designerObjectSchemaChanged.js", import.meta.url),
      "utf8",
    );
    const previewContextSource = readFileSync(
      new URL("../../context/ObjectTypePreviewTabContext.jsx", import.meta.url),
      "utf8",
    );
    const viewsTabSource = readFileSync(
      new URL("./ViewsTab.jsx", import.meta.url),
      "utf8",
    );
    const workspaceSource = readFileSync(
      new URL("../../pages/ObjectTypeWorkspacePage.jsx", import.meta.url),
      "utf8",
    );

    assert.match(schemaChangedSource, /DESIGNER_OBJECT_SCHEMA_CHANGED_EVENT/);
    assert.match(schemaChangedSource, /dispatchDesignerObjectSchemaChanged/);
    assert.match(previewContextSource, /DESIGNER_OBJECT_SCHEMA_CHANGED_EVENT/);
    assert.match(previewContextSource, /reloadViews/);
    assert.match(viewsTabSource, /onSchemaChanged\?\.\(\{ viewKey/);
    assert.match(viewsTabSource, /previewTab\?\.selectView/);
    assert.match(workspaceSource, /schemaRevision/);
    assert.match(workspaceSource, /dispatchDesignerObjectSchemaChanged/);
    assert.match(workspaceSource, /hasStudioUnpublishedChanges/);
  });
});
