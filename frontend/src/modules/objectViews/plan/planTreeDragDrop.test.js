import { describe, expect, it } from "vitest";

import {
  buildPlanTreeMoveDescriptor,
  computePlanTreeDropPosition,
  getPlanTreeChildrenIds,
  PLAN_TREE_DROP_POSITION,
  resolvePlanTreeDropDescriptor,
  resolvePlanTreeDropInsertDepth,
  validatePlanTreeDrop,
} from "./planTreeDragDrop.js";

function createTreeFixture() {
  const roots = [
    {
      id: "root-1",
      parentId: null,
      depth: 0,
      children: [
        { id: "child-1", parentId: "root-1", depth: 1, children: [] },
        { id: "child-2", parentId: "root-1", depth: 1, children: [] },
      ],
    },
    { id: "root-2", parentId: null, depth: 0, children: [] },
    { id: "root-3", parentId: null, depth: 0, children: [] },
    { id: "root-4", parentId: null, depth: 0, children: [] },
  ];

  const nodesById = new Map([
    ["root-1", roots[0]],
    ["child-1", roots[0].children[0]],
    ["child-2", roots[0].children[1]],
    ["root-2", roots[1]],
    ["root-3", roots[2]],
    ["root-4", roots[3]],
  ]);

  return { roots, nodesById };
}

function createAnchoredTreeFixture() {
  const anchorId = "anchor-1";
  const roots = [
    {
      id: "root-1",
      parentId: anchorId,
      depth: 0,
      children: [
        {
          id: "child-1",
          parentId: "root-1",
          depth: 1,
          children: [],
        },
      ],
    },
    { id: "root-2", parentId: anchorId, depth: 0, children: [] },
    { id: "root-3", parentId: anchorId, depth: 0, children: [] },
  ];

  const nodesById = new Map([
    ["child-1", roots[0].children[0]],
    ["root-1", roots[0]],
    ["root-2", roots[1]],
    ["root-3", roots[2]],
  ]);

  return { roots, nodesById, anchorId };
}

describe("computePlanTreeDropPosition", () => {
  it("returns before for the top quarter of the row", () => {
    const row = {
      getBoundingClientRect: () => ({ top: 100, height: 40 }),
    };

    expect(
      computePlanTreeDropPosition({ clientY: 105 }, row),
    ).toBe(PLAN_TREE_DROP_POSITION.BEFORE);
  });

  it("returns inside for the middle of the row", () => {
    const row = {
      getBoundingClientRect: () => ({ top: 100, height: 40 }),
    };

    expect(
      computePlanTreeDropPosition({ clientY: 120 }, row),
    ).toBe(PLAN_TREE_DROP_POSITION.INSIDE);
  });

  it("returns after for the bottom quarter of the row", () => {
    const row = {
      getBoundingClientRect: () => ({ top: 100, height: 40 }),
    };

    expect(
      computePlanTreeDropPosition({ clientY: 135 }, row),
    ).toBe(PLAN_TREE_DROP_POSITION.AFTER);
  });
});

describe("buildPlanTreeMoveDescriptor", () => {
  it("builds before descriptor with target parent", () => {
    const { roots, nodesById } = createTreeFixture();

    expect(
      buildPlanTreeMoveDescriptor({
        sourceId: "root-4",
        targetId: "root-2",
        position: PLAN_TREE_DROP_POSITION.BEFORE,
        nodesById,
        roots,
      }),
    ).toEqual({
      targetId: "root-2",
      position: PLAN_TREE_DROP_POSITION.BEFORE,
      parentId: null,
      index: 1,
    });
  });

  it("builds after descriptor with target parent", () => {
    const { roots, nodesById } = createTreeFixture();

    expect(
      buildPlanTreeMoveDescriptor({
        sourceId: "root-4",
        targetId: "root-2",
        position: PLAN_TREE_DROP_POSITION.AFTER,
        nodesById,
        roots,
      }),
    ).toEqual({
      targetId: "root-2",
      position: PLAN_TREE_DROP_POSITION.AFTER,
      parentId: null,
      index: 2,
    });
  });

  it("builds inside descriptor with parent equal to target", () => {
    const { roots, nodesById } = createTreeFixture();

    expect(
      buildPlanTreeMoveDescriptor({
        sourceId: "root-4",
        targetId: "root-1",
        position: PLAN_TREE_DROP_POSITION.INSIDE,
        nodesById,
        roots,
      }),
    ).toEqual({
      targetId: "root-1",
      position: PLAN_TREE_DROP_POSITION.INSIDE,
      parentId: "root-1",
      index: 2,
    });
  });

  it("builds root-end descriptor with null parent", () => {
    const { roots, nodesById } = createTreeFixture();

    expect(
      buildPlanTreeMoveDescriptor({
        sourceId: "child-1",
        position: PLAN_TREE_DROP_POSITION.ROOT_END,
        nodesById,
        roots,
      }),
    ).toEqual({
      targetId: null,
      position: PLAN_TREE_DROP_POSITION.ROOT_END,
      parentId: null,
      index: 4,
    });
  });

  it("moves sibling before sibling on the same level", () => {
    const { roots, nodesById } = createTreeFixture();

    expect(
      buildPlanTreeMoveDescriptor({
        sourceId: "child-2",
        targetId: "child-1",
        position: PLAN_TREE_DROP_POSITION.BEFORE,
        nodesById,
        roots,
      }),
    ).toEqual({
      targetId: "child-1",
      position: PLAN_TREE_DROP_POSITION.BEFORE,
      parentId: "root-1",
      index: 0,
    });
  });
});

describe("validatePlanTreeDrop", () => {
  it("rejects drop inside self", () => {
    const { nodesById } = createTreeFixture();

    expect(
      validatePlanTreeDrop("root-1", {
        targetId: "root-1",
        position: PLAN_TREE_DROP_POSITION.INSIDE,
        parentId: "root-1",
        index: 0,
      }, nodesById),
    ).toEqual({ valid: false, reason: "self" });
  });

  it("rejects drop inside descendant", () => {
    const { nodesById } = createTreeFixture();

    expect(
      validatePlanTreeDrop("root-1", {
        targetId: "child-1",
        position: PLAN_TREE_DROP_POSITION.INSIDE,
        parentId: "child-1",
        index: 0,
      }, nodesById),
    ).toEqual({ valid: false, reason: "cycle" });
  });

  it("rejects before/after on descendant target", () => {
    const { nodesById } = createTreeFixture();

    expect(
      validatePlanTreeDrop("root-1", {
        targetId: "child-2",
        position: PLAN_TREE_DROP_POSITION.AFTER,
        parentId: "root-1",
        index: 2,
      }, nodesById),
    ).toEqual({ valid: false, reason: "cycle" });
  });
});

describe("getPlanTreeChildrenIds", () => {
  it("returns root ids for null parent", () => {
    const { roots, nodesById } = createTreeFixture();

    expect(getPlanTreeChildrenIds(nodesById, roots, null)).toEqual([
      "root-1",
      "root-2",
      "root-3",
      "root-4",
    ]);
  });

  it("returns visible roots when root anchor is hidden from nodesById", () => {
    const { roots, nodesById, anchorId } = createAnchoredTreeFixture();

    expect(getPlanTreeChildrenIds(nodesById, roots, null, anchorId)).toEqual([
      "root-1",
      "root-2",
      "root-3",
    ]);
    expect(getPlanTreeChildrenIds(nodesById, roots, anchorId, anchorId)).toEqual([
      "root-1",
      "root-2",
      "root-3",
    ]);
  });
});

describe("resolvePlanTreeDropDescriptor", () => {
  it("keeps hover and drop descriptors identical", () => {
    const { roots, nodesById, anchorId } = createAnchoredTreeFixture();
    const params = {
      sourceId: "child-1",
      targetId: "root-2",
      position: PLAN_TREE_DROP_POSITION.BEFORE,
      nodesById,
      roots,
      rootAnchorId: anchorId,
    };

    const hoverDescriptor = resolvePlanTreeDropDescriptor(params);
    const dropDescriptor = resolvePlanTreeDropDescriptor(params);

    expect(hoverDescriptor).toEqual(dropDescriptor);
    expect(dropDescriptor).toMatchObject({
      targetId: "root-2",
      position: PLAN_TREE_DROP_POSITION.BEFORE,
      parentId: anchorId,
      index: 1,
      insertDepth: 0,
    });
  });

  it("builds child to root after descriptor with anchor", () => {
    const { roots, nodesById, anchorId } = createAnchoredTreeFixture();

    expect(
      buildPlanTreeMoveDescriptor({
        sourceId: "child-1",
        targetId: "root-2",
        position: PLAN_TREE_DROP_POSITION.AFTER,
        nodesById,
        roots,
        rootAnchorId: anchorId,
      }),
    ).toEqual({
      targetId: "root-2",
      position: PLAN_TREE_DROP_POSITION.AFTER,
      parentId: anchorId,
      index: 2,
    });
  });
});

describe("resolvePlanTreeDropInsertDepth", () => {
  it("uses root indent for before root placement", () => {
    const { nodesById, anchorId } = createAnchoredTreeFixture();

    expect(
      resolvePlanTreeDropInsertDepth(
        {
          targetId: "root-2",
          position: PLAN_TREE_DROP_POSITION.BEFORE,
          parentId: anchorId,
          index: 1,
        },
        nodesById,
        anchorId,
      ),
    ).toBe(0);
  });

  it("uses child indent for before child placement", () => {
    const { roots, nodesById } = createTreeFixture();

    expect(
      resolvePlanTreeDropInsertDepth(
        buildPlanTreeMoveDescriptor({
          sourceId: "child-2",
          targetId: "child-1",
          position: PLAN_TREE_DROP_POSITION.BEFORE,
          nodesById,
          roots,
        }),
        nodesById,
      ),
    ).toBe(1);
  });
});
