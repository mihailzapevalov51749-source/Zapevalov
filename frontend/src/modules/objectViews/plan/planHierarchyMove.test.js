import { describe, expect, it, vi, beforeEach } from "vitest";

import { movePlanTreeNode } from "./planHierarchyMove.js";
import * as runtimeRelationsApi from "../../../api/runtimeRelationsApi.js";
import * as planTreeRootOrderApi from "./planTreeRootOrderApi.js";

describe("movePlanTreeNode root reorder", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("maps null parent to root anchor and calls reorder-siblings", async () => {
    const reorderSpy = vi
      .spyOn(planTreeRootOrderApi, "reorderPlanTreeSiblingOrder")
      .mockResolvedValue({ updatedCount: 2 });
    vi.spyOn(runtimeRelationsApi, "deleteRelation").mockResolvedValue(undefined);
    vi.spyOn(runtimeRelationsApi, "createRelation").mockResolvedValue({});

    const roots = [
      { id: "root-1", parentId: "anchor-1", children: [] },
      { id: "root-2", parentId: "anchor-1", children: [] },
    ];
    const nodesById = new Map([
      ["anchor-1", { id: "anchor-1", children: roots }],
      ...roots.map((node) => [node.id, node]),
    ]);

    await movePlanTreeNode({
      tenantId: 1,
      relationKey: "podpunkt",
      relationDefinition: {
        key: "podpunkt",
        source_object_type_key: "napravleniya",
        target_object_type_key: "napravleniya",
        settings_json: {
          parent_entity_side: "source",
          child_entity_side: "target",
        },
      },
      instances: [],
      nodesById,
      roots,
      rootAnchorId: "anchor-1",
      sourceId: "root-2",
      descriptor: {
        targetId: "root-1",
        position: "before",
        parentId: null,
        index: 0,
      },
    });

    expect(reorderSpy).toHaveBeenCalledWith(1, "podpunkt", {
      parentEntityId: "anchor-1",
      orderedChildIds: ["root-2", "root-1"],
    });
    expect(runtimeRelationsApi.createRelation).not.toHaveBeenCalled();
  });

  it("reparents legacy root to anchor before reorder", async () => {
    vi.spyOn(planTreeRootOrderApi, "reorderPlanTreeSiblingOrder").mockResolvedValue({
      updatedCount: 2,
    });
    vi.spyOn(runtimeRelationsApi, "deleteRelation").mockResolvedValue(undefined);
    const createSpy = vi
      .spyOn(runtimeRelationsApi, "createRelation")
      .mockResolvedValue({});

    const roots = [
      { id: "root-1", parentId: "anchor-1", children: [], entity: { object_type_key: "napravleniya" } },
      { id: "root-2", parentId: null, children: [], entity: { object_type_key: "napravleniya" } },
    ];
    const nodesById = new Map([
      ["anchor-1", { id: "anchor-1", entity: { object_type_key: "napravleniya" }, children: [] }],
      ...roots.map((node) => [node.id, node]),
    ]);

    await movePlanTreeNode({
      tenantId: 1,
      relationKey: "podpunkt",
      relationDefinition: {
        key: "podpunkt",
        source_object_type_key: "napravleniya",
        target_object_type_key: "napravleniya",
        settings_json: {
          parent_entity_side: "source",
          child_entity_side: "target",
        },
      },
      instances: [],
      nodesById,
      roots,
      rootAnchorId: "anchor-1",
      sourceId: "root-2",
      descriptor: {
        targetId: "root-1",
        position: "after",
        parentId: null,
        index: 1,
      },
    });

    expect(createSpy).toHaveBeenCalledWith(1, "podpunkt", {
      source_entity_id: "anchor-1",
      target_entity_id: "root-2",
    });
  });

  it("reparents child to root before another root", async () => {
    const reorderSpy = vi
      .spyOn(planTreeRootOrderApi, "reorderPlanTreeSiblingOrder")
      .mockResolvedValue({ updatedCount: 3 });
    const deleteSpy = vi.spyOn(runtimeRelationsApi, "deleteRelation").mockResolvedValue(undefined);
    const createSpy = vi.spyOn(runtimeRelationsApi, "createRelation").mockResolvedValue({});

    const roots = [
      {
        id: "root-1",
        parentId: "anchor-1",
        children: [{ id: "child-1", parentId: "root-1", children: [] }],
        entity: { object_type_key: "napravleniya" },
      },
      { id: "root-2", parentId: "anchor-1", children: [], entity: { object_type_key: "napravleniya" } },
      { id: "root-3", parentId: "anchor-1", children: [], entity: { object_type_key: "napravleniya" } },
    ];
    const nodesById = new Map([
      ["anchor-1", { id: "anchor-1", entity: { object_type_key: "napravleniya" }, children: [] }],
      ["child-1", { ...roots[0].children[0], entity: { object_type_key: "napravleniya" } }],
      ["root-1", roots[0]],
      ["root-2", roots[1]],
      ["root-3", roots[2]],
    ]);

    await movePlanTreeNode({
      tenantId: 1,
      relationKey: "podpunkt",
      relationDefinition: {
        key: "podpunkt",
        source_object_type_key: "napravleniya",
        target_object_type_key: "napravleniya",
        settings_json: {
          parent_entity_side: "source",
          child_entity_side: "target",
        },
      },
      instances: [
        { id: "inst-1", source_entity_id: "root-1", target_entity_id: "child-1" },
      ],
      nodesById,
      roots,
      rootAnchorId: "anchor-1",
      sourceId: "child-1",
      descriptor: {
        targetId: "root-2",
        position: "before",
        parentId: "anchor-1",
        index: 1,
      },
    });

    expect(deleteSpy).toHaveBeenCalledWith(1, "inst-1");
    expect(createSpy).toHaveBeenCalledWith(1, "podpunkt", {
      source_entity_id: "anchor-1",
      target_entity_id: "child-1",
    });
    expect(reorderSpy).toHaveBeenCalledWith(1, "podpunkt", {
      parentEntityId: "anchor-1",
      orderedChildIds: ["root-1", "child-1", "root-2", "root-3"],
    });
  });

  it("reparents child to root after another root", async () => {
    const reorderSpy = vi
      .spyOn(planTreeRootOrderApi, "reorderPlanTreeSiblingOrder")
      .mockResolvedValue({ updatedCount: 3 });
    vi.spyOn(runtimeRelationsApi, "deleteRelation").mockResolvedValue(undefined);
    vi.spyOn(runtimeRelationsApi, "createRelation").mockResolvedValue({});

    const roots = [
      {
        id: "root-1",
        parentId: "anchor-1",
        children: [{ id: "child-1", parentId: "root-1", children: [] }],
        entity: { object_type_key: "napravleniya" },
      },
      { id: "root-2", parentId: "anchor-1", children: [], entity: { object_type_key: "napravleniya" } },
      { id: "root-3", parentId: "anchor-1", children: [], entity: { object_type_key: "napravleniya" } },
    ];
    const nodesById = new Map([
      ["anchor-1", { id: "anchor-1", entity: { object_type_key: "napravleniya" }, children: [] }],
      ["child-1", { ...roots[0].children[0], entity: { object_type_key: "napravleniya" } }],
      ["root-1", roots[0]],
      ["root-2", roots[1]],
      ["root-3", roots[2]],
    ]);

    await movePlanTreeNode({
      tenantId: 1,
      relationKey: "podpunkt",
      relationDefinition: {
        key: "podpunkt",
        source_object_type_key: "napravleniya",
        target_object_type_key: "napravleniya",
        settings_json: {
          parent_entity_side: "source",
          child_entity_side: "target",
        },
      },
      instances: [
        { id: "inst-1", source_entity_id: "root-1", target_entity_id: "child-1" },
      ],
      nodesById,
      roots,
      rootAnchorId: "anchor-1",
      sourceId: "child-1",
      descriptor: {
        targetId: "root-2",
        position: "after",
        parentId: "anchor-1",
        index: 2,
      },
    });

    expect(reorderSpy).toHaveBeenCalledWith(1, "podpunkt", {
      parentEntityId: "anchor-1",
      orderedChildIds: ["root-1", "root-2", "child-1", "root-3"],
    });
  });
});
