import { useCallback, useEffect, useMemo, useState } from "react";

import {
  getActivityStatsMeta,
  getBrowserTimezone,
  getDailyActivityStats,
  getMonthlyActivityStats,
  getWeeklyActivityStats,
} from "../../api/userActivityApi";
import { getCurrentMonthInTimezone } from "../activity/activityCalendarHelpers";
import {
  averagePerActiveDay,
  buildStreakLabel,
  formatDuration,
  formatStatsStartedDate,
  formatTimeOnly,
} from "../activity/activityStatsHelpers";
import {
  MonthActivityCalendar,
  PeriodSummaryBlock,
  WeekActivityStrip,
} from "./ActivityPeriodViews";
import "./profileActivityPanel.css";

function StatLine({ label, value }) {
  return (
    <div className="activity-stat-line">
      <span className="activity-stat-line__label">{label}</span>
      <span className="activity-stat-line__value">{value}</span>
    </div>
  );
}

export default function ProfileActivityPanel() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [dayStats, setDayStats] = useState(null);
  const [weekStats, setWeekStats] = useState(null);
  const [monthStats, setMonthStats] = useState(null);
  const [monthLoading, setMonthLoading] = useState(false);
  const [monthYear, setMonthYear] = useState(null);
  const [metaStats, setMetaStats] = useState(null);

  const browserTz = useMemo(() => getBrowserTimezone(), []);

  const loadMonthStats = useCallback(async (year, month, { silent = false } = {}) => {
    if (!silent) {
      setMonthLoading(true);
    }
    try {
      const month = await getMonthlyActivityStats(year, month);
      setMonthStats(month);
      setMonthYear({ year: month.year, month: month.month });
    } catch (loadError) {
      setError(loadError.message || "Не удалось загрузить статистику месяца");
    } finally {
      setMonthLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadStats() {
      setLoading(true);
      setError("");
      try {
        const current = getCurrentMonthInTimezone(browserTz);
        const [day, week, month, meta] = await Promise.all([
          getDailyActivityStats(),
          getWeeklyActivityStats(),
          getMonthlyActivityStats(current.year, current.month),
          getActivityStatsMeta(),
        ]);
        if (!cancelled) {
          setDayStats(day);
          setWeekStats(week);
          setMonthStats(month);
          setMonthYear({ year: month.year, month: month.month });
          setMetaStats(meta);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError.message || "Не удалось загрузить статистику активности");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadStats();
    return () => {
      cancelled = true;
    };
  }, [browserTz]);

  const handleMonthChange = useCallback(
    ({ year, month }) => {
      loadMonthStats(year, month);
    },
    [loadMonthStats],
  );

  const streakLabel = useMemo(() => buildStreakLabel(metaStats), [metaStats]);

  const statsStartedLabel = useMemo(
    () => formatStatsStartedDate(metaStats?.stats_started_at, browserTz),
    [metaStats, browserTz],
  );

  const weekAverage = useMemo(
    () => averagePerActiveDay(weekStats?.total_active_seconds, weekStats?.active_days_count),
    [weekStats],
  );

  const monthAverage = useMemo(
    () => averagePerActiveDay(monthStats?.total_active_seconds, monthStats?.active_days_count),
    [monthStats],
  );

  if (loading) {
    return <p className="activity-muted">Загрузка статистики активности...</p>;
  }

  if (error && !monthStats) {
    return <p className="activity-error">{error}</p>;
  }

  const todayHasData = Number(dayStats?.active_seconds) > 0;
  const monthView = monthYear || getCurrentMonthInTimezone(browserTz);

  return (
    <div className="activity-panel">
      {statsStartedLabel ? (
        <p className="activity-footnote">Статистика собирается с: {statsStartedLabel}</p>
      ) : null}

      {streakLabel ? (
        <div className="activity-streak">
          <span className="activity-streak__label">Текущая серия активности</span>
          <span className="activity-streak__value">{streakLabel}</span>
        </div>
      ) : null}

      <section className="activity-section">
        <h3 className="activity-section__title">Сегодня</h3>
        {todayHasData ? (
          <div className="activity-section__body">
            <StatLine label="Активное время" value={formatDuration(dayStats.active_seconds)} />
            <StatLine label="Сессий" value={String(dayStats.session_count ?? 0)} />
            <StatLine label="Первая активность" value={formatTimeOnly(dayStats.first_action_at, browserTz)} />
            <StatLine label="Последняя активность" value={formatTimeOnly(dayStats.last_action_at, browserTz)} />
            <StatLine
              label="Максимальная сессия"
              value={formatDuration(dayStats.longest_session_seconds)}
            />
          </div>
        ) : (
          <p className="activity-muted">Сегодня активности пока не было.</p>
        )}
      </section>

      <div className="activity-period-stack">
        <PeriodSummaryBlock
          title="Неделя"
          totalSeconds={weekStats?.total_active_seconds}
          averageSeconds={weekAverage}
          activeDays={weekStats?.active_days_count ?? 0}
          sessionCount={weekStats?.session_count ?? 0}
        >
          <WeekActivityStrip days={weekStats?.days} timeZone={browserTz} />
        </PeriodSummaryBlock>

        <PeriodSummaryBlock
          title="Месяц"
          totalSeconds={monthStats?.total_active_seconds}
          averageSeconds={monthAverage}
          activeDays={monthStats?.active_days_count ?? 0}
          sessionCount={monthStats?.session_count ?? 0}
        >
          <MonthActivityCalendar
            year={monthView.year}
            month={monthView.month}
            days={monthStats?.days}
            timeZone={browserTz}
            loading={monthLoading}
            onMonthChange={handleMonthChange}
          />
        </PeriodSummaryBlock>
      </div>
    </div>
  );
}
