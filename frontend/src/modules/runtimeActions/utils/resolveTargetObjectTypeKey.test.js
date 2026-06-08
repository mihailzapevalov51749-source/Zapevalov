import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  isCreateRecordAction,
  resolveTargetObjectTypeKey,
} from "./resolveTargetObjectTypeKey.js";

describe("resolveTargetObjectTypeKey", () => {
  it("prefers flat target_object_type_key", () => {
    const key = resolveTargetObjectTypeKey(
      {
        action_type_key: "create_record",
        target_object_type_key: "tasks",
      },
      "projects",
    );

    assert.equal(key, "tasks");
  });

  it("reads nested target_object_type.key", () => {
    const key = resolveTargetObjectTypeKey(
      {
        action_type_key: "create_record",
        target_object_type: {
          id: "target-id",
          key: "tasks",
          name: "Задачи",
        },
      },
      "projects",
    );

    assert.equal(key, "tasks");
  });

  it("falls back to source object type key", () => {
    const key = resolveTargetObjectTypeKey(
      { action_type_key: "create_record" },
      "projects",
    );

    assert.equal(key, "projects");
  });

  it("detects create_record action type", () => {
    assert.equal(isCreateRecordAction({ action_type_key: "create_record" }), true);
    assert.equal(isCreateRecordAction({ action_type_key: "open_url" }), false);
  });
});
