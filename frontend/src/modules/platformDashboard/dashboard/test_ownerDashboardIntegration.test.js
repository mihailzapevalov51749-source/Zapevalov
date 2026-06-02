import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  findOwnerSection,
  isOwnerDashboardViewPayload,
  mapOwnerHistoryEventToUi,
  mapOwnerStageToUi,
  resolveOwnerDashboardStages,
} from "./ownerDashboardIntegration.js";

describe("ownerDashboardIntegration", () => {
  const sampleView = {
    catalog_version: "1.0.1",
    sections: [
      {
        key: "development",
        title: "Развитие продукта",
        kind: "stages",
        stages: [
          {
            id: "dev-platform-transition",
            title: "Переход",
            description: "",
            readiness: 0,
            done: ["Завершено 9 ключевых работ."],
            inWork: [],
            remaining: ["Осталось выполнить 5 работ."],
            meta: {
              owner_status: "В планах",
              raw_items: { done: ["modules/foo"] },
              implementation_stage_slugs: ["legacy-isolation"],
            },
          },
        ],
        events: [],
      },
      {
        key: "history",
        title: "История",
        kind: "timeline",
        stages: [],
        events: [
          {
            id: "refresh-aggregate-2026-06-01",
            group_key: "hist-dashboard",
            title: "Dashboard обновлялся 3 раза за 01.06.2026",
            description: "Общая готовность платформы: 84% → 84%.",
            occurred_at: "2026-06-01T12:00:00",
            initiated_by: "Тест",
            meta: {
              activity_type: "dashboard_refresh",
              slug: "hidden-slug",
              source_event_ids: ["1", "2"],
            },
          },
        ],
      },
      {
        key: "companies",
        title: "Компании",
        kind: "stages",
        stages: [
          {
            id: "default:company-onboarding",
            title: "Онбординг",
            description: "",
            readiness: null,
            done: [],
            inWork: [],
            remaining: ["Шаг 1"],
            meta: {
              tenantId: "default",
              displayTitle: "Демо компания",
              workspaceTitle: "Демо компания",
            },
          },
        ],
        events: [],
      },
    ],
  };

  it("validates owner dashboard payload", () => {
    assert.ok(isOwnerDashboardViewPayload(sampleView));
    assert.ok(!isOwnerDashboardViewPayload({ sections: [{}] }));
  });

  it("maps development stage without leaking forbidden meta", () => {
    const stage = resolveOwnerDashboardStages(sampleView, "development")[0];
    assert.equal(stage.ownerStatus, "В планах");
    assert.equal(stage.done[0], "Завершено 9 ключевых работ.");
    assert.ok(!JSON.stringify(stage).includes("raw_items"));
    assert.ok(!JSON.stringify(stage).includes("modules/"));
  });

  it("maps company stage title from displayTitle", () => {
    const stage = mapOwnerStageToUi(
      sampleView.sections[2].stages[0],
      { sectionKey: "companies" },
    );
    assert.equal(stage.title, "Демо компания");
    assert.equal(stage.subtitle, "Онбординг");
    assert.ok(!stage.title.includes("default"));
  });

  it("maps history event without technical fields", () => {
    const event = mapOwnerHistoryEventToUi(sampleView.sections[1].events[0]);
    assert.equal(event.title, "Dashboard обновлялся 3 раза за 01.06.2026");
    assert.ok(event.ownerView);
    assert.ok(!Object.prototype.hasOwnProperty.call(event, "type"));
    assert.ok(!Object.prototype.hasOwnProperty.call(event, "meta"));
  });

  it("finds section by key", () => {
    assert.equal(findOwnerSection(sampleView, "development")?.title, "Развитие продукта");
  });
});
