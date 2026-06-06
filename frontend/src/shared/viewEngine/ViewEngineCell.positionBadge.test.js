import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("ViewEngineCell title hierarchy number", () => {
  it("uses unified title chrome with hierarchy number resolver", () => {
    const source = readFileSync(
      new URL("./ViewEngineCell.jsx", import.meta.url),
      "utf8",
    );

    expect(source).toContain("resolveTitleFieldDisplayNumber");
    expect(source).toContain("displayNumber");
    expect(source).toContain("hierarchyTreeEnabled");
    expect(source).not.toContain("ViewEngineTitlePositionBadge");
    expect(source).not.toContain("ViewEngineHierarchyTitleChrome");
  });
});
