import { describe, expect, it } from "vitest";

import {
  PLAN_PROGRESS_COLUMN_LABEL,
  resolvePlanProgressDisplayLabel,
} from "./planProgressLabels.js";

describe("resolvePlanProgressDisplayLabel", () => {
  it("maps legacy Готовность label to Прогресс", () => {
    expect(resolvePlanProgressDisplayLabel("Готовность")).toBe(PLAN_PROGRESS_COLUMN_LABEL);
    expect(resolvePlanProgressDisplayLabel("")).toBe(PLAN_PROGRESS_COLUMN_LABEL);
  });

  it("keeps custom labels", () => {
    expect(resolvePlanProgressDisplayLabel("Выполнение")).toBe("Выполнение");
  });
});
