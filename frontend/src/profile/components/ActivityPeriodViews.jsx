import { useMemo } from "react";

import {
  buildMonthCalendarGrid,
  formatMonthYearLabel,
  getCurrentMonthInTimezone,
  isMonthAfter,
  shiftMonth,
} from "../activity/activityCalendarHelpers";
import {
  formatDayDurationLabel,
  formatDuration,
  formatWeekdayShort,
} from "../activity/activityStatsHelpers";

function StatLine({ label, value }) {
  return (
    <div className="activity-stat-line">
      <span className="activity-stat-line__label">{label}</span>
      <span className="activity-stat-line__value">{value}</span>
    </div>
  );
}

export function PeriodSummaryBlock({
  title,
  totalSeconds,
  averageSeconds,
  activeDays,
  sessionCount,
  children,
}) {
  return (
    <section className="activity-section activity-section--period">
      <h3 className="activity-section__title">{title}</h3>
      <div className="activity-summary-grid">
        <StatLine label="Всего" value={formatDuration(totalSeconds)} />
        <StatLine label="Среднее" value={formatDuration(averageSeconds)} />
        <StatLine label="Активных дней" value={String(activeDays)} />
        <StatLine label="Сессий" value={String(sessionCount)} />
      </div>
      {children}
    </section>
  );
}

export function WeekActivityStrip({ days, timeZone }) {
  const weekDays = days || [];
  if (!weekDays.length) {
    return <p className="activity-muted">За неделю активности не было.</p>;
  }

  const maxSeconds = Math.max(...weekDays.map((day) => Number(day.active_seconds) || 0), 1);

  return (
    <div className="activity-week-strip" role="list">
      {weekDays.map((day) => {
        const seconds = Number(day.active_seconds) || 0;
        const isActive = seconds > 0;
        const barHeight = isActive
          ? Math.max(4, Math.round((seconds / maxSeconds) * 28))
          : 0;

        return (
          <div
            key={day.date}
            className={`activity-week-day${isActive ? " is-active" : ""}`}
            role="listitem"
            title={isActive ? formatDuration(seconds) : "Без активности"}
          >
            <div className="activity-week-day__bar-slot" aria-hidden="true">
              {isActive ? (
                <span className="activity-week-day__bar" style={{ height: `${barHeight}px` }} />
              ) : (
                <span className="activity-week-day__idle">—</span>
              )}
            </div>
            <span className="activity-week-day__weekday">{formatWeekdayShort(day.date, timeZone)}</span>
            <span className="activity-week-day__duration">{formatDayDurationLabel(seconds)}</span>
          </div>
        );
      })}
    </div>
  );
}

function monthCellClassName(status) {
  switch (status) {
    case "future":
      return "activity-cal-day is-future";
    case "past":
      return "activity-cal-day is-past";
    case "active":
      return "activity-cal-day is-active";
    case "today":
      return "activity-cal-day is-today";
    case "today-active":
      return "activity-cal-day is-today is-active";
    default:
      return "activity-cal-day";
  }
}

export function MonthActivityCalendar({
  year,
  month,
  days,
  timeZone,
  loading,
  onMonthChange,
}) {
  const currentMonth = useMemo(() => getCurrentMonthInTimezone(timeZone), [timeZone]);
  const nextMonth = shiftMonth(year, month, 1);
  const canGoNext = !isMonthAfter(
    nextMonth.year,
    nextMonth.month,
    currentMonth.year,
    currentMonth.month,
  );

  const calendar = useMemo(
    () => buildMonthCalendarGrid(year, month, days, timeZone),
    [year, month, days, timeZone],
  );

  const monthLabel = formatMonthYearLabel(year, month);

  return (
    <div className="activity-month-calendar">
      <div className="activity-month-nav">
        <button
          type="button"
          className="activity-month-nav__btn"
          aria-label="Предыдущий месяц"
          onClick={() => onMonthChange(shiftMonth(year, month, -1))}
        >
          ◀
        </button>
        <span className="activity-month-nav__label">{monthLabel}</span>
        <button
          type="button"
          className="activity-month-nav__btn"
          aria-label="Следующий месяц"
          disabled={!canGoNext}
          onClick={() => {
            if (canGoNext) {
              onMonthChange(shiftMonth(year, month, 1));
            }
          }}
        >
          ▶
        </button>
      </div>

      <div className={`activity-month-calendar__body${loading ? " is-loading" : ""}`}>
        <div className="activity-cal-weekdays" aria-hidden="true">
          {calendar.headers.map((label) => (
            <span key={label} className="activity-cal-weekday">
              {label}
            </span>
          ))}
        </div>

        <div className="activity-cal-grid">
          {calendar.weeks.map((week, weekIndex) => (
            <div key={`week-${weekIndex}`} className="activity-cal-week">
              {week.map((cell, cellIndex) => {
                if (cell.type === "empty") {
                  return (
                    <div
                      key={`empty-${weekIndex}-${cellIndex}`}
                      className="activity-cal-day is-empty"
                      aria-hidden="true"
                    />
                  );
                }

                return (
                  <div
                    key={cell.dateKey}
                    className={monthCellClassName(cell.status)}
                    title={cell.durationLabel || undefined}
                  >
                    <span className="activity-cal-day__num">{cell.dayOfMonth}</span>
                    {cell.durationLabel ? (
                      <span className="activity-cal-day__time">{cell.durationLabel}</span>
                    ) : null}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
