import { useEffect, useMemo, useState } from "react";

import {
  buildJournalMonthCalendarGrid,
  formatMonthYearLabel,
  getJournalDaySelectionState,
  getLocalTodayIso,
  resolveInitialCalendarMonth,
  shiftMonth,
} from "../utils/journalDateFilterCalendar";
import { normalizeJournalDateRange } from "../utils/filterPlatformEventJournalEntries";

import "./platformEventJournalDateFilter.css";

export default function PlatformEventJournalCalendar({
  value = null,
  onChange,
  onClose,
}) {
  const initialMonth = useMemo(() => resolveInitialCalendarMonth(value), [value]);
  const [year, setYear] = useState(initialMonth.year);
  const [month, setMonth] = useState(initialMonth.month);

  useEffect(() => {
    const nextMonth = resolveInitialCalendarMonth(value);
    setYear(nextMonth.year);
    setMonth(nextMonth.month);
  }, [value]);

  const { headers, weeks } = useMemo(
    () => buildJournalMonthCalendarGrid(year, month),
    [year, month],
  );

  const handlePrevMonth = () => {
    const next = shiftMonth(year, month, -1);
    setYear(next.year);
    setMonth(next.month);
  };

  const handleNextMonth = () => {
    const next = shiftMonth(year, month, 1);
    setYear(next.year);
    setMonth(next.month);
  };

  const handleDayClick = (isoDate) => {
    onChange?.(normalizeJournalDateRange(isoDate, value));
  };

  const handleToday = () => {
    const today = getLocalTodayIso();
    onChange?.({ start: today, end: null });
    const parts = today.split("-").map(Number);
    setYear(parts[0]);
    setMonth(parts[1]);
  };

  const handleDelete = () => {
    onChange?.(null);
    onClose?.();
  };

  return (
    <div
      className="platform-event-journal-calendar"
      role="dialog"
      aria-label="Выбор даты"
    >
      <div className="platform-event-journal-calendar__header">
        <button
          type="button"
          className="platform-event-journal-calendar__nav"
          onClick={handlePrevMonth}
          aria-label="Предыдущий месяц"
        >
          ‹
        </button>
        <span className="platform-event-journal-calendar__title">
          {formatMonthYearLabel(year, month)}
        </span>
        <button
          type="button"
          className="platform-event-journal-calendar__nav"
          onClick={handleNextMonth}
          aria-label="Следующий месяц"
        >
          ›
        </button>
      </div>

      <div className="platform-event-journal-calendar__weekdays">
        {headers.map((header) => (
          <span key={header} className="platform-event-journal-calendar__weekday">
            {header}
          </span>
        ))}
      </div>

      <div className="platform-event-journal-calendar__grid">
        {weeks.map((week, weekIndex) => (
          <div key={`week-${weekIndex}`} className="platform-event-journal-calendar__week">
            {week.map((cell, cellIndex) => {
              if (cell.type === "empty") {
                return (
                  <span
                    key={`empty-${weekIndex}-${cellIndex}`}
                    className="platform-event-journal-calendar__day platform-event-journal-calendar__day--empty"
                    aria-hidden="true"
                  />
                );
              }

              const selectionState = getJournalDaySelectionState(cell.dateKey, value);
              const className = [
                "platform-event-journal-calendar__day",
                cell.isToday ? "is-today" : "",
                selectionState !== "none" ? `is-${selectionState}` : "",
              ]
                .filter(Boolean)
                .join(" ");

              return (
                <button
                  key={cell.dateKey}
                  type="button"
                  className={className}
                  onClick={() => handleDayClick(cell.dateKey)}
                  aria-pressed={selectionState !== "none"}
                >
                  {cell.dayOfMonth}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      <div className="platform-event-journal-calendar__actions">
        <button
          type="button"
          className="platform-event-journal-calendar__action"
          onClick={handleToday}
        >
          Сегодня
        </button>
        <button
          type="button"
          className="platform-event-journal-calendar__action platform-event-journal-calendar__action--danger"
          onClick={handleDelete}
        >
          Удалить
        </button>
      </div>
    </div>
  );
}
