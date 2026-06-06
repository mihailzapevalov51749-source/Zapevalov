import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { resolveObjectViewTabStatusLabel } from "./resolveObjectViewTabStatusLabel.js";

describe("resolveObjectViewTabStatusLabel", () => {
  const publishedObjectType = {
    status: "active",
    last_published_at: "2026-06-06T10:00:00.000Z",
  };

  it("returns hidden for inactive views", () => {
    const label = resolveObjectViewTabStatusLabel({
      view: { is_active: false, updated_at: "2026-06-06T12:00:00.000Z" },
      objectType: publishedObjectType,
      catalogVersion: "12",
      hasMenuPlacement: true,
    });

    assert.equal(label, "Скрыто");
  });

  it("returns draft when object is not published", () => {
    const label = resolveObjectViewTabStatusLabel({
      view: { is_active: true, updated_at: "2026-06-06T12:00:00.000Z" },
      objectType: { status: "active" },
      catalogVersion: null,
      hasMenuPlacement: false,
    });

    assert.equal(label, "Черновик");
  });

  it("returns published + draft when view changed after publish", () => {
    const label = resolveObjectViewTabStatusLabel({
      view: { is_active: true, updated_at: "2026-06-06T12:00:00.000Z" },
      objectType: publishedObjectType,
      catalogVersion: "12",
      hasMenuPlacement: true,
    });

    assert.equal(label, "Опубликовано + черновик");
  });

  it("returns published when view is synced", () => {
    const label = resolveObjectViewTabStatusLabel({
      view: { is_active: true, updated_at: "2026-06-06T10:00:00.000Z" },
      objectType: publishedObjectType,
      catalogVersion: "12",
      hasMenuPlacement: true,
    });

    assert.equal(label, "Опубликовано");
  });
});
