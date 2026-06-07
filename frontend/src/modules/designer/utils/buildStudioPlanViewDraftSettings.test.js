import { describe, expect, it } from "vitest";

import { buildStudioPlanViewDraftSettings } from "./buildStudioPlanViewDraftSettings.js";

describe("buildStudioPlanViewDraftSettings", () => {
  it("syncs projection info_field_keys into objectView projection", () => {
    const settings = buildStudioPlanViewDraftSettings(
      {
        key: "plan",
        view_type: "plan",
        settings_json: {
          objectView: {
            schemaVersion: 1,
            key: "plan",
            viewType: "plan",
            projection: {
              fieldKeys: ["title", "status", "description"],
              fieldOrder: ["title", "status", "description"],
              titleFieldKey: "title",
              infoFieldKeys: ["status", "description"],
            },
            presentation: { plan: {} },
          },
        },
        projection: {
          visible_fields: ["title", "status"],
          field_order: ["title", "status"],
          title_field: "title",
          info_field_keys: ["status"],
        },
        roleMapping: {},
      },
      { planLayout: { tabs: [] } },
    );

    expect(settings?.objectView?.projection?.fieldKeys).toEqual(["title", "status"]);
    expect(settings?.objectView?.projection?.infoFieldKeys).toEqual(["status"]);
    expect(settings?.projection?.info_field_keys).toEqual(["status"]);
  });
});
