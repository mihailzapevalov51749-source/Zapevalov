import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("ViewEngineSelectionCell hierarchy tree toggle", () => {
  it("renders checkbox and tree toggle in one selection column", () => {
    const selectionCell = readFileSync(
      new URL("./ViewEngineSelectionCell.jsx", import.meta.url),
      "utf8",
    );
    const table = readFileSync(
      new URL("../ViewEngineTable.jsx", import.meta.url),
      "utf8",
    );
    const titleChrome = readFileSync(
      new URL("./ViewEngineTitleFieldChrome.jsx", import.meta.url),
      "utf8",
    );

    expect(selectionCell).toContain("ViewEngineSelectionTreeToggle");
    expect(selectionCell).toContain("hierarchyTreeEnabled");
    expect(selectionCell).toContain("onToggleTreeHeader");
    expect(table).toContain("hierarchyTree?.onToggleRowExpanded");
    expect(table).toContain("hierarchyTree?.onToggleTreeHeader");
    expect(titleChrome).not.toContain("ViewEngineTitleExpandToggle");
  });
});
