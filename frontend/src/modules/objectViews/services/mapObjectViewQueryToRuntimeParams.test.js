import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

const source = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "mapObjectViewQueryToRuntimeParams.js"),
  "utf8",
);

describe("mapObjectViewQueryToRuntimeParams", () => {
  it("serializes filter conditions into runtime filters JSON param", () => {
    assert.match(source, /filters:\s*JSON\.stringify\(payload\)/);
    assert.match(source, /buildRuntimeFilterParams/);
  });

  it("maps boolean operators to eq true/false", () => {
    assert.match(source, /FILTER_OPERATOR_BOOLEAN_TRUE/);
    assert.match(source, /value = true/);
    assert.match(source, /value = false/);
  });

  it("supports empty operators without value", () => {
    assert.match(source, /FILTER_OPERATOR_IS_EMPTY/);
    assert.match(source, /FILTER_OPERATOR_IS_NOT_EMPTY/);
  });
});
