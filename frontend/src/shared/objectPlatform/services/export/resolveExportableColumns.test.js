import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

const source = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "resolveExportableColumns.js"),
  "utf8",
);

describe("resolveExportableColumns", () => {
  it("excludes system id, selection and hidden columns", () => {
    assert.match(source, /SYSTEM_COLUMN_KEYS\.id/);
    assert.match(source, /__selection__/);
    assert.match(source, /column\?\.visible === false/);
  });
});
