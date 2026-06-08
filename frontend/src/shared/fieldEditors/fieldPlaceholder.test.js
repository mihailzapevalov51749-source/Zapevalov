import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const __dirname = dirname(fileURLToPath(import.meta.url));

describe("FieldPropertiesPanel placeholder UI", () => {
  it("exposes Подсказка field below description", () => {
    const source = readFileSync(
      join(__dirname, "../../modules/designer/components/fields/FieldPropertiesForm.jsx"),
      "utf8",
    );

    expect(source).toContain("field-prop-placeholder");
    expect(source).toContain("Подсказка");
    expect(source).toContain("draft.placeholder");
    expect(source).toContain("Например: Кратко опишите проблему");
  });
});

describe("FieldEditor placeholder wiring", () => {
  it("passes resolved placeholder to editors", () => {
    const source = readFileSync(
      join(__dirname, "FieldEditor.jsx"),
      "utf8",
    );

    expect(source).toContain("resolveFieldPlaceholder");
    expect(source).toContain("placeholder={placeholder}");
  });
});
