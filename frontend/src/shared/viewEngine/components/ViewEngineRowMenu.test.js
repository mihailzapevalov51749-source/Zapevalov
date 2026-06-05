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

    expect(source).toContain("createChildMenuLabel");
    expect(source).toContain("Удалить");
    expect(source).toContain("data-view-engine-row-menu");
    expect(source).toContain("opacity: showButton ? 1 : 0");
    expect(cssSource).toContain("view-engine-row-menu-slot");
    expect(cellSource).toContain("rendererContext?.rowActions");
    expect(cellSource).toContain("isRowHovered");
    expect(titleChromeSource).toMatch(/\{menu\}\s+<ViewEngineHierarchyTitleChrome/);
    expect(titleChromeSource).toMatch(
      /\{menu\}\s+<div\s+className="view-engine-title-field-chrome__body"/,
    );
    expect(cssSource).toContain("grid-template-columns: 18px minmax(0, 1fr)");
  });
});
