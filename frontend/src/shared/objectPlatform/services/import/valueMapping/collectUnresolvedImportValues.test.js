import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

describe("collectUnresolvedImportValues", () => {
  it("exports unresolved value mapping collection contract", () => {
    const source = readFileSync(
      new URL("./collectUnresolvedImportValues.js", import.meta.url),
      "utf8",
    );

    assert.match(source, /resolveImportValueMappingSection/);
    assert.match(source, /normalizeObjectExcelImportValue/);
    assert.match(source, /needsUserMapping/);
    assert.match(source, /VALUE_MAPPING_CANDIDATE_ERRORS/);
    assert.match(source, /sections:/);
  });
});
