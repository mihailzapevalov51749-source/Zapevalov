/** @typedef {import('node:test').TestContext} TestContext */
import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  computeObjectTypePublishFlags,
  hasUnpublishedObjectTypeChanges,
} from "./objectTypePublishState.js";

describe("objectTypePublishState", () => {
  it("treats published baseline by catalog + last_published_at, not menu placement", () => {
    const flags = computeObjectTypePublishFlags(
      {
        updated_at: "2026-06-01T10:00:00.000Z",
        last_published_at: "2026-06-01T12:00:00.000Z",
      },
      { catalogVersion: 3, hasMenuPlacement: false },
    );

    assert.equal(flags.hasPublishedBaseline, true);
    assert.equal(flags.publishAction, "none");
  });

  it("uses publish-catalog for first publish without requiring menu placement", () => {
    const flags = computeObjectTypePublishFlags(
      { updated_at: "2026-06-01T10:00:00.000Z", last_published_at: null },
      { catalogVersion: null, hasMenuPlacement: false },
    );

    assert.equal(flags.publishAction, "publish-catalog");
    assert.equal(flags.needsMenuPlacement, false);
  });

  it("detects pending catalog sync after object edits", () => {
    assert.equal(
      hasUnpublishedObjectTypeChanges({
        updated_at: "2026-06-02T10:00:00.000Z",
        last_published_at: "2026-06-01T12:00:00.000Z",
      }),
      true,
    );

    const flags = computeObjectTypePublishFlags(
      {
        updated_at: "2026-06-02T10:00:00.000Z",
        last_published_at: "2026-06-01T12:00:00.000Z",
      },
      { catalogVersion: 4, hasMenuPlacement: false },
    );

    assert.equal(flags.publishAction, "update-catalog");
  });
});
