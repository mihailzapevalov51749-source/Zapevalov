import { describe, expect, it } from "vitest";

import { buildRowNumbers } from "./buildRowNumbers";

describe("buildRowNumbers", () => {
  it("buildRowNumbers flat assigns sequential positions", () => {
    const rows = [{ id: "a" }, { id: "b" }, { id: "c" }];

    expect(buildRowNumbers({ rows, mode: "flat" })).toEqual({
      a: "1",
      b: "2",
      c: "3",
    });
  });

  it("buildRowNumbers flat recalculates after filter subset", () => {
    const rows = [{ id: "b" }, { id: "d" }];

    expect(buildRowNumbers({ rows, mode: "flat" })).toEqual({
      b: "1",
      d: "2",
    });
  });

  it("buildRowNumbers tree assigns hierarchical positions", () => {
    const rows = [
      { id: "r7" },
      { id: "c1", parent_id: "r7" },
      { id: "c2", parent_id: "r7" },
      { id: "c3", parent_id: "r7" },
    ];

    const result = buildRowNumbers({ rows, mode: "tree" });

    expect(result.r7).toBe("1");
    expect(result.c1).toBe("1.1");
    expect(result.c2).toBe("1.2");
    expect(result.c3).toBe("1.3");
  });

  it("position recalculated after sort uses new array order", () => {
    const rows = [{ id: "d" }, { id: "c" }, { id: "b" }, { id: "a" }];

    expect(buildRowNumbers({ rows, mode: "flat" })).toEqual({
      d: "1",
      c: "2",
      b: "3",
      a: "4",
    });
  });
});
