import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  arePlacementKeysEqual,
  buildPlacementKeysFromPlacements,
  computePlacementSyncPlan,
  syncActionPlacements,
} from "./syncActionPlacements.js";

describe("buildPlacementKeysFromPlacements", () => {
  it("returns sorted placement keys", () => {
    assert.deepEqual(
      buildPlacementKeysFromPlacements([
        { placement_key: "row_menu" },
        { placement_key: "table" },
      ]),
      ["row_menu", "table"],
    );
  });
});

describe("arePlacementKeysEqual", () => {
  it("compares placement key sets regardless of order", () => {
    assert.equal(arePlacementKeysEqual(["table", "row_menu"], ["row_menu", "table"]), true);
    assert.equal(arePlacementKeysEqual(["table"], ["row_menu"]), false);
  });
});

describe("computePlacementSyncPlan", () => {
  it("computes create and delete operations", () => {
    const plan = computePlacementSyncPlan(
      [{ id: "1", placement_key: "table" }],
      ["row_menu"],
    );

    assert.deepEqual(plan.toCreate, ["row_menu"]);
    assert.deepEqual(plan.toDelete, [{ id: "1", placement_key: "table" }]);
  });
});

describe("syncActionPlacements", () => {
  it("creates and deletes placements through API", async () => {
    const calls = {
      deleted: [],
      created: [],
    };

    const api = {
      deleteActionPlacement: async (...args) => {
        calls.deleted.push(args);
      },
      createActionPlacement: async (...args) => {
        calls.created.push(args);
        return {};
      },
      listActionPlacements: async () => [{ id: "2", placement_key: "row_menu" }],
    };

    const result = await syncActionPlacements({
      tenantId: "1",
      objectTypeId: "object-type",
      actionDefinitionId: "action-id",
      currentPlacements: [{ id: "1", placement_key: "table" }],
      draftPlacementKeys: ["row_menu"],
      placementCatalog: [{ key: "row_menu", sort_order: 30 }],
      api,
    });

    assert.deepEqual(calls.deleted[0], ["1", "object-type", "action-id", "1"]);
    assert.equal(calls.created[0][3].placement_key, "row_menu");
    assert.equal(calls.created[0][3].sort_order, 30);
    assert.deepEqual(result, [{ id: "2", placement_key: "row_menu" }]);
  });
});
