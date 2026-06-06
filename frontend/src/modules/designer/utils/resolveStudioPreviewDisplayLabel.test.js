import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { resolveStudioPreviewDisplayLabel } from "./resolveStudioPreviewDisplayLabel.js";

describe("resolveStudioPreviewDisplayLabel", () => {
  it("formats table representation label", () => {
    assert.equal(
      resolveStudioPreviewDisplayLabel({
        activeAdapterType: "table",
        activeRepresentationName: "Все",
      }),
      "Таблица → Все",
    );
  });

  it("formats non-table adapter label", () => {
    assert.equal(
      resolveStudioPreviewDisplayLabel({
        activeAdapterType: "kanban",
        activeRepresentationName: "Доска",
      }),
      "Канбан",
    );
  });
});
