import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { resolveRuntimeActionLabel } from "./resolveRuntimeActionLabel.js";

describe("resolveRuntimeActionLabel", () => {
  it("uses label_override when present", () => {
    assert.equal(
      resolveRuntimeActionLabel({
        name: "Создать задачу",
        label_override: "Новая задача",
      }),
      "Новая задача",
    );
  });

  it("falls back to name", () => {
    assert.equal(
      resolveRuntimeActionLabel({
        name: "Создать задачу",
      }),
      "Создать задачу",
    );
  });
});
