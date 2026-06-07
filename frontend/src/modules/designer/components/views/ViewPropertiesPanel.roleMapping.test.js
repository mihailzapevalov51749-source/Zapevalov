import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("ViewPropertiesPanel plan layout", () => {
  it("does not expose Role Mapping for plan views", () => {
    const source = readFileSync(
      new URL("./ViewPropertiesPanel.jsx", import.meta.url),
      "utf8",
    );

    expect(source).not.toMatch(/ObjectRoleMappingPanel/);
    expect(source).toMatch(/showInfoColumn=\{isPlanView\}/);
    expect(source).toMatch(/Настройки Плана/);
    expect(source).toMatch(/Вкладки/);
    expect(source).not.toMatch(/Role Mapping/);
    expect(source).not.toMatch(/Секции вкладки Инфо/);
  });

  it("projection list supports Info column for plan", () => {
    const fieldsListSource = readFileSync(
      new URL("./ViewPropertiesFieldsList.jsx", import.meta.url),
      "utf8",
    );

    expect(fieldsListSource).toMatch(/showInfoColumn/);
    expect(fieldsListSource).toMatch(/onToggleInfoField/);
    expect(fieldsListSource).toMatch(/disabled=\{!isVisible \|\| isLocked\}/);
  });
});
