#!/usr/bin/env python3
"""Restore June 2026 user activity sessions for Platform Owner (Михаил Запевалов)."""

from __future__ import annotations

import sys
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_ROOT))

from app.db.session import SessionLocal
from app.modules.user_activity.models import UserActivitySession
from app.modules.user_activity.service import (
    compute_monthly_stats,
    compute_weekly_stats,
)
from app.modules.users.models import User
from scripts.platform_data_write_guard import require_platform_data_write_approval

# Совпадает с USER_ACTIVITY_VALID_FROM_TZ в user_activity/service.py (МСК, UTC+3).
MOSCOW = timezone(timedelta(hours=3))
TARGET_USER_EMAIL = "zmn8@ya.ru"

# Июнь 2026 — длительность активности по дням (часы, минуты).
DAILY_TARGETS: list[tuple[date, int, int]] = [
    (date(2026, 6, 2), 7, 8),
    (date(2026, 6, 3), 12, 21),
    (date(2026, 6, 4), 12, 1),
    (date(2026, 6, 5), 13, 38),
    (date(2026, 6, 6), 9, 41),
    (date(2026, 6, 7), 14, 35),
    (date(2026, 6, 8), 9, 40),
    (date(2026, 6, 9), 10, 58),
    (date(2026, 6, 10), 15, 12),
    (date(2026, 6, 11), 5, 42),
]

# 41 сессия на 10 активных дней.
SESSION_COUNTS = [4, 4, 4, 4, 4, 5, 4, 4, 5, 3]


def _to_seconds(hours: int, minutes: int) -> int:
    return hours * 3600 + minutes * 60


def _split_duration(total_seconds: int, parts: int) -> list[int]:
    if parts <= 0:
        return []
    base = total_seconds // parts
    remainder = total_seconds % parts
    return [base + (1 if index < remainder else 0) for index in range(parts)]


def _format_duration(total_seconds: int) -> str:
    hours = total_seconds // 3600
    minutes = (total_seconds % 3600) // 60
    if hours > 0:
        return f"{hours} ч {minutes:02d} мин"
    return f"{minutes} мин"


def _find_target_user(db) -> User:
    user = db.query(User).filter(User.email.ilike(TARGET_USER_EMAIL)).first()
    if user is None:
        user = db.query(User).filter(User.full_name.ilike("%Запевалов%")).first()
    if user is None:
        raise RuntimeError("Пользователь Михаил Запевалов не найден в таблице users")
    return user


def _build_sessions_for_day(day: date, total_seconds: int, session_count: int) -> list[UserActivitySession]:
    durations = _split_duration(total_seconds, session_count)
    sessions: list[UserActivitySession] = []
    day_end = datetime(day.year, day.month, day.day, 23, 59, 59, tzinfo=MOSCOW)
    default_start = datetime(day.year, day.month, day.day, 9, 0, tzinfo=MOSCOW)
    day_start = max(
        datetime(day.year, day.month, day.day, 0, 0, tzinfo=MOSCOW),
        day_end - timedelta(seconds=total_seconds),
    )
    if day_start > default_start:
        day_start = default_start
    cursor = day_start

    for duration_seconds in durations:
        if duration_seconds <= 0:
            continue
        ended_at = cursor + timedelta(seconds=duration_seconds)
        if ended_at > day_end:
            ended_at = day_end
            duration_seconds = max(0, int((ended_at - cursor).total_seconds()))
        if duration_seconds <= 0:
            break
        sessions.append(
            UserActivitySession(
                started_at=cursor,
                ended_at=ended_at,
                last_activity_at=ended_at,
                duration_seconds=duration_seconds,
                close_reason="restored",
            )
        )
        cursor = ended_at

    assigned = sum(session.duration_seconds or 0 for session in sessions)
    if assigned < total_seconds and sessions:
        remainder = total_seconds - assigned
        last = sessions[-1]
        extended_end = min(last.ended_at + timedelta(seconds=remainder), day_end)
        last.duration_seconds = int((extended_end - last.started_at).total_seconds())
        last.ended_at = extended_end
        last.last_activity_at = extended_end

    return sessions


def restore_activity(db, user: User) -> int:
    range_start = datetime(2026, 6, 1, 0, 0, tzinfo=MOSCOW)
    range_end = datetime(2026, 7, 1, 0, 0, tzinfo=MOSCOW)

    deleted = (
        db.query(UserActivitySession)
        .filter(
            UserActivitySession.user_id == user.id,
            UserActivitySession.started_at >= range_start,
            UserActivitySession.started_at < range_end,
        )
        .delete(synchronize_session=False)
    )

    created = 0
    for (day, hours, minutes), session_count in zip(DAILY_TARGETS, SESSION_COUNTS, strict=True):
        total_seconds = _to_seconds(hours, minutes)
        for session in _build_sessions_for_day(day, total_seconds, session_count):
            session.user_id = user.id
            db.add(session)
            created += 1

    db.commit()
    print(f"Deleted sessions in range: {deleted}")
    print(f"Created sessions: {created}")
    return created


def print_verification(db, user: User) -> None:
    print("\n--- Calendar (June 2026) ---")
    month = compute_monthly_stats(
        db,
        user_id=user.id,
        year=2026,
        month=6,
        tz=MOSCOW,
    )
    for day_info in month["days"]:
        if day_info["active_seconds"] <= 0:
            continue
        print(
            f"{day_info['date'].strftime('%d.%m.%Y')} — "
            f"{_format_duration(day_info['active_seconds'])}"
        )

    print("\n--- Week (anchor 2026-06-11, Mon=Пн) ---")
    week = compute_weekly_stats(
        db,
        user_id=user.id,
        anchor_day=date(2026, 6, 11),
        tz=MOSCOW,
    )
    weekday_labels = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"]
    for day_info in week["days"]:
        label = weekday_labels[day_info["date"].weekday()]
        seconds = day_info["active_seconds"]
        value = _format_duration(seconds) if seconds > 0 else "нет данных"
        print(f"{label} — {value}")

    print("\n--- Month summary ---")
    print(f"Всего: {_format_duration(month['total_active_seconds'])}")
    print(f"Активных дней: {month['active_days_count']}")
    print(f"Среднее: {_format_duration(month['average_active_seconds_per_day'])}")
    print(f"Сессий: {month['session_count']}")


def main() -> None:
    require_platform_data_write_approval(script_name="restore_platform_owner_activity_june2026.py")

    db = SessionLocal()
    try:
        user = _find_target_user(db)
        print(f"Target user: #{user.id} {user.email} {user.full_name}")
        restore_activity(db, user)
        print_verification(db, user)
    finally:
        db.close()


if __name__ == "__main__":
    main()
