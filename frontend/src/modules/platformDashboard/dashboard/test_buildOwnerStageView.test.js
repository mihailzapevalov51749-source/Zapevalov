import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildDevelopmentStages,
  buildPlatformStages,
  buildStageFromPlatformComponent,
} from "./buildOwnerStageView.js";
import {
  isKnownDashboardSection,
  resolveDashboardSectionKey,
  resolveYasiiDashboardTabKey,
} from "./dashboardSections.js";

describe("dashboardSections", () => {
  it("resolves top-level sections and legacy redirects", () => {
    assert.equal(
      resolveDashboardSectionKey("/designer/tenant/1/platform/platform").sectionKey,
      "platform",
    );
    assert.equal(
      resolveDashboardSectionKey("/designer/tenant/1/platform/architecture").sectionKey,
      "platform",
    );
    assert.equal(
      resolveDashboardSectionKey("/designer/tenant/1/platform/architecture").legacySegment,
      "architecture",
    );
    assert.equal(
      resolveDashboardSectionKey("/designer/tenant/1/platform/implementation").sectionKey,
      "development",
    );
    assert.ok(isKnownDashboardSection("quality"));
    assert.equal(resolveYasiiDashboardTabKey("platform"), "architecture");
    assert.equal(resolveYasiiDashboardTabKey("development"), "implementation");
  });
});

describe("buildOwnerStageView", () => {
  it("maps platform component work lists without technical labels", () => {
    const stage = buildStageFromPlatformComponent({
      id: 1,
      title: "Платформенное ядро",
      description: "Базовые движки",
      readiness: 85,
      completed_items: ["Шаг A"],
      current_tasks: ["Шаг B"],
      remaining_items: ["Шаг C"],
    });

    assert.equal(stage.title, "Платформенное ядро");
    assert.deepEqual(stage.done, ["Шаг A"]);
    assert.deepEqual(stage.inWork, ["Шаг B"]);
    assert.deepEqual(stage.remaining, ["Шаг C"]);
  });

  it("builds platform stages from components first", () => {
    const stages = buildPlatformStages(
      [{ id: 2, title: "Объектный движок", readiness: 40 }],
      { engines: [{ slug: "fallback", title: "Fallback" }] },
    );
    assert.equal(stages.length, 1);
    assert.equal(stages[0].title, "Объектный движок");
  });

  it("builds development stages from implementation phases", () => {
    const stages = buildDevelopmentStages([
      {
        id: 10,
        title: "Dashboard",
        readiness: 70,
        completed_items: ["Готово"],
        current_tasks: ["В работе"],
        next_tasks: ["Дальше"],
      },
    ]);
    assert.equal(stages[0].title, "Dashboard");
    assert.deepEqual(stages[0].remaining, ["Дальше"]);
  });
});
