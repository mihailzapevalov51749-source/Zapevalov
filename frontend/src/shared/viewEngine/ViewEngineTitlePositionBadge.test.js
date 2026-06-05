import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("ViewEngineTitlePositionBadge", () => {
  it("renders bracketed position inside title field", () => {
    const source = readFileSync(
      new URL("./ViewEngineTitlePositionBadge.jsx", import.meta.url),
      "utf8",
    );

    expect(source).not.toContain("[{displayValue}]");
    expect(source).toContain("view-engine-title-position-text");
    expect(source).not.toContain("border-radius");
  });

  it("position badge is not separate column", () => {
    const projectionSource = readFileSync(
      new URL(
        "../../modules/objectViews/table/services/adapters/projectionToColumns.js",
        import.meta.url,
      ),
      "utf8",
    );

    expect(projectionSource).not.toContain('label: "Позиция"');
    expect(projectionSource).not.toContain("positionNumber");
  });
});
