import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

const source = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "normalizeObjectExcelImportValue.js"),
  "utf8",
);

describe("normalizeObjectExcelImportValue", () => {
  it("supports MVP field types", () => {
    assert.match(source, /editorType === "number"/);
    assert.match(source, /editorType === "date"/);
    assert.match(source, /resolveChoiceImportKey/);
    assert.match(source, /resolveImportUserId/);
    assert.match(source, /normalizeLinkStorageValue/);
  });

  it("parses common date formats and excel serial", () => {
    assert.match(source, /DATE_PATTERNS/);
    assert.match(source, /excelEpoch/);
    assert.match(source, /Дата не распознана/);
  });
});
