import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

const source = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "buildImportDefaultValues.js"),
  "utf8",
);

describe("buildImportDefaultValues", () => {
  it("builds rules for required fields with excel or default source", () => {
    assert.match(source, /getRequiredImportableFields/);
    assert.match(source, /isFieldMappedToExcelColumn/);
    assert.match(source, /IMPORT_DATA_SOURCE_EXCEL_COLUMN/);
    assert.match(source, /IMPORT_DATA_SOURCE_DEFAULT_VALUE/);
    assert.match(source, /supportsImportDefaultValue/);
  });
});
