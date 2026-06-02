"""
Reset user activity history for dev DB.

Logic:
1) Count sessions before cutoff.
2) Delete sessions that have no activity after cutoff (last_activity_at < cutoff).
3) Verify computed stats for day/week/month/meta so that "01.06" doesn't appear.
"""

from __future__ import annotations

import sys
from pathlib import Path
from datetime import datetime, timedelta, timezone

BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.db.session import SessionLocal
from app.modules.user_activity.models import UserActivitySession
from app.modules.user_activity.service import (
    compute_activity_meta,
    compute_daily_stats,
    compute_monthly_stats,
    compute_weekly_stats,
    IDLE_TIMEOUT,  # noqa: F401 (exposed for debugging)
    USER_ACTIVITY_VALID_FROM,
    USER_ACTIVITY_VALID_FROM_UTC,
)
from app.modules.user_activity.timezone_utils import UTC
from sqlalchemy import func, text


def main() -> None:
    tz = timezone(timedelta(hours=3))  # MSK (UTC+3)
    cutoff_utc = USER_ACTIVITY_VALID_FROM_UTC
    valid_from_date_local = USER_ACTIVITY_VALID_FROM

    db = SessionLocal()
    try:
        total_before_started = (
            db.query(func.count(UserActivitySession.id))
            .filter(UserActivitySession.started_at < cutoff_utc)
            .scalar()
        )
        total_before_last_activity = (
            db.query(func.count(UserActivitySession.id))
            .filter(UserActivitySession.last_activity_at < cutoff_utc)
            .scalar()
        )

        print(f"Cutoff (local date): {valid_from_date_local}  MSK")
        print(f"Cutoff (UTC):         {cutoff_utc.isoformat()}")
        print(f"Sessions started < cutoff_utc:     {total_before_started}")
        print(f"Sessions last_activity < cutoff_utc: {total_before_last_activity}")

        deleted = (
            db.query(UserActivitySession)
            .filter(UserActivitySession.last_activity_at < cutoff_utc)
            .delete(synchronize_session=False)
        )
        db.commit()

        print(f"Deleted sessions: {deleted}")

        # Verification on the first user (fast smoke test).
        # If there are no users, we skip the calc checks.
        user = db.execute(text("SELECT id FROM users ORDER BY id ASC LIMIT 1")).fetchone()
        if not user:
            print("No users found; skip verification.")
            return

        user_id = user[0]
        now_local = datetime(valid_from_date_local.year, valid_from_date_local.month, valid_from_date_local.day, 9, 0, tzinfo=tz)
        now_utc = now_local.astimezone(timezone.utc)

        day_before = (now_local - timedelta(days=1)).date()
        day_today = now_local.date()

        daily_before = compute_daily_stats(db, user_id=user_id, day=day_before, tz=tz, now=now_utc)
        daily_today = compute_daily_stats(db, user_id=user_id, day=day_today, tz=tz, now=now_utc)

        weekly = compute_weekly_stats(
            db,
            user_id=user_id,
            anchor_day=day_today,
            tz=tz,
            now=now_utc,
        )
        month = compute_monthly_stats(db, user_id=user_id, year=day_today.year, month=day_today.month, tz=tz, now=now_utc)
        meta = compute_activity_meta(db, user_id=user_id, tz=tz, now=now_utc)

        def day_active_seconds(days: list[dict], day: datetime.date) -> int:
            for d in days:
                if d["date"] == day:
                    return d["active_seconds"]
            raise AssertionError(f"Day {day} not present in breakdown")

        prev_week_active = day_active_seconds(weekly["days"], day_before)
        prev_month_active = day_active_seconds(month["days"], day_before)

        print("Verification:")
        print(f"  Daily {day_before}: session_count={daily_before['session_count']} active_seconds={daily_before['active_seconds']}")
        print(f"  Daily {day_today}:  session_count={daily_today['session_count']} active_seconds={daily_today['active_seconds']}")
        print(f"  Weekly day {day_before}: active_seconds={prev_week_active}")
        print(f"  Monthly day {day_before}: active_seconds={prev_month_active}")
        print(
            "  Series meta: stats_started_at="
            f"{meta['stats_started_at']} current_streak_days={meta['current_streak_days']} "
            f"current_workday_streak_days={meta['current_workday_streak_days']}"
        )

        # Hard assertions for gate:
        assert daily_before["active_seconds"] == 0
        assert daily_before["session_count"] == 0
        assert prev_week_active == 0
        assert prev_month_active == 0
        if meta["stats_started_at"] is not None:
            assert meta["stats_started_at"] >= valid_from_date_local

        print("OK: cutoff enforcement verified for smoke test user.")
    finally:
        db.close()


if __name__ == "__main__":
    main()

