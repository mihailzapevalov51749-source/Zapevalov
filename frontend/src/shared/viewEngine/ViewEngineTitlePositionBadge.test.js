import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("ViewEngineTitlePositionBadge", () => {
  it("legacy badge kept for compatibility; title field uses hierarchy number component", () => {
    const badgeSource = readFileSync(
      new URL("./ViewEngineTitlePositionBadge.jsx", import.meta.url),
      "utf8",
    );
    const hierarchySource = readFileSync(
      new URL("./components/ViewEngineTitleHierarchyNumber.jsx", import.meta.url),
      "utf8",
    );

    expect(badgeSource).toContain("view-engine-title-position-text");
    expect(hierarchySource).toContain("view-engine-title-hierarchy-number");
    expect(hierarchySource).toContain("view-engine-title-field-chrome__number-zone");
  });
});
