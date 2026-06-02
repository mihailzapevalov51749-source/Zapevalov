"""One-off audit: dump today's sessions and reconcile daily stats."""

from __future__ import annotations

from datetime import datetime, timezone

from app.db.session import SessionLocal
from app.modules.user_activity.models import UserActivitySession
from app.modules.user_activity.service import (
    _ensure_utc,
    _session_effective_end,
    _session_activity_window,
    compute_daily_stats,
)
from app.modules.user_activity.timezone_utils import local_day_bounds, local_today
from zoneinfo import ZoneInfo

TZ = ZoneInfo("Europe/Moscow")


def main() -> None:
    db = SessionLocal()
    try:
        today = local_today(TZ)
        range_start, range_end = local_day_bounds(today, TZ)
        now = datetime.now(timezone.utc)

        sessions = (
            db.query(UserActivitySession)
            .filter(
                UserActivitySession.last_activity_at >= range_start,
                UserActivitySession.started_at < range_end,
            )
            .order_by(UserActivitySession.user_id.asc(), UserActivitySession.started_at.asc())
            .all()
        )

        print(f"Today (local): {today}  TZ: {TZ}")
        print(f"Range UTC: {range_start} .. {range_end}")
        print(f"Sessions touching today: {len(sessions)}")
        print("-" * 100)

        for session in sessions:
            _, _, window_sec = _session_activity_window(
                session,
                range_start=range_start,
                range_end=range_end,
                now=now,
            )
            effective_end = _session_effective_end(session, now)
            effective_duration = max(
                0,
                int((effective_end - _ensure_utc(session.started_at)).total_seconds()),
            )
            created_by = "heartbeat"
            if session.close_reason in {"logout", "manual", "system", "timeout"}:
                updated_by = f"close:{session.close_reason}"
            else:
                updated_by = "heartbeat/open"
            print(f"Session ID: {session.id}  User: {session.user_id}")
            print(f"  Started At:       {session.started_at}")
            print(f"  Last Activity At: {session.last_activity_at}")
            print(f"  Ended At:         {session.ended_at}")
            print(f"  Duration (DB):    {session.duration_seconds}")
            print(f"  Duration (calc):  {effective_duration}")
            print(f"  Close Reason:     {session.close_reason}")
            print(f"  Created By:       {created_by}")
            print(f"  Updated By:       {updated_by}")
            print(f"  Stats window (s): {window_sec}")
            print()

        user_ids = sorted({session.user_id for session in sessions})
        for user_id in user_ids:
            stats = compute_daily_stats(db, user_id=user_id, day=today, tz=TZ, now=now)
            user_sessions = [s for s in sessions if s.user_id == user_id]

            sum_window = 0
            max_window = 0
            max_db_duration = 0
            counted = 0

            for session in user_sessions:
                _, _, window_sec = _session_activity_window(
                    session,
                    range_start=range_start,
                    range_end=range_end,
                    now=now,
                )
                if window_sec <= 0:
                    continue
                counted += 1
                sum_window += window_sec
                max_window = max(max_window, window_sec)

                if session.duration_seconds is not None:
                    max_db_duration = max(max_db_duration, session.duration_seconds)
                elif session.ended_at is None:
                    live = int(
                        (
                            min(_ensure_utc(session.last_activity_at), now)
                            - _ensure_utc(session.started_at)
                        ).total_seconds(),
                    )
                    max_db_duration = max(max_db_duration, live)

            print(f"USER {user_id} — reconcile")
            print(f"  UI active_seconds:          {stats['active_seconds']}")
            print(f"  Sum stats windows:          {sum_window}")
            print(f"  UI session_count:           {stats['session_count']}")
            print(f"  Sessions with window > 0:   {counted}")
            print(f"  UI longest_session_seconds: {stats['longest_session_seconds']}")
            print(f"  Max stats window:           {max_window}")
            print(f"  Max duration_seconds (DB):  {max_db_duration}")
            print(f"  First / Last action:        {stats['first_action_at']} / {stats['last_action_at']}")
            print()
    finally:
        db.close()


if __name__ == "__main__":
    main()
