import { describe, expect, it } from "vitest";

import { generatePlanRoleMappingFromLegacy } from "./generatePlanRoleMappingFromLegacy.js";

describe("generatePlanRoleMappingFromLegacy", () => {
  const projectionFieldKeys = [
    "nazvanie",
    "opisanie",
    "status",
    "prioritet",
  ];

  it("maps legacy *FieldKey to roleMapping for Архитектура tab", () => {
    const roleMapping = generatePlanRoleMappingFromLegacy(
      {
        titleFieldKey: "nazvanie",
        descriptionFieldKey: "opisanie",
        statusFieldKey: null,
        nextStepsFieldKey: null,
      },
      projectionFieldKeys,
    );

    expect(roleMapping).toEqual({
      nodeTitle: "nazvanie",
      nodeDescription: "opisanie",
      nodeStatus: "status",
    });
  });

  it("maps all four legacy keys when present", () => {
    const roleMapping = generatePlanRoleMappingFromLegacy(
      {
        titleFieldKey: "nazvanie",
        statusFieldKey: "status",
        descriptionFieldKey: "opisanie",
        nextStepsFieldKey: "prioritet",
      },
      [...projectionFieldKeys, "prioritet"],
    );

    expect(roleMapping).toEqual({
      nodeTitle: "nazvanie",
      nodeStatus: "status",
      nodeDescription: "opisanie",
      nextSteps: "prioritet",
    });
  });

  it("preserves existing roleMapping entries not overridden by legacy", () => {
    const roleMapping = generatePlanRoleMappingFromLegacy(
      {
        titleFieldKey: "nazvanie",
        descriptionFieldKey: "opisanie",
      },
      projectionFieldKeys,
      { nodeStatus: "status" },
    );

    expect(roleMapping.nodeStatus).toBe("status");
    expect(roleMapping.nodeTitle).toBe("nazvanie");
  });

  it("skips legacy keys outside projection", () => {
    const roleMapping = generatePlanRoleMappingFromLegacy(
      {
        titleFieldKey: "missing_field",
        descriptionFieldKey: "opisanie",
      },
      projectionFieldKeys,
      {},
      { inferRequiredRoles: false },
    );

    expect(roleMapping).toEqual({
      nodeDescription: "opisanie",
    });
  });
});
