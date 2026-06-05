import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  resolveLinkedImplementationStages,
  resolveStageDashboardProgress,
  formatReadinessListMeta,
} from "./resolveStageDashboardProgress.js";

describe("resolveStageDashboardProgress", () => {
  it("links owner stage by implementation_stage_slugs", () => {
    const stage = {
      id: "dev-relation-field-type",
      meta: { implementation_stage_slugs: ["relation-field-type"] },
    };
    const impl = [
      {
        id: 9,
        slug: "relation-field-type",
        completed_items: ["A", "B"],
        current_tasks: ["C"],
        next_tasks: ["D", "E"],
        remaining_items: [],
        updated_at: "2026-06-04T12:00:00Z",
      },
    ];

    const linked = resolveLinkedImplementationStages(stage, impl);
    assert.equal(linked.length, 1);

    const progress = resolveStageDashboardProgress(stage, {
      implementationStages: impl,
      dashboardRefreshedAt: "2026-06-03T00:00:00Z",
    });
    assert.equal(progress.completedSteps, 2);
    assert.equal(progress.totalSteps, 5);
    assert.equal(progress.nextStep, "C");
    assert.equal(progress.lastUpdated, "2026-06-04T12:00:00Z");
  });

  it("falls back to owner work lists without linked implementation stage", () => {
    const stage = {
      id: "engine-1",
      done: ["x"],
      inWork: ["y"],
      remaining: ["z", "w"],
    };
    const progress = resolveStageDashboardProgress(stage, {
      implementationStages: [],
      dashboardRefreshedAt: "2026-06-01T00:00:00Z",
    });
    assert.equal(progress.completedSteps, 1);
    assert.equal(progress.totalSteps, 4);
    assert.equal(progress.nextStep, "y");
    assert.equal(progress.lastUpdated, "2026-06-01T00:00:00Z");
  });

  it("formats list meta as percent", () => {
    assert.equal(formatReadinessListMeta(67), "67%");
    assert.equal(formatReadinessListMeta(null), "Н/Д");
  });
});
