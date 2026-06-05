import { describe, expect, it } from "vitest";

import { buildObjectTableHierarchyDisplayRows } from "./buildObjectTableHierarchyDisplayRows.js";

function row(id) {
  return { id, cells: [] };
}

describe("buildObjectTableHierarchyDisplayRows", () => {
  it("nests children under expanded parent in flat row order", () => {
    const flatRows = [row("a"), row("b"), row("c")];
    const parentByChild = new Map([
      ["b", "a"],
      ["c", "b"],
    ]);
    const childrenByParent = new Map([
      ["a", ["b"]],
      ["b", ["c"]],
    ]);
    const expandedRowIds = new Set(["a", "b"]);

    const display = buildObjectTableHierarchyDisplayRows({
      flatRows,
      parentByChild,
      childrenByParent,
      expandedRowIds,
    });

    expect(display.map((item) => item.id)).toEqual(["a", "b", "c"]);
    expect(display[0].hierarchy.level).toBe(0);
    expect(display[1].hierarchy.level).toBe(1);
    expect(display[2].hierarchy.level).toBe(2);
    expect(display.map((item) => item.hierarchy.hierarchyNumber)).toEqual([
      "1",
      "1.1",
      "1.1.1",
    ]);
  });

  it("assigns root numbers 1, 2, 3 for siblings at level 0", () => {
    const flatRows = [row("r1"), row("r2"), row("r2c"), row("r3")];
    const parentByChild = new Map([["r2c", "r2"]]);
    const childrenByParent = new Map([["r2", ["r2c"]]]);

    const display = buildObjectTableHierarchyDisplayRows({
      flatRows,
      parentByChild,
      childrenByParent,
      expandedRowIds: new Set(["r2"]),
    });

    expect(display.map((item) => item.hierarchy.hierarchyNumber)).toEqual([
      "1",
      "2",
      "2.1",
      "3",
    ]);
  });

  it("hides collapsed descendants", () => {
    const flatRows = [row("a"), row("b")];
    const parentByChild = new Map([["b", "a"]]);
    const childrenByParent = new Map([["a", ["b"]]]);

    const display = buildObjectTableHierarchyDisplayRows({
      flatRows,
      parentByChild,
      childrenByParent,
      expandedRowIds: new Set(),
    });

    expect(display.map((item) => item.id)).toEqual(["a"]);
    expect(display[0].hierarchy.isExpanded).toBe(false);
  });

  it("promotes filtered child without parent on page to root", () => {
    const flatRows = [row("child-only")];
    const parentByChild = new Map([["child-only", "parent-off-page"]]);
    const childrenByParent = new Map([["parent-off-page", ["child-only"]]]);

    const display = buildObjectTableHierarchyDisplayRows({
      flatRows,
      parentByChild,
      childrenByParent,
      expandedRowIds: new Set(),
    });

    expect(display).toHaveLength(1);
    expect(display[0].id).toBe("child-only");
    expect(display[0].hierarchy.level).toBe(0);
  });
});
