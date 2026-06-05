import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("ViewEngineTable record number column", () => {
  it("table renders record_number column via formatSystemRowNumber", () => {
    const source = readFileSync(
      new URL("./ViewEngineTable.jsx", import.meta.url),
      "utf8",
    );

    expect(source).toContain("formatSystemRowNumber");
    expect(source).toContain("row.recordNumber");
  });
});
