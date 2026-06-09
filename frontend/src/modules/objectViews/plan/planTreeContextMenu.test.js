import { describe, expect, it, vi } from "vitest";

import { buildPlanTreeContextMenuActions } from "./buildPlanTreeContextMenuActions.js";
import { duplicatePlanTreeNode } from "./duplicatePlanTreeNode.js";
import { executePlanTreeContextMenuAction } from "./executePlanTreeContextMenuAction.js";
import {
  PLAN_TREE_CONTEXT_TARGET,
  createPlanTreeContextTarget,
  isPlanTreeBackgroundContextTarget,
  isPlanTreeNodeContextTarget,
  resolvePlanTreeContextMenuLabel,
} from "./planTreeContextTarget.js";

const FORBIDDEN_MENU_ACTION_IDS = ["create_child", "copy"];

function expectMenuWithoutForbiddenActions(actions) {
  for (const actionId of FORBIDDEN_MENU_ACTION_IDS) {
    expect(actions.some((action) => action.id === actionId)).toBe(false);
  }
}

describe("planTreeContextTarget", () => {
  it("creates node target with normalized id", () => {
    expect(createPlanTreeContextTarget(PLAN_TREE_CONTEXT_TARGET.NODE, " node_1 ")).toEqual({
      targetType: "node",
      targetId: "node_1",
    });
  });

  it("creates tree target without id", () => {
    expect(createPlanTreeContextTarget(PLAN_TREE_CONTEXT_TARGET.TREE)).toEqual({
      targetType: "tree",
      targetId: null,
    });
  });

  it("detects node and tree targets", () => {
    const nodeTarget = createPlanTreeContextTarget(PLAN_TREE_CONTEXT_TARGET.NODE, "a");
    const treeTarget = createPlanTreeContextTarget(PLAN_TREE_CONTEXT_TARGET.TREE);

    expect(isPlanTreeNodeContextTarget(nodeTarget)).toBe(true);
    expect(isPlanTreeBackgroundContextTarget(nodeTarget)).toBe(false);
    expect(isPlanTreeNodeContextTarget(treeTarget)).toBe(false);
    expect(isPlanTreeBackgroundContextTarget(treeTarget)).toBe(true);
  });

  it("resolves menu labels by target type", () => {
    expect(resolvePlanTreeContextMenuLabel(PLAN_TREE_CONTEXT_TARGET.NODE)).toContain("записи");
    expect(resolvePlanTreeContextMenuLabel(PLAN_TREE_CONTEXT_TARGET.TREE)).toContain("дерева");
  });
});

describe("buildPlanTreeContextMenuActions", () => {
  it("builds simplified node menu", () => {
    const actions = buildPlanTreeContextMenuActions({
      targetType: PLAN_TREE_CONTEXT_TARGET.NODE,
      canCreate: true,
      hasClipboard: true,
    });

    expect(actions.map((action) => action.id)).toEqual([
      "create",
      "rename",
      "duplicate",
      "cut",
      "paste",
      "delete",
      "properties",
    ]);
    expectMenuWithoutForbiddenActions(actions);
    expect(actions.find((action) => action.id === "paste")?.disabled).toBe(false);
  });

  it("builds tree menu without node-only actions", () => {
    const actions = buildPlanTreeContextMenuActions({
      targetType: PLAN_TREE_CONTEXT_TARGET.TREE,
      canCreate: true,
      hasClipboard: true,
    });

    expect(actions.map((action) => action.id)).toEqual(["create", "paste", "refresh"]);
    expectMenuWithoutForbiddenActions(actions);
    expect(actions.some((action) => action.id === "delete")).toBe(false);
    expect(actions.some((action) => action.id === "rename")).toBe(false);
    expect(actions.some((action) => action.id === "properties")).toBe(false);
  });

  it("shows refresh-only tree menu when create and clipboard are unavailable", () => {
    const actions = buildPlanTreeContextMenuActions({
      targetType: PLAN_TREE_CONTEXT_TARGET.TREE,
      canCreate: false,
      hasClipboard: false,
    });

    expect(actions).toEqual([{ id: "refresh", label: "Обновить" }]);
    expectMenuWithoutForbiddenActions(actions);
  });

  it("returns no actions in preview mode", () => {
    expect(
      buildPlanTreeContextMenuActions({
        targetType: PLAN_TREE_CONTEXT_TARGET.NODE,
        previewMode: true,
      }),
    ).toEqual([]);
  });
});

describe("executePlanTreeContextMenuAction", () => {
  it("routes create on tree target to createRootNode", async () => {
    const createRootNode = vi.fn();

    await executePlanTreeContextMenuAction({
      actionId: "create",
      context: createPlanTreeContextTarget(PLAN_TREE_CONTEXT_TARGET.TREE),
      handlers: { createRootNode },
    });

    expect(createRootNode).toHaveBeenCalledTimes(1);
  });

  it("routes create on node target to createChildNode", async () => {
    const createChildNode = vi.fn();

    await executePlanTreeContextMenuAction({
      actionId: "create",
      context: createPlanTreeContextTarget(PLAN_TREE_CONTEXT_TARGET.NODE, "parent-1"),
      handlers: { createChildNode },
    });

    expect(createChildNode).toHaveBeenCalledWith("parent-1");
  });

  it("routes duplicate on node target to duplicateNode", async () => {
    const duplicateNode = vi.fn();

    await executePlanTreeContextMenuAction({
      actionId: "duplicate",
      context: createPlanTreeContextTarget(PLAN_TREE_CONTEXT_TARGET.NODE, "node-1"),
      handlers: { duplicateNode },
    });

    expect(duplicateNode).toHaveBeenCalledWith("node-1");
  });
});

describe("duplicatePlanTreeNode", () => {
  it("creates a copy with the same values and keeps hierarchy parent", async () => {
    const createEntity = vi.fn(async () => ({ id: "copy-1" }));
    const reparentNode = vi.fn(async () => undefined);
    const refreshTree = vi.fn(async () => undefined);
    const onCreated = vi.fn();

    const createdId = await duplicatePlanTreeNode({
      sourceNode: {
        parentId: "parent-1",
        entity: { values: { title: "Улучшения", status: "open" } },
      },
      newParentId: "parent-1",
      createEntity,
      reparentNode,
      refreshTree,
      onCreated,
    });

    expect(createdId).toBe("copy-1");
    expect(createEntity).toHaveBeenCalledWith({ title: "Улучшения", status: "open" });
    expect(reparentNode).toHaveBeenCalledWith("copy-1", "parent-1");
    expect(refreshTree).toHaveBeenCalledTimes(1);
    expect(onCreated).toHaveBeenCalledWith("copy-1");
  });
});
