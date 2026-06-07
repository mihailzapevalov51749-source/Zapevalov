import { describe, expect, it } from "vitest";
import { createEmptyObjectViewContract } from "../services/objectViewContract.js";
import { buildPlanTree } from "./buildPlanTree.js";
import { resolvePlanRoleMapping } from "./resolvePlanRoleMapping.js";

const CATALOG = {
  relations: [
    {
      key: "subtask",
      source_object_type_key: "task",
      target_object_type_key: "task",
      settings_json: {},
    },
  ],
};

describe("resolvePlanRoleMapping", () => {
  it("uses roleMapping when filled", () => {
    const contract = createEmptyObjectViewContract({
      viewType: "plan",
      roleMapping: {
        nodeTitle: "module_name",
        nodeStatus: "workflow_status",
        nodeDescription: "details",
        nextSteps: "next_steps",
      },
      presentation: {
        plan: {
          titleFieldKey: "legacy_title",
          statusFieldKey: "legacy_status",
          descriptionFieldKey: "legacy_description",
          nextStepsFieldKey: "legacy_next",
          hierarchyRelationKey: "subtask",
        },
      },
    });

    const resolved = resolvePlanRoleMapping(contract);

    expect(resolved.source).toBe("roleMapping");
    expect(resolved.nodeTitle).toBe("module_name");
    expect(resolved.nodeStatus).toBe("workflow_status");
    expect(resolved.nodeDescription).toBe("details");
    expect(resolved.nextSteps).toBe("next_steps");
    expect(resolved.sources.nodeTitle).toBe("roleMapping");
    expect(resolved.sources.nodeStatus).toBe("roleMapping");
  });

  it("ignores presentation.plan legacy keys when roleMapping is empty", () => {
    const resolved = resolvePlanRoleMapping(
      createEmptyObjectViewContract({
        viewType: "plan",
        roleMapping: {},
        presentation: {
          plan: {
            titleFieldKey: "title",
            statusFieldKey: "status",
            descriptionFieldKey: "description",
            nextStepsFieldKey: "next_steps",
          },
        },
      }),
    );

    expect(resolved.source).toBe("missing");
    expect(resolved.nodeTitle).toBeNull();
    expect(resolved.nodeStatus).toBeNull();
    expect(resolved.nodeDescription).toBeNull();
    expect(resolved.nextSteps).toBeNull();
    expect(resolved.sources.nodeTitle).toBe("missing");
  });

  it("returns missing source when roleMapping is empty", () => {
    const resolved = resolvePlanRoleMapping(
      createEmptyObjectViewContract({
        viewType: "plan",
        roleMapping: {},
        presentation: { plan: {} },
      }),
    );

    expect(resolved.source).toBe("missing");
    expect(resolved.nodeTitle).toBeNull();
    expect(resolved.nodeStatus).toBeNull();
    expect(resolved.nodeDescription).toBeNull();
    expect(resolved.nextSteps).toBeNull();
    expect(resolved.sources.nodeTitle).toBe("missing");
  });

  it("partial roleMapping leaves absent roles missing", () => {
    const resolved = resolvePlanRoleMapping(
      createEmptyObjectViewContract({
        viewType: "plan",
        roleMapping: { nodeTitle: "module_name" },
        presentation: {
          plan: {
            titleFieldKey: "title",
            statusFieldKey: "status",
          },
        },
      }),
    );

    expect(resolved.source).toBe("roleMapping");
    expect(resolved.nodeTitle).toBe("module_name");
    expect(resolved.sources.nodeTitle).toBe("roleMapping");
    expect(resolved.nodeStatus).toBeNull();
    expect(resolved.sources.nodeStatus).toBe("missing");
  });

  it("buildPlanTree uses titleFieldKey from projection contract", () => {
    const tree = buildPlanTree({
      items: [
        {
          id: "e1",
          values: { module_name: "Новый модуль", status: "В работе" },
        },
      ],
      hierarchyInstances: [],
      catalog: CATALOG,
      planPresentation: {
        hierarchyRelationKey: "subtask",
      },
      titleFieldKey: "module_name",
      statusFieldKey: "status",
    });

    expect(tree.roots[0]?.title).toBe("Новый модуль");
  });
});
