import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  buildPlanViewDraftFromView,
  hasPendingPlanViewChanges,
  readPlanHierarchyRelationKey,
} from "./planViewStudioSave.js";

describe("planViewStudioSave", () => {
  it("buildPlanViewDraftFromView copies view metadata", () => {
    const draft = buildPlanViewDraftFromView(
      {
        name: "Идеи план",
        key: "idei_plan",
        view_type: "plan",
        is_active: true,
        description: "",
        settings_json: {
          objectView: {
            presentation: {
              plan: { hierarchyRelationKey: "ierarhiya_idey" },
            },
          },
        },
      },
      (settingsJson) => settingsJson,
    );

    assert.equal(draft?.key, "idei_plan");
    assert.equal(
      draft?.settings_json?.objectView?.presentation?.plan?.hierarchyRelationKey,
      "ierarhiya_idey",
    );
  });

  it("hasPendingPlanViewChanges detects plan settings before draft hydrates", () => {
    const pending = hasPendingPlanViewChanges({
      view: {
        view_type: "plan",
        settings_json: {
          objectView: {
            presentation: { plan: { hierarchyRelationKey: null } },
          },
        },
      },
      draft: null,
      planSettings: { hierarchyRelationKey: "ierarhiya_idey" },
      normalizeProjection: (settingsJson) => settingsJson,
    });

    assert.equal(pending, true);
  });

  it("readPlanHierarchyRelationKey normalizes empty values", () => {
    assert.equal(readPlanHierarchyRelationKey({ hierarchyRelationKey: "  idei  " }), "idei");
    assert.equal(readPlanHierarchyRelationKey({ hierarchyRelationKey: "" }), null);
  });
});
