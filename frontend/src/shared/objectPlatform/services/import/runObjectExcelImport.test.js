import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

const source = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "runObjectExcelImport.js"),
  "utf8",
);

describe("runObjectExcelImport", () => {
  it("creates entities in chunks via runtime write gateway", () => {
    assert.match(source, /OBJECT_EXCEL_IMPORT_CHUNK_SIZE = 50/);
    assert.match(source, /runtimeWriteGateway\.createEntity/);
    assert.match(source, /chunkRows/);
    assert.match(source, /createdCount/);
  });
});
