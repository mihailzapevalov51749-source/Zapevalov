import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

const source = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "catalogFieldsForTableQueryUi.js"),
  "utf8",
);

describe("catalogFieldsForTableQueryUi", () => {
  it("filters relation fields out of table filter/sort UI", () => {
    assert.match(source, /isRelationFieldType/);
    assert.match(source, /return !isRelationFieldType\(rawType\)/);
  });

  it("does not re-add relation keys from projection", () => {
    assert.match(source, /if \(isRelationFieldType\(rawType\)\)/);
    assert.match(source, /continue;/);
  });
});
