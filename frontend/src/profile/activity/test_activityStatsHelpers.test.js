import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  averagePerActiveDay,
  buildStreakLabel,
  filterActiveDays,
  formatDayDurationLabel,
  formatDuration,
  formatTimeOnly,
  getMonthDaysUntilToday,
} from "./activityStatsHelpers.js";

describe("activityStatsHelpers", () => {
  it("formats duration compactly", () => {
    assert.equal(formatDuration(4020), "1 ч 7 мин");
    assert.equal(formatDuration(180), "3 мин");
  });

  it("filters only active days", () => {
    const days = [
      { date: "2026-06-01", active_seconds: 0 },
      { date: "2026-06-02", active_seconds: 3600 },
    ];
    assert.equal(filterActiveDays(days).length, 1);
  });

  it("computes average per active day", () => {
    assert.equal(averagePerActiveDay(34_200, 5), 6840);
  });

  it("builds streak label only when meaningful", () => {
    assert.equal(buildStreakLabel({ current_streak_days: 1 }), null);
    assert.equal(
      buildStreakLabel({ current_streak_days: 12 }),
      "12 дней подряд",
    );
    assert.equal(
      buildStreakLabel({ current_streak_days: 3, current_workday_streak_days: 5 }),
      "5 рабочих дней подряд",
    );
  });

  it("formats time only", () => {
    assert.match(formatTimeOnly("2026-06-01T08:14:00Z"), /^\d{2}:\d{2}$/);
  });

  it("filters month days until today", () => {
    const days = [
      { date: "2026-06-01", active_seconds: 300 },
      { date: "2099-06-15", active_seconds: 9999 },
    ];
    const visible = getMonthDaysUntilToday(days, "UTC");
    assert.equal(visible.length, 1);
    assert.equal(visible[0].date, "2026-06-01");
  });

  it("formatDayDurationLabel shows dash for zero", () => {
    assert.equal(formatDayDurationLabel(0), "—");
    assert.equal(formatDayDurationLabel(120), "2 мин");
  });
});
