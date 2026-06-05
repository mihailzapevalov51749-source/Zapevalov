import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

const excludeSource = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "excludeHierarchyTableFields.js"),
  "utf8",
);

const syncSource = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "syncProjectionWithCatalogFields.js"),
  "utf8",
);

const projectionSource = readFileSync(
  join(
    dirname(fileURLToPath(import.meta.url)),
    "../table/services/adapters/projectionToColumns.js",
  ),
  "utf8",
);

describe("excludeHierarchyTableFields", () => {
  it("uses canonical isHierarchyRelationField detector", () => {
    assert.match(excludeSource, /isHierarchyRelationField/);
    assert.match(excludeSource, /hierarchyRelationProfile/);
  });

  it("exports field key exclusion helper for saved views", () => {
    assert.match(excludeSource, /excludeHierarchyRelationFieldKeys/);
    assert.match(excludeSource, /isHierarchyRelationFieldKey/);
  });
});

describe("syncProjectionWithCatalogFields hierarchy exclusion", () => {
  it("filters hierarchy from merge and all-mode field lists", () => {
    assert.match(syncSource, /excludeHierarchyRelationFieldKeys/);
    assert.match(syncSource, /excludeHierarchyRelationFields/);
    assert.match(syncSource, /isHierarchyRelationField/);
  });
});

describe("projectionToColumns hierarchy exclusion", () => {
  it("skips hierarchy relation fields when building columns", () => {
    assert.match(projectionSource, /isHierarchyRelationFieldForTable/);
    assert.match(projectionSource, /continue;/);
  });
});
