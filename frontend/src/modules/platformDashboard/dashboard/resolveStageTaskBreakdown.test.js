import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  mapTaskRows,
  resolveStageTaskBreakdown,
  resolveStageTaskLists,
} from "./resolveStageTaskBreakdown.js";

describe("resolveStageTaskBreakdown", () => {
  it("aggregates task lists from linked implementation stages", () => {
    const stage = {
      id: "dev-platform-transition",
      readiness: 42,
      meta: {
        implementation_stage_slugs: ["legacy-isolation", "object-table-ut-parity"],
      },
    };
    const implementationStages = [
      {
        slug: "legacy-isolation",
        completed_items: ["A"],
        current_tasks: ["B"],
        next_tasks: ["C"],
        remaining_items: ["D"],
        updated_at: "2026-06-05T10:00:00Z",
      },
      {
        slug: "object-table-ut-parity",
        completed_items: ["E"],
        current_tasks: [],
        next_tasks: ["Реализовать режим дерева", "Реализовать поиск по таблице"],
        remaining_items: [],
        updated_at: "2026-06-05T12:00:00Z",
      },
    ];

    const lists = resolveStageTaskLists(stage, { implementationStages });
    assert.deepEqual(lists.done, ["A", "E"]);
    assert.deepEqual(lists.inWork, ["B"]);
    assert.deepEqual(lists.remaining, ["C", "D", "Реализовать режим дерева", "Реализовать поиск по таблице"]);

    const breakdown = resolveStageTaskBreakdown(stage, {
      implementationStages,
      dashboardRefreshedAt: "2026-06-04T00:00:00Z",
    });

    assert.equal(breakdown.readiness, 42);
    assert.equal(breakdown.completedCount, 2);
    assert.equal(breakdown.inWorkCount, 1);
    assert.equal(breakdown.notStartedCount, 4);
    assert.equal(breakdown.lastUpdated, "2026-06-05T12:00:00Z");
    assert.equal(breakdown.nextTasks[0], "Реализовать режим дерева");
    assert.equal(breakdown.showWeightPoints, true);
    assert.equal(breakdown.doneWeight, 2);
    assert.equal(breakdown.remainingWeight, 18);
  });

  it("falls back to owner stage work lists", () => {
    const stage = {
      id: "custom",
      readiness: 75,
      done: ["x"],
      inWork: ["y"],
      remaining: ["z"],
    };

    const breakdown = resolveStageTaskBreakdown(stage, {
      implementationStages: [],
      dashboardRefreshedAt: "2026-06-01T00:00:00Z",
    });

    assert.equal(breakdown.readiness, 75);
    assert.equal(breakdown.completedCount, 1);
    assert.equal(breakdown.inWorkCount, 1);
    assert.equal(breakdown.notStartedCount, 1);
    assert.equal(breakdown.lastUpdated, "2026-06-01T00:00:00Z");
  });

  it("maps task rows with display weights", () => {
    const rows = mapTaskRows(
      ["Реализовать режим дерева", "Unknown task"],
      "planned",
    );

    assert.equal(rows[0].title, "Реализовать режим дерева");
    assert.equal(rows[0].status, "planned");
    assert.equal(rows[0].weight, 10);
    assert.equal(rows[1].weight, 1);
  });
});
