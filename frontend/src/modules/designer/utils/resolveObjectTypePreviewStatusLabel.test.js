import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { resolveObjectTypePreviewStatusLabel } from "./resolveObjectTypePreviewStatusLabel.js";

describe("resolveObjectTypePreviewStatusLabel", () => {
  it("returns published + draft when catalog needs sync", () => {
    const label = resolveObjectTypePreviewStatusLabel({
      objectType: {
        status: "active",
        updated_at: "2026-06-06T12:00:00.000Z",
        last_published_at: "2026-06-06T10:00:00.000Z",
      },
      catalogVersion: "12",
      hasMenuPlacement: true,
    });

    assert.equal(label, "Опубликовано + есть черновик");
  });

  it("returns published when synced", () => {
    const label = resolveObjectTypePreviewStatusLabel({
      objectType: {
        status: "active",
        updated_at: "2026-06-06T10:00:00.000Z",
        last_published_at: "2026-06-06T10:00:00.000Z",
      },
      catalogVersion: "12",
      hasMenuPlacement: true,
    });

    assert.equal(label, "Опубликовано");
  });

  it("returns hidden for archived object types", () => {
    const label = resolveObjectTypePreviewStatusLabel({
      objectType: { status: "archived" },
      catalogVersion: "12",
      hasMenuPlacement: true,
    });

    assert.equal(label, "Скрыт");
  });
});
