import { describe, expect, it } from "vitest";

import { applyObjectTableDisplayPositions } from "./applyObjectTableDisplayPositions";

describe("applyObjectTableDisplayPositions", () => {
  it("position recalculated after filter on flat rows", () => {
    const rows = [{ id: "b" }, { id: "d" }];

    const result = applyObjectTableDisplayPositions({
      rows,
      treeEnabled: false,
    });

    expect(result.map((row) => row.positionNumber)).toEqual(["1", "2"]);
  });

  it("position recalculated after sort on flat rows", () => {
    const rows = [{ id: "d" }, { id: "c" }, { id: "b" }];

    const result = applyObjectTableDisplayPositions({
      rows,
      treeEnabled: false,
    });

    expect(result.map((row) => row.positionNumber)).toEqual(["1", "2", "3"]);
  });

  it("tree mode uses parent map for hierarchical positions", () => {
    const sourceRows = [
      { id: "p" },
      { id: "c1" },
      { id: "c2" },
    ];
    const parentByChild = new Map([
      ["c1", "p"],
      ["c2", "p"],
    ]);

    const displayRows = [
      { id: "p" },
      { id: "c1" },
      { id: "c2" },
    ];

    const result = applyObjectTableDisplayPositions({
      rows: displayRows,
      sourceRows,
      treeEnabled: true,
      parentByChild,
    });

    expect(result[0].displayPosition).toBe("1");
    expect(result[1].displayPosition).toBe("1.1");
    expect(result[2].displayPosition).toBe("1.2");
  });
});
