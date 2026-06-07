import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("ViewPropertiesPanel projection layout", () => {
  it("renders ObjectProjectionPanel for all view types including plan", () => {
    const source = readFileSync(
      new URL("./ViewPropertiesPanel.jsx", import.meta.url),
      "utf8",
    );

    expect(source).toMatch(/ObjectProjectionPanel/);
    expect(source).toMatch(/Настройки Плана/);
    expect(source).toMatch(/PlanViewSettingsPanel/);
    expect(source).not.toMatch(/isPlanView \? \(\s*<PlanViewSettingsPanel/);
  });
});
