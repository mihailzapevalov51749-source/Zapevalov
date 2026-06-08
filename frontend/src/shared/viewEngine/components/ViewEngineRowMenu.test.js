import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const here = dirname(fileURLToPath(import.meta.url));

describe("ViewEngineRowMenu", () => {
  it("renders platform row menu actions without domain logic", () => {
    const source = readFileSync(resolve(here, "ViewEngineRowMenu.jsx"), "utf8");
    const cssSource = readFileSync(
      resolve(here, "../viewEngineTable.css"),
      "utf8",
    );
    const cellSource = readFileSync(
      resolve(here, "../ViewEngineCell.jsx"),
      "utf8",
    );
    const titleChromeSource = readFileSync(
      resolve(here, "ViewEngineTitleFieldChrome.jsx"),
      "utf8",
    );
    const selectionCellSource = readFileSync(
      resolve(here, "ViewEngineSelectionCell.jsx"),
      "utf8",
    );

    expect(source).toContain("createChildMenuLabel");
    expect(source).toContain("Удалить");
    expect(source).toContain("data-view-engine-row-menu");
    expect(source).toContain("opacity: showButton ? 1 : 0");
    expect(cssSource).toContain("view-engine-row-menu-slot");
    expect(cellSource).toContain("rendererContext?.rowActions");
    expect(cellSource).toContain("isRowHovered");
    expect(titleChromeSource).toContain("ViewEngineTitleHierarchyNumber");
    expect(titleChromeSource).toContain("view-engine-title-field-chrome__content");
    expect(selectionCellSource).toContain("ViewEngineSelectionTreeToggle");
    expect(source).toContain("readOnly");
    expect(source).toContain("RuntimeRowActions");
    expect(source).toContain("runtimePlacedActions");
    expect(cssSource).toContain("grid-template-columns: 24px minmax(0, 1fr)");
    expect(cssSource).toContain("view-engine-table-selection-tree-toggle");
    expect(cssSource).toContain("min-width: 36px");
  });
});
