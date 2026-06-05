import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("ViewEngineCell position badge", () => {
  it("table renders position badge near title field", () => {
    const source = readFileSync(
      new URL("./ViewEngineCell.jsx", import.meta.url),
      "utf8",
    );

    expect(source).toContain("ViewEngineTitlePositionBadge");
    expect(source).toContain("positionNumber");
    expect(source).not.toMatch(/label:\s*["']Позиция["']/);
  });
});
