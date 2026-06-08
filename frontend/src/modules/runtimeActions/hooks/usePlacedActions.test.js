import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { resolveRuntimeActionLabel } from "../utils/resolveRuntimeActionLabel.js";

describe("usePlacedActions contract", () => {
  it("preserves resolver order for labels", () => {
    const actions = [
      { key: "z_action", name: "Z Action", sort_order: 20 },
      { key: "a_action", name: "A Action", sort_order: 10 },
    ];

    const labels = actions
      .slice()
      .sort((left, right) => {
        const sortDelta = (left.sort_order || 0) - (right.sort_order || 0);
        if (sortDelta !== 0) {
          return sortDelta;
        }

        return String(left.name).localeCompare(String(right.name), "ru");
      })
      .map((action) => resolveRuntimeActionLabel(action));

    assert.deepEqual(labels, ["A Action", "Z Action"]);
  });
});
