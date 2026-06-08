import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  AUTO_LINK_PARTIAL_SUCCESS_WARNING,
  submitAutoLinkRelation,
} from "./submitAutoLinkRelation.js";

const autoLinkAction = {
  auto_link_enabled: true,
  auto_link_relation_key: "project_tasks",
};

describe("submitAutoLinkRelation", () => {
  it("creates relation when source and target entity ids are present", async () => {
    const calls = [];

    const result = await submitAutoLinkRelation({
      tenantId: 1,
      action: autoLinkAction,
      sourceEntityId: "project-1",
      targetEntityId: "task-1",
      createRelation: async (tenantId, relationKey, payload) => {
        calls.push([tenantId, relationKey, payload]);
      },
    });

    assert.equal(result.linked, true);
    assert.deepEqual(calls[0], [
      1,
      "project_tasks",
      {
        source_entity_id: "project-1",
        target_entity_id: "task-1",
      },
    ]);
  });

  it("skips auto link without source entity id (top_panel)", async () => {
    const result = await submitAutoLinkRelation({
      tenantId: 1,
      action: autoLinkAction,
      sourceEntityId: null,
      targetEntityId: "task-1",
      createRelation: async () => {
        throw new Error("should not be called");
      },
    });

    assert.equal(result.skipped, true);
    assert.equal(result.linked, false);
  });

  it("returns warning when relation create fails", async () => {
    const result = await submitAutoLinkRelation({
      tenantId: 1,
      action: autoLinkAction,
      sourceEntityId: "project-1",
      targetEntityId: "task-1",
      createRelation: async () => {
        throw new Error("relation failed");
      },
    });

    assert.equal(result.linked, false);
    assert.equal(result.warning, AUTO_LINK_PARTIAL_SUCCESS_WARNING);
  });
});
