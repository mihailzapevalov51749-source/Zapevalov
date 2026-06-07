import { describe, expect, it } from "vitest";

import { OBJECT_VIEW_SCHEMA_VERSION } from "../services/objectViewContract.js";
import { resolvePlanUsesLegacyPlanFields } from "./resolvePlanUsesLegacyPlanFields.js";

describe("resolvePlanUsesLegacyPlanFields", () => {
  it("returns false when required roleMapping roles are filled", () => {
    const usesLegacy = resolvePlanUsesLegacyPlanFields({
      schemaVersion: OBJECT_VIEW_SCHEMA_VERSION,
      viewType: "plan",
      roleMapping: {
        nodeTitle: "module_name",
        nodeStatus: "status",
        nodeDescription: "description",
      },
      presentation: {
        plan: {
          titleFieldKey: "title",
          statusFieldKey: "status",
        },
      },
    });

    expect(usesLegacy).toBe(false);
  });

  it("returns true when roleMapping is empty and legacy keys exist", () => {
    const usesLegacy = resolvePlanUsesLegacyPlanFields({
      schemaVersion: OBJECT_VIEW_SCHEMA_VERSION,
      viewType: "plan",
      roleMapping: {},
      presentation: {
        plan: {
          titleFieldKey: "title",
          statusFieldKey: "status",
          descriptionFieldKey: "description",
        },
      },
    });

    expect(usesLegacy).toBe(true);
  });

  it("returns true for mixed roleMapping and legacy", () => {
    const usesLegacy = resolvePlanUsesLegacyPlanFields({
      schemaVersion: OBJECT_VIEW_SCHEMA_VERSION,
      viewType: "plan",
      roleMapping: {
        nodeTitle: "module_name",
      },
      presentation: {
        plan: {
          statusFieldKey: "status",
          descriptionFieldKey: "description",
        },
      },
    });

    expect(usesLegacy).toBe(true);
  });
});
