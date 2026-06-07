import { describe, expect, it } from "vitest";
import {
  readRoleMappingFromSettings,
  syncViewSettingsRoleMapping,
} from "./syncViewSettingsRoleMapping.js";
import { syncViewSettingsFromDraftProjection } from "./syncViewSettingsProjection.js";
import { validateRoleMappingAgainstProjection } from "../../objectViews/services/objectViewRoleMapping.js";

describe("syncViewSettingsRoleMapping", () => {
  it("reads roleMapping from objectView", () => {
    const mapping = readRoleMappingFromSettings({
      objectView: {
        roleMapping: { nodeTitle: "title", nodeStatus: "status" },
      },
    });

    expect(mapping).toEqual({ nodeTitle: "title", nodeStatus: "status" });
  });

  it("persists sanitized roleMapping after projection sync", () => {
    let settings = syncViewSettingsFromDraftProjection(
      {
        objectView: {
          schemaVersion: 1,
          key: "plan",
          viewType: "plan",
          roleMapping: {},
        },
      },
      {
        visible_fields: ["title", "status"],
        field_order: ["title", "status"],
        title_field: "title",
        default_sort: { field: null, order: "desc" },
      },
    );

    settings = syncViewSettingsRoleMapping(settings, {
      nodeTitle: "title",
      nodeStatus: "status",
      nodeDescription: "missing",
    });

    expect(settings.objectView.roleMapping).toEqual({
      nodeTitle: "title",
      nodeStatus: "status",
    });
  });

  it("rejects role mapping outside projection on save validation", () => {
    const issues = validateRoleMappingAgainstProjection(
      { nodeStatus: "status" },
      ["title"],
    );

    expect(issues).toHaveLength(1);
    expect(issues[0].code).toBe("object_view_role_mapping_field_not_in_projection");
  });
});
