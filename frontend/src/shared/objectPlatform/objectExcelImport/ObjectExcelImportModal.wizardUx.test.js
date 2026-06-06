import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

describe("ObjectExcelImportModal wizard UX", () => {
  it("implements clean compact layout for step 1", () => {
    const modalSource = readFileSync(
      new URL("./ObjectExcelImportModal.jsx", import.meta.url),
      "utf8",
    );
    const cssSource = readFileSync(
      new URL("./objectExcelImport.css", import.meta.url),
      "utf8",
    );
    const stepperSource = readFileSync(
      new URL("./ObjectExcelImportStepper.jsx", import.meta.url),
      "utf8",
    );

    assert.match(modalSource, /title="Импорт Excel"/);
    assert.match(modalSource, /subtitle=\{objectName\}/);
    assert.match(modalSource, /headerDensity=\{step === "file" \? "compact" : "default"\}/);
    assert.match(modalSource, /ObjectExcelImportStepper/);
    assert.match(modalSource, /object-excel-import__dropzone/);
    assert.match(modalSource, /object-excel-import__btn--primary/);
    assert.match(modalSource, /object-excel-import__footer--end/);
    assert.match(modalSource, /UNSUPPORTED_FILE_MESSAGE/);
    assert.match(modalSource, /showPlatformNotification/);
    assert.match(modalSource, /canProceedFromFile/);
    assert.match(modalSource, /Далее →/);
    assert.match(modalSource, /disabled=\{!canProceedFromFile\}/);
    assert.match(modalSource, /FILE_STEP_CONTENT_STYLE/);
    assert.match(modalSource, /resolveFileStepBounds/);
    assert.doesNotMatch(modalSource, /Создание записей из Excel-файла/);
    assert.doesNotMatch(modalSource, /Следующий шаг:/);
    assert.doesNotMatch(modalSource, /Загрузите Excel-файл/);
    assert.doesNotMatch(modalSource, /Поддерживается формат: \.xlsx/);
    assert.doesNotMatch(modalSource, /designer-btn/);

    assert.match(stepperSource, /marker: "①"/);
    assert.match(stepperSource, /valueMapping/);
    assert.match(stepperSource, /marker: "⑤"/);
    assert.match(stepperSource, /Импорт/);
    assert.match(cssSource, /object-excel-import__stepper/);
    assert.match(cssSource, /object-excel-import__footer--end/);
    assert.match(cssSource, /min-height: 72px/);
    assert.match(cssSource, /:focus-visible/);
    assert.doesNotMatch(cssSource, /object-excel-import__format-hint/);
  });
});
