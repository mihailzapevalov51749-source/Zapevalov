import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

describe("ObjectExcelImportModal review UX", () => {
  it("implements review guidance and grouped footer actions", () => {
    const modalSource = readFileSync(
      new URL("./ObjectExcelImportModal.jsx", import.meta.url),
      "utf8",
    );
    const reviewPanelSource = readFileSync(
      new URL("./ObjectExcelImportReviewPanel.jsx", import.meta.url),
      "utf8",
    );
    const cssSource = readFileSync(
      new URL("./objectExcelImport.css", import.meta.url),
      "utf8",
    );

    assert.match(modalSource, /ObjectExcelImportReviewPanel/);
    assert.match(modalSource, /handleFixMapping/);
    assert.match(modalSource, /Исправить сопоставление/);
    assert.match(modalSource, /setStep\("mapping"\)/);
    assert.match(modalSource, /valueMappingStepUsed \? "valueMapping" : "mapping"/);
    assert.match(modalSource, /step === "review"[\s\S]*object-excel-import__footer--end/);
    assert.match(modalSource, /disabled=\{loading \|\| !validation\?\.validRows\?\.length\}/);

    assert.match(reviewPanelSource, /Нужно сопоставить обязательные поля/);
    assert.match(reviewPanelSource, /collectUnmappedRequiredImportFields/);
    assert.match(reviewPanelSource, /IMPORT_REVIEW_ZERO_ROWS_MESSAGE/);
    assert.match(reviewPanelSource, /Вернитесь к шагу «Колонки»/);

    assert.match(cssSource, /object-excel-import__review-alert/);
    assert.match(cssSource, /object-excel-import__review-hint/);
  });
});
