import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

describe("ObjectExcelImportModal default values", () => {
  it("wires default value rules into mapping and validation", () => {
    const modalSource = readFileSync(
      new URL("./ObjectExcelImportModal.jsx", import.meta.url),
      "utf8",
    );
    const panelSource = readFileSync(
      new URL("./ObjectExcelImportDefaultValuesPanel.jsx", import.meta.url),
      "utf8",
    );
    const validateSource = readFileSync(
      new URL("../services/import/validateObjectExcelImportRows.js", import.meta.url),
      "utf8",
    );

    assert.match(modalSource, /ObjectExcelImportDefaultValuesPanel/);
    assert.match(modalSource, /importDefaultValues/);
    assert.match(modalSource, /buildImportDefaultValues/);
    assert.match(modalSource, /syncImportDefaultValuesWithMappings/);
    assert.match(modalSource, /importDefaultValues,\s*\)/);

    assert.match(panelSource, /Значение по умолчанию/);
    assert.match(panelSource, /Колонка Excel/);
    assert.match(panelSource, /IMPORT_DEFAULT_CURRENT_USER_LABEL/);
    assert.match(panelSource, /onAssignExcelColumn/);
    assert.match(panelSource, /Обязательные поля/);
    assert.match(modalSource, /validateImportDefaultFieldRules/);
    assert.match(modalSource, /ensureImportDefaultFieldRules/);
    assert.match(modalSource, /importContext/);

    assert.match(validateSource, /applyImportDefaultValues/);
    assert.match(validateSource, /IMPORT_DATA_SOURCE_DEFAULT_VALUE/);
    assert.match(validateSource, /importContext/);
  });
});
