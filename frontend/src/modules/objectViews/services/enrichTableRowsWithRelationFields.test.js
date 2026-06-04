import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

const enrichSource = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "enrichTableRowsWithRelationFields.js"),
  "utf8",
);

const preloadSource = readFileSync(
  join(
    dirname(fileURLToPath(import.meta.url)),
    "preloadRelationFieldStatesForPage.js",
  ),
  "utf8",
);

describe("relation table enrichment", () => {
  it("replaces relation cell values from preloaded state map", () => {
    assert.match(enrichSource, /createRelationTableValue/);
    assert.match(enrichSource, /relationStateByKey\.get/);
    assert.match(enrichSource, /relationKeys\.has\(fieldKey\)/);
  });

  it("loads relation state via runtime relation field API", () => {
    assert.match(preloadSource, /getRelationFieldState/);
    assert.match(preloadSource, /Promise\.all/);
  });
});
