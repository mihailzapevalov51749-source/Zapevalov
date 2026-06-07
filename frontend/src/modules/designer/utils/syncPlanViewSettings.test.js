import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  buildPlanViewInitialSettingsJson,
  readPlanSettingsFromView,
  syncPlanSettingsToObjectView,
} from "./syncPlanViewSettings.js";

describe("syncPlanViewSettings", () => {
  it("buildPlanViewInitialSettingsJson seeds objectView.presentation.plan", () => {
    const settings = buildPlanViewInitialSettingsJson("architecture");

    assert.equal(settings.objectView.schemaVersion, 1);
    assert.equal(settings.objectView.key, "architecture");
    assert.equal(settings.objectView.viewType, "plan");
    assert.ok(settings.objectView.presentation.plan);
    assert.deepEqual(settings.objectView.roleMapping, {});
    assert.deepEqual(settings.objectView.projection.fieldKeys, []);
  });

  it("syncPlanSettingsToObjectView merges plan settings without wiping existing keys", () => {
    const base = buildPlanViewInitialSettingsJson("architecture");

    const synced = syncPlanSettingsToObjectView(
      base,
      { hierarchyRelationKey: "parent_child", titleFieldKey: "name" },
      { viewKey: "architecture", viewType: "plan" },
    );

    const plan = readPlanSettingsFromView(synced);
    assert.equal(plan.hierarchyRelationKey, "parent_child");
    assert.equal(plan.titleFieldKey, "name");
    assert.equal(synced.objectView.viewType, "plan");
    assert.equal(synced.objectView.key, "architecture");
  });

  it("syncPlanSettingsToObjectView preserves saved plan when planSettings is null", () => {
    const base = syncPlanSettingsToObjectView(
      {},
      { hierarchyRelationKey: "parent_child" },
      { viewKey: "architecture", viewType: "plan" },
    );

    const synced = syncPlanSettingsToObjectView(base, null, {
      viewKey: "architecture",
      viewType: "plan",
    });

    assert.equal(readPlanSettingsFromView(synced).hierarchyRelationKey, "parent_child");
  });
});
