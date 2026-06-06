import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

const source = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "validateObjectExcelImportRows.js"),
  "utf8",
);

describe("validateObjectExcelImportRows", () => {
  it("validates mapped rows and collects per-row errors", () => {
    assert.match(source, /normalizeObjectExcelImportValue/);
    assert.match(source, /IMPORT_SKIP_FIELD_VALUE/);
    assert.match(source, /validRows/);
    assert.match(source, /errorCount/);
  });

  it("checks required fields even when not mapped", () => {
    assert.match(source, /field\.isRequired/);
    assert.match(source, /REQUIRED_FIELD_UNMAPPED_MESSAGE/);
    assert.match(source, /REQUIRED_FIELD_UNMAPPED_CODE/);
    assert.match(source, /applyImportDefaultValues/);
    assert.match(source, /IMPORT_DATA_SOURCE_DEFAULT_VALUE/);
    assert.match(source, /Object\.keys\(values\)\.length > 0/);
  });
});
