import { describe, expect, it } from "vitest";

import {
  PLAN_TREE_ROOT_ANCHOR_MARKER,
  isPlanTreeRootAnchorTitle,
  resolveEffectivePlanTreeParentId,
  resolvePlanTreeRootIds,
} from "./planTreeRootAnchor.js";
import { getPlanTreeChildrenIds } from "./planTreeDragDrop.js";

describe("planTreeRootAnchor", () => {
  it("maps null parent to root anchor id", () => {
    expect(resolveEffectivePlanTreeParentId(null, "anchor-1")).toBe("anchor-1");
    expect(resolveEffectivePlanTreeParentId("parent-1", "anchor-1")).toBe("parent-1");
  });

  it("uses anchor children as root ids", () => {
    const parentByChild = new Map([
      ["root-1", "anchor-1"],
      ["root-2", "anchor-1"],
    ]);
    const childrenByParent = new Map([
      ["anchor-1", ["root-1", "root-2"]],
    ]);
    const entitiesById = new Map([
      ["anchor-1", { id: "anchor-1", values: { title: PLAN_TREE_ROOT_ANCHOR_MARKER } }],
      ["root-1", { id: "root-1" }],
      ["root-2", { id: "root-2" }],
    ]);

    expect(
      resolvePlanTreeRootIds({
        parentByChild,
        childrenByParent,
        entitiesById,
        rootAnchorId: "anchor-1",
      }),
    ).toEqual(["root-1", "root-2"]);
  });

  it("detects relation-scoped anchor titles", () => {
    expect(
      isPlanTreeRootAnchorTitle(`${PLAN_TREE_ROOT_ANCHOR_MARKER}#podpunkt`),
    ).toBe(true);
  });

  it("returns anchor children for root-level sibling operations", () => {
    const roots = [
      { id: "root-1", children: [] },
      { id: "root-2", children: [] },
    ];
    const nodesById = new Map([
      [
        "anchor-1",
        {
          id: "anchor-1",
          children: [
            { id: "root-1", children: [] },
            { id: "root-2", children: [] },
          ],
        },
      ],
      ["root-1", roots[0]],
      ["root-2", roots[1]],
    ]);

    expect(getPlanTreeChildrenIds(nodesById, roots, null, "anchor-1")).toEqual([
      "root-1",
      "root-2",
    ]);
  });
});
