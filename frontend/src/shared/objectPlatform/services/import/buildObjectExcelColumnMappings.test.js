import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

const source = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "buildObjectExcelColumnMappings.js"),
  "utf8",
);

describe("buildObjectExcelColumnMappings", () => {
  it("auto-maps headers by normalized label and blocks system columns", () => {
    assert.match(source, /normalizeImportHeaderLabel/);
    assert.match(source, /isBlockedImportExcelHeader/);
    assert.match(source, /IMPORT_SKIP_FIELD_VALUE/);
    assert.match(source, /findSampleValue/);
  });

  it("enforces unique field mapping on manual update", () => {
    assert.match(source, /updateObjectExcelColumnMapping/);
    assert.match(source, /fieldKey: IMPORT_SKIP_FIELD_VALUE/);
  });
});
