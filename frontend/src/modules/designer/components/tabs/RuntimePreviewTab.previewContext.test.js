import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";

describe("RuntimePreviewTab preview tab selector UX", () => {
  it("renders view meta with platform badges and office-only usage block", () => {
    const source = readFileSync(
      new URL("./RuntimePreviewTab.jsx", import.meta.url),
      "utf8",
    );
    const contextSource = readFileSync(
      new URL("../preview/StudioPreviewContextBlock.jsx", import.meta.url),
      "utf8",
    );
    const tabsSource = readFileSync(
      new URL("../objectTypes/ObjectTypeTabs.jsx", import.meta.url),
      "utf8",
    );
    const usageResolverSource = readFileSync(
      new URL("../../utils/resolveObjectViewUsagePaths.js", import.meta.url),
      "utf8",
    );

    assert.match(source, /useObjectTypePreviewTab/);
    assert.match(source, /resolveObjectViewTypeLabel/);
    assert.match(source, /resolveObjectViewTabStatusPresentation/);
    assert.match(source, /designer-preview-tab__view-meta/);
    assert.match(source, /designer-preview-tab__view-meta/);
    assert.doesNotMatch(source, /StudioPreviewTabDropdown/);
    assert.doesNotMatch(source, /designerApi\.listViews/);
    assert.doesNotMatch(source, /GET \/runtime\/query/);
    assert.doesNotMatch(source, /Runtime Preview/);
    assert.doesNotMatch(contextSource, /Отображается:/);
    assert.doesNotMatch(contextSource, /Статус:/);
    assert.match(contextSource, /Используется:/);
    assert.match(tabsSource, /ObjectTypePreviewTabTrigger/);
    assert.doesNotMatch(usageResolverSource, /Студия/);
    assert.match(usageResolverSource, /Офис → /);
  });
});
