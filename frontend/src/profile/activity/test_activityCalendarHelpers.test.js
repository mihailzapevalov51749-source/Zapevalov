import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildMonthCalendarGrid,
  formatCalendarDuration,
  formatMonthYearLabel,
  getDaysInMonth,
  isMonthAfter,
  shiftMonth,
} from "./activityCalendarHelpers.js";

describe("activityCalendarHelpers", () => {
  it("formats calendar duration with padded minutes when hours present", () => {
    assert.equal(formatCalendarDuration(135), "2 мин");
    assert.equal(formatCalendarDuration(3600), "1 ч 00 мин");
    assert.equal(formatCalendarDuration(8100), "2 ч 15 мин");
    assert.equal(formatCalendarDuration(24180), "6 ч 43 мин");
    assert.equal(formatCalendarDuration(0), null);
  });

  it("builds calendar with leading blanks and all month days", () => {
    const days = [
      { date: "2020-01-01", active_seconds: 300 },
      { date: "2020-01-02", active_seconds: 0 },
    ];
    const { weeks } = buildMonthCalendarGrid(2020, 1, days, "UTC");
    const dayCells = weeks.flat().filter((cell) => cell.type === "day");
    assert.equal(getDaysInMonth(2020, 1), 31);
    assert.equal(dayCells.length, 31);
    assert.equal(dayCells[0].dayOfMonth, 1);
    assert.equal(dayCells[0].durationLabel, "5 мин");
    assert.equal(dayCells[1].status, "past");
    assert.equal(dayCells[1].durationLabel, null);
  });

  it("shifts months", () => {
    assert.deepEqual(shiftMonth(2026, 1, -1), { year: 2025, month: 12 });
    assert.deepEqual(shiftMonth(2026, 12, 1), { year: 2027, month: 1 });
  });

  it("formats month year label", () => {
    assert.match(formatMonthYearLabel(2026, 6), /^Июнь 2026$/);
  });

  it("detects future months", () => {
    assert.equal(isMonthAfter(2026, 7, 2026, 6), true);
    assert.equal(isMonthAfter(2026, 5, 2026, 6), false);
  });
});
