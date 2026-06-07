import { describe, expect, it } from "vitest";

import { assignPlanTreeHierarchyNumbers } from "./planTreeNumbering.js";

describe("assignPlanTreeHierarchyNumbers", () => {
  it("assigns 1, 1.1, 1.2 style numbers", () => {
    const roots = [
      {
        id: "root",
        children: [
          { id: "c1", children: [{ id: "c1-1", children: [] }] },
          { id: "c2", children: [] },
        ],
      },
    ];

    assignPlanTreeHierarchyNumbers(roots);

    expect(roots[0].hierarchyNumber).toBe("1");
    expect(roots[0].children[0].hierarchyNumber).toBe("1.1");
    expect(roots[0].children[0].children[0].hierarchyNumber).toBe("1.1.1");
    expect(roots[0].children[1].hierarchyNumber).toBe("1.2");
  });
});
