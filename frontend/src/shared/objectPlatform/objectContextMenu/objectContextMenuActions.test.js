import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

const source = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "objectContextMenuActions.js"),
  "utf8",
);

describe("objectContextMenuActions", () => {
  it("defines import and export excel action ids", () => {
    assert.match(source, /IMPORT_EXCEL/);
    assert.match(source, /EXPORT_EXCEL/);
    assert.match(source, /buildObjectContextMenuActions/);
    assert.match(source, /Импорт Excel/);
    assert.match(source, /Экспорт Excel/);
  });

  it("wires export excel to object table export service", () => {
    assert.match(source, /exportObjectTableToExcel/);
    assert.match(source, /getObjectTableExportProvider/);
    assert.match(source, /runExportExcel/);
    assert.doesNotMatch(source, /notifyStub\("Экспорт Excel"\)/);
  });

  it("wires import excel to object table import bridge", () => {
    assert.match(source, /getObjectTableImportProvider/);
    assert.match(source, /requestObjectExcelImportOpen/);
    assert.match(source, /runImportExcel/);
    assert.doesNotMatch(source, /notifyStub\("Импорт Excel"\)/);
  });
});
