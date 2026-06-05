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

  it("excludes presentation-only __table_row_number from filter options", () => {
    assert.match(source, /isTableRowNumberPresentationFieldKey/);
    assert.match(source, /peelTableRowNumberPresentationFieldKey/);
    assert.match(source, /RECORD_NUMBER_FILTER_LABEL/);
  });

  it("passes fieldType in table filter field options", () => {
    assert.match(source, /fieldType:/);
    assert.match(source, /buildTableFilterFieldOption/);
    assert.match(source, /catalogFieldToFieldDef/);
  });

  it("maps presentation row number key to catalog record number key", () => {
    assert.match(source, /normalizeTableFilterFieldKey/);
    assert.match(source, /SYSTEM_ENTITY_FIELD_KEYS\.recordNumber/);
  });
});
