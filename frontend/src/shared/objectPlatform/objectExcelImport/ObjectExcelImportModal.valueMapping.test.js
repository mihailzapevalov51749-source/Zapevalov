import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

describe("ObjectExcelImportModal value mapping integration", () => {
  it("wires value mapping step into import wizard", () => {
    const modalSource = readFileSync(
      new URL("./ObjectExcelImportModal.jsx", import.meta.url),
      "utf8",
    );
    const stepperSource = readFileSync(
      new URL("./ObjectExcelImportStepper.jsx", import.meta.url),
      "utf8",
    );
    const panelSource = readFileSync(
      new URL("./ObjectExcelImportValueMappingPanel.jsx", import.meta.url),
      "utf8",
    );

    assert.match(modalSource, /ObjectExcelImportValueMappingPanel/);
    assert.match(modalSource, /buildImportValueMappings/);
    assert.match(modalSource, /handleProceedFromMapping/);
    assert.match(modalSource, /handleProceedFromValueMapping/);
    assert.match(modalSource, /valueMappingRules/);
    assert.match(modalSource, /step === "valueMapping"/);

    assert.match(stepperSource, /valueMapping/);
    assert.match(stepperSource, /marker: "③"/);
    assert.match(stepperSource, /marker: "⑤"/);

    assert.match(panelSource, /VALUE_MAPPING_SECTION_LABELS/);
    assert.match(panelSource, /withSkipMappingOption/);
    assert.match(panelSource, /IMPORT_VALUE_SKIP_OPTION/);
  });
});
