import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

const source = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "getEntityCardLayoutFields.js"),
  "utf8",
);

describe("getEntityCardLayoutFields", () => {
  it("filters hierarchy relation fields from card layout", () => {
    assert.match(source, /isHierarchyRelationField/);
    assert.match(source, /hierarchyRelationProfile/);
  });

  it("merges creatable fields with non-hierarchy relation layout fields", () => {
    assert.match(source, /getCreatableFields/);
    assert.match(source, /isRelationFieldType/);
    assert.match(source, /return \[\.\.\.creatableFields, \.\.\.relationFields\]/);
  });
});
