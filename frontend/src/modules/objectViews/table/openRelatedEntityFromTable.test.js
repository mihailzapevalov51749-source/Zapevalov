import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { resolveRelatedEntityCardOpenArgs } from "./openRelatedEntityFromTable.js";

describe("openRelatedEntityFromTable", () => {
  it("returns card open args for linked entity", () => {
    assert.deepEqual(
      resolveRelatedEntityCardOpenArgs({
        entityId: "peer-1",
        relatedObjectTypeKey: "project",
        fallbackObjectTypeKey: "task",
        enabled: true,
      }),
      {
        entityId: "peer-1",
        objectTypeKey: "project",
      },
    );
  });

  it("falls back to anchor object type", () => {
    assert.deepEqual(
      resolveRelatedEntityCardOpenArgs({
        entityId: "peer-1",
        relatedObjectTypeKey: "",
        fallbackObjectTypeKey: "task",
        enabled: true,
      }),
      {
        entityId: "peer-1",
        objectTypeKey: "task",
      },
    );
  });

  it("returns null when card navigation is disabled", () => {
    assert.equal(
      resolveRelatedEntityCardOpenArgs({
        entityId: "peer-1",
        relatedObjectTypeKey: "project",
        fallbackObjectTypeKey: "task",
        enabled: false,
      }),
      null,
    );
  });
});
