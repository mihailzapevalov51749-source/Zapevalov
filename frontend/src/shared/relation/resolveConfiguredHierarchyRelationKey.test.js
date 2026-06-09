import { describe, expect, it } from "vitest";

import {
  resolveConfiguredHierarchyRelationKey,
  resolvePlanViewHierarchyRelationKey,
} from "./resolveConfiguredHierarchyRelationKey.js";

describe("resolveConfiguredHierarchyRelationKey", () => {
  const catalog = {
    object_types: [
      {
        key: "architecture",
        views: [
          {
            view_type: "plan",
            settings_json: {
              objectView: {
                presentation: {
                  plan: { hierarchyRelationKey: "podpunkt" },
                },
              },
            },
          },
        ],
      },
      {
        key: "problems",
        views: [
          {
            view_type: "plan",
            settings_json: {
              objectView: {
                presentation: {
                  plan: { hierarchyRelationKey: "problem_subtask" },
                },
              },
            },
          },
        ],
      },
    ],
    relations: [
      { key: "task_subtask", source_object_type_key: "problems", target_object_type_key: "problems" },
      { key: "problem_subtask", source_object_type_key: "problems", target_object_type_key: "problems" },
      { key: "podpunkt", source_object_type_key: "architecture", target_object_type_key: "architecture" },
    ],
  };

  it("reads hierarchyRelationKey from published plan view contract", () => {
    expect(resolvePlanViewHierarchyRelationKey(catalog, "architecture")).toBe("podpunkt");
    expect(resolvePlanViewHierarchyRelationKey(catalog, "problems")).toBe("problem_subtask");
  });

  it("prefers plan contract over primary hierarchy resolver", () => {
    expect(resolveConfiguredHierarchyRelationKey(catalog, "problems")).toBe(
      "problem_subtask",
    );
    expect(resolveConfiguredHierarchyRelationKey(catalog, "architecture")).toBe(
      "podpunkt",
    );
  });
});
