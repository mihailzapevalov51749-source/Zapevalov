import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  PLAN_STATUS_CATEGORY,
  resolvePlanStatusCategory,
  resolvePlanStatusDisplay,
  rollupPlanStatusCategoryFromChildren,
} from "./planStatusUtils.js";

describe("resolvePlanStatusCategory", () => {
  it("maps localized status labels to categories", () => {
    assert.equal(resolvePlanStatusCategory("Просрочено"), PLAN_STATUS_CATEGORY.OVERDUE);
    assert.equal(resolvePlanStatusCategory("В работе"), PLAN_STATUS_CATEGORY.IN_PROGRESS);
    assert.equal(resolvePlanStatusCategory("Приостановлено"), PLAN_STATUS_CATEGORY.PAUSED);
    assert.equal(resolvePlanStatusCategory("Не начато"), PLAN_STATUS_CATEGORY.NOT_STARTED);
    assert.equal(resolvePlanStatusCategory("Завершено"), PLAN_STATUS_CATEGORY.COMPLETED);
  });
});

describe("rollupPlanStatusCategoryFromChildren", () => {
  it("uses priority: overdue > in_progress > paused > not_started > completed", () => {
    assert.equal(
      rollupPlanStatusCategoryFromChildren([
        { statusCategory: PLAN_STATUS_CATEGORY.COMPLETED },
        { statusCategory: PLAN_STATUS_CATEGORY.OVERDUE },
      ]),
      PLAN_STATUS_CATEGORY.OVERDUE,
    );

    assert.equal(
      rollupPlanStatusCategoryFromChildren([
        { statusCategory: PLAN_STATUS_CATEGORY.COMPLETED },
        { statusCategory: PLAN_STATUS_CATEGORY.IN_PROGRESS },
      ]),
      PLAN_STATUS_CATEGORY.IN_PROGRESS,
    );

    assert.equal(
      rollupPlanStatusCategoryFromChildren([
        { statusCategory: PLAN_STATUS_CATEGORY.COMPLETED },
        { statusCategory: PLAN_STATUS_CATEGORY.PAUSED },
      ]),
      PLAN_STATUS_CATEGORY.PAUSED,
    );

    assert.equal(
      rollupPlanStatusCategoryFromChildren([
        { statusCategory: PLAN_STATUS_CATEGORY.COMPLETED },
        { statusCategory: PLAN_STATUS_CATEGORY.NOT_STARTED },
      ]),
      PLAN_STATUS_CATEGORY.NOT_STARTED,
    );

    assert.equal(
      rollupPlanStatusCategoryFromChildren([
        { statusCategory: PLAN_STATUS_CATEGORY.COMPLETED },
        { statusCategory: PLAN_STATUS_CATEGORY.COMPLETED },
      ]),
      PLAN_STATUS_CATEGORY.COMPLETED,
    );
  });

  it("returns null when there are no children", () => {
    assert.equal(rollupPlanStatusCategoryFromChildren([]), null);
  });
});

describe("resolvePlanStatusDisplay", () => {
  it("returns label and color for known categories", () => {
    const display = resolvePlanStatusDisplay(PLAN_STATUS_CATEGORY.IN_PROGRESS);
    assert.equal(display.label, "В работе");
    assert.equal(display.color, "#EAB308");
  });
});
