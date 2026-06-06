import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

const source = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "formatExportCellValue.js"),
  "utf8",
);

describe("formatExportCellValue", () => {
  it("formats relation, user, date and link field types", () => {
    assert.match(source, /formatRelationTableDisplayLabel/);
    assert.match(source, /resolveExportUserLabel/);
    assert.match(source, /normalizeDateValue/);
    assert.match(source, /resolveLinkHref/);
    assert.match(source, /hyperlink/);
  });

  it("returns empty text for null values", () => {
    assert.match(source, /return \{ text: "" \}/);
  });
});
