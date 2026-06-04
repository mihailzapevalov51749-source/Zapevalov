import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

const source = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "projectionToColumns.js"),
  "utf8",
);

describe("projectionToColumns relation columns", () => {
  it("marks relation columns as not sortable", () => {
    assert.match(source, /isRelationFieldType/);
    assert.match(source, /isRelationColumn \? false : true/);
  });
});
