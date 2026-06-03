import { describe, expect, it } from "vitest";

import { formatDateTimeRu } from "./dateUtils";

describe("formatDateTimeRu", () => {
  it("formats ISO datetime as дд.мм.гггг чч:мм", () => {
    expect(formatDateTimeRu("2026-06-03T11:51:03.472891")).toBe(
      "03.06.2026 11:51",
    );
  });
});
