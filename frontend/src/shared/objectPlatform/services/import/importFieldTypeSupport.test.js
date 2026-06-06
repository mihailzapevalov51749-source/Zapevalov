import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

const source = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "importFieldTypeSupport.js"),
  "utf8",
);

describe("importFieldTypeSupport", () => {
  it("defines blocked headers and MVP import types", () => {
    assert.match(source, /BLOCKED_HEADER_LABELS/);
    assert.match(source, /MVP_IMPORT_FIELD_TYPES/);
    assert.match(source, /normalizeImportHeaderLabel/);
  });

  it("excludes relation, file and system fields", () => {
    assert.match(source, /rawType === "relation"/);
    assert.match(source, /rawType === "file"/);
    assert.match(source, /isBlockedImportFieldKey/);
    assert.match(source, /isTableRowNumberPresentationFieldKey/);
  });
});
