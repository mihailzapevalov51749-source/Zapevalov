import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import {
  PLAN_DATA_EMPTY_HINT,
  PLAN_DATA_EMPTY_TITLE,
} from "./planEmptyStateMessages.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

describe("planEmptyStateMessages", () => {
  it("uses universal data-empty copy without view type names", () => {
    expect(PLAN_DATA_EMPTY_TITLE).toBe("Пока нет записей");
    expect(PLAN_DATA_EMPTY_HINT).toBe(
      "Создайте первую запись через контекстное меню\nили кнопку «Создать запись».",
    );
    expect(PLAN_DATA_EMPTY_TITLE.toLowerCase()).not.toContain("план");
    expect(PLAN_DATA_EMPTY_HINT.toLowerCase()).not.toContain("план");
  });

  it("PlanTreePanel runtime empty branch does not mention plan view type", () => {
    const source = readFileSync(join(__dirname, "PlanTreePanel.jsx"), "utf8");
    expect(source).not.toContain("План пока пуст");
    expect(source).not.toContain("В плане пока нет элементов");
    expect(source).toContain("PLAN_DATA_EMPTY_TITLE");
    expect(source).toContain("PLAN_DATA_EMPTY_HINT");
  });
});
