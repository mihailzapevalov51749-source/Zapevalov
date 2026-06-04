import { describe, expect, it } from "vitest";

import { syncViewSettingsFromDraftProjection } from "./syncViewSettingsProjection";

describe("syncViewSettingsFromDraftProjection", () => {
  it("updates objectView.titleFieldKey when legacy projection changes", () => {
    const result = syncViewSettingsFromDraftProjection(
      {
        objectView: {
          projection: {
            fieldKeys: ["title", "assignee"],
            fieldOrder: ["title", "assignee"],
            titleFieldKey: "title",
          },
        },
      },
      {
        visible_fields: ["title", "assignee"],
        field_order: ["title", "assignee"],
        title_field: "assignee",
      },
    );

    expect(result.projection.title_field).toBe("assignee");
    expect(result.objectView.projection.titleFieldKey).toBe("assignee");
  });
});
